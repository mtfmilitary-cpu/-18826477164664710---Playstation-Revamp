const { contextBridge, ipcRenderer } = require("electron");

function onNavigate(callback) {
  if (typeof callback !== "function") return () => {};
  const listener = (_event, route) => callback(route);
  ipcRenderer.on("console:navigate", listener);
  return () => ipcRenderer.removeListener("console:navigate", listener);
}

function onQuickMenuToggle(callback) {
  if (typeof callback !== "function") return () => {};
  const listener = () => callback();
  ipcRenderer.on("console:quick-menu-toggle", listener);
  return () => ipcRenderer.removeListener("console:quick-menu-toggle", listener);
}

// Intentionally expose no Node.js APIs. The renderer uses the local HTTP API.
contextBridge.exposeInMainWorld("consoleBridge", Object.freeze({
  runtime: "electron",
  platform: process.platform,
  openSteamAuth: (url) => ipcRenderer.invoke("console:open-steam-auth", url),
  checkForUpdates: () => ipcRenderer.invoke("console:check-for-updates"),
  onQuickMenuToggle,
  toggleQuickMenu: () => ipcRenderer.invoke("console:toggle-quick-menu"),
  onNavigate,
  hideQuickMenu: () => ipcRenderer.invoke("console:quick-menu-hide"),
  openMainRoute: (route) => ipcRenderer.invoke("console:open-main-route", route),
  openBluetoothSettings: () => ipcRenderer.invoke("console:open-bluetooth-settings"),
  getControllerStackStatus: () => ipcRenderer.invoke("console:controller-stack-status"),
  installControllerStack: () => ipcRenderer.invoke("console:install-controller-stack"),
  launchControllerEmulator: () => ipcRenderer.invoke("console:launch-controller-emulator"),
  onControllerSetupProgress: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("console:controller-setup-progress", listener);
    return () => ipcRenderer.removeListener("console:controller-setup-progress", listener);
  },
  openControllerGuide: (guide) => ipcRenderer.invoke("console:open-controller-guide", guide),
  reportDiagnostic: (entry) => {
    if (!entry || typeof entry !== "object") return Promise.resolve(false);
    return ipcRenderer.invoke("console:renderer-diagnostic", {
      code: String(entry.code || ""),
      message: String(entry.message || ""),
      name: String(entry.name || ""),
      detail: String(entry.detail || ""),
      componentStack: String(entry.componentStack || ""),
    });
  },
  requestPowerAction: (action) => {
    if (!["sleep", "restart", "shutdown"].includes(action)) return Promise.reject(new Error("Unsupported power action."));
    return ipcRenderer.invoke("console:power-action", action);
  },
}));
