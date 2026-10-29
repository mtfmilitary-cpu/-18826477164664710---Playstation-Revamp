import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Award, ExternalLink, RefreshCw, Trophy, LockKeyhole, AlertCircle } from "lucide-react";

const panelStyle = {
  background: "rgba(10, 14, 26, 0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 20,
  color: "#fff",
  boxShadow: "0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
};

function unlockLabel(unlockTime) {
  const seconds = Number(unlockTime);
  if (!Number.isFinite(seconds) || seconds <= 0) return "Unlocked";
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime())
    ? "Unlocked"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/profile/achievements/all", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Steam achievements could not be loaded.");
      if (!payload || !Array.isArray(payload.games)) throw new Error("Steam returned an unexpected achievements response.");
      setData(payload);
    } catch (err) {
      setError(err?.message || "Steam achievements could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAchievements(); }, [loadAchievements]);

  const recent = useMemo(() => {
    if (!Array.isArray(data?.games)) return [];
    return data.games.flatMap((game) => (Array.isArray(game.achievements) ? game.achievements : [])
      .filter((achievement) => achievement.achieved)
      .map((achievement) => ({ ...achievement, appId: game.appId, gameName: game.gameName })))
      .sort((a, b) => Number(b.unlockTime || 0) - Number(a.unlockTime || 0))
      .slice(0, 4);
  }, [data]);

  return (
    <section style={panelStyle} aria-labelledby="steam-recent-achievements-title">
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h3 id="steam-recent-achievements-title" style={{ fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8, letterSpacing: "-.3px" }}>
          <Award size={18} color="#f5b942" /> Steam Achievements
        </h3>
        <button type="button" onClick={loadAchievements} disabled={loading} aria-label="Refresh Steam achievements"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 9px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#dbe7f7", cursor: loading ? "wait" : "pointer", opacity: loading ? .65 : 1 }}>
          <RefreshCw size={14} style={loading ? { animation: "steam-achievement-spin 1s linear infinite" } : undefined} />
          <span style={{ fontSize: 12 }}>Refresh</span>
        </button>
      </header>

      {data && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 120px", background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "11px 12px" }}>
            <div style={{ fontSize: 23, fontWeight: 750 }}>{Number(data.unlocked || 0).toLocaleString()} <span style={{ color: "#8e9bb0", fontSize: 13, fontWeight: 500 }}>/ {Number(data.total || 0).toLocaleString()}</span></div>
            <div style={{ color: "#91a0b5", fontSize: 11, marginTop: 3 }}>Unlocked across Steam games</div>
          </div>
          <div style={{ flex: "1 1 100px", background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "11px 12px" }}>
            <div style={{ fontSize: 23, fontWeight: 750 }}>{Number(data.gamesWithAchievements || 0).toLocaleString()}</div>
            <div style={{ color: "#91a0b5", fontSize: 11, marginTop: 3 }}>Games with achievements</div>
          </div>
        </div>
      )}

      {loading && !data && <p style={{ color: "#aab8ca", fontSize: 13, margin: "18px 0" }}>Loading achievements from Steam…</p>}
      {error && (
        <div role="alert" style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: 12, borderRadius: 10, background: "rgba(255,100,100,.08)", border: "1px solid rgba(255,100,100,.2)", color: "#ffc0c0", fontSize: 13 }}>
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>{error}<div style={{ color: "#c5aeb0", marginTop: 5, fontSize: 11 }}>Check that Steam is signed in, the profile/game details are visible, and STEAM_WEB_API_KEY is configured on the server.</div></div>
          {!loading && <button type="button" onClick={loadAchievements} style={{ background: "transparent", border: 0, color: "#fff", textDecoration: "underline", cursor: "pointer" }}>Retry</button>}
        </div>
      )}

      {!loading && !error && data && recent.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 12px", color: "#9ba9bd" }}>
          <LockKeyhole size={23} style={{ marginBottom: 8, opacity: .7 }} />
          <p style={{ margin: 0, fontSize: 13 }}>{data.total > 0 ? "No unlocked achievements were returned for these games yet." : "No public Steam achievement data was found for this account."}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recent.map((achievement) => (
          <a key={`${achievement.appId}:${achievement.apiName}`}
            href={`https://steamcommunity.com/stats/${encodeURIComponent(achievement.appId)}/achievements/`}
            target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.065)", borderRadius: 12, padding: "11px 12px", display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <span style={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 10, background: "linear-gradient(135deg, rgba(245,185,66,.9), rgba(255,140,0,.8))", boxShadow: "0 4px 12px rgba(245,166,35,.18)" }}><Trophy size={18} color="#fff" /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{achievement.name || achievement.apiName}</span>
              <span style={{ display: "block", fontSize: 11, color: "#93a3b9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{achievement.gameName} · {unlockLabel(achievement.unlockTime)}</span>
              {achievement.description && <span style={{ display: "block", fontSize: 11, color: "#7f8ea3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{achievement.description}</span>}
            </span>
            <ExternalLink size={14} color="#8494aa" style={{ flexShrink: 0 }} />
          </a>
        ))}
      </div>

      {data?.gamesUnavailable?.length > 0 && (
        <p style={{ fontSize: 11, lineHeight: 1.5, color: "#8290a4", margin: "12px 0 0" }}>
          Steam did not provide achievement data for {data.gamesUnavailable.length} game{data.gamesUnavailable.length === 1 ? "" : "s"} (for example, private stats or games without public achievements).
        </p>
      )}
      <style>{`@keyframes steam-achievement-spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}
