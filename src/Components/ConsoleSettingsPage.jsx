import React, { useEffect, useMemo, useState } from "react";
import {
  Accessibility, Bell, Bluetooth, Cable, Check, ChevronRight, CircleHelp, Download,
  Gamepad2, Gauge, LockKeyhole, Monitor, Music2, Palette, Power, RotateCcw,
  ShieldCheck, SlidersHorizontal, Volume2, Wifi, HardDrive, UserRound, Eye,
  Keyboard, RefreshCw, AlertTriangle, CheckCircle2, X, Moon, Sun, AudioLines
} from "lucide-react";
import "./ConsoleSettings.css";

const DEFAULTS = {
  accent: "#2877dc", font: "Inter", backdrop: "blue", soundsEnabled: true,
  soundVolume: 50, backgroundMusicEnabled: true, enforceMusicBackgroundPlayback: true,
  accountNickname: "Player", profileVisibility: "friends", showOnlineStatus: true,
  showGameActivity: true, personalizedRecommendations: false, analyticsSharing: false,
  twoFactorReminder: true, notificationsEnabled: true, friendNotifications: true,
  downloadNotifications: true, controllerDeadzoneLeft: 8, controllerDeadzoneRight: 8,
  controllerSensitivity: 100, controllerVibration: true, controllerProfiles: {},
  activeControllerProfile: "Default", buttonMap: {}, screenScale: 100, reducedMotion: false,
  screenReader: false, autoUpdates: true, confirmPowerActions: true, quickMenuMusic: true
};

const CATEGORIES = [
  { id: "system", label: "System", icon: SlidersHorizontal, description: "Console behavior and system preferences." },
  { id: "account", label: "Users and Accounts", icon: UserRound, description: "Local profile and account preferences." },
  { id: "privacy", label: "Privacy", icon: LockKeyhole, description: "Control what this console displays and stores." },
  { id: "accessories", label: "Accessories", icon: Gamepad2, description: "Connected devices and controller tools." },
  { id: "controller", label: "Controller Settings", icon: Gamepad2, description: "Inspect live input, adjust deadzones, and save app profiles." },
  { id: "sound", label: "Sound", icon: Volume2, description: "Audio, interface sounds, and background music." },
  { id: "screen", label: "Screen and Video", icon: Monitor, description: "Window presentation and accessibility options." },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Personalize the console interface." },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Choose which console notifications appear." },
  { id: "storage", label: "Storage", icon: HardDrive, description: "Local app storage information." },
  { id: "game", label: "Saved Data and Game/App Settings", icon: Download, description: "Local app preferences and update behavior." },
  { id: "power", label: "Power", icon: Power, description: "Sleep, restart, and shut down Windows." }
];

function Toggle({ value, onChange, label }) {
  return <button type="button" role="switch" aria-checked={!!value} aria-label={label}
    className={`ps-toggle ${value ? "is-on" : ""}`} onClick={() => onChange(!value)}>
    <span />
  </button>;
}
function SettingRow({ title, description, children }) {
  return <div className="ps-setting-row"><div className="ps-setting-copy"><strong>{title}</strong>{description && <p>{description}</p>}</div><div className="ps-setting-control">{children}</div></div>;
}
function Select({ value, onChange, children, label }) {
  return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}
function Range({ value, onChange, min=0, max=100, step=1, label, suffix="%" }) {
  return <div className="ps-range"><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/><span>{value}{suffix}</span></div>;
}

export default function ConsoleSettingsPage() {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("console-settings") || "{}") }; }
    catch { return DEFAULTS; }
  });
  const [active, setActive] = useState("system");
  const [controllerInfo, setControllerInfo] = useState(null);
  const [controllerStack, setControllerStack] = useState(null);
  const [controllerToast, setControllerToast] = useState(null);
  const [installingController, setInstallingController] = useState(false);
  const [livePad, setLivePad] = useState(null);
  const [nativeInput, setNativeInput] = useState(null);
  const [nativeInputMessage, setNativeInputMessage] = useState("");
  const [powerMessage, setPowerMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [profileName, setProfileName] = useState("");

  const currentCategory = CATEGORIES.find(item => item.id === active) || CATEGORIES[0];
  const update = (key, value) => setSettings(current => ({ ...current, [key]: value }));

  useEffect(() => {
    try { localStorage.setItem("console-settings", JSON.stringify(settings)); } catch {}
    document.documentElement.style.setProperty("--console-accent", settings.accent);
    document.documentElement.style.setProperty("--font-ui", settings.font === "System" ? "system-ui" : settings.font);
    document.body.dataset.consoleBackdrop = settings.backdrop;
    window.dispatchEvent(new Event("console-settings-changed"));
  }, [settings]);

  useEffect(() => {
    window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack)
      .catch(() => setControllerStack({ supported: false, error: "Could not check controller support." }));
    const unsubscribe = window.consoleBridge?.onControllerSetupProgress?.(progress => {
      setControllerToast({ title: progress.title || "Controller setup", message: progress.message || "", kind: progress.kind || "info" });
      if (progress.stage === "complete") {
        setInstallingController(false);
        window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack).catch(() => {});
      } else if (progress.stage === "failed" || progress.stage === "cancelled") setInstallingController(false);
    });
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, []);

  useEffect(() => {
    let raf;
    let last = 0;
    const poll = now => {
      if (now - last > 70) {
        last = now;
        const pads = Array.from(navigator.getGamepads?.() || []).filter(pad => pad?.connected);
        const pad = pads.find(item => /dualshock|wireless controller|sony|dualsense/i.test(item.id)) || pads[0] || null;
        if (pad) {
          const info = { id: pad.id || "Game controller", index: pad.index, mapping: pad.mapping || "non-standard",
            buttons: pad.buttons?.length || 0, axes: Array.from(pad.axes || []),
            pressed: Array.from(pad.buttons || []).map((button, index) => button.pressed ? index : -1).filter(index => index >= 0) };
          setLivePad(previous => JSON.stringify(previous) === JSON.stringify(info) ? previous : info);
          setControllerInfo(previous => previous?.id === info.id && previous?.index === info.index ? previous : info);
        } else {
          setLivePad(null); setControllerInfo(null);
        }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const unsubscribeInput = window.consoleBridge?.onGameInputEvent?.(event => {
      if (!event || event.source !== "gameinput") return;
      if (event.type === "device-status" && event.connected === false) {
        setNativeInput(null);
        setNativeInputMessage("Native controller disconnected; browser input remains available as a fallback.");
        return;
      }
      if (event.type !== "gamepad-state") return;
      setNativeInput(event);
      setNativeInputMessage("Receiving native GameInput readings.");
    });
    const unsubscribeStopped = window.consoleBridge?.onGameInputStopped?.(() => {
      setNativeInput(null);
      setNativeInputMessage("Native GameInput helper stopped.");
    });
    return () => {
      if (typeof unsubscribeInput === "function") unsubscribeInput();
      if (typeof unsubscribeStopped === "function") unsubscribeStopped();
    };
  }, []);

  async function startNativeGameInput() {
    if (!window.consoleBridge?.startGameInputBridge) {
      setNativeInputMessage("Native input requires the Electron desktop build on Windows.");
      return;
    }
    try {
      const result = await window.consoleBridge.startGameInputBridge();
      setNativeInputMessage(result?.message || (result?.started ? "Native GameInput helper started." : "Native GameInput helper is not available."));
    } catch (error) {
      setNativeInputMessage(error?.message || "Native GameInput helper could not start.");
    }
  }

  async function launchControllerEmulator() {
    if (!window.consoleBridge?.launchControllerEmulator) {
      setControllerToast({ title: "Desktop app required", message: "Launch the Electron desktop build on Windows to open the controller emulator.", kind: "error" });
      return;
    }
    try {
      const result = await window.consoleBridge.launchControllerEmulator();
      setControllerToast({ title: result?.launched ? "Controller emulator" : "Emulator not found", message: result?.message || "No launch status was returned.", kind: result?.launched ? "success" : "info" });
      if (result?.launched) window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack).catch(() => {});
    } catch (error) {
      setControllerToast({ title: "Could not launch controller emulator", message: error.message || "Windows could not launch DS4Windows.", kind: "error" });
    }
  }

  async function installControllerStack() {
    if (!window.consoleBridge?.installControllerStack) {
      setControllerToast({ title: "Desktop app required", message: "Run the Electron desktop build on Windows to install controller components.", kind: "error" });
      return;
    }
    setInstallingController(true);
    setControllerToast({ title: "Confirm controller setup", message: "The installer verifies downloaded files and requests Windows administrator approval before installing drivers.", kind: "info" });
    try {
      const result = await window.consoleBridge.installControllerStack();
      if (result?.cancelled) { setInstallingController(false); setControllerToast({ title: "Installation cancelled", message: "No changes were made.", kind: "info" }); }
    } catch (error) {
      setInstallingController(false);
      setControllerToast({ title: "Controller setup failed", message: error.message || "The setup did not complete.", kind: "error" });
    }
  }

  async function powerAction(action) {
    if (!window.consoleBridge?.requestPowerAction) { setPowerMessage("Power controls require the Electron desktop app."); return; }
    setPowerMessage("");
    try {
      const result = await window.consoleBridge.requestPowerAction(action);
      setPowerMessage(result?.cancelled ? "Power action cancelled." : result?.message || "Power action requested.");
    } catch (error) { setPowerMessage(error.message || "The power action failed."); }
  }

  function saveControllerProfile() {
    const name = profileName.trim() || "Custom profile";
    const profiles = { ...(settings.controllerProfiles || {}), [name]: {
      leftDeadzone: settings.controllerDeadzoneLeft, rightDeadzone: settings.controllerDeadzoneRight,
      sensitivity: settings.controllerSensitivity, vibration: settings.controllerVibration,
      buttonMap: settings.buttonMap || {}
    }};
    setSettings(current => ({ ...current, controllerProfiles: profiles, activeControllerProfile: name }));
    setProfileName("");
    setSaveMessage(`Saved “${name}” to this console.`);
  }
  function loadControllerProfile(name) {
    const profile = settings.controllerProfiles?.[name];
    if (!profile) { update("activeControllerProfile", name); return; }
    setSettings(current => ({ ...current, activeControllerProfile: name,
      controllerDeadzoneLeft: profile.leftDeadzone ?? 8, controllerDeadzoneRight: profile.rightDeadzone ?? 8,
      controllerSensitivity: profile.sensitivity ?? 100, controllerVibration: profile.vibration ?? true,
      buttonMap: profile.buttonMap || {} }));
    setSaveMessage(`Loaded “${name}”. These settings affect this console UI only unless a game/input backend applies them.`);
  }

  const profiles = useMemo(() => Object.keys(settings.controllerProfiles || {}), [settings.controllerProfiles]);
  const panel = (() => {
    switch (active) {
      case "system": return <>
        <SettingRow title="Console language" description="Language used by the console interface."><Select label="Console language" value={settings.language || "English"} onChange={v=>update("language",v)}><option>English</option><option>Spanish</option><option>French</option><option>German</option><option>Russian</option></Select></SettingRow>
        <SettingRow title="Reduce motion" description="Reduce animated transitions within supported console screens."><Toggle label="Reduce motion" value={settings.reducedMotion} onChange={v=>update("reducedMotion",v)}/></SettingRow>
        <SettingRow title="Confirm power actions" description="Ask for confirmation before Windows sleep, restart, or shutdown."><Toggle label="Confirm power actions" value={settings.confirmPowerActions} onChange={v=>update("confirmPowerActions",v)}/></SettingRow>
        <SettingRow title="Automatic updates" description="Check for console update manifests when the update feature is configured."><Toggle label="Automatic updates" value={settings.autoUpdates} onChange={v=>update("autoUpdates",v)}/></SettingRow>
        <SettingRow title="Runtime" description="This status reflects the current renderer environment."><span className="ps-status">{window.consoleBridge?.runtime === "electron" ? "Electron desktop" : "Browser preview"}</span></SettingRow>
        <div className="ps-note"><CircleHelp size={16}/> These preferences are stored locally in this app. They do not change Windows system settings unless a specific desktop action is provided.</div>
      </>;
      case "account": return <>
        <div className="ps-profile-card"><div className="ps-avatar"><UserRound size={28}/></div><div><strong>{settings.accountNickname || "Player"}</strong><p>Local console profile · no PlayStation Network account connected</p></div></div>
        <SettingRow title="Profile nickname" description="Name shown inside this console interface."><input aria-label="Profile nickname" maxLength={32} value={settings.accountNickname} onChange={e=>update("accountNickname",e.target.value)}/></SettingRow>
        <SettingRow title="Profile visibility" description="Local preference for future social features; it does not change Steam privacy."><Select label="Profile visibility" value={settings.profileVisibility} onChange={v=>update("profileVisibility",v)}><option value="public">Public</option><option value="friends">Friends only</option><option value="private">Private</option></Select></SettingRow>
        <SettingRow title="Show online status" description="Preference for the console's own profile display."><Toggle label="Show online status" value={settings.showOnlineStatus} onChange={v=>update("showOnlineStatus",v)}/></SettingRow>
        <SettingRow title="Show game activity" description="Preference only; Steam profile visibility remains controlled by Steam."><Toggle label="Show game activity" value={settings.showGameActivity} onChange={v=>update("showGameActivity",v)}/></SettingRow>
        <div className="ps-note"><ShieldCheck size={16}/> Account controls here manage this app's local profile. They do not change Steam credentials, purchases, subscriptions, or account security.</div>
      </>;
      case "privacy": return <>
        <SettingRow title="Profile visibility" description="Choose how this console should display your local profile."><Select label="Privacy profile visibility" value={settings.profileVisibility} onChange={v=>update("profileVisibility",v)}><option value="public">Public</option><option value="friends">Friends only</option><option value="private">Private</option></Select></SettingRow>
        <SettingRow title="Online status" description="Show the local profile as online in supported console areas."><Toggle label="Online status" value={settings.showOnlineStatus} onChange={v=>update("showOnlineStatus",v)}/></SettingRow>
        <SettingRow title="Game activity" description="Show recently played games in the console UI."><Toggle label="Game activity" value={settings.showGameActivity} onChange={v=>update("showGameActivity",v)}/></SettingRow>
        <SettingRow title="Personalized recommendations" description="Allow local UI preferences to be used for on-device recommendations."><Toggle label="Personalized recommendations" value={settings.personalizedRecommendations} onChange={v=>update("personalizedRecommendations",v)}/></SettingRow>
        <SettingRow title="Share anonymous diagnostics" description="Preference flag only; no diagnostic upload is enabled by this toggle alone."><Toggle label="Share anonymous diagnostics" value={settings.analyticsSharing} onChange={v=>update("analyticsSharing",v)}/></SettingRow>
        <div className="ps-note"><LockKeyhole size={16}/> These are local UI preferences, not a replacement for Steam's account privacy controls.</div>
      </>;
      case "accessories": return <>
        <SettingRow title="Connected controller" description={controllerInfo?.id || "Connect a controller and press a button to detect it."}><span className={controllerInfo ? "ps-status connected" : "ps-status"}>{controllerInfo ? "Connected" : "Not detected"}</span></SettingRow>
        <SettingRow title="Controller setup components" description={controllerStack?.ds4WindowsInstalled ? (controllerStack.ds4WindowsRunning ? "DS4Windows is installed and running." : "DS4Windows is installed but not running.") : "DS4Windows classic setup not detected."}><span className="ps-status">{controllerStack?.ds4WindowsInstalled ? (controllerStack.ds4WindowsRunning ? "Running" : "Installed") : "Not installed"}</span></SettingRow>
        <SettingRow title="ViGEmBus driver" description={controllerStack?.vigemBusInstalled ? "Driver service detected." : "Not detected; this status check does not install drivers."}><span className="ps-status">{controllerStack?.vigemBusInstalled ? "Detected" : "Not detected"}</span></SettingRow>
        {controllerStack?.supported && (!controllerStack.ds4WindowsInstalled || !controllerStack.vigemBusInstalled) && <div className="ps-action-block"><strong>Controller compatibility setup</strong><p>Downloads pinned releases, verifies their hashes, then requires confirmation and Windows administrator approval.</p><button className="ps-primary-button" disabled={installingController} onClick={installControllerStack}><Download size={16}/>{installingController ? "Installing…" : "Install missing components"}</button><small>ViGEmBus is archived/retired. Review the driver notes before installing legacy components.</small></div>}
        <button className="ps-primary-button" onClick={launchControllerEmulator}><Gamepad2 size={16}/> Launch DS4Windows</button>
        <button className="ps-secondary-button" onClick={()=>window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack).catch(()=>{})}><RefreshCw size={16}/> Refresh device status</button>
        <button className="ps-secondary-button" onClick={()=>window.consoleBridge?.openBluetoothSettings?.().catch(()=>{})}><Bluetooth size={16}/> Open Windows Bluetooth settings</button>
        <div className="ps-note"><AlertTriangle size={16}/> The console currently reads live input through Chromium's Gamepad API. Microsoft GameInput is the intended native input layer, but it still needs a compiled native bridge before this app can claim to use it. The emulator handles virtual-controller compatibility; it does not guarantee a perfect PS4/PS5 experience in every game.</div>
      </>;
      case "controller": return <>
        <div className="ps-controller-top"><div><span className="ps-eyebrow">INPUT MONITOR</span><h3>{nativeInput ? "Native GameInput" : livePad?.id || "No controller detected"}</h3><p>{nativeInput ? `Native reading · buttons bitmask ${nativeInput.buttons} · ${Math.round((nativeInput.receivedAt || 0) ? Date.now() - nativeInput.receivedAt : 0)} ms since sample` : livePad ? `${livePad.buttons} buttons · ${livePad.axes.length} axes · ${livePad.mapping === "standard" ? "standard mapping" : "device-specific mapping"}` : "Connect a controller, then move a stick or press a button."}</p>{nativeInputMessage && <p className="ps-note">{nativeInputMessage}</p>}</div><span className={nativeInput || livePad ? "ps-status connected" : "ps-status"}>{nativeInput ? "Native" : livePad ? "Browser" : "Waiting"}</span></div>
        <div className="ps-controller-actions"><button className="ps-primary-button" onClick={startNativeGameInput}><Gamepad2 size={16}/> Start native GameInput</button><button className="ps-secondary-button" onClick={launchControllerEmulator}><Gamepad2 size={16}/> Launch DS4Windows</button><button className="ps-secondary-button" onClick={()=>window.consoleBridge?.openBluetoothSettings?.().catch(()=>{})}><Bluetooth size={16}/> Pair / reconnect controller</button><button className="ps-secondary-button" onClick={()=>window.consoleBridge?.getControllerStackStatus?.().then(setControllerStack).catch(()=>{})}><RefreshCw size={16}/> Refresh connection status</button></div>
        <div className="ps-stick-grid">
          {[{name:"Left stick",x:nativeInput?.leftX ?? livePad?.axes?.[0] ?? 0,y:nativeInput?.leftY ?? livePad?.axes?.[1] ?? 0},{name:"Right stick",x:nativeInput?.rightX ?? livePad?.axes?.[2] ?? 0,y:nativeInput?.rightY ?? livePad?.axes?.[3] ?? 0}].map(stick=><div className="ps-stick-card" key={stick.name}><div className="ps-stick-visual"><div className="ps-stick-ring"><span style={{left:`${50+stick.x*42}%`,top:`${50+stick.y*42}%`}}/></div></div><div className="ps-stick-meta"><strong>{stick.name}</strong><span>X {stick.x.toFixed(2)} · Y {stick.y.toFixed(2)}</span></div></div>)}
        </div>
        <SettingRow title="Left stick deadzone" description="Ignore small input around the center. This value is saved to this app's profile."><Range label="Left stick deadzone" value={settings.controllerDeadzoneLeft} max={35} step={1} onChange={v=>update("controllerDeadzoneLeft",v)}/></SettingRow>
        <SettingRow title="Right stick deadzone" description="Adjust the center deadzone independently."><Range label="Right stick deadzone" value={settings.controllerDeadzoneRight} max={35} step={1} onChange={v=>update("controllerDeadzoneRight",v)}/></SettingRow>
        <SettingRow title="Stick sensitivity" description="Sensitivity preference for integrations that consume this profile."><Range label="Stick sensitivity" value={settings.controllerSensitivity} min={25} max={200} step={5} onChange={v=>update("controllerSensitivity",v)}/></SettingRow>
        <SettingRow title="Controller vibration" description="Stored preference; browser Gamepad API does not expose vibration support uniformly."><Toggle label="Controller vibration" value={settings.controllerVibration} onChange={v=>update("controllerVibration",v)}/></SettingRow>
        <div className="ps-button-map">
          <div className="ps-button-map-heading"><strong>Console button mapping profile</strong><p>Choose the logical action saved for each detected physical button. This profile is stored locally; applying it to global Steam/game input requires a separate input backend.</p></div>
          {Array.from({length:Math.min(Math.max(livePad?.buttons||0,4),16)},(_,index)=>index).map(index=><div className="ps-button-map-row" key={index}><span>Physical button {index+1}</span><Select label={`Mapping for physical button ${index+1}`} value={(settings.buttonMap||{})[index]||"default"} onChange={value=>update("buttonMap",{...(settings.buttonMap||{}),[index]:value})}><option value="default">Default / unchanged</option><option value="confirm">Confirm / Select</option><option value="back">Back / Cancel</option><option value="menu">Open Quick Menu</option><option value="music-play-pause">Music: Play / Pause</option><option value="music-next">Music: Next track</option><option value="music-previous">Music: Previous track</option><option value="disabled">Disable in console UI profile</option></Select></div>)}
        </div>
        <SettingRow title="Controller profile" description="Choose a saved local profile."><Select label="Controller profile" value={settings.activeControllerProfile} onChange={loadControllerProfile}><option value="Default">Default</option>{profiles.map(name=><option key={name} value={name}>{name}</option>)}</Select></SettingRow>
        <div className="ps-profile-save"><input aria-label="New controller profile name" placeholder="New profile name" value={profileName} onChange={e=>setProfileName(e.target.value)} maxLength={40}/><button className="ps-primary-button" onClick={saveControllerProfile}><Check size={16}/> Save profile</button><button className="ps-secondary-button" onClick={()=>{update("controllerDeadzoneLeft",8);update("controllerDeadzoneRight",8);update("controllerSensitivity",100);update("buttonMap",{});setSaveMessage("Controller values reset to defaults.");}}><RotateCcw size={16}/> Reset</button></div>
        <div className="ps-button-monitor"><strong>Pressed buttons</strong><div>{livePad?.pressed?.length ? livePad.pressed.map(n=><span key={n}>Button {n+1}</span>) : <small>No buttons currently pressed</small>}</div></div>
        <div className="ps-note"><AlertTriangle size={16}/> Important: this screen can read live Gamepad API input and save calibration preferences. Chromium does not let this page change physical controller firmware or globally remap input for every Steam game. Applying deadzones to games requires a supported input backend or per-game integration.</div>
      </>;
      case "sound": return <>
        <SettingRow title="Interface sounds" description="Enable UI sound effects where supported."><Toggle label="Interface sounds" value={settings.soundsEnabled} onChange={v=>update("soundsEnabled",v)}/></SettingRow>
        <SettingRow title="Sound volume" description="Master volume preference for console UI sounds and the console music player."><Range label="Sound volume" value={settings.soundVolume} step={5} onChange={v=>update("soundVolume",v)}/></SettingRow>
        <SettingRow title="Background music" description="Allow the console music player to play while navigating the console."><Toggle label="Background music" value={settings.backgroundMusicEnabled} onChange={v=>update("backgroundMusicEnabled",v)}/></SettingRow>
        <SettingRow title="Enforce music background playback" description="Keep console music playing when a Steam game or another app takes focus."><Toggle label="Enforce music background playback" value={settings.enforceMusicBackgroundPlayback} onChange={v=>update("enforceMusicBackgroundPlayback",v)}/></SettingRow>
        <SettingRow title="Show music controls in Quick Menu" description="Keep compact player controls available in the Quick Menu."><Toggle label="Quick Menu music controls" value={settings.quickMenuMusic} onChange={v=>update("quickMenuMusic",v)}/></SettingRow>
        <div className="ps-note"><AudioLines size={16}/> The background playback setting is saved. The music player must also subscribe to the console-settings-changed event and pause/resume its audio element on window focus changes for enforcement to take effect.</div>
      </>;
      case "screen": return <>
        <SettingRow title="Screen scale" description="Scale supported console content for your display."><Range label="Screen scale" value={settings.screenScale} min={80} max={120} step={5} onChange={v=>{update("screenScale",v);document.documentElement.style.setProperty("--console-ui-scale",String(v/100));}}/></SettingRow>
        <SettingRow title="Screen reader" description="Preference flag; full narration requires a screen-reader implementation."><Toggle label="Screen reader" value={settings.screenReader} onChange={v=>update("screenReader",v)}/></SettingRow>
        <SettingRow title="Reduce motion" description="Reduce supported transitions."><Toggle label="Reduce motion" value={settings.reducedMotion} onChange={v=>update("reducedMotion",v)}/></SettingRow>
        <SettingRow title="Window runtime" description="The app does not control the monitor's physical resolution from the renderer."><span className="ps-status">{window.consoleBridge?.runtime === "electron" ? "Electron" : "Browser preview"}</span></SettingRow>
      </>;
      case "appearance": return <>
        <SettingRow title="Accent color" description="Used for focus rings, selection, and primary actions."><input aria-label="Accent color" type="color" value={settings.accent} onChange={e=>update("accent",e.target.value)}/></SettingRow>
        <SettingRow title="Interface font" description="Choose the typeface used by supported console screens."><Select label="Interface font" value={settings.font} onChange={v=>update("font",v)}><option>Inter</option><option>Arial</option><option>System</option><option>Oswald</option></Select></SettingRow>
        <SettingRow title="Background style" description="Change the console's ambient backdrop."><Select label="Background style" value={settings.backdrop} onChange={v=>update("backdrop",v)}><option value="blue">Deep blue</option><option value="black">Black</option><option value="red">Dark red</option><option value="slate">Slate</option><option value="midnight">Midnight</option><option value="emerald">Emerald</option><option value="violet">Violet</option><option value="crimson">Crimson</option><option value="amber">Amber</option><option value="arctic">Arctic</option><option value="rose">Rose</option><option value="teal">Teal</option><option value="graphite">Graphite</option><option value="sunset">Sunset</option></Select></SettingRow>
        <button className="ps-secondary-button" onClick={()=>setSettings(current=>({...current,accent:DEFAULTS.accent,font:DEFAULTS.font,backdrop:DEFAULTS.backdrop}))}><RotateCcw size={16}/> Reset appearance</button>
      </>;
      case "notifications": return <>
        <SettingRow title="Notifications" description="Enable console notification surfaces where implemented."><Toggle label="Notifications" value={settings.notificationsEnabled} onChange={v=>update("notificationsEnabled",v)}/></SettingRow>
        <SettingRow title="Friend notifications" description="Preference for supported friend activity notices."><Toggle label="Friend notifications" value={settings.friendNotifications} onChange={v=>update("friendNotifications",v)}/></SettingRow>
        <SettingRow title="Download notifications" description="Preference for supported download status notices."><Toggle label="Download notifications" value={settings.downloadNotifications} onChange={v=>update("downloadNotifications",v)}/></SettingRow>
      </>;
      case "storage": return <>
        <div className="ps-storage-card"><HardDrive size={26}/><div><strong>Console settings storage</strong><p>Small preferences are saved in this browser profile using localStorage.</p><span>Used by this settings page: approximately {Math.max(1,Math.round(new Blob([JSON.stringify(settings)]).size/1024))} KB</span></div></div>
        <SettingRow title="Clear local console preferences" description="Reset saved settings and local UI profile preferences to defaults."><button className="ps-secondary-button" onClick={()=>{setSettings(DEFAULTS);setSaveMessage("Local settings reset to defaults.");}}><RotateCcw size={16}/> Reset local settings</button></SettingRow>
        <div className="ps-note"><AlertTriangle size={16}/> This does not delete Steam data, installed games, or files outside this app's local settings.</div>
      </>;
      case "game": return <>
        <SettingRow title="Automatic updates" description="Check configured update manifests when the update workflow runs."><Toggle label="Automatic updates" value={settings.autoUpdates} onChange={v=>update("autoUpdates",v)}/></SettingRow>
        <SettingRow title="Game activity display" description="Local preference only; Steam manages its own game overlay and profile settings."><Toggle label="Game activity display" value={settings.showGameActivity} onChange={v=>update("showGameActivity",v)}/></SettingRow>
        <SettingRow title="Background music while gaming" description="Allow the music player to continue when another application is focused."><Toggle label="Background music while gaming" value={settings.enforceMusicBackgroundPlayback} onChange={v=>update("enforceMusicBackgroundPlayback",v)}/></SettingRow>
        <div className="ps-note"><Download size={16}/> Update checks and installation require the desktop updater to be configured. This toggle stores the preference; it does not download updates by itself.</div>
      </>;
      case "power": return <>
        <SettingRow title="Confirm power actions" description="Ask before sending a request to Windows."><Toggle label="Confirm power actions" value={settings.confirmPowerActions} onChange={v=>update("confirmPowerActions",v)}/></SettingRow>
        <div className="ps-power-actions"><button className="ps-secondary-button" onClick={()=>powerAction("sleep")}><Moon size={17}/> Sleep</button><button className="ps-secondary-button" onClick={()=>powerAction("restart")}><RotateCcw size={17}/> Restart PC</button><button className="ps-danger-button" onClick={()=>powerAction("shutdown")}><Power size={17}/> Shut down</button></div>
        {powerMessage && <div className="ps-note"><AlertTriangle size={16}/>{powerMessage}</div>}
      </>;
      default: return null;
    }
  })();

  return <main className="ps-settings-shell">
    <header className="ps-settings-header"><div><span className="ps-eyebrow">CONSOLE CONFIGURATION</span><h1>Settings</h1></div><div className="ps-header-right"><span className="ps-system-dot"/><span>Console settings</span></div></header>
    <div className="ps-settings-layout">
      <nav className="ps-settings-nav" aria-label="Settings categories">
        {CATEGORIES.map(item=>{const Icon=item.icon;return <button key={item.id} className={`ps-nav-item ${active===item.id?"selected":""}`} onClick={()=>{setActive(item.id);setSaveMessage("");}}><Icon size={19}/><span>{item.label}</span><ChevronRight className="ps-nav-chevron" size={16}/></button>;})}
      </nav>
      <section className="ps-settings-detail" aria-live="polite">
        <div className="ps-detail-heading"><div><span className="ps-eyebrow">SETTINGS</span><h2>{currentCategory.label}</h2><p>{currentCategory.description}</p></div><currentCategory.icon size={27} strokeWidth={1.6}/></div>
        <div className="ps-settings-options">{panel}</div>
        {saveMessage && <div className="ps-save-message" role="status"><CheckCircle2 size={16}/>{saveMessage}<button onClick={()=>setSaveMessage("")} aria-label="Dismiss message"><X size={14}/></button></div>}
      </section>
    </div>
    {controllerToast && <aside className={`ps-toast ${controllerToast.kind==="error"?"error":controllerToast.kind==="success"?"success":""}`} role="status" aria-live="polite"><div><strong>{controllerToast.title}</strong><p>{controllerToast.message}</p></div><button aria-label="Dismiss notification" onClick={()=>setControllerToast(null)}><X size={16}/></button></aside>}
    <footer className="ps-settings-footer"><span><Keyboard size={14}/> Navigate with mouse, keyboard, or supported controller</span><span>Changes save automatically on this device</span></footer>
  </main>;
}
