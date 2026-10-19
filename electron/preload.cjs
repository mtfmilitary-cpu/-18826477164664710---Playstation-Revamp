const { contextBridge, ipcRenderer } = require("electron");

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
  onQuickMenuToggle,
  requestPowerAction: (action) => {
    if (!["sleep", "restart", "shutdown"].includes(action)) return Promise.reject(new Error("Unsupported power action."));
    return ipcRenderer.invoke("console:power-action", action);
  },
}));
