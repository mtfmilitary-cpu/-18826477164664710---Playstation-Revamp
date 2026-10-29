import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, Gamepad2, Headphones, Moon, Music2, Power, Settings2, Trophy, Users, X, RefreshCw, Volume2, Mic, Plus, LogOut } from "lucide-react";
import PeerCallPanel from "./PeerCallPanel";
import "./QuickMenu.css";

const items = [
  { id: "sound", label: "Sound and Devices", icon: AudioLines, detail: "Connected audio inputs and outputs" },
  { id: "friends", label: "Friends", icon: Users, detail: "Your synced Steam friends" },
  { id: "party", label: "Party Chat", icon: Headphones, detail: "Start or join a party, voice chat, and message" },
  { id: "music", label: "Music", icon: Music2, detail: "Music controls" },
  { id: "achievements", label: "Achievements", icon: Trophy, detail: "Recent games and achievement access" },
  { id: "customize", label: "Customize Console", icon: Settings2, detail: "Change console appearance" },
  { id: "power", label: "Sleep Mode and Power", icon: Power, detail: "Sleep, restart, or shut down this PC" },
];

export default function QuickMenu() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("sound");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState(null);
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInput, setSelectedInput] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState(null);
  const [partyName, setPartyName] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [username, setUsername] = useState(() => localStorage.getItem("console-username") || "GamerPro");
  const [busy, setBusy] = useState(false);
  const [achievementGame, setAchievementGame] = useState(null);
  const [achievementData, setAchievementData] = useState(null);
  const [achievementBusy, setAchievementBusy] = useState(false);
  const [achievementError, setAchievementError] = useState("");
  const [allAchievements, setAllAchievements] = useState(null);
  const [allAchievementsBusy, setAllAchievementsBusy] = useState(false);
  const [consoleSettings, setConsoleSettings] = useState(() => {
    try { return { accent: "#2877dc", font: "Inter", backdrop: "blue", ...JSON.parse(localStorage.getItem("console-settings") || "{}") }; }
    catch { return { accent: "#2877dc", font: "Inter", backdrop: "blue" }; }
  });
  const navigate = useNavigate();
  const active = items.find((item) => item.id === selected) || items[0];

  const closeMenu = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(new Event("console:sound-quick-close"));
    if (window.location.pathname === "/overlay") window.consoleBridge?.hideQuickMenu?.().catch(() => {});
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/profile/me", { cache: "no-store" });
      const data = await response.json();
      setProfile(data);
      if (data?.personaName) {
        setUsername(data.personaName);
        localStorage.setItem("console-username", data.personaName);
      }
    } catch { setProfile(null); }
  }, []);

  const loadParties = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/party");
      const data = await response.json();
      setParties(data.parties || []);
    } catch {}
  }, []);

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices({ inputs: [], outputs: [] });
      return;
    }
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((device) => device.kind === "audioinput");
      const outputs = all.filter((device) => device.kind === "audiooutput");
      setDevices({ inputs, outputs });
      setSelectedInput((current) => current || inputs[0]?.deviceId || "");
      setSelectedOutput((current) => current || outputs[0]?.deviceId || "");
    } catch { setNotice("Windows did not allow audio-device enumeration."); }
  }, []);

  useEffect(() => {
    const toggle = () => {
      setOpen((value) => {
        window.dispatchEvent(new Event(value ? "console:sound-quick-close" : "console:sound-quick-open"));
        if (value && window.location.pathname === "/overlay") window.consoleBridge?.hideQuickMenu?.().catch(() => {});
        return !value;
      });
      setNotice("");
    };
    window.addEventListener("console:quick-menu-toggle", toggle);
    const unsubscribe = window.consoleBridge?.onQuickMenuToggle?.(() => window.dispatchEvent(new Event("console:quick-menu-toggle")));
    const keydown = (event) => {
      if (event.code === "ScrollLock" && !window.consoleBridge?.runtime) {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("console:quick-menu-toggle", toggle);
      unsubscribe?.();
      window.removeEventListener("keydown", keydown);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let frameId;
    let lastMoveAt = 0;
    const previousButtons = new Map();
    const loop = (timestamp) => {
      const pads = navigator.getGamepads?.() || [];
      const pad = Array.from(pads).find((candidate) => candidate?.connected);
      if (pad) {
        const pressed = (index) => Boolean(pad.buttons[index]?.pressed);
        const rising = (index) => {
          const key = String(pad.index) + ":" + String(index);
          const current = pressed(index);
          const previous = previousButtons.get(key) || false;
          previousButtons.set(key, current);
          return current && !previous;
        };
        let direction = null;
        if (rising(12) || (pad.axes[1] < -0.65 && timestamp - lastMoveAt > 180)) direction = "up";
        else if (rising(13) || (pad.axes[1] > 0.65 && timestamp - lastMoveAt > 180)) direction = "down";
        else if (rising(14) || (pad.axes[0] < -0.65 && timestamp - lastMoveAt > 180)) direction = "left";
        else if (rising(15) || (pad.axes[0] > 0.65 && timestamp - lastMoveAt > 180)) direction = "right";
        if (direction && timestamp - lastMoveAt > 120) {
          lastMoveAt = timestamp;
          const currentIndex = Math.max(0, items.findIndex((item) => item.id === selectedRef.current));
          const delta = direction === "up" || direction === "left" ? -1 : 1;
          const nextIndex = (currentIndex + delta + items.length) % items.length;
          setSelected(items[nextIndex].id);
          document.querySelectorAll(".quick-menu-item")[nextIndex]?.focus({ preventScroll: true });
        }
        if (rising(0)) {
          const currentIndex = items.findIndex((item) => item.id === selectedRef.current);
          document.querySelectorAll(".quick-menu-item")[Math.max(0, currentIndex)]?.click();
        }
        if (rising(1) || rising(8)) closeMenu();
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [open, closeMenu]);
  useEffect(() => {
    if (!open) return;
    const firstItem = document.querySelector(".quick-menu-item");
    firstItem?.focus({ preventScroll: true });
    loadProfile();
    loadDevices();
    loadParties();
    const timer = window.setInterval(loadParties, 4000);
    return () => window.clearInterval(timer);
  }, [open, loadProfile, loadDevices, loadParties]);

  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function createParty() {
    setBusy(true); setNotice("");
    try {
      const data = await request("/api/v1/party", { method: "POST", body: JSON.stringify({ username, name: partyName.trim() || username + "'s Party" }) });
      setParty(data.party); setPartyName(""); await loadParties();
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function joinParty(id) {
    setBusy(true); setNotice("");
    try {
      const data = await request("/api/v1/party/" + encodeURIComponent(id) + "/join", { method: "POST", body: JSON.stringify({ username }) });
      setParty(data.party); await loadParties();
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function sendPartyInvite(event) {
    event.preventDefault();
    if (!party || !inviteName.trim()) return;
    setNotice("");
    try {
      const data = await request("/api/v1/party/" + encodeURIComponent(party.id) + "/invite", {
        method: "POST",
        body: JSON.stringify({ username, friend: inviteName.trim() }),
      });
      setParty(data.party);
      setNotice("Invite added for " + inviteName.trim() + ".");
      setInviteName("");
    } catch (error) { setNotice(error.message); }
  }

  async function leaveParty() {
    if (!party) return;
    try { await request("/api/v1/party/" + encodeURIComponent(party.id) + "/leave", { method: "POST", body: JSON.stringify({ username }) }); }
    catch (error) { setNotice(error.message); }
    setParty(null); await loadParties();
  }

  async function activate(item) {
    setSelected(item.id); setNotice("");
    if (item.path) {
      closeMenu();
      if (window.location.pathname === "/overlay" && window.consoleBridge?.openMainRoute) window.consoleBridge.openMainRoute(item.path).catch(() => {});
      else navigate(item.path);
    }
    else if (item.id === "friends") loadProfile();
    else if (item.id === "sound") loadDevices();
    else if (item.id === "party") loadParties();
  }

  async function power(action) {
    if (!window.consoleBridge?.requestPowerAction) {
      setNotice("Power controls are available in the Windows desktop app.");
      return;
    }
    try {
      const result = await window.consoleBridge.requestPowerAction(action);
      setNotice(result?.cancelled ? action + " cancelled." : result?.message || action + " requested.");
    } catch (error) { setNotice(error.message || "Power action failed."); }
  }

  const friends = profile?.steamFriends;
  const onlineCount = Array.isArray(friends) ? friends.filter((friend) => friend.personaState > 0).length : null;

  if (!open) return null;
  return <div className="quick-menu-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
    <section className="quick-menu-panel" role="dialog" aria-modal="true" aria-label="Quick Menu">
      <header className="quick-menu-header"><span>QUICK MENU</span><button aria-label="Close Quick Menu" onClick={closeMenu}><X size={18}/></button></header>
      <div className="quick-menu-content">
        <nav className="quick-menu-list" aria-label="Quick Menu options">
          {items.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={selected === item.id ? "quick-menu-item selected" : "quick-menu-item"} onMouseEnter={() => setSelected(item.id)} onFocus={() => setSelected(item.id)} onClick={() => activate(item)}>
              <Icon size={19} strokeWidth={1.7}/><span>{item.label}</span>
              {item.id === "friends" && profile?.friends != null && <small>{profile.friends}</small>}
            </button>;
          })}
        </nav>
        <div className="quick-menu-detail">
          <div className="quick-menu-detail-icon">{React.createElement(active.icon, { size: 28, strokeWidth: 1.5 })}</div>
          <p className="quick-menu-eyebrow">CONSOLE</p><h2>{active.label}</h2><p>{active.detail}</p>

          {active.id === "sound" && <div className="quick-menu-section">
            <h3><Mic size={15}/> Microphone input</h3>
            {devices.inputs.length ? <label className="quick-menu-field">Use for party voice<select value={selectedInput} onChange={(event) => { setSelectedInput(event.target.value); window.dispatchEvent(new CustomEvent("console:audio-input-selected", { detail: { deviceId: event.target.value } })); }}>
              {devices.inputs.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || "Audio input " + (index + 1)}</option>)}
            </select></label> : <p className="quick-menu-muted">No input devices reported. Device names may appear after microphone permission is granted.</p>}
            <h3><Volume2 size={15}/> Party voice output</h3>
            {devices.outputs.length ? <label className="quick-menu-field">Play party audio through<select value={selectedOutput} onChange={(event) => { setSelectedOutput(event.target.value); window.dispatchEvent(new CustomEvent("console:audio-output-selected", { detail: { deviceId: event.target.value } })); }}>
              {devices.outputs.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || "Audio output " + (index + 1)}</option>)}
            </select></label> : <p className="quick-menu-muted">No output devices reported by the browser.</p>}
            <button className="quick-menu-action" onClick={loadDevices}><RefreshCw size={14}/> Refresh devices</button>
            <p className="quick-menu-muted">These selections apply to party voice audio. Windows system-wide default output and master volume still need native Windows audio integration.</p>
          </div>}

          {active.id === "friends" && <div className="quick-menu-section">
            <div className="quick-menu-inline-stats"><strong>{profile?.friends ?? "—"} friends</strong><span>{onlineCount == null ? "Presence unavailable" : onlineCount + " online"}</span></div>
            {!profile?.connected ? <p className="quick-menu-muted">Sign in to Steam on this PC and configure the Web API key to sync your friends.</p> :
              !Array.isArray(friends) ? <p className="quick-menu-muted">Steam did not return your friends list. Check your profile privacy settings and API key.</p> :
              friends.length === 0 ? <p className="quick-menu-muted">No friends were returned by Steam.</p> :
              <div className="quick-menu-friend-list">{friends.map((friend) => <div className="quick-menu-friend" key={friend.steamId}>
                {friend.avatar ? <img src={friend.avatar} alt=""/> : <span className="quick-menu-friend-avatar">{friend.personaName.slice(0,1)}</span>}
                <span><strong>{friend.personaName}</strong><small>{friend.gameName || (friend.personaState > 0 ? "Online" : "Offline")}</small></span>
                <i className={friend.personaState > 0 ? "online" : ""}/>
              </div>)}</div>}
            <button className="quick-menu-action" onClick={loadProfile}><RefreshCw size={14}/> Sync Steam friends</button>
          </div>}

          {active.id === "party" && <div className="quick-menu-section">
            <div className="quick-menu-steam-identity">{profile?.avatar ? <img src={profile.avatar} alt="" /> : <span className="quick-menu-friend-avatar">{(profile?.personaName || username).slice(0, 1)}</span>}<span><strong>{profile?.personaName || username}</strong><small>{profile?.connected ? "Steam account" : "Steam account not connected"}</small></span></div>
            {!party ? <>
              <label className="quick-menu-field">New party name<input value={partyName} maxLength={60} onChange={(event) => setPartyName(event.target.value)} placeholder="Optional"/></label>
              <button className="quick-menu-action" disabled={busy} onClick={createParty}><Plus size={14}/> Create party</button>
              <h3><Users size={15}/> Active parties</h3>
              {parties.length ? parties.map((item) => <div className="quick-menu-party" key={item.id}><span><strong>{item.name}</strong><small>{item.members.length} member(s) · Host {item.host}</small></span><button disabled={busy} onClick={() => joinParty(item.id)}>Join</button></div>) : <p className="quick-menu-muted">No active parties. Create one to begin.</p>}
            </> : <>
              <div className="quick-menu-party-active"><strong>{party.name}</strong><span>{party.members.length} member(s): {party.members.join(", ")}</span><form className="quick-menu-invite-form" onSubmit={sendPartyInvite}><input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Steam friend display name" maxLength={32}/><button type="submit" disabled={!inviteName.trim()}>Invite</button></form><p className="quick-menu-muted">Invites are currently recorded in this console party. Friends need to join from a shared party session.</p><button className="quick-menu-action" onClick={leaveParty}><LogOut size={14}/> Leave party</button></div>
              <PeerCallPanel party={party} username={username}/>
              <button className="quick-menu-action" onClick={() => { setOpen(false); navigate("/party"); }}>Open full party screen</button>
            </>}
            <button className="quick-menu-action secondary" onClick={loadParties}><RefreshCw size={14}/> Refresh parties</button>
          </div>}

          {active.id === "music" && <div className="quick-menu-section"><p className="quick-menu-muted">Music controls will appear here when a music provider or local library is configured. No music source is connected yet.</p></div>}
          {active.id === "achievements" && <div className="quick-menu-section">
            {allAchievements ? <>
              <button className="quick-menu-action secondary" onClick={() => setAllAchievements(null)}>← Back to achievement menu</button>
              <div className="quick-menu-inline-stats"><strong>{allAchievements.unlocked} / {allAchievements.total} unlocked</strong><span>{allAchievements.gamesWithAchievements} games</span></div>
              {allAchievements.games.map((game) => <div className="quick-menu-achievement-game" key={game.appId}><strong>{game.gameName}</strong><small>{game.unlocked} / {game.total} · {game.hours} hours</small>{game.achievements.map((achievement) => <div className="quick-menu-achievement" key={achievement.apiName}><Trophy size={14} className={achievement.achieved ? "unlocked" : ""}/><span><strong>{achievement.name}</strong><small>{achievement.description || (achievement.achieved ? "Unlocked" : "Not unlocked")}</small></span><i className={achievement.achieved ? "unlocked" : ""}/></div>)}</div>)}
            </> : achievementData ? <>
              <button className="quick-menu-action secondary" onClick={() => { setAchievementData(null); setAchievementGame(null); setAchievementError(""); }}>← All recent games</button>
              <h3><Trophy size={15}/>{achievementData.gameName || achievementGame?.name || "Game achievements"}</h3>
              <div className="quick-menu-inline-stats"><strong>{achievementData.unlocked} / {achievementData.total} unlocked</strong><span>{achievementData.total ? Math.round(achievementData.unlocked / achievementData.total * 100) + "%" : "No achievements"}</span></div>
              <div className="quick-menu-achievement-list">{achievementData.achievements.map((achievement) => <div className="quick-menu-achievement" key={achievement.apiName}><Trophy size={15} className={achievement.achieved ? "unlocked" : ""}/><span><strong>{achievement.name}</strong><small>{achievement.description || (achievement.achieved ? "Unlocked" : "Not unlocked")}</small></span><i className={achievement.achieved ? "unlocked" : ""}/></div>)}</div>
            </> : <>
              <button className="quick-menu-action" disabled={allAchievementsBusy} onClick={async () => {
                setAllAchievementsBusy(true); setAchievementError("");
                try { const response = await fetch("/api/v1/profile/achievements/all", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "The Steam achievement library could not be loaded."); setAllAchievements(data); }
                catch (error) { setAchievementError(error.message || "Achievements could not be loaded."); }
                finally { setAllAchievementsBusy(false); }
              }}><Trophy size={14}/>{allAchievementsBusy ? "Loading all achievements…" : "Show all achievements"}</button>
              <h3><Trophy size={15}/> Or choose a recently played game</h3>
              {profile?.recentGames?.length ? profile.recentGames.map((game) => <button className="quick-menu-game quick-menu-game-button" key={game.appId} disabled={achievementBusy} onClick={async () => {
                setAchievementGame(game); setAchievementData(null); setAchievementBusy(true); setAchievementError("");
                try {
                  const response = await fetch("/api/v1/profile/achievements/" + encodeURIComponent(game.appId), { cache: "no-store" });
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error || "Achievements are unavailable for this game.");
                  setAchievementData(data);
                } catch (error) { setAchievementError(error.message || "Achievements could not be loaded."); }
                finally { setAchievementBusy(false); }
              }}>{game.cover && <img src={game.cover} alt=""/>}<span><strong>{game.name}</strong><small>{game.hours} total hours · {game.recentHours} in the last 2 weeks</small></span></button>) : <p className="quick-menu-muted">Recent games require a working Steam Web API key and visible profile/game details.</p>}
              {achievementBusy && <p className="quick-menu-muted">Loading achievements from Steam…</p>}
              {achievementError && <p className="quick-menu-notice" role="alert">{achievementError}</p>}
            </>}
            <p className="quick-menu-muted">Achievement details are fetched per game from Steam. Some games do not expose achievement data, and private profile settings may restrict access.</p>
          </div>}

          {active.id === "customize" && <div className="quick-menu-section">
            <label className="quick-menu-field">Accent color<input aria-label="Accent color" type="color" value={consoleSettings.accent} onChange={(event) => { const next = { ...consoleSettings, accent: event.target.value }; setConsoleSettings(next); localStorage.setItem("console-settings", JSON.stringify(next)); document.documentElement.style.setProperty("--console-accent", next.accent); window.dispatchEvent(new Event("console-settings-changed")); }}/></label>
            <label className="quick-menu-field">Background<select value={consoleSettings.backdrop} onChange={(event) => { const next = { ...consoleSettings, backdrop: event.target.value }; setConsoleSettings(next); localStorage.setItem("console-settings", JSON.stringify(next)); document.body.dataset.consoleBackdrop = next.backdrop; window.dispatchEvent(new Event("console-settings-changed")); }}><option value="blue">Deep blue</option><option value="black">Black</option><option value="red">Dark red</option></select></label>
            <label className="quick-menu-field">Interface font<select value={consoleSettings.font} onChange={(event) => { const next = { ...consoleSettings, font: event.target.value }; setConsoleSettings(next); localStorage.setItem("console-settings", JSON.stringify(next)); document.documentElement.style.setProperty("--font-ui", next.font === "System" ? "system-ui" : next.font); window.dispatchEvent(new Event("console-settings-changed")); }}><option>Inter</option><option>Arial</option><option>System</option><option>Oswald</option></select></label>
            <button className="quick-menu-action secondary" onClick={() => { closeMenu(); if (window.location.pathname === "/overlay" && window.consoleBridge?.openMainRoute) window.consoleBridge.openMainRoute("/settings").catch(() => {}); else navigate("/settings"); }}>More Settings</button>
          </div>}
          {active.id === "power" && <div className="quick-menu-power-actions">
            <button onClick={() => power("sleep")}><Moon size={15}/> Sleep</button>
            <button onClick={() => power("restart")}>Restart</button>
            <button className="danger" onClick={() => power("shutdown")}>Shut down</button>
          </div>}
          {notice && <p className="quick-menu-notice" role="status">{notice}</p>}
          <div className="quick-menu-footer"><Gamepad2 size={15}/> Scroll Lock to toggle <span>·</span> Esc to close</div>
        </div>
      </div>
    </section>
  </div>;
}
