import fs from "node:fs/promises";
import path from "node:path";
import { createPrivateKey, sign } from "node:crypto";
import { validateManifestShape } from "../server/updateService.js";

const [inputPath, outputPath, privateKeyPath] = process.argv.slice(2);
if (!inputPath || !outputPath || !privateKeyPath) {
  console.error("Usage: node scripts/sign-update-manifest.js <manifest.json> <signed-envelope.json> <ed25519-private-key.pem>");
  process.exitCode = 2;
} else {
  try {
    const manifest = JSON.parse(await fs.readFile(inputPath, "utf8"));
    validateManifestShape(manifest);
    if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
      throw new Error("Manifest version must be semantic version format.");
    }
    if (manifest.files.length > 500) throw new Error("Manifest contains too many files.");
    const allowed = new Set(["index.html"]);
    for (const item of manifest.files) {
      if (!item.path.startsWith("assets/") && !allowed.has(item.path)) throw new Error("Only built frontend assets and index.html may be included.");
      const url = new URL(item.url);
      if (url.protocol !== "https:") throw new Error("Every asset URL must use HTTPS.");
    }
    const key = createPrivateKey(await fs.readFile(privateKeyPath));
    const payload = Buffer.from(JSON.stringify(manifest));
    const signature = sign(null, payload, key);
    const envelope = {
      payload: payload.toString("base64url"),
      signature: signature.toString("base64url"),
    };
    await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(envelope) + "\n", { mode: 0o600 });
    console.log("Signed update manifest written to " + path.resolve(outputPath));
    console.log("Keep the private key outside the repository and the update server.");
  } catch (error) {
    console.error("Could not sign update manifest: " + String(error?.message || error));
    process.exitCode = 1;
  }
}
