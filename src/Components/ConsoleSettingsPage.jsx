import React, { useEffect, useState } from "react";
import { Monitor, Palette, Power, RotateCcw, Moon, AlertTriangle, Volume2, MousePointer2, Music2 } from "lucide-react";
import "./ConsoleSettings.css";

const DEFAULTS = { accent: "#2877dc", font: "Inter", backdrop: "blue", soundsEnabled: true, soundVolume: 50 };

export default function ConsoleSettingsPage() {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("console-settings") || "{}") }; }
    catch { return DEFAULTS; }
  });
  const [powerMessage, setPowerMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("console-settings", JSON.stringify(settings));
    document.documentElement.style.setProperty("--console-accent", settings.accent);
    document.documentElement.style.setProperty("--font-ui", settings.font === "System" ? "system-ui" : settings.font);
    document.body.dataset.consoleBackdrop = settings.backdrop;
    window.dispatchEvent(new Event("console-settings-changed"));
  }, [settings]);

  function update(key, value) { setSettings((current) => ({ ...current, [key]: value })); }

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
        <div className="console-settings-row"><div><strong>Sound volume</strong><p>Controls hover, select, and background audio.</p></div><label className="console-settings-volume"><input type="range" min="0" max="100" step="5" value={settings.soundVolume} onChange={(event) => update("soundVolume", Number(event.target.value))}/><span>{settings.soundVolume}%</span></label></div>
        <div className="console-settings-sound-tests">
          <button className="console-settings-button secondary" onClick={() => testSound("Hover_Steam.mp3")}><MousePointer2 size={16}/> Test Hover</button>
          <button className="console-settings-button secondary" onClick={() => testSound("Select_Stream.mp3")}><Volume2 size={16}/> Test Select</button>
          <button className="console-settings-button secondary" onClick={() => testSound("Steam_Background.mp3")}><Music2 size={16}/> Test Background</button>
        </div>
        <p className="console-settings-audio-note">Place these exact files in the project's <code>public</code> folder: <code>Hover_Steam.mp3</code>, <code>Select_Stream.mp3</code>, and <code>Steam_Background.mp3</code>. The background track loops only on the Games home screen.</p>
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
  );
}
