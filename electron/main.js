import { app, BrowserWindow, shell, ipcMain, dialog, globalShortcut } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
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
    if (!isTrustedLocalUrl(url)) event.preventDefault();
  });
}

app.whenReady().then(async () => {
  await startServer(3000, "127.0.0.1");
  await createWindow();
  // Scroll Lock is a global console hotkey, including while a Steam game is foregrounded.
  globalShortcut.register("ScrollLock", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("console:quick-menu-toggle");
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


ipcMain.handle("console:power-action", async (_event, action) => {
  const labels = { sleep: "Sleep", restart: "Restart", shutdown: "Shut down" };
  if (!Object.hasOwn(labels, action)) throw new Error("Unsupported power action.");
  if (process.platform !== "win32") throw new Error("Power controls are currently available on Windows only.");
  const confirmation = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    title: "Confirm " + labels[action],
    message: "Are you sure you want to " + labels[action].toLowerCase() + " this PC?",
    detail: "Save your work before continuing.",
    buttons: ["Cancel", labels[action] + " now"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  if (confirmation.response !== 1) return { cancelled: true };
  if (action === "sleep") {
    const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class ConsolePower { [DllImport("PowrProf.dll", SetLastError=true)] public static extern bool SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent); }'; [ConsolePower]::SetSuspendState($false, $false, $false) | Out-Null`;
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true });
  } else {
    await execFileAsync("shutdown.exe", [action === "restart" ? "/r" : "/s", "/t", "0"], { windowsHide: true });
  }
  return { message: labels[action] + " requested." };
});

app.on("will-quit", () => globalShortcut.unregisterAll());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
