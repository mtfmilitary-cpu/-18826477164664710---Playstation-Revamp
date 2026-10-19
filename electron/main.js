import { app, BrowserWindow, shell, ipcMain, dialog, globalShortcut } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startServer } from "../server.js";
import { diagnostic, diagnosticLogPath } from "../server/diagnostics.js";

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
  const targetUrl = devUrl || "http://127.0.0.1:3000";
  diagnostic("ELECTRON-WINDOW-0001", "Console window created.", null, "INFO", {
    devMode: Boolean(devUrl), platform: process.platform,
  });
  mainWindow.on("close", () => {
    diagnostic("ELECTRON-WINDOW-0002", "Console window close requested.", null, "INFO");
  });
  mainWindow.on("closed", () => {
    diagnostic("ELECTRON-WINDOW-0003", "Console window closed.", null, "INFO");
    mainWindow = null;
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, _description, validatedURL, isMainFrame) => {
    if (errorCode === -3) return;
    diagnostic("ELECTRON-LOAD-0001", "A page or resource failed to load.", null, "ERROR", {
      errorCode, isMainFrame: Boolean(isMainFrame),
      localPage: isTrustedLocalUrl(validatedURL),
    });
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    diagnostic("ELECTRON-RENDERER-0001", "Electron renderer process exited unexpectedly.", null, "FATAL", {
      reason: String(details?.reason || "unknown").slice(0, 80),
      exitCode: Number.isInteger(details?.exitCode) ? details.exitCode : null,
    });
  });
  await mainWindow.loadURL(targetUrl);
  diagnostic("ELECTRON-LOAD-0002", "Console page loaded.", null, "INFO", {
    localPage: isTrustedLocalUrl(targetUrl),
  });

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
  try {
    await startServer(3000, "127.0.0.1");
  } catch (error) {
    diagnostic("ELECTRON-BOOT-0001", "Backend startup failed; the console window will not be created.", error, "FATAL");
    throw error;
  }
  try {
    await createWindow();
  } catch (error) {
    diagnostic("ELECTRON-BOOT-0002", "Electron could not load the console window.", error, "FATAL");
    throw error;
  }
  diagnostic("DIAG-0000", `Diagnostic logging is active. Log file: ${diagnosticLogPath}`, null, "INFO");
  // Scroll Lock is a global console hotkey, including while a Steam game is foregrounded.
  const registered = globalShortcut.register("ScrollLock", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      diagnostic("ELECTRON-HOTKEY-0002", "Quick-menu hotkey pressed while the window was unavailable.", null, "WARN");
      return;
    }
    diagnostic("ELECTRON-HOTKEY-0001", "Quick-menu hotkey activated.", null, "INFO");
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("console:quick-menu-toggle");
  });
  diagnostic("ELECTRON-HOTKEY-0003", registered ? "Quick-menu hotkey registered." : "Quick-menu hotkey registration failed.", null, registered ? "INFO" : "WARN");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  diagnostic("ELECTRON-BOOT-0003", "Electron application startup failed.", error, "FATAL");
  app.quit();
});

process.on("uncaughtException", (error) => {
  diagnostic("ELECTRON-FATAL-0001", "Uncaught exception in Electron main process.", error, "FATAL");
  app.quit();
});

process.on("unhandledRejection", (reason) => {
  diagnostic("ELECTRON-PROMISE-0001", "Unhandled promise rejection in Electron main process.", reason instanceof Error ? reason : new Error(String(reason)), "ERROR");
});


const rendererDiagnosticCodes = new Set([
  "RENDERER-0001",
  "RENDERER-PROMISE-0001",
  "RENDERER-BOOT-0001",
  "RENDERER-BOOT-0002",
  "RENDERER-BOOT-0003",
  "RENDERER-ASSET-0001",
  "RENDERER-ASSET-0002",
  "RENDERER-API-0001",
]);

ipcMain.handle("console:renderer-diagnostic", (event, entry) => {
  if (!isTrustedLocalUrl(event.senderFrame?.url || "")) return false;
  if (!entry || typeof entry !== "object" || !rendererDiagnosticCodes.has(entry.code)) return false;
  const clean = (value, max = 300) => String(value || "")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL REDACTED]")
    .replace(/\b(key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, max);
  const code = entry.code;
  const message = clean(entry.message, 240) || "Renderer reported an error.";
  diagnostic(code, message, null, code === "RENDERER-BOOT-0003" ? "INFO" : "ERROR", {
    name: clean(entry.name, 80),
    detail: clean(entry.detail, 600),
  });
  return true;
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

app.on("before-quit", () => {
  diagnostic("ELECTRON-LIFECYCLE-0001", "Electron application shutdown requested.", null, "INFO");
});
app.on("will-quit", () => {
  diagnostic("ELECTRON-LIFECYCLE-0002", "Electron application is quitting.", null, "INFO");
  globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {
  diagnostic("ELECTRON-LIFECYCLE-0003", "All Electron windows are closed.", null, "INFO");
  if (process.platform !== "darwin") app.quit();
});
app.on("child-process-gone", (_event, details) => {
  diagnostic("ELECTRON-CHILD-0001", "An Electron child process exited.", null, "ERROR", {
    type: String(details?.type || "unknown").slice(0, 60),
    reason: String(details?.reason || "unknown").slice(0, 80),
    exitCode: Number.isInteger(details?.exitCode) ? details.exitCode : null,
  });
});
