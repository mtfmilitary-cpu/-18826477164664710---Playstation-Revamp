import React, { useCallback, useEffect, useState } from "react";
import { Search, ExternalLink, ShoppingBag, ArrowLeft, LoaderCircle, AlertCircle } from "lucide-react";
import { getSteamGameDetails, searchSteamStore } from "../services/steamApi";
import "./SteamPages.css";

export default function SteamStorePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(true);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [error, setError] = useState("");

  const loadFeatured = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/store/featured");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Steam Store is unavailable.");
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Steam Store is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { loadFeatured(); }, [loadFeatured]);

  async function submitSearch(event) {
    event.preventDefault();
    if (!query.trim()) return loadFeatured();
    setBusy(true);
    setError("");
    setSelected(null);
    setDetails(null);
    try {
      const response = await searchSteamStore(query.trim());
      setItems(response.items || []);
    } catch (err) {
      setError(err.message || "Couldn't search Steam right now.");
    } finally {
      setBusy(false);
    }
  }

  async function openDetails(game) {
    setSelected(game);
    setDetails(null);
    setDetailsBusy(true);
    setError("");
    try {
      setDetails(await getSteamGameDetails(game.appId));
    } catch (err) {
      setError(err.message || "Game details couldn't be loaded.");
    } finally {
      setDetailsBusy(false);
    }
  }

  return (
    <main className="steam-page steam-store-page">
      <header className="steam-page-heading">
        <div>
          <p className="steam-eyebrow">STEAM STORE</p>
          <h1>Discover your next game</h1>
          <p className="steam-subtitle">Browse Steam games here. Purchases always finish on the official Steam website.</p>
        </div>
        <ShoppingBag size={34} className="steam-heading-icon" />
      </header>

      <form className="steam-search steam-store-search" onSubmit={submitSearch}>
        <Search size={19} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the Steam catalog…" aria-label="Search Steam games" />
        <button type="submit" className="steam-button" disabled={busy}>Search</button>
      </form>

      {error && <div className="steam-notice steam-notice-error"><AlertCircle size={18} />{error}</div>}

      {selected && (
        <section className="steam-detail-panel">
          <button className="steam-back-button" onClick={() => { setSelected(null); setDetails(null); }}><ArrowLeft size={17} /> Back to games</button>
          {detailsBusy ? <p className="steam-muted"><LoaderCircle className="steam-spin" size={18} /> Loading game details…</p> :
            details ? <div className="steam-detail-layout">
              <img src={details.cover || selected.cover} alt="" />
              <div className="steam-detail-copy">
                <p className="steam-eyebrow">GAME DETAILS</p>
                <h2>{details.name}</h2>
                <p>{details.description || "Description not provided by Steam."}</p>
                {details.genres?.length > 0 && <p className="steam-muted">{details.genres.join(" · ")}</p>}
                <div className="steam-purchase-row">
                  <strong>{details.price || selected.price || "Price unavailable"}</strong>
                  <a className="steam-button" href={details.steamUrl} target="_blank" rel="noreferrer">View on Steam <ExternalLink size={16} /></a>
                </div>
                <p className="steam-footnote">Checkout, payment, and ownership are handled by Steam—not this app.</p>
              </div>
            </div> : <p className="steam-muted">Details are unavailable. You can still open the game's official Steam page.</p>}
        </section>
      )}

      {!selected && (busy ? <p className="steam-muted"><LoaderCircle className="steam-spin" size={18} /> Loading Steam catalog…</p> :
        items.length ? <section className="steam-store-grid">
          {items.map((game) => <button className="steam-store-card" key={game.appId} onClick={() => openDetails(game)}>
            <img src={game.cover} alt="" loading="lazy" />
            <span className="steam-store-card-title">{game.name}</span>
            <span className="steam-store-card-price">{game.price || "View price on Steam"}</span>
          </button>)}
        </section> : <div className="steam-empty"><ShoppingBag size={40} /><h2>No games found</h2><p>Try another search. Steam's public search service can occasionally be unavailable.</p></div>
      )}
    </main>
  );
}
