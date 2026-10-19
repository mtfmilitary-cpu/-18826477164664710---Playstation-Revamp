/**
 * HomeDashboard.jsx — PS5-style home screen
 *
 * Fix: All game cards (featured + library extras) now share a single unified
 *      allGames array. Clicking any card triggers the PS5 cinematic background
 *      transition — the poster fills the screen with an animated fade+scale.
 *      "Play Game" on library-only titles navigates to /library.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import LogoImage from "./LogoImage.jsx";
import { useDualSenseWS } from "./Anikator/useDualSenseWS";
import { searchSteamStore, getSteamGameDetails } from "../services/steamApi";

/* ── PS Button SVG Icons ── */
const CrossIcon = ({ size = 16, color = "white" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);
/* PS Logo */
const PSLogoMini = () => (
    <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" style={{ width: 28, height: 28, filter: "brightness(0) invert(1)" }} />
);

const SteamStatsPanel = ({ profile, onOpenProfile }) => (
    <div style={{ background: "rgba(16,20,27,.72)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderRadius: 16, border: "1px solid rgba(255,255,255,.16)", padding: "16px 18px", width: 300, maxWidth: "30vw", color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,.25)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="" style={{ width: 18, height: 18, filter: "brightness(0) invert(1)" }}/><strong style={{fontSize:13}}>Steam account stats</strong></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Total playtime",profile?.totalHours == null ? "—" : Number(profile.totalHours).toLocaleString()+" h"],["Games",profile?.games == null ? "—" : Number(profile.games).toLocaleString()],["Friends",profile?.friends == null ? "—" : Number(profile.friends).toLocaleString()],["Steam level",profile?.level == null ? "—" : profile.level]].map(([label,value])=><div key={label} style={{padding:"10px",borderRadius:9,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.07)"}}><div style={{fontSize:9,color:"#aeb9c8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:5}}>{label}</div><div style={{fontSize:20,fontWeight:750}}>{value}</div></div>)}
      </div>
      <button onClick={onOpenProfile} style={{marginTop:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,.18)",background:"rgba(255,255,255,.1)",color:"#fff",cursor:"pointer",fontSize:11}}>View profile & achievements</button>
      {!profile?.fullStatsAvailable && <div style={{fontSize:10,color:"#f1d2a0",marginTop:8}}>Steam stats unavailable. Check the API key and profile privacy.</div>}
    </div>
);

const GameCard = ({ game, isActive, onClick }) => (
    <motion.button
        type="button"
        onClick={onClick}
        data-focusable
        aria-label={game?.title || game?.name || "Steam game"}
        aria-pressed={Boolean(isActive)}
        whileHover={{ y: -4, scale: 1.025 }}
        whileTap={{ scale: 0.98 }}
        style={{
            position: "relative",
            flex: "0 0 auto",
            width: isActive ? 156 : 112,
            height: isActive ? 88 : 70,
            overflow: "hidden",
            padding: 0,
            borderRadius: 12,
            border: isActive ? "2px solid rgba(255,255,255,.92)" : "2px solid rgba(255,255,255,.18)",
            background: game?.poster || game?.cover
                ? `linear-gradient(to top, rgba(4,8,16,.9), rgba(4,8,16,.05)), url("${game.poster || game.cover}") center / cover`
                : "linear-gradient(135deg, #17243a, #304766)",
            boxShadow: isActive ? "0 8px 26px rgba(0,0,0,.42)" : "0 3px 12px rgba(0,0,0,.28)",
            color: "#fff",
            cursor: "pointer",
            textAlign: "left",
            transition: "width .2s ease, height .2s ease, border-color .2s ease",
        }}
    >
        <span style={{
            position: "absolute",
            left: 9,
            right: 9,
            bottom: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: isActive ? 11 : 9,
            fontWeight: 750,
            textShadow: "0 1px 4px rgba(0,0,0,.8)",
        }}>{game?.title || game?.name || "Untitled game"}</span>
    </motion.button>
);

/* ─────────────────────────────────────────────────────────────
   MAIN HOME DASHBOARD
───────────────────────────────────────────────────────────── */
const HomeDashboard = () => {
    const navigate = useNavigate();
    const { action } = useDualSenseWS();

    // activeIdx now indexes into allGames (not just featuredGames)
    const [activeIdx, setActiveIdx] = useState(0);
    const [focusZone, setFocusZone] = useState("GAMES");
    const [navIdx, setNavIdx] = useState(0);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [resolvedGame, setResolvedGame] = useState(null);
    const [steamDetails, setSteamDetails] = useState(null);
    const [detailsBusy, setDetailsBusy] = useState(false);
    const [detailsMessage, setDetailsMessage] = useState("");
    const [steamProfile, setSteamProfile] = useState(null);
    const [steamGames, setSteamGames] = useState([]);
    const [steamGamesLoading, setSteamGamesLoading] = useState(true);
    const navItems = ["Games", "Friends", "Store"];
    const displayGames = steamGames.map((item) => ({ ...item, title: item.name, poster: item.hero || item.cover, accentColor: "#3d7ec9", genre: "Steam library", fromLibrary: true, logo: null }));

    useEffect(() => {
        let cancelled = false;
        fetch("/api/v1/profile/me", { cache: "no-store" }).then((response) => response.json()).then((data) => {
            if (cancelled) return;
            setSteamProfile(data);
            if (Array.isArray(data.ownedGames)) setSteamGames(data.ownedGames);
            else setSteamGames([]);
        }).catch(() => { if (!cancelled) { setSteamProfile(null); setSteamGames([]); } }).finally(() => { if (!cancelled) setSteamGamesLoading(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (activeIdx >= displayGames.length) setActiveIdx(Math.max(0, displayGames.length - 1));
    }, [displayGames.length, activeIdx]);

    // Navigation logic for D-Pad — cycles through allGames
    useEffect(() => {
        if (!action) return;
        if (["DPAD_LEFT", "DPAD_RIGHT", "DPAD_UP", "DPAD_DOWN"].includes(action)) window.dispatchEvent(new Event("console:sound-hover"));
        if (action === "CROSS") window.dispatchEvent(new Event("console:sound-select"));
        if (!displayGames.length && focusZone === "GAMES" && (action === "DPAD_LEFT" || action === "DPAD_RIGHT")) return;

        if (focusZone === "GAMES") {
            if (action === "DPAD_LEFT") {
                setActiveIdx(i => (i - 1 + displayGames.length) % displayGames.length);
            } else if (action === "DPAD_RIGHT") {
                setActiveIdx(i => (i + 1) % displayGames.length);
            } else if (action === "DPAD_UP") {
                setFocusZone("NAV");
            }
        }
        else if (focusZone === "NAV") {
            if (action === "DPAD_LEFT") {
                setNavIdx(i => (i - 1 + navItems.length) % navItems.length);
            } else if (action === "DPAD_RIGHT") {
                if (navIdx === navItems.length - 1) setFocusZone("QUICK");
                else setNavIdx(i => (i + 1) % navItems.length);
            } else if (action === "DPAD_DOWN") {
                setFocusZone("GAMES");
            } else if (action === "CROSS") {
                const t = navItems[navIdx];
                if (t === "Friends") navigate("/friends");
                else if (t === "Store") navigate("/store");
                // "Games" is already the active screen.
            }
        }
        else if (focusZone === "QUICK") {
            if (action === "DPAD_LEFT") {
                setFocusZone("NAV");
            } else if (action === "DPAD_RIGHT") {
            } else if (action === "DPAD_DOWN") {
                setFocusZone("GAMES");
            }
        }
    }, [action, focusZone, navIdx, displayGames.length]);

    async function openGameDetails(selectedGame) {
        setDetailsOpen(true);
        setResolvedGame(null);
        setSteamDetails(null);
        setDetailsMessage("");
        setDetailsBusy(true);
        try {
            if (selectedGame.appId) {
                setResolvedGame({ appId: String(selectedGame.appId), name: selectedGame.title || selectedGame.name, steamUrl: selectedGame.steamUrl || `https://store.steampowered.com/app/${selectedGame.appId}/` });
                try { setSteamDetails(await getSteamGameDetails(selectedGame.appId)); }
                catch { setDetailsMessage("Steam found this game, but its full description is currently unavailable."); }
                return;
            }
            const search = await searchSteamStore(selectedGame.title || selectedGame.name || "");
            const items = search.items || [];
            const wanted = (selectedGame.title || selectedGame.name || "").trim().toLowerCase();
            const match = items.find((item) => item.name.trim().toLowerCase() === wanted) || items.find((item) => item.name.trim().toLowerCase().includes(wanted) || wanted.includes(item.name.trim().toLowerCase())) || null;
            if (!match) {
                setResolvedGame({ ...selectedGame, name: selectedGame.title || selectedGame.name, appId: null, steamUrl: null });
                setDetailsMessage("No matching Steam Store listing was found. The description below is from the console's featured-game entry.");
                return;
            }
            setResolvedGame(match);
            try { setSteamDetails(await getSteamGameDetails(match.appId)); }
            catch { setDetailsMessage("Steam found the game, but its full description is currently unavailable."); }
        } catch {
            setResolvedGame({ ...selectedGame, name: selectedGame.title || selectedGame.name, appId: null, steamUrl: null });
            setDetailsMessage("Steam search is unavailable right now. Showing the console's game information.");
        } finally { setDetailsBusy(false); }
    }

    async function shareSelectedGame() {
        const url = steamDetails?.steamUrl || resolvedGame?.steamUrl;
        if (!url) { setDetailsMessage("There isn't a verified Steam page to share for this game yet."); return; }
        try {
            if (navigator.share) await navigator.share({ title: steamDetails?.name || resolvedGame?.name, url });
            else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
                setDetailsMessage("Steam game link copied.");
            } else window.prompt("Copy this Steam link:", url);
        } catch (error) { if (error?.name !== "AbortError") setDetailsMessage("Couldn't share the link from this window."); }
    }

    function launchSelectedGame() {
        const appId = steamDetails?.appId || resolvedGame?.appId;
        if (!appId) { setDetailsMessage("No verified Steam App ID is available. Try searching the Steam Store."); return; }
        window.location.href = `steam://run/${encodeURIComponent(appId)}`;
        setDetailsMessage("Sent the launch request to Steam.");
    }

    // Current active game (from the full list)
    const game = displayGames[activeIdx] || { title: steamGamesLoading ? "Loading your Steam library…" : "Your Steam games will appear here", name: "", poster: "", accentColor: "#253448", genre: "", fromLibrary: false, appId: null };

    return (
        <>
        <div style={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            position: "relative",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            userSelect: "none",
            color: "#fff",
        }}>
            {/* ── FULL-SCREEN GAME POSTER BACKGROUND ── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeIdx}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: game.poster ? `url(${game.poster})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        zIndex: 0,
                    }}
                />
            </AnimatePresence>

            {/* Color overlay — left dark, right semi-transparent */}
            <div style={{
                position: "absolute", inset: 0, zIndex: 1,
                background: "linear-gradient(to right, rgba(5,8,18,0.88) 0%, rgba(5,8,18,0.55) 40%, rgba(5,8,18,0.15) 75%, rgba(5,8,18,0.05) 100%)",
            }} />
            <div style={{
                position: "absolute", inset: 0, zIndex: 1,
                background: "linear-gradient(to top, rgba(5,8,18,0.85) 0%, rgba(5,8,18,0.2) 35%, transparent 65%)",
            }} />

            {/* Game accent ambient glow */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`glow-${activeIdx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    style={{
                        position: "absolute", inset: 0, zIndex: 1,
                        background: `radial-gradient(ellipse at 20% 80%, ${game.accentColor}22 0%, transparent 60%)`,
                    }}
                />
            </AnimatePresence>

            {/* ── CONTENT LAYER ── */}
            <div style={{ position: "relative", zIndex: 10, width: "100%", height: "100%", display: "flex", flexDirection: "column", paddingTop: "82px" }}>

                {/* ── GAME CARDS CAROUSEL (floating row) ── */}
                <div style={{
                    padding: "16px 40px 0",
                    display: "flex", alignItems: "flex-end", gap: "10px",
                    overflowX: "auto",
                    // hide scrollbar but keep scrollable
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                }}>
                    <style>{`.home-row::-webkit-scrollbar { display: none; }`}</style>

                    {/* PS Library shortcut */}
                    <div
                        data-focusable
                        onClick={() => navigate("/library")}
                        title="Game Library"
                        style={{
                            flexShrink: 0, width: "70px", height: "70px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #1a1f3a, #2a2f55)",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", border: "2px solid rgba(255,255,255,0.15)",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
                            transition: "all 0.3s ease", gap: "4px",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,255,255,0.15)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.5)"; }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                        </svg>
                        <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: "0.5px" }}>LIBRARY</span>
                    </div>

                    {/* PS Store shortcut */}
                    <div
                        data-focusable
                        onClick={() => navigate("/store")}
                        title="PS Store"
                        style={{
                            flexShrink: 0, width: "70px", height: "70px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #0070d1, #0044a0)",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", border: "2px solid rgba(255,255,255,0.15)",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
                            transition: "all 0.3s ease", gap: "4px",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.05)"; e.currentTarget.style.borderColor = "rgba(0,112,209,0.8)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,112,209,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.5)"; }}
                    >
                        <PSLogoMini />
                        <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: "0.5px" }}>STORE</span>
                    </div>

                    {/* ALL game cards — unified loop over allGames */}
                    {!displayGames.length && <div style={{flexShrink:0,width:280,height:70,display:"grid",placeItems:"center",padding:"0 18px",borderRadius:12,background:"rgba(10,15,24,.82)",border:"1px solid rgba(255,255,255,.18)",fontSize:12,color:"#d5dfed"}}>{steamGamesLoading ? "Syncing your real Steam games…" : "No Steam games returned. Check your API key and Steam privacy settings."}</div>}
                    {displayGames.map((g, i) => (
                        <GameCard
                            key={g.id}
                            game={g}
                            isActive={i === activeIdx}
                            onClick={() => { setActiveIdx(i); openGameDetails(g); }}
                        />
                    ))}
                </div>

                {/* ── SPACER (game art shows here) ── */}
                <div style={{ flex: 1 }} />

                {/* ── BOTTOM SECTION ── */}
                <div style={{
                    padding: "0 40px 32px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: "20px",
                }}>
                    {/* Bottom-LEFT: Game logo/CTA + Party Chat */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Game Logo + CTA — extra top margin to push it down from carousel */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`info-${activeIdx}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.4 }}
                                style={{ marginBottom: "4px", marginTop: "28px" }}
                            >
                                {/* Logo or title text */}
                                {game.logo ? (
                                    <LogoImage
                                        src={game.logo}
                                        alt={game.title}
                                        style={{ maxHeight: "130px", maxWidth: "380px", objectFit: "contain", display: "block", marginBottom: "16px" }}
                                    />
                                ) : (
                                    <div style={{
                                        fontSize: "46px", fontWeight: 900, letterSpacing: "-1.5px",
                                        fontFamily: "var(--font-display)",
                                        color: "#fff", marginBottom: "16px", lineHeight: 1,
                                        textShadow: `0 4px 24px ${game.accentColor}66`,
                                    }}>
                                        {game.title}
                                    </div>
                                )}

                                {/* Genre badge for library games */}
                                {game.fromLibrary && game.genre && (
                                    <div style={{
                                        display: "inline-flex", alignItems: "center", gap: "6px",
                                        background: `${game.accentColor}22`,
                                        border: `1px solid ${game.accentColor}44`,
                                        borderRadius: "20px", padding: "3px 12px", marginBottom: "14px",
                                        fontSize: "10px", fontWeight: 400,
                                        fontFamily: "var(--font-ui)",
                                        color: game.accentColor,
                                        letterSpacing: "1px",
                                    }}>
                                        {game.genre}
                                    </div>
                                )}

                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    {/* Play Now / View in Library button */}
                                    <button
                                        onClick={launchSelectedGame}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "8px",
                                            background: "rgba(255,255,255,0.9)",
                                            border: "none", borderRadius: "6px",
                                            padding: "10px 24px",
                                            fontSize: "13px", fontWeight: 400,
                                            fontFamily: "var(--font-ui)",
                                            color: "#000",
                                            cursor: "pointer",
                                            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                                            transition: "all 200ms ease",
                                            letterSpacing: "0.5px",
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "scale(1.03)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; e.currentTarget.style.transform = "scale(1)"; }}
                                    >
                                        <CrossIcon size={14} color="#000" />
                                        {"Play"}
                                    </button>

                                    {/* More options button */}
                                    <button
                                        style={{
                                            width: "40px", height: "40px", borderRadius: "50%",
                                            background: "rgba(255,255,255,0.12)",
                                            backdropFilter: "blur(10px)",
                                            border: "1px solid rgba(255,255,255,0.2)",
                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: "16px", color: "#fff",
                                            transition: "all 200ms ease",
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                                    >
                                        ···
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                    </div>

                    {/* Bottom-RIGHT: Friends Panel + Stats / Progress / Trophies + dots */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>

                        {/* Friends panel now on the right, above Progress & Trophies */}
                        <SteamStatsPanel profile={steamProfile} onOpenProfile={() => navigate("/profile")} />

                        {/* Game dot indicators — one dot per allGames entry */}
                        <div style={{ display: "flex", gap: "6px", paddingRight: "4px", flexWrap: "wrap", maxWidth: "340px", justifyContent: "flex-end" }}>
                            {displayGames.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveIdx(i)}
                                    style={{
                                        width: i === activeIdx ? "28px" : "6px",
                                        height: "4px",
                                        borderRadius: "2px",
                                        background: i === activeIdx
                                            ? "rgba(255,255,255,0.9)"
                                            : "rgba(255,255,255,0.15)",
                                        border: "none", cursor: "pointer",
                                        transition: "all 300ms ease",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
            {detailsOpen && (
                <div aria-label="Selected game details" style={{ position: "fixed", right: 28, top: 94, zIndex: 200000, width: "min(480px, calc(100vw - 36px))", maxHeight: "calc(100vh - 120px)", overflow: "auto", borderRadius: 10, padding: 20, color: "#fff", background: "rgba(9,15,25,.94)", backdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,.2)", boxShadow: "0 18px 55px rgba(0,0,0,.45)" }}>
                    <section>
                        <button onClick={() => setDetailsOpen(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.18)", borderRadius: 4, color: "#fff", padding: "7px 11px", cursor: "pointer" }}>Back to Games</button>
                        {detailsBusy ? <p style={{ color: "rgba(255,255,255,.65)", padding: 24 }}>Looking up the real Steam listing…</p> : (
                            <>
                                <img src={steamDetails?.cover || resolvedGame?.cover || resolvedGame?.poster || game.poster} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 12, marginTop: 16, background: "#1a2230" }} />
                                <h2 style={{ fontSize: 30, margin: "18px 0 8px" }}>{steamDetails?.name || resolvedGame?.name || game.title}</h2>
                                <p style={{ lineHeight: 1.65, color: "rgba(235,241,250,.8)" }}>{steamDetails?.description || resolvedGame?.description || "No description is available for this featured title yet."}</p>
                                <p style={{ color: "rgba(235,241,250,.68)" }}>Steam App ID: <code>{steamDetails?.appId || resolvedGame?.appId || "Not found"}</code></p>
                                {steamDetails?.genres?.length > 0 && <p style={{ color: "rgba(235,241,250,.55)" }}>{steamDetails.genres.join(" · ")}</p>}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                                    <button onClick={launchSelectedGame} disabled={!steamDetails?.appId && !resolvedGame?.appId} style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "11px 18px", border: 0, borderRadius: 8, background: "#f2f5f8", color: "#111820", fontWeight: 700, cursor: "pointer" }}>▶ Play</button>
                                    <button onClick={shareSelectedGame} style={{ padding: "11px 18px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, background: "rgba(255,255,255,.07)", color: "#fff", cursor: "pointer" }}>↗ Share</button>
                                    {(steamDetails?.steamUrl || resolvedGame?.steamUrl) && <a href={steamDetails?.steamUrl || resolvedGame?.steamUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "11px 18px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, color: "#fff", textDecoration: "none" }}>Steam Store ↗</a>}
                                </div>
                                {detailsMessage && <p style={{ color: "rgba(235,241,250,.62)", marginTop: 14 }}>{detailsMessage}</p>}
                            </>
                        )}
                    </section>
                </aside>
            )}
        </>
    );
};

export default HomeDashboard;
