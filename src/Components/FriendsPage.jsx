import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, Users, CircleDot, RefreshCw, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./SocialPages.css";

export default function FriendsPage() {
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const syncFriends = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/profile/me", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Steam friends could not be loaded.");
      setProfile(data);
    } catch (err) {
      setError(err.message || "Steam friends could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { syncFriends(); }, [syncFriends]);

  const friends = useMemo(() => (Array.isArray(profile?.steamFriends) ? profile.steamFriends : []).filter((friend) =>
    friend.personaName.toLowerCase().includes(query.trim().toLowerCase())
  ), [profile, query]);

  function startParty(friend) {
    sessionStorage.setItem("party-invite-friend", friend.personaName);
    navigate("/party");
  }

  const connected = Boolean(profile?.connected);
  const onlineCount = friends.filter((friend) => friend.personaState > 0).length;

  return <main className="social-page">
    <header className="social-heading"><div><p className="social-eyebrow">YOUR PEOPLE</p><h1>Friends</h1><p>Synced from your Steam account. Invite friends into your party.</p></div><span className="social-count"><Users size={18}/>{profile?.friends ?? friends.length} friends</span></header>
    <label className="social-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a Steam friend…"/></label>
    <div style={{display:"flex",alignItems:"center",gap:12,margin:"14px 0 20px",flexWrap:"wrap"}}>
      <span style={{fontSize:13,color:"rgba(255,255,255,.65)"}}>{onlineCount} online in the visible list</span>
      <button className="social-secondary" onClick={syncFriends} disabled={loading}><RefreshCw size={15}/>{loading ? "Syncing…" : "Sync Steam friends"}</button>
      {profile?.profileUrl && <a className="social-secondary" href={profile.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Steam profile</a>}
    </div>
    {!connected && !loading && <p className="social-note">Steam isn't connected yet. Sign in to Steam on this PC and set your Web API key in the project's root .env file.</p>}
    {connected && !Array.isArray(profile?.steamFriends) && !loading && <p className="social-note">Steam didn't return the friend list. Check that your Steam profile and friends list are visible to the Web API.</p>}
    {error && <p className="social-error" role="alert">{error}</p>}
    {loading ? <p className="social-muted">Loading your Steam friends…</p> : friends.length === 0 ? <p className="social-muted">{connected ? "No matching friends were returned by Steam." : "Connect Steam to show your actual friends here."}</p> :
      <section className="friend-grid">
        {friends.map(friend => <article className="friend-card" key={friend.steamId}>
          {friend.avatar ? <img className="friend-avatar-image" src={friend.avatar} alt="" style={{width:48,height:48,borderRadius:"50%",objectFit:"cover"}}/> : <div className="friend-avatar">{friend.personaName.slice(0, 2).toUpperCase()}<i className={friend.personaState > 0 ? "in-game" : ""}/></div>}
          <div className="friend-info"><h2>{friend.personaName}</h2><p><CircleDot size={12}/>{friend.gameName || (friend.personaState > 0 ? "Online" : "Offline")}</p></div>
          <button className="social-primary" onClick={() => startParty(friend)}><MessageCircle size={16}/> Invite to party</button>
          {friend.profileUrl && <a href={friend.profileUrl} target="_blank" rel="noreferrer" aria-label={"Open " + friend.personaName + "'s Steam profile"}><ExternalLink size={15}/></a>}
        </article>)}
      </section>}
    <p className="social-note">Friend names, avatars, and current game are taken from Steam when its API and privacy settings allow them. Online presence may be limited by Steam privacy settings.</p>
  </main>;
}
