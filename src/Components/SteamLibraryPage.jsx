import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Play, ExternalLink, Gamepad2, HardDrive, AlertCircle } from "lucide-react";
import { getInstalledSteamGames, refreshSteamLibrary, launchSteamGame } from "../services/steamApi";
import "./SteamPages.css";

export default function SteamLibraryPage() {
  const [games, setGames] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState("");
  const [error, setError] = useState("");
  const [scannedAt, setScannedAt] = useState(null);

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
            <img src={game.cover} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
            <div className="steam-game-card-content">
              <h2>{game.name}</h2>
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
    </main>
  );
}
