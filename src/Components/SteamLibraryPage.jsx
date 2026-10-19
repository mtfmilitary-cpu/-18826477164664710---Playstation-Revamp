import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Play, ExternalLink, Gamepad2, HardDrive, AlertCircle, Share2 } from "lucide-react";
import { getInstalledSteamGames, refreshSteamLibrary, launchSteamGame, getSteamGameDetails } from "../services/steamApi";
import "./SteamPages.css";

export default function SteamLibraryPage() {
  const [games, setGames] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState("");
  const [error, setError] = useState("");
  const [scannedAt, setScannedAt] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    setError("");
    try {
      const result = refresh ? await refreshSteamLibrary() : await getInstalledSteamGames();
      setGames(result.games || []);
      setScannedAt(result.scannedAt || null);
    } catch (err) {
      setError(err.message || "Couldn't read the installed Steam library.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredGames = useMemo(() => games.filter((game) =>
    game.name.toLowerCase().includes(query.trim().toLowerCase())
  ), [games, query]);

  async function openGame(game) {
    setSelectedGame(game);
    setDetails(null);
    setShareMessage("");
    setDetailsBusy(true);
    try {
      setDetails(await getSteamGameDetails(game.appId));
    } catch (err) {
      setError(err.message || "Steam game details are unavailable.");
    } finally {
      setDetailsBusy(false);
    }
  }

  async function shareGame(game) {
    const url = game.steamUrl || `https://store.steampowered.com/app/${game.appId}/`;
    try {
      if (navigator.share) await navigator.share({ title: game.name, url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage("Steam game link copied.");
      } else window.prompt("Copy this Steam link:", url);
    } catch (err) {
      if (err?.name !== "AbortError") setShareMessage("Couldn't share the link from this window.");
    }
  }

  async function playGame(game) {
    setLaunching(game.appId);
    setError("");
    try {
      await launchSteamGame(game.appId);
    } catch (err) {
      setError(err.message || "Steam couldn't launch that game.");
    } finally {
      setLaunching("");
    }
  }

  return (
    <main className="steam-page">
      <header className="steam-page-heading">
        <div>
          <p className="steam-eyebrow">YOUR COLLECTION</p>
          <h1>Game Library</h1>
          <p className="steam-subtitle">Installed Steam games on this PC, across detected library drives.</p>
        </div>
        <button className="steam-button steam-button-secondary" onClick={() => load(true)} disabled={busy}>
          <RefreshCw size={17} className={busy ? "steam-spin" : ""} />
          {busy ? "Scanning…" : "Rescan library"}
        </button>
      </header>

      <div className="steam-library-stats">
        <div><Gamepad2 size={19} /><strong>{games.length}</strong><span>installed games</span></div>
        <div><HardDrive size={19} /><span>{scannedAt ? `Last scanned ${new Date(scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Scan to detect Steam libraries"}</span></div>
      </div>

      <label className="steam-search">
        <Search size={19} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search installed games…" />
      </label>

      {error && <div className="steam-notice steam-notice-error"><AlertCircle size={18} />{error}</div>}
      {!busy && games.length === 0 && !error && (
        <div className="steam-empty">
          <Gamepad2 size={42} />
          <h2>No installed Steam games detected</h2>
          <p>Make sure Steam is installed and at least one game is installed. Then rescan the library.</p>
          <button className="steam-button" onClick={() => load(true)}>Scan again</button>
        </div>
      )}
      {!busy && games.length > 0 && filteredGames.length === 0 && <p className="steam-muted">No installed games match “{query}”.</p>}

      <section className="steam-game-grid">
        {filteredGames.map((game) => (
          <article className="steam-game-card" key={game.appId}>
            <img src={game.cover} alt={game.name} loading="lazy" role="button" tabIndex={0} onClick={() => openGame(game)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openGame(game); }} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
            <div className="steam-game-card-content">
              <h2 role="button" tabIndex={0} onClick={() => openGame(game)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openGame(game); }} style={{ cursor: "pointer" }}>{game.name}</h2>
              <p>App ID {game.appId}</p>
              <div className="steam-card-actions">
                <button className="steam-button" onClick={() => playGame(game)} disabled={launching === game.appId}>
                  <Play size={16} fill="currentColor" />{launching === game.appId ? "Opening…" : "Play"}
                </button>
                <a className="steam-icon-link" href={game.steamUrl} target="_blank" rel="noreferrer" aria-label={`Open ${game.name} on Steam`}><ExternalLink size={17} /></a>
              </div>
            </div>
          </article>
        ))}
      </section>
      <p className="steam-footnote">Only local Steam install manifests are shown. No Steam password or account login is collected.</p>

      {selectedGame && (
        <div role="dialog" aria-modal="true" aria-label="Steam game details" onClick={() => setSelectedGame(null)} style={{ position: "fixed", inset: 0, zIndex: 5000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.78)", backdropFilter: "blur(12px)" }}>
          <section onClick={(event) => event.stopPropagation()} style={{ width: "min(900px, 100%)", maxHeight: "90vh", overflow: "auto", padding: 24, borderRadius: 18, color: "#f5f7fa", background: "#101721", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 24px 80px rgba(0,0,0,.45)" }}>
            <button className="steam-back-button" onClick={() => setSelectedGame(null)}>← Back to library</button>
            {detailsBusy ? <p className="steam-muted">Loading Steam details…</p> : (
              <>
                <img src={details?.cover || selectedGame.cover} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12, marginTop: 14 }} />
                <h2 style={{ fontSize: 30, margin: "18px 0 8px" }}>{details?.name || selectedGame.name}</h2>
                <p style={{ lineHeight: 1.65, color: "rgba(235,241,250,.78)" }}>{details?.description || "Steam hasn't returned a public description for this title."}</p>
                <p style={{ color: "rgba(235,241,250,.68)" }}>Steam App ID: <code>{selectedGame.appId}</code></p>
                {details?.genres?.length > 0 && <p className="steam-muted">{details.genres.join(" · ")}</p>}
                <div className="steam-card-actions" style={{ marginTop: 18 }}>
                  <button className="steam-button" onClick={() => playGame(selectedGame)} disabled={launching === selectedGame.appId}><Play size={16} fill="currentColor" />{launching === selectedGame.appId ? "Opening…" : "Play"}</button>
                  <button className="steam-button steam-button-secondary" onClick={() => shareGame({ ...selectedGame, steamUrl: details?.steamUrl || selectedGame.steamUrl })}><Share2 size={16} /> Share</button>
                  <a className="steam-button steam-button-secondary" href={details?.steamUrl || selectedGame.steamUrl} target="_blank" rel="noreferrer">Steam page <ExternalLink size={15} /></a>
                </div>
                {shareMessage && <p className="steam-muted">{shareMessage}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
