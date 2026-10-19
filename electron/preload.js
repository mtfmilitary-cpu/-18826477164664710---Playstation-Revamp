import { contextBridge } from "electron";

// Deliberately expose no Node.js APIs. Renderer-to-backend requests use the
// local HTTP API and the browser's normal fetch implementation.
contextBridge.exposeInMainWorld("consoleBridge", Object.freeze({
  runtime: "electron",
  platform: process.platform,
}));
