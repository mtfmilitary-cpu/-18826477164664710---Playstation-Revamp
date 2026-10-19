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
import { featuredGames, recentlyPlayedGames, onlineFriends, recentAchievements, userProfile } from "../data/mockData.js";
import LogoImage from "./LogoImage.jsx";
import { useDualSenseWS } from "./Anikator/useDualSenseWS";
import { searchSteamStore, getSteamGameDetails } from "../services/steamApi";

/* ── PS Button SVG Icons ── */
const CrossIcon = ({ size = 16, color = "white" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);
const CircleIcon = ({ size = 16, color = "white" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" />
    </svg>
);
const TriangleIcon = ({ size = 16, color = "white" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4L21 20H3L12 4Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
);
const SquareIcon = ({ size = 16, color = "white" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2.5" />
    </svg>
);

/* PS Logo */
const PSLogoMini = () => (
    <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" style={{ width: 28, height: 28, filter: "brightness(0) invert(1)" }} />
);

/* Settings gear */
const GearIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

/* Search icon */
const SearchIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

/* ────────────────────────────────────────────────────────────
   UNIFIED GAME LIST — featuredGames + 6 extra library titles
   Every entry MUST have: poster, accentColor, title.
   logo is optional (falls back to title text).
   fromLibrary=true → "Play Game" navigates to /library instead of doing nothing.
──────────────────────────────────────────────────────────── */
const extraLibraryGames = [
    {
        id: 101,
        title: "GOD OF WAR",
        genre: "Action-Adventure",
        logo: "/store-logos/god_of_war_logo.png",
        // same thumb URL used in StoreUI
        poster: "https://cdn1.epicgames.com/offer/3ddd6a590da64e3686042d108968a6b2/EGS_GodofWar_SantaMonicaStudio_S1_2560x1440-5d74d9b240bba8f2c40920dcde7c5c67_2560x1440-5d74d9b240bba8f2c40920dcde7c5c67",
        accentColor: "#c0392b",
        fromLibrary: true,
    },
    {
        id: 102,
        title: "MARVEL'S SPIDER-MAN 2",
        genre: "Action-Adventure",
        logo: null,
        // IGDB CDN — reliable, no hotlink restrictions
        poster: "https://4kwallpapers.com/images/wallpapers/marvels-spider-man-3840x2160-12554.jpeg",
        accentColor: "#cc0000",
        fromLibrary: true,
    },
    {
        id: 103,
        title: "GHOST OF TSUSHIMA",
        genre: "Action-Adventure",
        logo: "/store-logos/ghost.png",
        // Steam CDN library hero — Ghost of Tsushima Director's Cut (App 2215430)
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/2215430/library_hero.jpg",
        accentColor: "#e67e22",
        fromLibrary: true,
    },
    {
        id: 104,
        title: "GTA V",
        genre: "Open World",
        logo: "/store-logos/gta.png",
        // Epic Games CDN — reliable
        poster: "https://cdn1.epicgames.com/offer/b0cd075465c44f87be3b505ac04a2e46/EGS_GrandTheftAutoVEnhanced_RockstarNorth_S1_2560x1440-906d8ae76a91aafc60b1a54c23fab496",
        accentColor: "#8e44ad",
        fromLibrary: true,
    },
    {
        id: 105,
        title: "CYBERPUNK 2077",
        genre: "RPG",
        logo: "/store-logos/cp.png",
        // Epic Games CDN — reliable
        poster: "https://cdn1.epicgames.com/offer/77f2b98e2cef40c8a7437518bf420e47/EGS_Cyberpunk2077_CDPROJEKTRED_S1_03_2560x1440-359e77d3cd0a40aebf3bbc130d14c5c7",
        accentColor: "#f0e040",
        fromLibrary: true,
    },
    {
        id: 106,
        title: "THE LAST OF US",
        genre: "Action-Adventure",
        logo: "/store-logos/los.png",
        // Steam CDN library hero — The Last of Us Part I (App 1888930)
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1888930/library_hero.jpg",
        accentColor: "#d4a017",
        fromLibrary: true,
    },
    {
        id: 107,
        title: "RED DEAD II",
        genre: "Open World",
        logo: "/store-logos/rdr2.png",
        // Steam CDN library hero — Red Dead Redemption 2 (App 1174180)
        poster: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_hero.jpg",
        accentColor: "#8b4513",
        fromLibrary: true,
    },
];

// Single source of truth for ALL games shown on home screen
const allGames = [...featuredGames, ...extraLibraryGames];

/* ── Game Card for top carousel ── */
const GameCard = ({ game, isActive, onClick }) => {
    const [imgFailed, setImgFailed] = React.useState(false);
    // accent fallback for placeholder bg
    const accent = game.accentColor || "#1a2040";

    return (
        <div
            data-focusable
            onClick={onClick}
            style={{
                flexShrink: 0,
                width: isActive ? "180px" : "115px",
                height: isActive ? "105px" : "65px",
                borderRadius: "10px",
                overflow: "hidden",
                cursor: "pointer",
                border: isActive ? "2px solid rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.15)",
                boxShadow: isActive ? "0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.15)" : "0 2px 12px rgba(0,0,0,0.5)",
                transform: isActive ? "translateY(-6px)" : "translateY(0) scale(1)",
                transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                marginRight: "4px",
                // fallback bg shown when image is missing
                background: imgFailed ? `linear-gradient(135deg, ${accent}55, #0d1128)` : "transparent",
            }}
            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.transform = "translateY(-3px) scale(1.05)"; e.currentTarget.style.borderColor = "rgba(0,112,209,0.8)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,112,209,0.5)"; } }}
            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.5)"; } }}
        >
            {!imgFailed && (
                <img
                    src={game.poster}
                    alt={game.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={() => setImgFailed(true)}
                />
            )}

            {/* Always visible overlay for active card; also shown as placeholder when image fails */}
            {(isActive || imgFailed) && (
                <div style={{
                    position: "absolute", inset: 0,
                    background: imgFailed
                        ? `linear-gradient(135deg, ${accent}33, rgba(0,0,0,0.7))`
                        : "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: imgFailed ? "center" : "flex-start",
                    justifyContent: imgFailed ? "center" : "flex-end",
                    padding: "6px 8px",
                }}>
                    <span style={{
                        fontSize: imgFailed ? "8px" : "9px",
                        fontWeight: 700,
                        color: "white",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        textAlign: "center",
                        lineHeight: 1.3,
                    }}>
                        {game.title}
                    </span>
                </div>
            )}
        </div>
    );
};


/* ── Friends Panel (bottom-left floating) ── */
const FriendsPanelOverlay = () => {
    const online = onlineFriends.filter(f => f.status === "online" || f.status === "in-game");
    return (
        <div style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "20px",
            width: "280px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
                <SquareIcon size={13} color="#0070d1" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>Friends</span>
                <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "#00e676", background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.25)", padding: "2px 8px", borderRadius: "20px" }}>{online.length} Online</span>
            </div>
            {onlineFriends.slice(0, 3).map((f, i) => (
                <div key={f.id} data-focusable style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 4px", borderRadius: "10px", cursor: "pointer", transition: "background 150ms ease" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: [" linear-gradient(135deg,#3a4a6b,#1e2d45)", "linear-gradient(135deg,#2a4a3a,#1a3028)", "linear-gradient(135deg,#4a3a6b,#2d1e45)"][i % 3], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                            {f.username[0]}
                        </div>
                        <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "9px", height: "9px", borderRadius: "50%", background: f.status === "in-game" ? "#0070d1" : "#00e676", border: "2px solid rgba(8,10,20,0.9)", boxShadow: f.status === "in-game" ? "0 0 5px #0070d1" : "0 0 5px #00e676" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.username}</div>
                        <div style={{ fontSize: "10px", color: f.currentGame ? "#8a9bb5" : "#00e676", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.currentGame || "Online"}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ── Chat Panel (bottom-left, below friends) ── */
const ChatOverlay = () => {
    const [msg, setMsg] = React.useState("");
    const [msgs, setMsgs] = React.useState([
        { id: 1, user: "SH", text: "ggs last round 🔥", self: false },
        { id: 2, user: "CO", text: "ready for ranked?", self: false },
    ]);
    const send = () => {
        if (!msg.trim()) return;
        setMsgs(p => [...p, { id: Date.now(), user: "GP", text: msg.trim(), self: true }]);
        setMsg("");
    };
    return (
        <div style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "20px",
            width: "280px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            overflow: "hidden"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                <CircleIcon size={13} color="#0070d1" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Party Chat</span>
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                {onlineFriends.slice(0, 4).map((f, i) => (
                    <div key={f.id} style={{ width: "28px", height: "28px", borderRadius: "50%", background: ["#3a4a6b", "#2a4a3a", "#4a3a6b", "#4a3a2a"][i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(255,255,255,0.1)", position: "relative" }}>
                        {f.username[0]}
                        <div style={{ position: "absolute", bottom: 0, right: 0, width: "7px", height: "7px", borderRadius: "50%", background: "#00e676", border: "1.5px solid rgba(8,10,20,0.9)" }} />
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                {msgs.slice(-4).map(m => (
                    <div key={m.id} style={{ display: "flex", gap: "6px", alignItems: "flex-start", justifyContent: m.self ? "flex-end" : "flex-start" }}>
                        {!m.self && <span style={{ fontSize: "10px", fontWeight: 700, color: "#0070d1", minWidth: "20px", paddingTop: "2px" }}>{m.user}</span>}
                        <span style={{ fontSize: "12px", color: "#e0e0e0", background: m.self ? "rgba(0,112,209,0.3)" : "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "6px 10px", maxWidth: "180px", lineHeight: "1.4" }}>{m.text}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
                <input
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Type message..."
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "11px", padding: "6px 10px", outline: "none" }}
                />
                <button onClick={send} style={{ background: "#0070d1", border: "none", borderRadius: "8px", padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <TriangleIcon size={12} color="white" />
                </button>
            </div>
        </div>
    );
};

/* ── Stats/Achievements box (bottom-right) ── */
const StatsBox = ({ game }) => {
    const progressPct = Math.round((userProfile.currentXP / userProfile.nextLevelXP) * 100);
    const trophyCount = recentAchievements.length;

    return (
        <div style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "24px 28px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            minWidth: "320px",
        }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 112, 209, 0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.1)"; }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#f5a623"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" /></svg>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>Progress & Trophies</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: "9px", color: "#8a9bb5", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>Level Progress</div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{progressPct}%</div>
                    <div style={{ height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "8px" }}>
                        <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #0070d1, #00d4ff)", borderRadius: "2px" }} />
                    </div>
                    <div style={{ fontSize: "9px", color: "#8a9bb5", marginTop: "4px" }}>Lv {userProfile.level} → {userProfile.nextLevel}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: "9px", color: "#8a9bb5", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>Earned</div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{trophyCount}/{trophyCount + 42}</div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                        {[{ color: "#FFD700", count: 0 }, { color: "#C0C0C0", count: 0 }, { color: "#CD7F32", count: trophyCount }].map((t, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill={t.color}><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" /></svg>
                                <span style={{ fontSize: "9px", color: "#8a9bb5" }}>{t.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   MAIN HOME DASHBOARD
───────────────────────────────────────────────────────────── */
const HomeDashboard = () => {
    const navigate = useNavigate();
    const { action } = useDualSenseWS();

    // activeIdx now indexes into allGames (not just featuredGames)
    const [activeIdx, setActiveIdx] = useState(0);
    const [tab, setTab] = useState("Games");
    const [focusZone, setFocusZone] = useState("GAMES");
    const [navIdx, setNavIdx] = useState(0);
    const [quickIdx, setQuickIdx] = useState(0);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [resolvedGame, setResolvedGame] = useState(null);
    const [steamDetails, setSteamDetails] = useState(null);
    const [detailsBusy, setDetailsBusy] = useState(false);
    const [detailsMessage, setDetailsMessage] = useState("");
    const navItems = ["Games", "Media", "Accessories", "Showcase", "Store"];

    // Navigation logic for D-Pad — cycles through allGames
    useEffect(() => {
        if (!action) return;

        if (focusZone === "GAMES") {
            if (action === "DPAD_LEFT") {
                setActiveIdx(i => (i - 1 + allGames.length) % allGames.length);
            } else if (action === "DPAD_RIGHT") {
                setActiveIdx(i => (i + 1) % allGames.length);
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
                if (t === "Accessories") navigate("/accessories");
                else if (t === "Showcase") navigate("/showcase");
                else if (t === "Store") navigate("/store");
                else setTab(t);
            }
        }
        else if (focusZone === "QUICK") {
            if (action === "DPAD_LEFT") {
                setFocusZone("NAV");
            } else if (action === "DPAD_RIGHT") {
                setQuickIdx(0);
            } else if (action === "DPAD_DOWN") {
                setFocusZone("GAMES");
            }
        }
    }, [action, focusZone, navIdx, quickIdx]);

    // Auto-rotate through allGames (first 3 featured then loop)
    useEffect(() => {
        const t = setInterval(() => setActiveIdx(i => (i + 1) % allGames.length), 8000);
        return () => clearInterval(t);
    }, []);

    async function openGameDetails(selectedGame) {
        setDetailsOpen(true);
        setResolvedGame(null);
        setSteamDetails(null);
        setDetailsMessage("");
        setDetailsBusy(true);
        try {
            const search = await searchSteamStore(selectedGame.title || selectedGame.name || "");
            const items = search.items || [];
            const wanted = (selectedGame.title || selectedGame.name || "").trim().toLowerCase();
            const match = items.find((item) => item.name.trim().toLowerCase() === wanted) || items[0] || null;
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
    const game = allGames[activeIdx];

    return (
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
                        backgroundImage: `url(${game.poster})`,
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
                    {allGames.map((g, i) => (
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
                                        onClick={() => openGameDetails(game)}
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
                                        {"Game Details"}
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
                        <FriendsPanelOverlay />

                        {/* Progress & Trophies */}
                        <StatsBox game={game} />

                        {/* Game dot indicators — one dot per allGames entry */}
                        <div style={{ display: "flex", gap: "6px", paddingRight: "4px", flexWrap: "wrap", maxWidth: "340px", justifyContent: "flex-end" }}>
                            {allGames.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveIdx(i)}
                                    style={{
                                        width: i === activeIdx ? "28px" : "6px",
                                        height: "4px",
                                        borderRadius: "2px",
                                        background: i === activeIdx
                                            ? "rgba(255,255,255,0.9)"
                                            : i < featuredGames.length
                                                ? "rgba(255,255,255,0.3)"
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
                <div role="dialog" aria-modal="true" aria-label="Game details" onClick={() => setDetailsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.78)", backdropFilter: "blur(14px)" }}>
                    <section onClick={(event) => event.stopPropagation()} style={{ width: "min(860px, 100%)", maxHeight: "90vh", overflow: "auto", borderRadius: 18, padding: 24, color: "#fff", background: "#101721", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 24px 90px rgba(0,0,0,.5)" }}>
                        <button onClick={() => setDetailsOpen(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, color: "#fff", padding: "8px 12px", cursor: "pointer" }}>← Back to Games</button>
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
                </div>
            )}
    );
};

export default HomeDashboard;
