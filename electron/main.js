import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startServer } from "../server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;

function isTrustedLocalUrl(value) {
  try {
    const url = new URL(value);
    return ["http://127.0.0.1:3000", "http://127.0.0.1:5173"].includes(url.origin);
  } catch {
    return false;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#070a12",
    title: "PlayStation-Inspired Console",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  await mainWindow.loadURL(devUrl || "http://127.0.0.1:3000");

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://store.steampowered.com/") ||
        url.startsWith("https://help.steampowered.com/")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedLocalUrl(url) && !url.startsWith("file://")) event.preventDefault();
  });
}

app.whenReady().then(async () => {
  await startServer(3000, "127.0.0.1");
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
