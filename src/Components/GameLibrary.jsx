/**
 * GameLibrary.jsx — PS5-style Game Library Screen
 *
 * Matches the reference screenshot:
 *  - Dark starfield background
 *  - "Games | Media" tab header
 *  - Console storage info + Sort control
 *  - 5-column responsive grid of game covers
 *  - Games from both HomeDashboard + StoreUI (6-7 from home, rest from store)
 */
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

/* ── PS Button SVG Icons ── */
const SearchIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);
const GearIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);
const SortIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 6h18M7 12h10M11 18h2" />
    </svg>
);
const PSLogoMini = () => (
    <svg width="28" height="20" viewBox="0 0 100 70" fill="white">
        <path d="M38.5 0v54.3l13.3 4.5V13.6c0-2.8 1.2-4 3-3.4 2.1.7 2.6 2.8 2.6 5.6v10.1c9.8 3.4 17.3 0 17.3-14-.1-13.4-8.4-18.6-19.5-14.1L38.5 0zM38.5 55.9L17.7 63.7l14.6-5.7v-9L4 60.2C-1.4 62.3.4 67.8 8 70c7.9 2.3 17.3 1.8 25-1.2L38.5 66v-10.1zM83.5 27.7c-7.9-2.3-17.3-1.8-25 1.2L38.5 31.7v9.2l21.1-7.9c2.8-1 5.2-.2 5.2 2.8 0 2.8-2 4.8-5.2 5.8L38.5 47.4v10.1l16.5-6.8c12.9-5.3 28.5-15.1 28.5-23z" />
    </svg>
);

const GridIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
);

/* ─────────────────────────────────────────────────────────────
   FULL LIBRARY — 20 games from PS5 library screenshot
   Thumb images: Apex, Pac-Man, Astro Playroom, Crash Bandicoot,
   Demon's Souls, Fortnite, Immortals, Spider-Man MM, Spider-Man,
   NBA 2K22, Returnal, Ratchet & Clank, Riders Republic, Ghost,
   COD Cold War, Overcooked 2, Back 4 Blood, Splitgate, Battlefield 2042, God of War
───────────────────────────────────────────────────────────── */
const libraryGames = [
    // 6-7 games fetched from home page (using same poster assets)
    {
        id: 1,
        title: "Call of Duty",
        genre: "FPS",
        poster: "/store-banners/cod-banner.png",
        logo: "/store-logos/cod-logo.png",
        accentColor: "#c8981a",
        progress: 67,
        installed: true,
        size: "85 GB",
        hoursPlayed: 203,
        fromHome: true,
    },
    {
        id: 2,
        title: "Kena: Bridge of Spirits",
        genre: "Action-Adventure",
        poster: "/store-banners/kena-banner.png",
        logo: "/store-logos/kena-logo.png",
        accentColor: "#3ab5e0",
        progress: 42,
        installed: true,
        size: "27 GB",
        hoursPlayed: 87,
        fromHome: true,
    },
    {
        id: 3,
        title: "Moving Out",
        genre: "Co-op",
        poster: "/store-banners/moving-out-banner.png",
        logo: "/store-logos/moving-out-logo.png",
        accentColor: "#f04c2e",
        progress: 80,
        installed: true,
        size: "8 GB",
        hoursPlayed: 65,
        fromHome: true,
    },
    // ── Library games with reliable Steam CDN / Epic CDN images ──
    {
        id: 4,
        title: "Euro Truck Simulator 2",
        genre: "Simulator",
        poster: "https://m.media-amazon.com/images/M/MV5BYTBkOGFhZDAtZTE5Yy00OTQ2LTkwNmUtNmUzOTYwMzExMWE4XkEyXkFqcGc@._V1_.jpg",
        accentColor: "#cd4a12",
        installed: true,
        size: "70 GB",
        hoursPlayed: 120,
        fromHome: false,
    },
    {
        id: 5,
        title: "Pac-Man Museum+",
        genre: "Arcade",
        poster: "https://upload.wikimedia.org/wikipedia/en/9/9a/Pacman_museum_plus_2022_cover.jpg",
        accentColor: "#f5c518",
        installed: true,
        size: "3 GB",
        hoursPlayed: 22,
        fromHome: false,
    },
    {
        id: 6,
        title: "Astro's Playroom",
        genre: "Platformer",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1700030/library_600x900_2x.jpg",
        accentColor: "#00b4d8",
        installed: true,
        size: "12 GB",
        hoursPlayed: 15,
        fromHome: false,
    },
    {
        id: 7,
        title: "Crash Bandicoot 4",
        genre: "Platformer",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1378020/library_600x900_2x.jpg",
        accentColor: "#e07722",
        installed: true,
        size: "30 GB",
        hoursPlayed: 50,
        fromHome: false,
    },
    {
        id: 8,
        title: "Demon's Souls",
        genre: "Action RPG",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/2241770/library_600x900_2x.jpg",
        accentColor: "#6b4c3b",
        installed: false,
        size: "66 GB",
        hoursPlayed: 0,
        fromHome: false,
    },
    {
        id: 9,
        title: "Fortnite",
        genre: "Battle Royale",
        poster: "https://play-lh.googleusercontent.com/FxJDPDIDJKlG9C8lOxaS041X27A0SrHAa46SGDIpPusAd4IEJihZTyGf-8rTZ_GpF34aeLvULilVuO0cpCJxTg",
        accentColor: "#00d4ff",
        installed: true,
        size: "30 GB",
        hoursPlayed: 175,
        fromHome: false,
    },
    {
        id: 10,
        title: "Immortals Fenyx Rising",
        genre: "Action RPG",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/2221920/library_600x900_2x.jpg",
        accentColor: "#9b59b6",
        installed: true,
        size: "23 GB",
        hoursPlayed: 40,
        fromHome: false,
    },
    {
        id: 11,
        title: "Marvel's Spider-Man",
        genre: "Action-Adventure",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1817070/library_600x900_2x.jpg",
        accentColor: "#cc0000",
        installed: true,
        size: "49 GB",
        hoursPlayed: 95,
        fromHome: false,
    },
    {
        id: 12,
        title: "Spider-Man Miles Morales",
        genre: "Action-Adventure",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1817190/library_600x900_2x.jpg",
        accentColor: "#8b5cf6",
        installed: true,
        size: "39 GB",
        hoursPlayed: 60,
        fromHome: false,
    },
    {
        id: 13,
        title: "NBA 2K22",
        genre: "Sports",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1644960/library_600x900_2x.jpg",
        accentColor: "#1a78c2",
        installed: false,
        size: "100 GB",
        hoursPlayed: 0,
        fromHome: false,
    },
    {
        id: 14,
        title: "Returnal",
        genre: "Roguelike",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1649240/library_600x900_2x.jpg",
        accentColor: "#00ff9d",
        installed: true,
        size: "54 GB",
        hoursPlayed: 33,
        fromHome: false,
    },
    {
        id: 15,
        title: "Ratchet & Clank",
        genre: "Platformer",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1895840/library_600x900_2x.jpg",
        accentColor: "#ff8c00",
        installed: true,
        size: "57 GB",
        hoursPlayed: 48,
        fromHome: false,
    },
    {
        id: 16,
        title: "Riders Republic",
        genre: "Sports",
        poster: "https://image.api.playstation.com/vulcan/img/rnd/202112/2100/7eEv1gTTKw9GA5OWi00yyT3s.png",
        accentColor: "#e67e22",
        installed: true,
        size: "25 GB",
        hoursPlayed: 18,
        fromHome: false,
    },
    {
        id: 17,
        title: "Ghost of Tsushima",
        genre: "Action-Adventure",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/2215430/library_600x900_2x.jpg",
        logo: "/store-logos/ghost.png",
        accentColor: "#e67e22",
        installed: true,
        size: "45 GB",
        hoursPlayed: 88,
        fromHome: false,
    },
    {
        id: 18,
        title: "COD: Cold War",
        genre: "FPS",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1985810/library_600x900_2x.jpg",
        accentColor: "#1a3a5c",
        installed: false,
        size: "175 GB",
        hoursPlayed: 0,
        fromHome: false,
    },
    {
        id: 19,
        title: "Overcooked! 2",
        genre: "Co-op",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/728880/library_600x900_2x.jpg",
        accentColor: "#ffcc00",
        installed: true,
        size: "2 GB",
        hoursPlayed: 28,
        fromHome: false,
    },
    {
        id: 20,
        title: "Back 4 Blood",
        genre: "Co-op Shooter",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/924970/library_600x900_2x.jpg",
        accentColor: "#c0392b",
        installed: true,
        size: "40 GB",
        hoursPlayed: 55,
        fromHome: false,
    },
    {
        id: 21,
        title: "Splitgate",
        genre: "FPS",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/677620/library_600x900_2x.jpg",
        accentColor: "#5c3e96",
        installed: true,
        size: "12 GB",
        hoursPlayed: 20,
        fromHome: false,
    },
    {
        id: 22,
        title: "Battlefield 2042",
        genre: "FPS",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1517290/library_600x900_2x.jpg",
        accentColor: "#2980b9",
        installed: true,
        size: "90 GB",
        hoursPlayed: 42,
        fromHome: false,
    },
    {
        id: 23,
        title: "God of War",
        genre: "Action-Adventure",
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/library_600x900_2x.jpg",
        logo: "/store-logos/god_of_war_logo.png",
        accentColor: "#c0392b",
        installed: true,
        size: "50 GB",
        hoursPlayed: 90,
        fromHome: false,
    },
];

const SORT_OPTIONS = [
    { label: "Name (A - Z)", value: "name-asc" },
    { label: "Name (Z - A)", value: "name-desc" },
    { label: "Recently Played", value: "recent" },
    { label: "Most Played", value: "hours" },
    { label: "Installed", value: "installed" },
];

const TABS = ["Games", "Media"];

/* ── Individual Game Cover Card ── */
const GameCoverCard = ({ game, index, onClick, featured = false }) => {
    const [hovered, setHovered] = React.useState(false);
    const [imgError, setImgError] = React.useState(false);

    return (
        <motion.div
            data-focusable
            data-library-game
            role="button"
            tabIndex={0}
            aria-label={`Open ${game.title}`}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick(game);
                }
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.025, 0.5), duration: 0.35 }}
            onClick={() => onClick(game)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: "relative",
                borderRadius: "10px",
                overflow: "hidden",
                cursor: "pointer",
                aspectRatio: "1 / 1",
                background: `linear-gradient(135deg, ${game.accentColor}11, #10131e)`,
                /* No colored glow border — just a clean 1px neutral border */
                border: hovered ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.6)" : "0 2px 8px rgba(0,0,0,0.4)",
                /* Subtle lift — no scale, just Y translation */
                transform: hovered ? "translateY(-5px)" : "translateY(0)",
                transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.15s, box-shadow 0.2s",
                /* Featured card spans 2 cols and 2 rows */
                ...(featured ? { gridColumn: "span 2", gridRow: "span 2" } : {}),
            }}
        >
            {/* Cover image */}
            {!imgError ? (
                <img
                    src={game.poster} alt={game.title}
                    onError={() => setImgError(true)}
                    style={{
                        width: "100%", height: "100%",
                        objectFit: "cover", display: "block",
                        // slight zoom on hover
                        transform: hovered ? "scale(1.06)" : "scale(1)",
                        transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    }}
                />
            ) : (
                <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "flex-end", padding: "14px",
                    background: `linear-gradient(160deg, ${game.accentColor}15, #0d1117)`,
                }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.3 }}>
                        {game.title}
                    </div>
                </div>
            )}

            {/* Base gradient — always visible, dims the bottom 40% */}
            <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 45%, transparent 65%)",
            }} />

            {/* TOP ACCENT BAR — appears on hover, much more editorial than all-around glow */}
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0,
                height: "2px",
                background: game.accentColor,
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.15s",
            }} />

            {/* Not-installed badge — minimal */}
            {
                !game.installed && (
                    <div style={{
                        position: "absolute", top: "10px", right: "10px",
                        background: "rgba(7,8,15,0.85)",
                        borderRadius: "4px", padding: "2px 7px",
                        fontSize: "8px", fontWeight: 700,
                        color: "rgba(255,255,255,0.38)",
                        letterSpacing: "1px", textTransform: "uppercase",
                    }}>
                        Stored
                    </div>
                )
            }

            {/* Bottom info — slides up on hover */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: featured ? "20px 16px 16px" : "14px 12px 12px",
                transform: hovered ? "translateY(0)" : "translateY(6px)",
                opacity: hovered ? 1 : 0.7,
                transition: "transform 0.22s ease, opacity 0.2s ease",
            }}>
                <div style={{
                    fontSize: featured ? "14px" : "11px",
                    fontWeight: 700, color: "#fff",
                    marginBottom: "3px",
                    lineHeight: 1.3,
                    /* Slight text-shadow so it reads on any image */
                    textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                }}>
                    {game.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.55)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {game.genre}
                    </span>
                    {game.hoursPlayed > 0 && (
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.55)" }}>
                            {game.hoursPlayed}h
                        </span>
                    )}
                </div>
                {
                    game.progress > 0 && (
                        <div style={{ marginTop: "6px", height: "2px", background: "rgba(255,255,255,0.15)", borderRadius: "1px" }}>
                            <div style={{ width: `${game.progress}%`, height: "100%", background: game.accentColor, borderRadius: "1px" }} />
                        </div>
                    )
                }
            </div >
        </motion.div >
    );
};

/* ─────────────────────────────────────────────────────────────
   GAME DETAIL MODAL
───────────────────────────────────────────────────────────── */
const GameDetailModal = ({ game, onClose }) => {
    const [imgError, setImgError] = React.useState(false);

    if (!game) return null;
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: "min(680px, 90vw)",
                        background: "linear-gradient(135deg, rgba(15,18,30,0.98) 0%, rgba(8,12,24,0.98) 100%)",
                        border: `1px solid ${game.accentColor}44`,
                        borderRadius: "24px",
                        overflow: "hidden",
                        boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px ${game.accentColor}22`,
                    }}
                >
                    {/* Cover banner */}
                    <div style={{ position: "relative", height: "200px", overflow: "hidden" }}>
                        {!imgError ? (
                            <img src={game.poster} alt={game.title}
                                onError={() => setImgError(true)}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${game.accentColor}44, #0d1117)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "60px" }}>🎮</div>
                        )}
                        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(10,14,26,1) 0%, transparent 60%)` }} />
                        <button onClick={onClose} style={{
                            position: "absolute", top: "16px", right: "16px",
                            background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer",
                            color: "white", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>✕</button>
                    </div>

                    {/* Details */}
                    <div style={{ padding: "8px 28px 28px" }}>
                        <div style={{ marginBottom: "6px" }}>
                            <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{game.title}</div>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: "2px" }}>{game.genre}</div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
                            {[
                                { label: "Time Played", value: `${game.hoursPlayed}h` },
                                { label: "Storage", value: game.size },
                                { label: "Status", value: game.installed ? "Installed" : "Not Installed" },
                            ].map(stat => (
                                <div key={stat.label} style={{
                                    flex: 1, minWidth: "80px",
                                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                                    borderRadius: "12px", padding: "12px",
                                }}>
                                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{stat.label}</div>
                                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Progress bar */}
                        {game.progress > 0 && (
                            <div style={{ marginBottom: "20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Completion</span>
                                    <span style={{ fontSize: "11px", color: game.accentColor, fontWeight: 700 }}>{game.progress}%</span>
                                </div>
                                <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                                    <motion.div
                                        initial={{ width: 0 }} animate={{ width: `${game.progress}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        style={{ height: "100%", background: `linear-gradient(90deg, ${game.accentColor}, ${game.accentColor}99)`, borderRadius: "2px" }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button style={{
                                flex: 1, padding: "12px", borderRadius: "12px",
                                background: game.accentColor, border: "none", cursor: "pointer",
                                color: "#fff", fontWeight: 700, fontSize: "14px",
                                boxShadow: `0 6px 20px ${game.accentColor}55`,
                                transition: "all 200ms ease",
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                                {game.installed ? "▶  Play Now" : "⬇  Download"}
                            </button>
                            <button style={{
                                padding: "12px 16px", borderRadius: "12px",
                                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                                cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "14px",
                                transition: "all 200ms ease",
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                            >
                                ···
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

/* ─────────────────────────────────────────────────────────────
   MAIN GAME LIBRARY
───────────────────────────────────────────────────────────── */
const GameLibrary = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("Games");
    const [sortOption, setSortOption] = useState("name-asc");
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const sortedGames = useMemo(() => {
        let games = [...libraryGames];
        if (searchQuery) {
            games = games.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        switch (sortOption) {
            case "name-asc": return games.sort((a, b) => a.title.localeCompare(b.title));
            case "name-desc": return games.sort((a, b) => b.title.localeCompare(a.title));
            case "recent": return games.sort((a, b) => (b.hoursPlayed > 0 ? 1 : 0) - (a.hoursPlayed > 0 ? 1 : 0));
            case "hours": return games.sort((a, b) => b.hoursPlayed - a.hoursPlayed);
            case "installed": return games.sort((a, b) => (b.installed ? 1 : 0) - (a.installed ? 1 : 0));
            default: return games;
        }
    }, [sortOption, searchQuery]);

    const installedCount = libraryGames.filter(g => g.installed).length;

    // Consistent grid navigation for keyboard and gamepad. Horizontal holds
    // start repeating only after three seconds; releasing immediately stops it.
    useEffect(() => {
        let frame = 0;
        let heldKey = null;
        let holdTimer = null;
        let repeatTimer = null;
        let gamepadDirection = null;
        let gamepadHeldSince = 0;
        let gamepadRepeatTimer = null;
        let gamepadRepeating = false;
        let previousSelect = false;
        const cards = () => Array.from(document.querySelectorAll("[data-library-game]"));
        const moveFocus = (direction) => {
            const list = cards();
            if (!list.length) return;
            const current = list.indexOf(document.activeElement);
            const index = current < 0 ? 0 : current;
            const columns = window.innerWidth < 900 ? 3 : window.innerWidth < 1300 ? 4 : 6;
            const delta = direction === "left" ? -1 : direction === "right" ? 1 : direction === "up" ? -columns : columns;
            const next = Math.max(0, Math.min(list.length - 1, index + delta));
            list[next]?.focus({ preventScroll: true });
            list[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
        };
        const stopKeyboardRepeat = () => {
            heldKey = null;
            if (holdTimer) window.clearTimeout(holdTimer);
            if (repeatTimer) window.clearInterval(repeatTimer);
            holdTimer = null;
            repeatTimer = null;
        };
        const onKeyDown = (event) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            if (window.__onScreenKeyboardOpen || event.altKey || event.ctrlKey || event.metaKey) return;
            if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName)) return;
            event.preventDefault();
            event.stopPropagation();
            const direction = event.key.replace("Arrow", "").toLowerCase();
            if (event.repeat || heldKey === event.key) return;
            stopKeyboardRepeat();
            heldKey = event.key;
            moveFocus(direction);
            if (direction === "left" || direction === "right") {
                holdTimer = window.setTimeout(() => {
                    if (heldKey !== event.key) return;
                    repeatTimer = window.setInterval(() => {
                        if (heldKey === event.key) moveFocus(direction);
                    }, 130);
                }, 3000);
            }
        };
        const onKeyUp = (event) => { if (event.key === heldKey) stopKeyboardRepeat(); };
        const stopGamepadRepeat = () => {
            if (gamepadRepeatTimer) window.clearInterval(gamepadRepeatTimer);
            gamepadRepeatTimer = null;
            gamepadRepeating = false;
        };
        const poll = (timestamp) => {
            const pad = Array.from(navigator.getGamepads?.() || []).find(item => item?.connected);
            let nextDirection = null;
            if (pad && !window.__onScreenKeyboardOpen && !document.querySelector(".quick-menu-panel")) {
                const selectPressed = Boolean(pad.buttons[0]?.pressed);
                if (selectPressed && !previousSelect && document.activeElement?.matches?.("[data-library-game]")) {
                    document.activeElement.click();
                }
                previousSelect = selectPressed;
                if (pad.buttons[14]?.pressed) nextDirection = "left";
                else if (pad.buttons[15]?.pressed) nextDirection = "right";
                else if (pad.buttons[12]?.pressed) nextDirection = "up";
                else if (pad.buttons[13]?.pressed) nextDirection = "down";
                else if ((pad.axes?.[0] ?? 0) < -0.78) nextDirection = "left";
                else if ((pad.axes?.[0] ?? 0) > 0.78) nextDirection = "right";
                else if ((pad.axes?.[1] ?? 0) < -0.78) nextDirection = "up";
                else if ((pad.axes?.[1] ?? 0) > 0.78) nextDirection = "down";
            }
            if (nextDirection !== gamepadDirection) {
                stopGamepadRepeat();
                gamepadDirection = nextDirection;
                gamepadHeldSince = nextDirection ? timestamp : 0;
                if (nextDirection) moveFocus(nextDirection);
            } else if (gamepadDirection && !gamepadRepeating && timestamp - gamepadHeldSince >= 3000) {
                gamepadRepeating = true;
                const repeatDirection = gamepadDirection;
                gamepadRepeatTimer = window.setInterval(() => moveFocus(repeatDirection), 130);
            }
            if (!gamepadDirection) stopGamepadRepeat();
            frame = window.requestAnimationFrame(poll);
        };
        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("keyup", onKeyUp, true);
        window.addEventListener("blur", stopKeyboardRepeat);
        frame = window.requestAnimationFrame(poll);
        return () => {
            stopKeyboardRepeat();
            stopGamepadRepeat();
            window.cancelAnimationFrame(frame);
            window.removeEventListener("keydown", onKeyDown, true);
            window.removeEventListener("keyup", onKeyUp, true);
            window.removeEventListener("blur", stopKeyboardRepeat);
        };
    }, [sortedGames.length]);

    return (
        <div style={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            position: "relative",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            userSelect: "none",
            color: "#fff",
            background: "#050810",
        }}>
            {/* ── STARFIELD BACKGROUND ── */}
            <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
                {/* Animated star particles */}
                {[...Array(80)].map((_, i) => (
                    <div key={i} style={{
                        position: "absolute",
                        width: Math.random() > 0.7 ? "2px" : "1px",
                        height: Math.random() > 0.7 ? "2px" : "1px",
                        background: `rgba(255,255,255,${0.2 + Math.random() * 0.6})`,
                        borderRadius: "50%",
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite alternate`,
                        animationDelay: `${Math.random() * 4}s`,
                    }} />
                ))}
                {/* Gold particle orbs */}
                {[...Array(8)].map((_, i) => (
                    <div key={`orb-${i}`} style={{
                        position: "absolute",
                        width: `${4 + Math.random() * 8}px`,
                        height: `${4 + Math.random() * 8}px`,
                        background: `rgba(200, 160, 60, ${0.3 + Math.random() * 0.4})`,
                        borderRadius: "50%",
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        filter: "blur(1px)",
                        animation: `float ${6 + Math.random() * 6}s ease-in-out infinite alternate`,
                        animationDelay: `${Math.random() * 3}s`,
                    }} />
                ))}
                {/* Subtle gradient overlay */}
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(0,80,180,0.12) 0%, transparent 60%)" }} />
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 80%, rgba(100,60,200,0.08) 0%, transparent 50%)" }} />
            </div>

            {/* CSS animations */}
            <style>{`
                @keyframes twinkle { 0% { opacity: 0.2; } 100% { opacity: 1; } }
                @keyframes float { 0% { transform: translateY(0px); } 100% { transform: translateY(-20px); } }
                .lib-scroll::-webkit-scrollbar { width: 4px; }
                .lib-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
                .lib-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
            `}</style>

            {/* ── CONTENT ── */}
            <div style={{ position: "relative", zIndex: 10, width: "100%", height: "100%", display: "flex", flexDirection: "column", paddingTop: "80px" }}>

                {/* ── TOP TABS + GAME LIBRARY HEADER ── */}
                <div style={{ padding: "16px 40px 0", display: "flex", alignItems: "center", gap: "0" }}>
                    {/* PS+ Icon */}
                    <div style={{
                        width: "48px", height: "48px", marginRight: "16px",
                        background: "linear-gradient(135deg, #2a3050, #1a2040)",
                        borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid rgba(255,255,255,0.12)",
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.8)" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.8)" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.8)" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.8)" />
                        </svg>
                    </div>

                    <div style={{ fontSize: "26px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#fff", marginRight: "24px" }}>Game Library</div>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: "0", marginLeft: "auto" }}>
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    if (tab === "Media") navigate("/media");
                                }}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: "16px", fontWeight: 400,
                                    fontFamily: "var(--font-ui)",
                                    color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.5)",
                                    padding: "10px 20px",
                                    letterSpacing: "0.8px",
                                    borderBottom: activeTab === tab ? "2px solid #fff" : "2px solid transparent",
                                    transition: "all 0.2s ease",
                                }}
                            >{tab}</button>
                        ))}
                    </div>

                    {/* Right icons */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", marginLeft: "20px" }}>
                        <button onClick={() => setShowSearch(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.7, transition: "opacity 0.2s" }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
                            <SearchIcon />
                        </button>
                        <button style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.7, transition: "opacity 0.2s" }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
                            <GearIcon />
                        </button>
                        {/* User avatar */}
                        <div style={{
                            width: "36px", height: "36px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #0070d1, #00d4ff)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: "13px", color: "white",
                            border: "2px solid rgba(255,255,255,0.2)",
                        }}>GP</div>

                        {/* Clock */}
                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                    </div>
                </div>

                {/* ── SEARCH BAR ── */}
                <AnimatePresence>
                    {showSearch && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ padding: "8px 40px 0" }}
                        >
                            <input
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search games..."
                                style={{
                                    width: "300px", padding: "8px 16px",
                                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                                    borderRadius: "20px", color: "#fff", fontSize: "14px", outline: "none",
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── STORAGE INFO + SORT ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px 10px" }}>
                    <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                        Console storage: <span style={{ color: "#fff", fontWeight: 700 }}>{installedCount}</span>
                        <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: "8px", fontSize: "12px" }}>
                            • {sortedGames.length} games total
                        </span>
                    </div>

                    {/* Sort dropdown */}
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowSortMenu(s => !s)}
                            style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "20px", padding: "7px 16px", cursor: "pointer",
                                color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: 600,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        >
                            <SortIcon />
                            Sort by: {SORT_OPTIONS.find(s => s.value === sortOption)?.label}
                            <span style={{ fontSize: "10px" }}>▼</span>
                        </button>

                        <AnimatePresence>
                            {showSortMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    style={{
                                        position: "absolute", top: "calc(100% + 8px)", right: 0,
                                        background: "rgba(12,16,28,0.97)", backdropFilter: "blur(20px)",
                                        border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px",
                                        overflow: "hidden", minWidth: "200px", zIndex: 100,
                                        boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                                    }}
                                >
                                    {SORT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setSortOption(opt.value); setShowSortMenu(false); }}
                                            style={{
                                                width: "100%", textAlign: "left",
                                                padding: "11px 18px",
                                                background: sortOption === opt.value ? "rgba(0,112,209,0.2)" : "transparent",
                                                border: "none", cursor: "pointer",
                                                color: sortOption === opt.value ? "#fff" : "rgba(255,255,255,0.65)",
                                                fontSize: "13px", fontWeight: sortOption === opt.value ? 700 : 400,
                                                borderLeft: sortOption === opt.value ? "2px solid #0070d1" : "2px solid transparent",
                                                transition: "all 0.15s",
                                            }}
                                            onMouseEnter={e => { if (sortOption !== opt.value) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                            onMouseLeave={e => { if (sortOption !== opt.value) e.currentTarget.style.background = "transparent"; }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── GAME GRID ── */}
                <div
                    className="lib-scroll"
                    onClick={() => showSortMenu && setShowSortMenu(false)}
                    style={{
                        flex: 1, overflowY: "auto",
                        padding: "4px 40px 40px",
                    }}
                >
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gap: "10px",
                        /* Allow featured card to pop through */
                        gridAutoRows: "1fr",
                    }}>
                        {sortedGames.map((game, index) => (
                            <GameCoverCard
                                key={game.id}
                                game={game}
                                index={index}
                                featured={index === 0}
                                onClick={setSelectedGame}
                            />
                        ))}
                    </div>

                    {sortedGames.length === 0 && (
                        <div style={{ textAlign: "center", padding: "80px 40px", color: "rgba(255,255,255,0.4)" }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
                            <div style={{ fontSize: "18px", fontWeight: 600 }}>No games found</div>
                            <div style={{ fontSize: "14px", marginTop: "8px" }}>Try a different search term</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── GAME DETAIL MODAL ── */}
            {selectedGame && (
                <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} />
            )}
        </div>
    );
};

export default GameLibrary;
