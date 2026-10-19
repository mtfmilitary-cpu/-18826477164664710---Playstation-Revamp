import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { diagnostic } from "./diagnostics.js";

const execFileAsync = promisify(execFile);
const isWindows = process.platform === "win32";
let cachedGames = [];
let lastScanAt = null;

function parseManifest(text) {
  const value = (key) => {
    const match = text.match(new RegExp('"' + key + '"\\s*"([^"]*)"', "i"));
    return match?.[1] ?? "";
  };
  const appId = value("appid");
  if (!/^\d+$/.test(appId)) return null;
  return {
    appId,
    name: value("name") || `Steam App ${appId}`,
    installDir: value("installdir"),
    stateFlags: Number(value("StateFlags") || 0),
  };
}

function readLibraryFolders(steamRoot) {
  const libraries = new Set([steamRoot]);
  const file = path.join(steamRoot, "steamapps", "libraryfolders.vdf");
  try {
    diagnostic("FILE-ACCESS-0001", "Reading Steam library folder configuration.", null, "INFO", {
      file: "steamapps/libraryfolders.vdf",
    });
    const contents = fs.readFileSync(file, "utf8");
    for (const match of contents.matchAll(/"path"\s*"([^"]+)"/g)) {
      libraries.add(match[1].replace(/\\\\/g, "\\"));
    }
  } catch (error) {
    diagnostic("FILE-ACCESS-0002", "Steam library folder configuration could not be read.", null, "WARN", {
      file: "steamapps/libraryfolders.vdf",
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || "")) ? String(error.code) : "FILE_READ_FAILED",
    });
  }
  return [...libraries];
}

function findSteamRoots() {
  const roots = new Set();
  if (process.env.STEAM_PATH) roots.add(process.env.STEAM_PATH);
  if (isWindows) {
    // Prefer Steam's own registry path so non-default install drives are found.
    try {
      const output = execFileSync("reg.exe", [
        "query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"
      ], { encoding: "utf8", windowsHide: true });
      const match = output.match(/SteamPath\s+REG_SZ\s+(.+)/i);
      if (match?.[1]) roots.add(match[1].trim().replace(/\//g, "\\"));
    } catch { /* Fall back to standard install paths below. */ }
    for (const candidate of [
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Steam"),
      path.join(process.env.ProgramFiles || "C:\\Program Files", "Steam"),
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Steam"),
    ]) roots.add(candidate);
  } else if (process.platform === "darwin") {
    roots.add(path.join(os.homedir(), "Library", "Application Support", "Steam"));
  } else {
    roots.add(path.join(os.homedir(), ".steam", "steam"));
    roots.add(path.join(os.homedir(), ".local", "share", "Steam"));
  }
  const found = [...roots].filter((root) => {
    const exists = Boolean(root && fs.existsSync(path.join(root, "steamapps")));
    diagnostic(exists ? "STEAM-PATH-0001" : "STEAM-PATH-0002",
      exists ? "Steam library root detected." : "Candidate Steam library root was not found.",
      null, exists ? "INFO" : "WARN",
      { candidate: root ? path.basename(root) : "empty", exists });
    return exists;
  });
  return found;
}

export function scanInstalledGames() {
  const games = new Map();
  const roots = findSteamRoots();
  for (const root of roots) {
    for (const library of readLibraryFolders(root)) {
      const appsDir = path.join(library, "steamapps");
      let entries = [];
      try {
        diagnostic("FILE-ACCESS-0003", "Listing Steam app manifests.", null, "INFO", {
          file: "steamapps", libraryIndex: [...readLibraryFolders(root)].indexOf(library),
        });
        entries = fs.readdirSync(appsDir);
      } catch (error) {
        diagnostic("FILE-ACCESS-0004", "Steam app manifest directory could not be listed.", null, "WARN", {
          file: "steamapps",
          code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || "")) ? String(error.code) : "DIRECTORY_READ_FAILED",
        });
        continue;
      }
      for (const filename of entries) {
        if (!/^appmanifest_\d+\.acf$/i.test(filename)) continue;
        try {
          diagnostic("FILE-ACCESS-0005", "Reading an installed-game manifest.", null, "INFO", {
            file: filename,
          });
          const manifest = parseManifest(fs.readFileSync(path.join(appsDir, filename), "utf8"));
          if (!manifest) {
            diagnostic("FILE-ACCESS-0006", "Installed-game manifest did not contain a valid app ID.", null, "WARN", { file: filename });
            continue;
          }
          games.set(manifest.appId, {
            ...manifest,
            libraryPath: library,
            cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${manifest.appId}/library_600x900_2x.jpg`,
            hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${manifest.appId}/library_hero.jpg`,
            steamUrl: `https://store.steampowered.com/app/${manifest.appId}/`,
          });
        } catch (error) {
          diagnostic("FILE-ACCESS-0007", "Installed-game manifest could not be read or parsed.", null, "WARN", {
            file: filename,
            code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || "")) ? String(error.code) : "MANIFEST_READ_FAILED",
          });
        }
      }
    }
  }
  cachedGames = [...games.values()].sort((a, b) => a.name.localeCompare(b.name));
  lastScanAt = new Date().toISOString();
  diagnostic("LIBRARY-0000", "Steam library scan finished.", null, "INFO", {
    gamesFound: cachedGames.length, libraryCount: roots.length,
  });
  return { games: cachedGames, scannedAt: lastScanAt, libraryCount: roots.length };
}

export function getInstalledGames() {
  if (!lastScanAt) return scanInstalledGames();
  return { games: cachedGames, scannedAt: lastScanAt, libraryCount: findSteamRoots().length };
}

export async function launchInstalledGame(appId) {
  const normalized = String(appId ?? "");
  if (!/^\d+$/.test(normalized)) throw new Error("A valid Steam App ID is required.");
  const { games } = getInstalledGames();
  if (!games.some((game) => game.appId === normalized)) {
    throw new Error("That game is not in the detected installed Steam library. Refresh the library first.");
  }
  diagnostic("GAME-LAUNCH-0000", "Launching an installed Steam game.", null, "INFO", { appId: normalized });
  if (isWindows) {
    await execFileAsync("cmd.exe", ["/c", "start", "", `steam://run/${normalized}`], { windowsHide: true });
  } else {
    const { default: open } = await import("open").catch(() => ({ default: null }));
    if (open) await open(`steam://run/${normalized}`);
    else throw new Error("Launching Steam games is currently supported on Windows.");
  }
  diagnostic("GAME-LAUNCH-0003", "Steam game launch command was issued.", null, "INFO", { appId: normalized });
  return { launched: true, appId: normalized };
}
