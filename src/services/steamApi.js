const API_BASE = "/api/v1";

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const getInstalledSteamGames = () => request("/library/installed");
export const refreshSteamLibrary = () => request("/library/refresh", { method: "POST" });
export const launchSteamGame = (appId) =>
  request("/library/launch", {
    method: "POST",
    body: JSON.stringify({ appId }),
  });
export const searchSteamStore = (query) =>
  request(`/store/search?q=${encodeURIComponent(query)}`);
export const getSteamGameDetails = (appId) => request(`/store/game/${encodeURIComponent(appId)}`);
