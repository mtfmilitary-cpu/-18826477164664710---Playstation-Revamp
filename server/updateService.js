export function getUpdateStatus(currentVersion) {
  const latestVersion = String(process.env.CONSOLE_UPDATE_VERSION || "0.0.0").trim();
  const manifestUrl = String(process.env.CONSOLE_UPDATE_MANIFEST_URL || "").trim();
  const valid = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  if (!valid.test(latestVersion)) throw new Error("CONSOLE_UPDATE_VERSION must be a semantic version.");
  if (currentVersion && !valid.test(String(currentVersion))) {
    const error = new Error("Invalid current version.");
    error.status = 400;
    throw error;
  }
  const compare = (a, b) => {
    const x = a.split("-")[0].split(".").map(Number);
    const y = b.split("-")[0].split(".").map(Number);
    for (let i = 0; i < 3; i += 1) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  };
  return {
    currentVersion: String(currentVersion || "0.0.0"),
    latestVersion,
    updateAvailable: Boolean(currentVersion && compare(latestVersion, String(currentVersion)) > 0),
    manifestUrl: manifestUrl || null,
    updaterReady: Boolean(manifestUrl),
    note: manifestUrl ? undefined : "Version checks are configured, but a signed update manifest is not configured.",
  };
}
export function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.files)) throw new Error("Update manifest format is invalid.");
  for (const item of manifest.files) {
    if (!item || typeof item.path !== "string" || item.path.startsWith("/") || item.path.includes("\\") ||
        item.path.split("/").some((part) => !part || part === "." || part === "..") ||
        !/^[a-f0-9]{64}$/i.test(String(item.sha256 || "")) ||
        !/^https:\/\//.test(String(item.url || ""))) throw new Error("Update manifest contains an unsafe file entry.");
  }
  return manifest;
}
