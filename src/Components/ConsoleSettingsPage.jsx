import React, { useEffect, useState } from "react";
import { Monitor, Palette, Power, RotateCcw, Moon, AlertTriangle, Volume2, MousePointer2, Music2, Gamepad2, Bluetooth, Cable, RefreshCw, Download, ShieldCheck, CheckCircle2, X } from "lucide-react";
import "./ConsoleSettings.css";

const DEFAULTS = { accent: "#2877dc", font: "Inter", backdrop: "blue", soundsEnabled: true, soundVolume: 50, backgroundMusicEnabled: true };

export default function ConsoleSettingsPage() {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("console-settings") || "{}") }; }
    catch { return DEFAULTS; }
  });
  const [powerMessage, setPowerMessage] = useState("");
  const [controllerInfo, setControllerInfo] = useState(null);
  const [controllerStack, setControllerStack] = useState(null);
  const [controllerToast, setControllerToast] = useState(null);
  const [installingController, setInstallingController] = useState(false);

  useEffect(() => {
    window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack).catch(() => setControllerStack({ supported: false, error: "Could not check DS4Windows status." }));
    const unsubscribeProgress = window.consoleBridge?.onControllerSetupProgress?.((progress) => {
      setControllerToast({ title: progress.title || "Controller setup", message: progress.message || "", kind: progress.kind || "info" });
      if (progress.stage === "complete") {
        setInstallingController(false);
        window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack).catch(() => {});
      } else if (progress.stage === "failed" || progress.stage === "cancelled") setInstallingController(false);
    });
    const refreshController = () => {
      const pads = Array.from(navigator.getGamepads?.() || []).filter((pad) => pad?.connected);
      const pad = pads.find((candidate) => /dualshock|wireless controller|sony/i.test(candidate.id)) || pads[0] || null;
      const next = pad ? {
        id: pad.id || "Game controller",
        mapping: pad.mapping || "non-standard",
        buttons: pad.buttons?.length || 0,
        axes: pad.axes?.length || 0,
        index: pad.index,
      } : null;
      setControllerInfo((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    refreshController();
    window.addEventListener("gamepadconnected", refreshController);
    window.addEventListener("gamepaddisconnected", refreshController);
    const timer = window.setInterval(refreshController, 1000);
    return () => {
      window.removeEventListener("gamepadconnected", refreshController);
      window.removeEventListener("gamepaddisconnected", refreshController);
      window.clearInterval(timer);
      if (typeof unsubscribeProgress === "function") unsubscribeProgress();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("console-settings", JSON.stringify(settings));
    document.documentElement.style.setProperty("--console-accent", settings.accent);
    document.documentElement.style.setProperty("--font-ui", settings.font === "System" ? "system-ui" : settings.font);
    document.body.dataset.consoleBackdrop = settings.backdrop;
    window.dispatchEvent(new Event("console-settings-changed"));
  }, [settings]);

  function update(key, value) { setSettings((current) => ({ ...current, [key]: value })); }

  async function installControllerStack() {
    if (!window.consoleBridge?.installControllerStack) {
      setControllerToast({ title: "Desktop app required", message: "Run this console with npm run desktop on Windows to install controller drivers.", kind: "error" });
      return;
    }
    setInstallingController(true);
    setControllerToast({ title: "Confirm controller setup", message: "A confirmation dialog will appear. If you approve, Windows will then show its administrator prompt.", kind: "info" });
    try {
      const result = await window.consoleBridge.installControllerStack();
      if (result?.cancelled) {
        setInstallingController(false);
        setControllerToast({ title: "Installation cancelled", message: "No changes were made.", kind: "info" });
      }
    } catch (error) {
      setInstallingController(false);
      setControllerToast({ title: "Controller setup failed", message: error.message || "The controller setup did not complete.", kind: "error" });
    }
  }

  async function testSound(file) {
    if (!settings.soundsEnabled) { setPowerMessage("Enable console sounds first."); return; }
    try {
      const response = await fetch("/" + file, { method: "HEAD", cache: "no-store" });
      if (!response.ok) { setPowerMessage(file + " isn't in the public folder yet. No sound was played."); return; }
      const audio = new Audio("/" + file);
      audio.volume = Math.max(0, Math.min(1, Number(settings.soundVolume) / 100));
      await audio.play();
      setPowerMessage("Playing " + file + ".");
    } catch {
      setPowerMessage("Couldn't play " + file + ". Check the file and browser audio permissions.");
    }
  }

  async function powerAction(action) {
    if (!window.consoleBridge?.requestPowerAction) {
      setPowerMessage("Power controls are available when running the Electron desktop app.");
      return;
    }
    setPowerMessage("");
    try {
      const result = await window.consoleBridge.requestPowerAction(action);
      if (result?.cancelled) setPowerMessage("Power action cancelled.");
      else setPowerMessage(result?.message || "Power action requested.");
    } catch (error) {
      setPowerMessage(error.message || "The power action failed.");
    }
  }

  return (
    <main className="console-settings-page">
      <p className="console-settings-eyebrow">CONSOLE CONFIGURATION</p>
      <h1>Settings</h1>
      <p className="console-settings-subtitle">Tune the interface and manage desktop power actions.</p>

      <section className="console-settings-section">
        <div className="console-settings-section-heading"><Palette size={20} /><div><h2>Appearance</h2><p>Personalize the console look.</p></div></div>
        <div className="console-settings-row">
          <div><strong>Accent color</strong><p>Used for buttons and highlights.</p></div>
          <input aria-label="Accent color" type="color" value={settings.accent} onChange={(event) => update("accent", event.target.value)} />
        </div>
        <div className="console-settings-row">
          <div><strong>Interface font</strong><p>Choose the text style used by console screens.</p></div>
          <select value={settings.font} onChange={(event) => update("font", event.target.value)}><option>Inter</option><option>Arial</option><option>System</option><option>Oswald</option></select>
        </div>
        <div className="console-settings-row">
          <div><strong>Background style</strong><p>Choose the console's ambient backdrop.</p></div>
          <select value={settings.backdrop} onChange={(event) => update("backdrop", event.target.value)}><option value="blue">Deep blue</option><option value="black">Black</option><option value="red">Dark red</option></select>
        </div>
        <button className="console-settings-button secondary" onClick={() => setSettings(DEFAULTS)}><RotateCcw size={16} /> Reset appearance</button>
      </section>

      <section className="console-settings-section">
        <div className="console-settings-section-heading"><Volume2 size={20} /><div><h2>Audio & Navigation</h2><p>Optional Steam-style menu sounds. Missing audio files are silently skipped.</p></div></div>
        <div className="console-settings-row"><div><strong>Interface sounds</strong><p>Play a sound when hovering over controls and selecting buttons.</p></div><label className="console-settings-toggle"><input type="checkbox" checked={settings.soundsEnabled} onChange={(event) => update("soundsEnabled", event.target.checked)}/><span>{settings.soundsEnabled ? "On" : "Off"}</span></label></div>
        <div className="console-settings-row"><div><strong>Background music</strong><p>Play your selected music throughout the console while this window is focused.</p></div><label className="console-settings-toggle"><input type="checkbox" checked={settings.backgroundMusicEnabled !== false} onChange={(event) => update("backgroundMusicEnabled", event.target.checked)}/><span>{settings.backgroundMusicEnabled !== false ? "On" : "Off"}</span></label></div>
        <div className="console-settings-row"><div><strong>Sound volume</strong><p>Controls UI effects and background music.</p></div><label className="console-settings-volume"><input type="range" min="0" max="100" step="5" value={settings.soundVolume} onChange={(event) => update("soundVolume", Number(event.target.value))}/><span>{settings.soundVolume}%</span></label></div>
        <div className="console-settings-sound-tests">
          {[
            ["Hover_Steam.mp3", "Test Hover"], ["Select_Stream.mp3", "Test Select"], ["Steam_Background.mp3", "Test Background"],
            ["QuickMenu_Open.mp3", "Test Menu Open"], ["QuickMenu_Close.mp3", "Test Menu Close"], ["Navigation_Back.mp3", "Test Back"],
            ["Keyboard_Typing.mp3", "Test Typing"], ["Achievement_Unlock.mp3", "Test Achievement"],
            ["Party_Join.mp3", "Test Party Join"], ["Party_Leave.mp3", "Test Party Leave"],
            ["Call_Connected.mp3", "Test Call Connected"], ["Call_Disconnected.mp3", "Test Call Disconnected"],
            ["Console_Notification.mp3", "Test Notification"], ["Console_Error.mp3", "Test Error"], ["Game_Launch.mp3", "Test Game Launch"],
          ].map(([file, label]) => <button key={file} className="console-settings-button secondary" onClick={() => testSound(file)}>{label}</button>)}
        </div>
        <p className="console-settings-audio-note">Optional files go in the project's <code>public</code> folder: <code>Hover_Steam.mp3</code>, <code>Select_Stream.mp3</code>, <code>Steam_Background.mp3</code>, <code>QuickMenu_Open.mp3</code>, <code>QuickMenu_Close.mp3</code>, <code>Navigation_Back.mp3</code>, <code>Keyboard_Typing.mp3</code>, <code>Achievement_Unlock.mp3</code>, <code>Party_Join.mp3</code>, <code>Party_Leave.mp3</code>, <code>Call_Connected.mp3</code>, <code>Call_Disconnected.mp3</code>, <code>Console_Notification.mp3</code>, <code>Console_Error.mp3</code>, and <code>Game_Launch.mp3</code>. Missing files are skipped. UI sounds stop when the console loses focus; voice-call audio is independent.</p>
      </section>

      <section className="console-settings-section">
        <div className="console-settings-section-heading"><Gamepad2 size={20} /><div><h2>Controller Setup</h2><p>DualShock 4 support over USB and Bluetooth.</p></div></div>
        <div className="console-settings-row">
          <div><strong>Controller status</strong><p>{controllerInfo ? controllerInfo.id : "No controller detected yet. Connect it, then press a button and refresh."}</p></div>
          <span className={controllerInfo ? "console-controller-status connected" : "console-controller-status"}>{controllerInfo ? "Connected" : "Not detected"}</span>
        </div>
        {controllerInfo && <div className="console-settings-row"><div><strong>Input mapping</strong><p>{controllerInfo.mapping === "standard" ? "Standard gamepad mapping is available." : "Windows exposed a non-standard mapping; some button labels may differ."}</p></div><span>{controllerInfo.buttons} buttons · {controllerInfo.axes} axes</span></div>}
        <div className="console-settings-row">
          <div><strong>DS4Windows</strong><p>{controllerStack?.ds4WindowsInstalled ? (controllerStack.ds4WindowsRunning ? "DS4Windows is installed and running." : "DS4Windows is installed but not running.") : "DS4Windows classic setup was not detected as installed."}</p></div>
          <span className={controllerStack?.ds4WindowsInstalled ? "console-controller-status connected" : "console-controller-status"}>{controllerStack?.ds4WindowsInstalled ? (controllerStack.ds4WindowsRunning ? "Running" : "Installed") : "Not installed"}</span>
        </div>
        <div className="console-settings-row">
          <div><strong>ViGEmBus driver</strong><p>{controllerStack?.vigemBusInstalled ? "Driver service detected (" + (controllerStack.vigemBusState || "state unknown") + ")." : "ViGEmBus was not detected. This check does not install or repair drivers."}</p></div>
          <span className={controllerStack?.vigemBusInstalled ? "console-controller-status connected" : "console-controller-status"}>{controllerStack?.vigemBusInstalled ? "Detected" : "Not detected"}</span>
        </div>
        {(controllerStack?.supported && (!controllerStack.ds4WindowsInstalled || !controllerStack.vigemBusInstalled)) && (
          <div className="console-controller-install">
            <div className="console-controller-install-copy"><ShieldCheck size={20}/><div><strong>Automatic controller setup</strong><p>Downloads the pinned classic DS4Windows and ViGEmBus releases, verifies their SHA-256 hashes, then asks Windows for administrator approval before installing the driver.</p></div></div>
            <button className="console-settings-button" onClick={installControllerStack} disabled={installingController}><Download size={16}/>{installingController ? "Installing controller support…" : "Install missing components"}</button>
            <p className="console-settings-audio-note">ViGEmBus is archived/retired. This installer deliberately uses the classic DS4Windows 4.0.2.3 stack because it requires ViGEmBus. It does not silently install anything: the console confirmation and Windows UAC approval are both required.</p>
          </div>
        )}
        <div className="console-settings-row">
          <div><strong>Newer DS4Windows backend</strong><p>{controllerStack?.modernBackendInstalled ? "USB/IP driver detected (" + (controllerStack.modernBackendState || "state unknown") + ")." : "No USB/IP driver detected. Newer DS4Windows builds may use a different virtual-controller backend."}</p></div>
          <span className={controllerStack?.modernBackendInstalled ? "console-controller-status connected" : "console-controller-status"}>{controllerStack?.modernBackendInstalled ? "Detected" : "Not detected"}</span>
        </div>
        <div className="console-settings-sound-tests">
          <button className="console-settings-button secondary" onClick={() => window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack).catch(() => setControllerStack({ supported: false, error: "Could not check DS4Windows status." }))}><RefreshCw size={16}/> Check controller stack</button>
          <button className="console-settings-button secondary" onClick={() => window.consoleBridge?.openControllerGuide?.("ds4windows").catch((error) => setPowerMessage(error.message || "Could not open DS4Windows guide."))}>DS4Windows guide</button>
          <button className="console-settings-button secondary" onClick={() => window.consoleBridge?.openControllerGuide?.("vigembus").catch((error) => setPowerMessage(error.message || "Could not open ViGEmBus page."))}>ViGEmBus project</button>
        </div>
        <div className="console-settings-sound-tests">
          <button className="console-settings-button secondary" onClick={() => {
            const pads = Array.from(navigator.getGamepads?.() || []).filter((pad) => pad?.connected);
            const pad = pads.find((candidate) => /dualshock|wireless controller|sony/i.test(candidate.id)) || pads[0] || null;
            setControllerInfo(pad ? { id: pad.id || "Game controller", mapping: pad.mapping || "non-standard", buttons: pad.buttons?.length || 0, axes: pad.axes?.length || 0, index: pad.index } : null);
          }}><RefreshCw size={16}/> Refresh controller</button>
          <button className="console-settings-button secondary" onClick={() => window.consoleBridge?.openBluetoothSettings?.().catch((error) => setPowerMessage(error.message || "Could not open Bluetooth settings."))}><Bluetooth size={16}/> Windows Bluetooth settings</button>
        </div>
        <p className="console-settings-audio-note"><Cable size={14} style={{display:"inline",verticalAlign:"middle"}}/> USB: connect the controller with a data-capable USB cable. <Bluetooth size={14} style={{display:"inline",verticalAlign:"middle"}}/> Bluetooth: pair it in Windows, then press a controller button so the app can detect it. The console uses the gamepad input Windows exposes to Chromium. Classic DS4Windows can map a DualShock 4 to a virtual Xbox controller; per-game remapping and advanced haptics are not implemented here. ViGEmBus is archived, so review the driver notes before installing legacy components.</p>
      </section>

      <section className="console-settings-section">
        <div className="console-settings-section-heading"><Monitor size={20} /><div><h2>Display</h2><p>Desktop window and renderer settings.</p></div></div>
        <div className="console-settings-row"><div><strong>Desktop runtime</strong><p>Electron with context isolation, sandboxing, and Node.js disabled in the renderer.</p></div><span className="console-settings-status">{window.consoleBridge?.runtime === "electron" ? "Electron" : "Browser preview"}</span></div>
        <div className="console-settings-row"><div><strong>Color mode</strong><p>The interface uses a dark console palette.</p></div><span className="console-settings-status"><Moon size={15} /> Dark</span></div>
      </section>

      <section className="console-settings-section">
        <div className="console-settings-section-heading"><Power size={20} /><div><h2>Power</h2><p>These actions require confirmation before Windows is affected.</p></div></div>
        <div className="console-settings-power-grid">
          <button className="console-settings-button" onClick={() => powerAction("sleep")}><Moon size={17} /> Sleep</button>
          <button className="console-settings-button" onClick={() => powerAction("restart")}><RotateCcw size={17} /> Restart PC</button>
          <button className="console-settings-button danger" onClick={() => powerAction("shutdown")}><Power size={17} /> Shut down</button>
        </div>
        {powerMessage && <p className="console-settings-message"><AlertTriangle size={16} />{powerMessage}</p>}
      </section>
    </main>

      {controllerToast && (
        <aside className={`controller-setup-toast ${controllerToast.kind === "success" ? "success" : controllerToast.kind === "error" ? "error" : ""}`} role="status" aria-live="polite">
          <div className="controller-setup-toast-icon">{controllerToast.kind === "success" ? <CheckCircle2 size={21}/> : controllerToast.kind === "error" ? <AlertTriangle size={21}/> : <ShieldCheck size={21}/>}</div>
          <div className="controller-setup-toast-copy"><strong>{controllerToast.title}</strong><p>{controllerToast.message}</p></div>
          <button type="button" aria-label="Dismiss notification" onClick={() => setControllerToast(null)}><X size={16}/></button>
        </aside>
      )}
  );
}
