import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

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
    const contents = fs.readFileSync(file, "utf8");
    for (const match of contents.matchAll(/"path"\s*"([^"]+)"/g)) {
      libraries.add(match[1].replace(/\\\\/g, "\\"));
    }
  } catch { /* Older Steam installs may not have libraryfolders.vdf. */ }
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
  return [...roots].filter((root) => root && fs.existsSync(path.join(root, "steamapps")));
}

export function scanInstalledGames() {
  const games = new Map();
  const roots = findSteamRoots();
  for (const root of roots) {
    for (const library of readLibraryFolders(root)) {
      const appsDir = path.join(library, "steamapps");
      let entries = [];
      try { entries = fs.readdirSync(appsDir); } catch { continue; }
      for (const filename of entries) {
        if (!/^appmanifest_\d+\.acf$/i.test(filename)) continue;
        try {
          const manifest = parseManifest(fs.readFileSync(path.join(appsDir, filename), "utf8"));
          if (!manifest) continue;
          games.set(manifest.appId, {
            ...manifest,
            libraryPath: library,
            cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${manifest.appId}/library_600x900_2x.jpg`,
            hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${manifest.appId}/library_hero.jpg`,
            steamUrl: `https://store.steampowered.com/app/${manifest.appId}/`,
          });
        } catch { /* Skip malformed or unreadable manifests. */ }
      }
    }
  }
  cachedGames = [...games.values()].sort((a, b) => a.name.localeCompare(b.name));
  lastScanAt = new Date().toISOString();
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
  if (isWindows) {
    await execFileAsync("cmd.exe", ["/c", "start", "", `steam://run/${normalized}`], { windowsHide: true });
  } else {
    const { default: open } = await import("open").catch(() => ({ default: null }));
    if (open) await open(`steam://run/${normalized}`);
    else throw new Error("Launching Steam games is currently supported on Windows.");
  }
  return { launched: true, appId: normalized };
}
