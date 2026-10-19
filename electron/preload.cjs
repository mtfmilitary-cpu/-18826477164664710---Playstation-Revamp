const { contextBridge, ipcRenderer } = require("electron");

// Intentionally expose no Node.js APIs. The renderer uses the local HTTP API.
contextBridge.exposeInMainWorld("consoleBridge", Object.freeze({
  runtime: "electron",
  platform: process.platform,
  requestPowerAction: (action) => {
    if (!["sleep", "restart", "shutdown"].includes(action)) return Promise.reject(new Error("Unsupported power action."));
    return ipcRenderer.invoke("console:power-action", action);
  },
}));
