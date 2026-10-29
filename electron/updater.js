import fs from "node:fs/promises";
import path from "node:path";
import { createHash, createPublicKey, verify } from "node:crypto";
import { validateManifestShape } from "../server/updateService.js";

const MAX_FILES = 500;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
function safeTarget(root, relative) {
  if (typeof relative !== "string" || relative.startsWith("/") || relative.includes("\\") ||
      relative.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Unsafe update path.");
  const target = path.resolve(root, ...relative.split("/"));
  if (!target.startsWith(root + path.sep)) throw new Error("Update path escapes the asset directory.");
  return target;
}
async function readHash(file) {
  try { return hash(await fs.readFile(file)); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
export async function checkAndStageDeltaUpdate({ app, manifestUrl, publicKeyB64, currentVersion }) {
  if (app.isPackaged) throw new Error("Self-updating packaged builds is disabled; use a signed installer/update provider.");
  const url = new URL(String(manifestUrl || ""));
  if (url.protocol !== "https:") throw new Error("The update manifest must be served over HTTPS.");
  if (!publicKeyB64) throw new Error("CONSOLE_UPDATE_PUBLIC_KEY_B64 is not configured.");
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Update manifest download failed.");
  const envelope = await response.json();
  if (typeof envelope?.payload !== "string" || typeof envelope?.signature !== "string") throw new Error("Signed manifest envelope is invalid.");
  const payloadBytes = Buffer.from(envelope.payload, "base64url");
  const signature = Buffer.from(envelope.signature, "base64url");
  const publicKey = createPublicKey({ key: Buffer.from(publicKeyB64, "base64"), format: "der", type: "spki" });
  if (!verify(null, payloadBytes, publicKey, signature)) throw new Error("Update manifest signature is invalid.");
  const manifest = validateManifestShape(JSON.parse(payloadBytes.toString("utf8")));
  if (typeof manifest.version !== "string" || !/^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) throw new Error("Manifest version is invalid.");
  const versionParts = (value) => value.split("-")[0].split(".").map(Number);
  const nextParts = versionParts(manifest.version), currentParts = versionParts(String(currentVersion || "0.0.0"));
  let versionComparison = 0;
  for (let i = 0; i < 3; i += 1) { if ((nextParts[i] || 0) !== (currentParts[i] || 0)) { versionComparison = (nextParts[i] || 0) - (currentParts[i] || 0); break; } }
  if (versionComparison <= 0) return { updateAvailable: false, filesStaged: 0, version: currentVersion };
  if (manifest.files.length > MAX_FILES) throw new Error("Manifest contains too many files.");
  const root = path.resolve(app.getAppPath(), "dist");
  const stageRoot = path.join(app.getPath("userData"), "update-staging", manifest.version);
  await fs.rm(stageRoot, { recursive: true, force: true });
  await fs.mkdir(stageRoot, { recursive: true });
  const staged = [];
  try {
    for (const item of manifest.files) {
      const fileUrl = new URL(item.url);
      if (fileUrl.origin !== url.origin || fileUrl.protocol !== "https:") throw new Error("Update assets must use the manifest's HTTPS origin.");
      const target = safeTarget(root, item.path);
      if (!item.path.startsWith("assets/") && item.path !== "index.html") throw new Error("Only built frontend assets may be updated.");
      if ((await readHash(target)) === item.sha256.toLowerCase()) continue;
      const fileResponse = await fetch(fileUrl, { signal: AbortSignal.timeout(30000) });
      if (!fileResponse.ok) throw new Error("An update asset could not be downloaded.");
      const bytes = Buffer.from(await fileResponse.arrayBuffer());
      if (bytes.length > MAX_FILE_BYTES || hash(bytes) !== item.sha256.toLowerCase()) throw new Error("An update asset failed its size or SHA-256 check.");
      const stagedFile = safeTarget(stageRoot, item.path);
      await fs.mkdir(path.dirname(stagedFile), { recursive: true });
      await fs.writeFile(stagedFile, bytes, { flag: "wx" });
      staged.push({ path: item.path, sha256: item.sha256.toLowerCase() });
    }
    const pending = { version: manifest.version, files: staged };
    await fs.writeFile(path.join(app.getPath("userData"), "pending-update.json"), JSON.stringify(pending), "utf8");
    return { updateAvailable: staged.length > 0, filesStaged: staged.length, version: manifest.version };
  } catch (error) {
    await fs.rm(stageRoot, { recursive: true, force: true });
    throw error;
  }
}
export async function applyStagedDeltaUpdate({ app }) {
  if (app.isPackaged) throw new Error("Self-updating packaged builds is disabled.");
  const userData = app.getPath("userData");
  const pendingFile = path.join(userData, "pending-update.json");
  const pending = JSON.parse(await fs.readFile(pendingFile, "utf8"));
  const root = path.resolve(app.getAppPath(), "dist");
  const stageRoot = path.join(userData, "update-staging", pending.version);
  const backupRoot = path.join(userData, "update-backup", pending.version);
  const replaced = [];
  try {
    for (const item of pending.files) {
      const target = safeTarget(root, item.path);
      const stagedFile = safeTarget(stageRoot, item.path);
      const backup = safeTarget(backupRoot, item.path);
      if ((await readHash(stagedFile)) !== item.sha256) throw new Error("Staged update integrity check failed.");
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.mkdir(path.dirname(backup), { recursive: true });
      let hadOriginal = false;
      try { await fs.rename(target, backup); hadOriginal = true; } catch (error) { if (error.code !== "ENOENT") throw error; }
      try { await fs.rename(stagedFile, target); }
      catch (error) { if (hadOriginal) await fs.rename(backup, target); throw error; }
      replaced.push({ target, backup, hadOriginal });
    }
    await fs.rm(pendingFile, { force: true });
    return { applied: replaced.length, version: pending.version };
  } catch (error) {
    for (const item of replaced.reverse()) {
      try { await fs.rm(item.target, { force: true }); if (item.hadOriginal) await fs.rename(item.backup, item.target); } catch {}
    }
    throw error;
  }
}
