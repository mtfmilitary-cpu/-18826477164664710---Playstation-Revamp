import React, { useMemo, useState } from "react";
import { MessageCircle, Search, Users, CircleDot } from "lucide-react";
import { onlineFriends } from "../data/mockData.js";
import { useNavigate } from "react-router-dom";
import "./SocialPages.css";

export default function FriendsPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const friends = useMemo(() => onlineFriends.filter((friend) =>
    friend.username.toLowerCase().includes(query.trim().toLowerCase())
  ), [query]);

  function startParty(friend) {
    sessionStorage.setItem("party-invite-friend", friend.username);
    navigate("/party");
  }

  return <main className="social-page">
    <header className="social-heading"><div><p className="social-eyebrow">YOUR PEOPLE</p><h1>Friends</h1><p>See who's around and invite people into a party.</p></div><span className="social-count"><Users size={18}/>{friends.length} friends</span></header>
    <label className="social-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a friend…"/></label>
    <section className="friend-grid">
      {friends.map(friend => <article className="friend-card" key={friend.id}>
        <div className="friend-avatar">{friend.username.slice(0, 2).toUpperCase()}<i className={friend.status === "in-game" ? "in-game" : ""}/></div>
        <div className="friend-info"><h2>{friend.username}</h2><p><CircleDot size={12}/>{friend.currentGame || (friend.status === "online" ? "Online" : "Offline")}</p></div>
        <button className="social-primary" onClick={() => startParty(friend)}><MessageCircle size={16}/> Invite to party</button>
      </article>)}
    </section>
    <p className="social-note">Friend presence is currently a local demo list. Party invitations work within the running console backend; Steam friend-account syncing isn't provided by Steam's public Store API.</p>
  </main>;
}
