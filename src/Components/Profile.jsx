import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Gamepad2, Trophy, Users, Clock3, ShieldCheck, Share2, Play, RefreshCw, AlertCircle, UserRound } from "lucide-react";
import { getSteamGameDetails, launchSteamGame } from "../services/steamApi";
import "./SteamPages.css";

const pageStyle = {
  minHeight: "100vh", padding: "112px 4vw 56px", color: "#f5f7fa",
  background: "radial-gradient(ellipse at 80% 0%, rgba(65,83,112,.22), transparent 42%), #090d14",
  fontFamily: "var(--font-ui, system-ui, sans-serif)",
};
const panelStyle = {
  background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 18, backdropFilter: "blur(18px)",
};

const prettyNumber = (value) => value == null ? "—" : Number(value).toLocaleString();
const hoursLabel = (value) => value == null ? "—" : `${Number(value).toLocaleString()} h`;

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [busyPlay, setBusyPlay] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/profile/me", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Steam profile could not be loaded.");
      setProfile(data);
    } catch (err) {
      setError(err.message || "Steam profile could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function openGame(game) {
    setSelectedGame(game); setDetails(null); setActionMessage(""); setDetailsLoading(true);
    try {
      const response = await getSteamGameDetails(game.appId);
      setDetails(response);
    } catch (err) {
      setActionMessage(err.message || "Steam details are temporarily unavailable.");
    } finally { setDetailsLoading(false); }
  }

  async function playGame(game) {
    setBusyPlay(true); setActionMessage("");
    try {
      await launchSteamGame(game.appId);
      setActionMessage("Sent launch request to Steam.");
    } catch {
      // Steam's URI handler can open/install games that aren't in this PC's installed manifest list.
      window.location.href = `steam://run/${encodeURIComponent(game.appId)}`;
      setActionMessage("Opening the game through Steam. If it is not installed, Steam may show its install page.");
    } finally { setBusyPlay(false); }
  }

  async function shareGame(game) {
    const url = game.steamUrl || `https://store.steampowered.com/app/${game.appId}/`;
    try {
      if (navigator.share) await navigator.share({ title: game.name, url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setActionMessage("Steam game link copied.");
      } else {
        window.prompt("Copy this Steam link:", url);
      }
    } catch (err) {
      if (err?.name !== "AbortError") setActionMessage("Couldn't share the link from this window.");
    }
  }

  const stats = [
    { label: "Total playtime", value: hoursLabel(profile?.totalHours), icon: Clock3 },
    { label: "Games owned", value: prettyNumber(profile?.games), icon: Gamepad2 },
    { label: "Achievements", value: profile?.achievementsUnlocked == null ? "—" : prettyNumber(profile.achievementsUnlocked), icon: Trophy },
    { label: "Friends", value: prettyNumber(profile?.friends), icon: Users },
    { label: "Steam level", value: prettyNumber(profile?.level), icon: ShieldCheck },
  ];

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div>
            <p className="steam-eyebrow">STEAM COMMUNITY</p>
            <h1 style={{ margin: "5px 0 8px", fontSize: "clamp(32px, 5vw, 54px)", letterSpacing: "-1.8px" }}>Your Profile</h1>
            <p style={{ margin: 0, color: "rgba(230,237,247,.62)" }}>Your account identity, play history and real Steam statistics.</p>
          </div>
          <button className="steam-button steam-button-secondary" onClick={loadProfile} disabled={loading}><RefreshCw size={16} className={loading ? "steam-spin" : ""} /> Refresh</button>
        </header>

        {error && <div className="steam-notice steam-notice-error"><AlertCircle size={18} />{error}</div>}
        {loading && !profile && <p className="steam-muted">Connecting to the Steam client…</p>}

        {profile && (
          <>
            <section style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 24, padding: "clamp(20px, 4vw, 36px)", marginBottom: 20, flexWrap: "wrap" }}>
              {profile.avatar
                ? <img src={profile.avatar} alt="" style={{ width: 104, height: 104, borderRadius: 18, objectFit: "cover", border: "1px solid rgba(255,255,255,.2)" }} />
                : <div style={{ width: 104, height: 104, borderRadius: 18, display: "grid", placeItems: "center", background: "rgba(255,255,255,.08)" }}><UserRound size={40} /></div>}
              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", margin: 0, letterSpacing: "-1px" }}>{profile.personaName || "Steam profile"}</h2>
                  {profile.level != null && <span style={{ border: "1px solid rgba(255,255,255,.22)", borderRadius: 8, padding: "5px 9px", color: "#d7e6fa", fontSize: 13 }}>Level {profile.level}</span>}
                </div>
                <p style={{ color: "rgba(230,237,247,.6)", margin: "8px 0" }}>{profile.accountName ? `Account: ${profile.accountName} · ` : ""}SteamID64: <code>{profile.steamId || "Not detected"}</code></p>
                {profile.memberSince && <p style={{ color: "rgba(230,237,247,.55)", margin: "4px 0 12px" }}>Member since {profile.memberSince}</p>}
                {profile.profileUrl && <a className="steam-icon-link" href={profile.profileUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#dce8f8" }}>Open Steam Community profile <ExternalLink size={15} /></a>}
              </div>
            </section>

            {(!profile.connected || !profile.fullStatsAvailable || profile.statsUnavailableReason) && (
              <section style={{ ...panelStyle, padding: 20, marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{profile.connected ? "Account found — full stats need API access" : "Connect your Steam account"}</h3>
                <p style={{ margin: 0, color: "rgba(230,237,247,.68)", lineHeight: 1.65 }}>
                  {profile.message || profile.statsUnavailableReason || "Sign in to Steam on this PC and make your profile, game details and friends list visible where required."}
                  {" "}The Steam Web API key must be configured in the desktop app's server environment as <code>STEAM_WEB_API_KEY</code>. Keep the key on the server; never paste it into frontend code or commit it to GitHub. Private profile data will remain unavailable.
                </p>
              </section>
            )}

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12, marginBottom: 28 }}>
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ ...panelStyle, padding: "20px 18px" }}>
                  <Icon size={20} color="rgba(220,234,252,.7)" />
                  <div style={{ fontSize: "clamp(25px, 3vw, 34px)", fontWeight: 750, marginTop: 14, letterSpacing: "-.7px" }}>{value}</div>
                  <div style={{ color: "rgba(230,237,247,.55)", fontSize: 13, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </section>

            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>Recently played</h2>
                <span style={{ color: "rgba(230,237,247,.48)", fontSize: 13 }}>Data supplied by Steam</span>
              </div>
              {profile.recentGames?.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))", gap: 14 }}>
                  {profile.recentGames.map((game) => (
                    <button key={game.appId} onClick={() => openGame(game)} style={{ ...panelStyle, overflow: "hidden", padding: 0, textAlign: "left", color: "inherit", cursor: "pointer" }}>
                      <img src={game.cover} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "460 / 215", objectFit: "cover", display: "block", background: "#171e2a" }} />
                      <div style={{ padding: 16 }}>
                        <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{game.name}</h3>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "rgba(230,237,247,.62)", fontSize: 13 }}>
                          <span>{hoursLabel(game.hours)} total</span><span>{hoursLabel(game.recentHours)} last 2 weeks</span>
                        </div>
                        <div style={{ color: "#c8d9ed", fontSize: 12, marginTop: 10 }}>App ID {game.appId} · View details →</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : <div style={{ ...panelStyle, padding: 22, color: "rgba(230,237,247,.65)" }}>No recent games returned by Steam. Your profile may be private, or the API key may not be configured.</div>}
              {profile.achievementsUnlocked == null && <p style={{ color: "rgba(230,237,247,.45)", fontSize: 12, marginTop: 16 }}>Achievements total is shown as unavailable until it can be calculated from per-game achievement data; no placeholder count is used.</p>}
            </section>
          </>
        )}
      </div>

      {selectedGame && (
        <div role="dialog" aria-modal="true" aria-label="Game details" onClick={() => setSelectedGame(null)} style={{ position: "fixed", inset: 0, zIndex: 5000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.78)", backdropFilter: "blur(12px)" }}>
          <section onClick={(event) => event.stopPropagation()} style={{ ...panelStyle, width: "min(920px, 100%)", maxHeight: "90vh", overflow: "auto", background: "#101721", padding: 22 }}>
            <button className="steam-back-button" onClick={() => setSelectedGame(null)}>← Back to profile</button>
            {detailsLoading ? <p className="steam-muted">Loading Steam game details…</p> : (
              <>
                <img src={details?.cover || selectedGame.cover} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 12, marginTop: 14 }} />
                <h2 style={{ fontSize: 30, margin: "18px 0 8px" }}>{details?.name || selectedGame.name}</h2>
                <p style={{ color: "rgba(230,237,247,.78)", lineHeight: 1.65 }}>{details?.description || "Steam has not returned a public short description for this game."}</p>
                <p style={{ color: "rgba(230,237,247,.65)" }}>Steam App ID: <code>{selectedGame.appId}</code></p>
                {details?.genres?.length > 0 && <p style={{ color: "rgba(230,237,247,.55)" }}>{details.genres.join(" · ")}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                  <button className="steam-button" disabled={busyPlay} onClick={() => playGame(selectedGame)}><Play size={16} fill="currentColor" /> {busyPlay ? "Opening…" : "Play"}</button>
                  <button className="steam-button steam-button-secondary" onClick={() => shareGame({ ...selectedGame, steamUrl: details?.steamUrl || selectedGame.steamUrl })}><Share2 size={16} /> Share</button>
                  <a className="steam-button steam-button-secondary" href={details?.steamUrl || selectedGame.steamUrl} target="_blank" rel="noreferrer">Steam page <ExternalLink size={15} /></a>
                </div>
                {actionMessage && <p style={{ color: "rgba(230,237,247,.7)", marginTop: 14 }}>{actionMessage}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
