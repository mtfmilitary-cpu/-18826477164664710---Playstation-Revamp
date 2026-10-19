import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";

const GlobalNavbar = () => {
    const location = useLocation();
    const currentPath = location.pathname;
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
        { label: "Store", path: "/store" },
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

        </nav>
    );
};

export default GlobalNavbar;
