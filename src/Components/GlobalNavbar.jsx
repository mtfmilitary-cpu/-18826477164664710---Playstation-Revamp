import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SearchIcon, Settings } from "lucide-react";
import { userProfile } from "../data/mockData.js";
import { QRCodeSVG } from "qrcode.react";
import { useDualSenseWS } from "./Anikator/useDualSenseWS";

const PSLogoSVG = () => (
    <svg viewBox="0 0 512 512" style={{ height: "40px", width: "auto", fill: "currentColor" }}>
        {/* Simplified PS Logo path, you can use a detailed one if needed, this is just a placeholder path assuming a real PS logo if I don't have the exact exact paths, but let's use a widely known PS logo layout or a detailed SVG */}
        <path d="M428.1 364.5c..." />
        {/* Wait, instead of typing a huge SVG, I'll use an img to the public / logo or a crisp text if public/ps-logo.svg does not exist. Let's use a very accurate path for PS logo if possible. */}
        {/* I'll use a reliable inline SVG for PlayStation. */}
        <path fill="#ffffff" d="M110.8,300l0-143.1l43.2,0l0,123.8c0,27.9,32.7,50.7,73.1,50.7c21.8,0,42.5-6.5,56.5-17.7l17,31.4c-19,15.6-45.6,24.3-73.5,24.3C161.4,369.4,110.8,338.3,110.8,300z" />
        <path fill="#ffffff" d="M228.6,80.1l0,152.1c0,20.8,40.6,37.8,90.8,37.8c34.1,0,63.9-8.4,79.5-21l-14.7-32.5c-11.4,9-34.9,15.7-64.8,15.7c-26.6,0-48.2-7.5-48.2-16.8V80.1H228.6z" />
        <path fill="#ffffff" d="M312.4,264l124-38.3v-38.6l-124,38.3V264z" />
        <path fill="#ffffff" d="M312.4,213.9l124-38.3v-38.6l-124,38.2V213.9z" />
        <path fill="#ffffff" d="M0.3,371.3l124-38.3v-38.6l-124,38.3V371.3z" />
        <path fill="#ffffff" d="M0.3,321.2l124-38.3V244.3l-124,38.3V321.2z" />
        <path fill="#ffffff" d="M205.3,0l124,38.3V77L205.3,38.6V0z" />
    </svg>
);

const GlobalNavbar = () => {
    const location = useLocation();
    const currentPath = location.pathname;
    const { session } = useDualSenseWS();
    const [showQR, setShowQR] = useState(false);

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
                    <div style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #0070d1, #00d4ff)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "14px", color: "white",
                        border: "2px solid rgba(255,255,255,0.2)",
                    }}>
                        {userProfile.username.substring(0, 2).toUpperCase()}
                    </div>
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
