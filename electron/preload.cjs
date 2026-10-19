const { contextBridge } = require("electron");

// Intentionally expose no Node.js APIs. The renderer uses the local HTTP API.
contextBridge.exposeInMainWorld("consoleBridge", Object.freeze({
  runtime: "electron",
  platform: process.platform,
}));
