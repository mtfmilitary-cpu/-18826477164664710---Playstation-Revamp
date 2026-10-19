import { app, BrowserWindow, shell, ipcMain, dialog, globalShortcut, screen } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { startServer } from "../server.js";
import { diagnostic, diagnosticLogPath } from "../server/diagnostics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;
let quickMenuWindow;

const projectRoot = path.resolve(__dirname, '..');
const startupFiles = [
  'package.json',
  'server.js',
  'server/diagnostics.js',
  'electron/preload.cjs',
  'src/main.jsx',
  'public/preloader.mp4',
];
for (const relativePath of startupFiles) {
  const exists = fs.existsSync(path.join(projectRoot, relativePath));
  diagnostic(
    exists ? 'FILE-CHECK-0001' : 'FILE-CHECK-0002',
    exists ? 'Required project file is present.' : 'Expected project file was not found.',
    null,
    exists ? 'INFO' : 'ERROR',
    { file: relativePath, exists }
  );
}

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
    if (quickMenuWindow && !quickMenuWindow.isDestroyed()) quickMenuWindow.close();
  });
  mainWindow.on("focus", () => {
    diagnostic("ELECTRON-WINDOW-0004", "Console window gained focus.", null, "INFO");
  });
  mainWindow.on("blur", () => {
    diagnostic("ELECTRON-WINDOW-0005", "Console window lost focus.", null, "INFO");
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

async function moveCursorToQuickMenu() {
  if (process.platform !== "win32") return;
  const bounds = screen.getPrimaryDisplay().bounds;
  const x = Math.round(bounds.x + 120);
  const y = Math.round(bounds.y + 100);
  const script = 'Add-Type -MemberDefinition \'[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);\' -Name ConsoleCursor -Namespace Native; [Native.ConsoleCursor]::SetCursorPos(' + x + ', ' + y + ') | Out-Null';
  try {
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 3000 });
  } catch (error) {
    diagnostic("ELECTRON-OVERLAY-0004", "Native mouse positioning was unavailable.", null, "WARN", {
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || "")) ? String(error.code) : "CURSOR_POSITION_FAILED",
    });
  }
}

async function createQuickMenuWindow() {
  const display = screen.getPrimaryDisplay();
  quickMenuWindow = new BrowserWindow({
    x: display.bounds.x, y: display.bounds.y,
    width: display.bounds.width, height: display.bounds.height,
    frame: false, transparent: true, backgroundColor: "#00000000",
    alwaysOnTop: true, focusable: true, skipTaskbar: true,
    resizable: false, movable: false, hasShadow: false, show: false,
    title: "Console Quick Menu",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  quickMenuWindow.setAlwaysOnTop(true, "screen-saver");
  quickMenuWindow.on("closed", () => { quickMenuWindow = null; });
  quickMenuWindow.webContents.on("did-fail-load", (_event, errorCode, _description, validatedURL, isMainFrame) => {
    if (errorCode === -3) return;
    diagnostic("ELECTRON-OVERLAY-0002", "Quick Menu overlay failed to load.", null, "ERROR", { errorCode, isMainFrame: Boolean(isMainFrame), localPage: isTrustedLocalUrl(validatedURL) });
  });
  const baseUrl = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:3000";
  await quickMenuWindow.loadURL(new URL("/overlay", baseUrl).toString());
  quickMenuWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  quickMenuWindow.webContents.on("will-navigate", (event, url) => {
    try { const parsed = new URL(url); if (!isTrustedLocalUrl(url) || parsed.pathname !== "/overlay") event.preventDefault(); }
    catch { event.preventDefault(); }
  });
  diagnostic("ELECTRON-OVERLAY-0001", "Windows-wide Quick Menu overlay created.", null, "INFO", { displayWidth: display.bounds.width, displayHeight: display.bounds.height });
}

function toggleQuickMenuOverlay() {
  if (!quickMenuWindow || quickMenuWindow.isDestroyed()) {
    diagnostic("ELECTRON-HOTKEY-0002", "Quick Menu overlay was unavailable.", null, "WARN"); return;
  }
  if (quickMenuWindow.isVisible()) { quickMenuWindow.webContents.send("console:quick-menu-toggle"); return; }
  quickMenuWindow.show(); quickMenuWindow.focus();
  setTimeout(() => {
    if (!quickMenuWindow || quickMenuWindow.isDestroyed() || !quickMenuWindow.isVisible()) return;
    moveCursorToQuickMenu();
    quickMenuWindow.webContents.send("console:quick-menu-toggle");
  }, 75);
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
    await createQuickMenuWindow();
  } catch (error) {
    diagnostic("ELECTRON-BOOT-0002", "Electron could not load the console window or Quick Menu overlay.", error, "FATAL");
    throw error;
  }
  diagnostic("DIAG-0000", `Diagnostic logging is active. Log file: ${diagnosticLogPath}`, null, "INFO");
  // Scroll Lock is a global console hotkey, including while a Steam game is foregrounded.
  const registered = globalShortcut.register("ScrollLock", () => {
    diagnostic("ELECTRON-HOTKEY-0001", "Quick-menu hotkey activated.", null, "INFO");
    toggleQuickMenuOverlay();
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
  "RENDERER-MEDIA-0001",
  "RENDERER-MEDIA-0002",
  "RENDERER-NAV-0001",
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
  const level = ["RENDERER-BOOT-0003", "RENDERER-MEDIA-0001", "RENDERER-MEDIA-0002", "RENDERER-NAV-0001"].includes(code) ? "INFO" : "ERROR";
  diagnostic(code, message, null, level, {
    name: clean(entry.name, 80),
    detail: clean(entry.detail, 600),
    componentStack: clean(entry.componentStack, 900),
  });
  return true;
});

ipcMain.handle("console:controller-stack-status", async (event) => {
  if (!isTrustedLocalUrl(event.senderFrame?.url || "")) return { supported: false, ds4WindowsRunning: false, vigemBusInstalled: false, error: "Untrusted renderer." };
  if (process.platform !== "win32") return { supported: false, ds4WindowsRunning: false, vigemBusInstalled: false, error: "Controller driver checks are available on Windows only." };
  const script = "$p = Get-Process -Name 'DS4Windows' -ErrorAction SilentlyContinue | Select-Object -First 1; $d = Get-CimInstance Win32_SystemDriver -Filter \"Name='ViGEmBus'\" -ErrorAction SilentlyContinue; $v = Get-CimInstance Win32_SystemDriver -Filter \"Name='usbip-win2'\" -ErrorAction SilentlyContinue; [pscustomobject]@{ ds4WindowsRunning = [bool]$p; vigemBusInstalled = [bool]$d; vigemBusState = if ($d) { [string]$d.State } else { 'NotFound' }; modernBackendInstalled = [bool]$v; modernBackendState = if ($v) { [string]$v.State } else { 'NotFound' } } | ConvertTo-Json -Compress";
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 5000 });
    const result = JSON.parse(stdout.trim());
    const localDs4 = path.join(process.env.LOCALAPPDATA || "", "DS4Windows", "DS4Windows.exe");
    const programDs4 = path.join(process.env.ProgramFiles || "C:\\Program Files", "DS4Windows", "DS4Windows.exe");
    const ds4WindowsPath = fs.existsSync(localDs4) ? localDs4 : (fs.existsSync(programDs4) ? programDs4 : null);
    return { supported: true, ds4WindowsRunning: Boolean(result.ds4WindowsRunning), ds4WindowsInstalled: Boolean(ds4WindowsPath), ds4WindowsPath, vigemBusInstalled: Boolean(result.vigemBusInstalled), vigemBusState: String(result.vigemBusState || "Unknown"), modernBackendInstalled: Boolean(result.modernBackendInstalled), modernBackendState: String(result.modernBackendState || "Unknown") };
  } catch (error) {
    diagnostic("CONTROLLER-STACK-0001", "Could not inspect the DS4Windows and ViGEmBus status.", error, "WARN");
    return { supported: true, ds4WindowsRunning: false, vigemBusInstalled: false, vigemBusState: "Check failed", modernBackendInstalled: false, modernBackendState: "Check failed", error: "Windows could not check the controller software. Try running the console again." };
  }
});

ipcMain.handle("console:install-controller-stack", async (event) => {
  if (!isTrustedLocalUrl(event.senderFrame?.url || "")) throw new Error("Untrusted renderer.");
  if (process.platform !== "win32") throw new Error("Controller setup is only available on Windows.");
  const confirmation = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    title: "Install DualShock 4 controller support?",
    message: "Install DS4Windows and the ViGEmBus virtual-controller driver?",
    detail: "This downloads DS4Windows 4.0.2.3 and the archived ViGEmBus 1.22.0 installer from their published GitHub release assets, checks their SHA-256 hashes, extracts DS4Windows, and launches the driver installer after Windows administrator approval. ViGEmBus is retired software. Continue only if you want this classic DS4Windows setup.",
    buttons: ["Cancel", "Continue to administrator prompt"], defaultId: 0, cancelId: 0, noLink: true,
  });
  if (confirmation.response !== 1) return { cancelled: true };
  const tempRoot = path.join(app.getPath("temp"), "console-controller-setup");
  fs.mkdirSync(tempRoot, { recursive: true });
  const sourceScriptPath = path.join(projectRoot, "scripts", "install-controller-stack.ps1");
  if (!fs.existsSync(sourceScriptPath)) throw new Error("Controller installer script is missing. Update the project and try again.");
  const scriptPath = path.join(tempRoot, "install-controller-stack.ps1");
  fs.copyFileSync(sourceScriptPath, scriptPath);
  const progressPath = path.join(tempRoot, "progress.json");
  const resultPath = path.join(tempRoot, "result.json");
  for (const file of [progressPath, resultPath]) { try { fs.unlinkSync(file); } catch {} }
  const sendProgress = (progress) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("console:controller-setup-progress", progress); };
  sendProgress({ stage: "prepare", title: "Preparing controller setup", message: "The app will download and verify the official release files first. Windows will then ask for administrator approval before installing the driver.", kind: "info" });
  const installArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-ProgressPath", progressPath, "-ResultPath", resultPath];
  let lastProgress = "";
  const poller = setInterval(() => {
    try {
      const progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
      const fingerprint = [progress.stage, progress.title, progress.message].join("|");
      if (fingerprint !== lastProgress) { lastProgress = fingerprint; sendProgress(progress); }
    } catch {}
  }, 500);
  try {
    await execFileAsync("powershell.exe", installArgs, { windowsHide: true, timeout: 15 * 60 * 1000, maxBuffer: 1024 * 1024 });
    let result = {};
    try { result = JSON.parse(fs.readFileSync(resultPath, "utf8")); } catch {}
    if (!result.success) throw new Error(result.error || "The installer finished without a successful validation result.");
    sendProgress({ stage: "complete", title: "Controller support installed", message: result.message || "Controller support is installed. Try out the controller system now.", kind: "success" });
    diagnostic("CONTROLLER-SETUP-0002", "DS4Windows and ViGEmBus setup completed and validation passed.", null, "INFO");
    return result;
  } catch (error) {
    let result = {};
    try { result = JSON.parse(fs.readFileSync(resultPath, "utf8")); } catch {}
    const message = result.error || "Controller setup was cancelled, failed, or interrupted. If you cancelled the Windows administrator prompt, no installation was authorized.";
    sendProgress({ stage: result.cancelled ? "cancelled" : "failed", title: result.cancelled ? "Installation cancelled" : "Controller setup did not finish", message, kind: result.cancelled ? "info" : "error" });
    diagnostic("CONTROLLER-SETUP-0003", "DS4Windows and ViGEmBus setup did not complete successfully.", error, "WARN");
    throw new Error(message);
  } finally { clearInterval(poller); }
});
ipcMain.handle("console:open-controller-guide", async (event, guide) => {
  if (!isTrustedLocalUrl(event.senderFrame?.url || "")) return false;
  const urls = {
    ds4windows: "https://github.com/ds4windowsapp/DS4Windows",
    vigembus: "https://github.com/nefarius/ViGEmBus",
  };
  if (!Object.hasOwn(urls, guide)) return false;
  await shell.openExternal(urls[guide]);
  return true;
});

ipcMain.handle("console:open-bluetooth-settings", async (event) => {
  if (!isTrustedLocalUrl(event.senderFrame?.url || "")) return false;
  if (process.platform !== "win32") throw new Error("Windows Bluetooth settings are only available on Windows.");
  await shell.openExternal("ms-settings:bluetooth");
  return true;
});

ipcMain.handle("console:quick-menu-hide", (event) => {
  try {
    if (!isTrustedLocalUrl(event.senderFrame?.url || "") || new URL(event.senderFrame.url).pathname !== "/overlay") return false;
  } catch { return false; }
  if (quickMenuWindow && !quickMenuWindow.isDestroyed()) quickMenuWindow.hide();
  return true;
});

ipcMain.handle("console:open-main-route", (event, route) => {
  if (!isTrustedLocalUrl(event.senderFrame?.url || "")) return false;
  const allowedRoutes = new Set(["/home", "/settings", "/friends", "/party", "/library", "/profile", "/store"]);
  if (!allowedRoutes.has(route) || !mainWindow || mainWindow.isDestroyed()) return false;
  mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send("console:navigate", route);
  if (quickMenuWindow && !quickMenuWindow.isDestroyed()) quickMenuWindow.hide();
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
process.on("exit", (code) => {
  diagnostic("ELECTRON-LIFECYCLE-0004", "Electron main process is exiting.", null, code === 0 ? "INFO" : "ERROR", {
    exitCode: code,
  });
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
