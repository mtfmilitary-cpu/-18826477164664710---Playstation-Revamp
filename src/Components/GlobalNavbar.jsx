import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SearchIcon, Settings } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useDualSenseWS } from "./Anikator/useDualSenseWS";

const GlobalNavbar = () => {
    const location = useLocation();
    const currentPath = location.pathname;
    const { session } = useDualSenseWS();
    const [showQR, setShowQR] = useState(false);
    const [steamProfile, setSteamProfile] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/v1/profile/me", { cache: "no-store" })
            .then((response) => response.json())
            .then((data) => { if (!cancelled && data.connected) setSteamProfile(data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const navItems = [
        { label: "Games", path: "/home" },
        { label: "Library", path: "/library" },
        { label: "Media", path: "/media" },
        { label: "Store", path: "/store" },
        { label: "Showcase", path: "/showcase" },
        { label: "Friends", path: "/friends" },
        { label: "Party Chat", path: "/party" },
        { label: "Profile", path: "/profile" },
        { label: "Settings", path: "/settings" },
    ];

    return (
        <nav style={{
            position: "fixed",
            top: 0, left: 0, right: 0,
            height: "72px", minHeight: "72px",
            display: "flex", alignItems: "center",
            padding: "0 32px",
            background: "linear-gradient(to bottom, rgba(5,8,18,0.85) 0%, transparent 100%)",
            zIndex: 1000,
            transition: "all 0.3s ease",
        }}>
            {/* Logo */}
            <Link to="/home" style={{
                marginRight: "40px", display: "flex", alignItems: "center", gap: "10px",
                transition: "opacity 0.3s ease"
            }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam logo" style={{ height: "36px", width: "36px", filter: "brightness(0) invert(1)" }} /><span style={{color:"#fff",fontSize:"20px",fontWeight:700,letterSpacing:"-0.5px"}}>Steam</span>
            </Link>

            {/* Navigation Links */}
            <div style={{ display: "flex", gap: "28px" }}>
                {navItems.map((item) => {
                    // Exact path match (ignores query strings)
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            style={{
                                textDecoration: "none",
                                fontSize: "22px",
                                fontFamily: "var(--font-ui)",
                                fontWeight: 400,
                                color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                                padding: "8px 0",
                                display: "flex", alignItems: "center",
                                borderBottom: isActive ? "2px solid white" : "2px solid transparent",
                                transition: "all 0.2s ease",
                                letterSpacing: "0.5px",
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.3)"; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.borderBottomColor = "transparent"; } }}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            {/* Right side icons */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "24px" }}>
                <button
                    onClick={() => setShowQR(true)}
                    style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "white",
                        padding: "10px 24px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "18px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                    Connect Phone
                </button>

                <SearchIcon size={20} style={{ color: "rgba(255,255,255,0.7)", cursor: "pointer", transition: "all 0.3s" }} />
                <Link to="/settings" aria-label="Settings" title="Settings" style={{ display: "flex", color: currentPath === "/settings" ? "#fff" : "rgba(255,255,255,0.7)" }}><Settings size={20} /></Link>

                {/* User Avatar */}
                <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", textDecoration: "none" }}>
                    {steamProfile?.avatar ? (
                        <img src={steamProfile.avatar} alt={steamProfile.personaName || "Steam profile"} title={steamProfile.personaName || "Steam profile"} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)" }} />
                    ) : (
                        <div title={steamProfile?.personaName || "Steam profile"} style={{
                            width: "36px", height: "36px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #303b4a, #111820)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: "14px", color: "white",
                            border: "2px solid rgba(255,255,255,0.2)",
                        }}>
                            {(steamProfile?.personaName || "S").substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </Link>
            </div>

            {/* QR Code Modal */}
            {showQR && (
                <div
                    style={{
                        position: "fixed",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backdropFilter: "blur(10px)",
                        zIndex: 99999,
                        cursor: "pointer"
                    }}
                    onClick={() => setShowQR(false)}
                >
                    <div
                        style={{
                            background: "#1a1f2e",
                            padding: "32px",
                            borderRadius: "24px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                            cursor: "auto"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ color: "white", fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>Scan to Control</h3>
                        <div style={{ background: "white", padding: "16px", borderRadius: "16px", marginBottom: "24px" }}>
                            <QRCodeSVG
                                value={`${(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                                    ? `http://${__NETWORK_IP__}:${window.location.port || '5173'}`
                                    : window.location.origin}/controller?session=${session}`}
                                size={220}
                            />
                        </div>
                        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>
                            Session ID: <span style={{ color: "white", fontFamily: "monospace", letterSpacing: "2px" }}>{session}</span>
                        </p>
                        <button
                            onClick={() => setShowQR(false)}
                            style={{
                                marginTop: "16px",
                                padding: "8px 24px",
                                background: "rgba(255,255,255,0.1)",
                                border: "none",
                                borderRadius: "20px",
                                color: "white",
                                cursor: "pointer",
                                transition: "all 0.3s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default GlobalNavbar;
