import React, { useCallback, useEffect, useState } from "react";
import { Headphones, Users, Plus, LogOut, RefreshCw, MessageCircle } from "lucide-react";
import PeerCallPanel from "./PeerCallPanel";
import "./SocialPages.css";

const API = "/api/v1/party";
const getUsername = () => {
  const saved = localStorage.getItem("console-username");
  return saved?.trim() || "GamerPro";
};

export default function PartyChatPage() {
  const [username, setUsername] = useState(getUsername);
  const [nameDraft, setNameDraft] = useState(getUsername);
  const [partyName, setPartyName] = useState("");
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState(null);
  const [invite, setInvite] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Party chat request failed.");
    return data;
  }, []);

  const loadParties = useCallback(async () => {
    try { const data = await request(API); setParties(data.parties || []); }
    catch (err) { setError(err.message); }
  }, [request]);

  const loadParty = useCallback(async (id) => {
    if (!id) return;
    try { const data = await request(`${API}/${encodeURIComponent(id)}`); setParty(data.party); }
    catch (err) { setError(err.message); }
  }, [request]);

  useEffect(() => { loadParties(); const timer = setInterval(loadParties, 3000); return () => clearInterval(timer); }, [loadParties]);
  useEffect(() => {
    if (!party?.id) return;
    const timer = setInterval(() => loadParty(party.id), 1500);
    return () => clearInterval(timer);
  }, [party?.id, loadParty]);

  useEffect(() => {
    const invited = sessionStorage.getItem("party-invite-friend");
    if (invited) { setInvite(invited); sessionStorage.removeItem("party-invite-friend"); }
  }, []);

  async function createParty(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const data = await request(API, { method: "POST", body: JSON.stringify({ name: partyName.trim() || `${username}'s Party`, username }) });
      setParty(data.party); setPartyName(""); await loadParties();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function joinParty(id) {
    setBusy(true); setError("");
    try { const data = await request(`${API}/${encodeURIComponent(id)}/join`, { method: "POST", body: JSON.stringify({ username }) }); setParty(data.party); await loadParties(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }


  async function sendInvite(event) {
    event.preventDefault();
    if (!invite.trim() || !party) return;
    try {
      const data = await request(`${API}/${encodeURIComponent(party.id)}/invite`, { method: "POST", body: JSON.stringify({ username, friend: invite.trim() }) });
      setParty(data.party); setInvite("");
    } catch (err) { setError(err.message); }
  }

  async function sendPartyMessage(event) {
    event.preventDefault();
    const text = messageDraft.trim();
    if (!party?.id || !text) return;
    setBusy(true);
    setError("");
    try {
      const data = await request(`${API}/${encodeURIComponent(party.id)}/messages`, {
        method: "POST",
        body: JSON.stringify({ username, text }),
      });
      setParty(data.party);
      setMessageDraft("");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function leaveParty() {
    if (!party) return;
    try { await request(`${API}/${encodeURIComponent(party.id)}/leave`, { method: "POST", body: JSON.stringify({ username }) }); }
    catch (err) { setError(err.message); }
    setParty(null); await loadParties();
  }

  function saveUsername(event) {
    event.preventDefault();
    const next = nameDraft.trim().slice(0, 32);
    if (!next) return;
    localStorage.setItem("console-username", next); setUsername(next);
  }

  return <main className="social-page party-page">
    <header className="social-heading"><div><p className="social-eyebrow">PLAY TOGETHER</p><h1>Party Chat</h1><p>Create a party, message members, and start optional peer-to-peer voice chat.</p></div><span className="social-count"><Headphones size={18}/> Party system</span></header>
    <div className="party-layout">
      <aside className="party-sidebar">
        <form className="party-username" onSubmit={saveUsername}><label htmlFor="party-username">Your console name</label><div><input id="party-username" value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={32}/><button className="social-primary" type="submit">Save</button></div></form>
        <form className="party-create" onSubmit={createParty}><label htmlFor="party-name">Start a party</label><input id="party-name" value={partyName} onChange={e => setPartyName(e.target.value)} maxLength={60} placeholder="Party name (optional)"/><button className="social-primary" disabled={busy}><Plus size={16}/> Create party</button></form>
        <div className="party-list-heading"><span>Open parties</span><button title="Refresh parties" onClick={loadParties}><RefreshCw size={15}/></button></div>
        {parties.length === 0 ? <p className="social-muted">No active parties yet. Start one!</p> : parties.map(item => <button className={party?.id === item.id ? "party-list-item selected" : "party-list-item"} key={item.id} onClick={() => joinParty(item.id)} disabled={busy}><span><strong>{item.name}</strong><small>Host: {item.host}</small></span><span className="party-member-count"><Users size={13}/>{item.members.length}</span></button>)}
      </aside>
      <section className="party-room">
        {!party ? <div className="party-empty"><MessageCircle size={42}/><h2>You're not in a party</h2><p>Create a party on the left or join an open room to start chatting.</p></div> : <>
          <div className="party-room-header"><div><p className="social-eyebrow">ACTIVE PARTY</p><h2>{party.name}</h2><p>Hosted by {party.host} · {party.members.length} member{party.members.length === 1 ? "" : "s"}</p></div><button className="social-secondary" onClick={leaveParty}><LogOut size={16}/> Leave</button></div>
          <div className="party-members"><strong><Users size={15}/> Members</strong>{party.members.map((member, index) => <span key={member} className="party-member-pill"><i/>{member}{index === 0 ? " · Host" : ""}</span>)}{party.invites?.map(person => <span key={person} className="party-member-pill invited">{person} · invited</span>)}</div>
          <form className="party-invite-form" onSubmit={sendInvite}><input value={invite} onChange={e => setInvite(e.target.value)} placeholder="Friend's username to invite" maxLength={32}/><button className="social-secondary" disabled={!invite.trim()}>Invite</button></form>
          <section className="party-server-chat">
            <header><MessageCircle size={16}/><strong>Party messages</strong><span>{(party.messages || []).length} messages</span></header>
            <div className="peer-chat-messages party-server-message-list" aria-live="polite">
              {(party.messages || []).map(message => <article key={message.id} className={message.username === username ? "peer-chat-message own" : "peer-chat-message"}>
                <div><strong>{message.username}</strong><small>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>
                <p>{message.text}</p>
              </article>)}
            </div>
            <form className="peer-chat-form" onSubmit={sendPartyMessage}>
              <input value={messageDraft} onChange={event => setMessageDraft(event.target.value)} placeholder="Message everyone in the party…" maxLength={1000} disabled={busy}/>
              <button className="social-primary" type="submit" disabled={busy || !messageDraft.trim()}>Send</button>
            </form>
          </section>
          <PeerCallPanel party={party} username={username} />
         </>}
      </section>
    </div>
    {error && <p className="social-error" role="alert">{error}</p>}
    <p className="social-note">Party membership and text messages are shared by this console's backend. Voice uses peer-to-peer WebRTC; internet voice sessions may need a public signaling server and TURN relay. This development build’s signaling server listens on this PC only; internet play needs a public HTTPS/WSS signaling endpoint and a TURN relay for restrictive networks.</p>
  </main>;
}
