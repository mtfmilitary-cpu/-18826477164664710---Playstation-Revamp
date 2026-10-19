import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, Gamepad2, Headphones, Moon, Music2, Power, Settings2, Trophy, Users, X, RefreshCw, Volume2, Mic, Monitor, Plus, LogOut } from "lucide-react";
import PeerCallPanel from "./PeerCallPanel";
import "./QuickMenu.css";

const items = [
  { id: "sound", label: "Sound and Devices", icon: AudioLines, detail: "Connected audio inputs and outputs" },
  { id: "friends", label: "Friends", icon: Users, detail: "Your synced Steam friends" },
  { id: "party", label: "Party Chat", icon: Headphones, detail: "Start or join a party, voice chat, and message" },
  { id: "music", label: "Music", icon: Music2, detail: "Music controls" },
  { id: "achievements", label: "Achievements", icon: Trophy, detail: "Recent games and achievement access" },
  { id: "customize", label: "Customize Console", icon: Settings2, detail: "Change console appearance", path: "/settings" },
  { id: "power", label: "Sleep Mode and Power", icon: Power, detail: "Sleep, restart, or shut down this PC" },
];

export default function QuickMenu() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("sound");
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState(null);
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState(null);
  const [partyName, setPartyName] = useState("");
  const [username, setUsername] = useState(() => localStorage.getItem("console-username") || "GamerPro");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const active = items.find((item) => item.id === selected) || items[0];

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/profile/me", { cache: "no-store" });
      const data = await response.json();
      setProfile(data);
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
      setDevices({
        inputs: all.filter((device) => device.kind === "audioinput"),
        outputs: all.filter((device) => device.kind === "audiooutput"),
      });
    } catch { setNotice("Windows did not allow audio-device enumeration."); }
  }, []);

  useEffect(() => {
    const toggle = () => { setOpen((value) => !value); setNotice(""); };
    window.addEventListener("console:quick-menu-toggle", toggle);
    const unsubscribe = window.consoleBridge?.onQuickMenuToggle?.(() => window.dispatchEvent(new Event("console:quick-menu-toggle")));
    const keydown = (event) => {
      if (event.code === "ScrollLock" && !window.consoleBridge?.runtime) {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("console:quick-menu-toggle", toggle);
      unsubscribe?.();
      window.removeEventListener("keydown", keydown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
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

  async function leaveParty() {
    if (!party) return;
    try { await request("/api/v1/party/" + encodeURIComponent(party.id) + "/leave", { method: "POST", body: JSON.stringify({ username }) }); }
    catch (error) { setNotice(error.message); }
    setParty(null); await loadParties();
  }

  async function activate(item) {
    setSelected(item.id); setNotice("");
    if (item.path) { setOpen(false); navigate(item.path); }
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
  return <div className="quick-menu-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
    <section className="quick-menu-panel" role="dialog" aria-modal="true" aria-label="Quick Menu">
      <header className="quick-menu-header"><span>QUICK MENU</span><button aria-label="Close Quick Menu" onClick={() => setOpen(false)}><X size={18}/></button></header>
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
            <h3><Mic size={15}/> Microphones / Inputs</h3>
            {devices.inputs.length ? devices.inputs.map((device, index) => <div className="quick-menu-device" key={device.deviceId || index}>{device.label || "Audio input " + (index + 1)}</div>) : <p className="quick-menu-muted">No input devices reported. Device names may appear after microphone permission is granted.</p>}
            <h3><Volume2 size={15}/> Speakers / Outputs</h3>
            {devices.outputs.length ? devices.outputs.map((device, index) => <div className="quick-menu-device" key={device.deviceId || index}>{device.label || "Audio output " + (index + 1)}</div>) : <p className="quick-menu-muted">No output devices reported by the browser.</p>}
            <button className="quick-menu-action" onClick={loadDevices}><RefreshCw size={14}/> Refresh devices</button>
            <p className="quick-menu-muted">This lists detected devices. Changing Windows' default output or master volume is not wired up yet.</p>
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
            <label className="quick-menu-field">Console name<input value={username} maxLength={32} onChange={(event) => { setUsername(event.target.value); localStorage.setItem("console-username", event.target.value); }}/></label>
            {!party ? <>
              <label className="quick-menu-field">New party name<input value={partyName} maxLength={60} onChange={(event) => setPartyName(event.target.value)} placeholder="Optional"/></label>
              <button className="quick-menu-action" disabled={busy} onClick={createParty}><Plus size={14}/> Create party</button>
              <h3><Users size={15}/> Active parties</h3>
              {parties.length ? parties.map((item) => <div className="quick-menu-party" key={item.id}><span><strong>{item.name}</strong><small>{item.members.length} member(s) · Host {item.host}</small></span><button disabled={busy} onClick={() => joinParty(item.id)}>Join</button></div>) : <p className="quick-menu-muted">No active parties. Create one to begin.</p>}
            </> : <>
              <div className="quick-menu-party-active"><strong>{party.name}</strong><span>{party.members.length} member(s): {party.members.join(", ")}</span><button className="quick-menu-action" onClick={leaveParty}><LogOut size={14}/> Leave party</button></div>
              <PeerCallPanel party={party} username={username}/>
              <button className="quick-menu-action" onClick={() => { setOpen(false); navigate("/party"); }}>Open full party screen</button>
            </>}
            <button className="quick-menu-action secondary" onClick={loadParties}><RefreshCw size={14}/> Refresh parties</button>
          </div>}

          {active.id === "music" && <div className="quick-menu-section"><p className="quick-menu-muted">Music stays as it is in the current console build.</p></div>}
          {active.id === "achievements" && <div className="quick-menu-section">
            <h3><Trophy size={15}/> Recent Steam games</h3>
            {profile?.recentGames?.length ? profile.recentGames.map((game) => <div className="quick-menu-game" key={game.appId}>{game.cover && <img src={game.cover} alt=""/>}<span><strong>{game.name}</strong><small>{game.hours} total hours · {game.recentHours} in the last 2 weeks</small></span></div>) : <p className="quick-menu-muted">Recent games require a working Steam Web API key and visible profile/game details.</p>}
            <p className="quick-menu-muted">Steam achievements are game-specific. This panel won't invent a total; the all-games achievement count isn't available from a single public API call.</p>
            <button className="quick-menu-action" onClick={() => { setOpen(false); navigate("/library"); }}>Open game library</button>
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
