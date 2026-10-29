import React, { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, PhoneOff, Send, Wifi, WifiOff, Volume2 } from "lucide-react";
import "./PeerCallPanel.css";

const SIGNAL_PATH = "/party-ws";
const configuredVoipServer = String(import.meta.env.VITE_VOIP_SERVER_URL || "").trim();

function getSignalingUrl() {
  if (configuredVoipServer) return configuredVoipServer.replace(/\/$/, "");
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.host}${SIGNAL_PATH}`;
}
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function makePeerId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PeerCallPanel({ party, username }) {
  const [connected, setConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const peerNamesRef = useRef(new Map());
  const dataChannelsRef = useRef(new Map());
  const audioElementsRef = useRef(new Map());
  const peerIdRef = useRef(makePeerId());
  const usernameRef = useRef(username);
  const partyRef = useRef(party);
  const selectedInputRef = useRef("");
  const selectedOutputRef = useRef("");

  usernameRef.current = username;
  partyRef.current = party;

  useEffect(() => {
    const onInputSelected = (event) => { selectedInputRef.current = String(event.detail?.deviceId || ""); };
    const onOutputSelected = (event) => {
      selectedOutputRef.current = String(event.detail?.deviceId || "");
      for (const audio of audioElementsRef.current.values()) {
        if (typeof audio.setSinkId === "function") audio.setSinkId(selectedOutputRef.current).catch(() => setError("This browser could not switch party audio to that output device."));
      }
    };
    window.addEventListener("console:audio-input-selected", onInputSelected);
    window.addEventListener("console:audio-output-selected", onOutputSelected);
    return () => {
      window.removeEventListener("console:audio-input-selected", onInputSelected);
      window.removeEventListener("console:audio-output-selected", onOutputSelected);
    };
  }, []);

  const updatePeers = useCallback(() => {
    setPeers([...peerNamesRef.current.entries()].map(([id, name]) => ({
      id, name, connected: peersRef.current.get(id)?.connectionState === "connected",
    })));
  }, []);

  const sendSignal = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  const closePeer = useCallback((peerId) => {
    peersRef.current.get(peerId)?.close();
    peersRef.current.delete(peerId);
    dataChannelsRef.current.get(peerId)?.close();
    dataChannelsRef.current.delete(peerId);
    const audio = audioElementsRef.current.get(peerId);
    if (audio) { audio.srcObject = null; audio.remove(); }
    audioElementsRef.current.delete(peerId);
    peerNamesRef.current.delete(peerId);
    updatePeers();
  }, [updatePeers]);

  const addPeer = useCallback((peerId, peerName, initiator = false) => {
    if (peerId === peerIdRef.current || peersRef.current.has(peerId)) return peersRef.current.get(peerId);
    peerNamesRef.current.set(peerId, peerName || "Party member");
    const pc = new RTCPeerConnection(rtcConfig);
    peersRef.current.set(peerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal({ type: "ice", to: peerId, candidate: event.candidate });
    };

    pc.ontrack = (event) => {
      let audio = audioElementsRef.current.get(peerId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.playsInline = true;
        audio.dataset.partyPeer = peerId;
        document.body.appendChild(audio);
        audioElementsRef.current.set(peerId, audio);
      }
      audio.srcObject = event.streams[0];
      if (selectedOutputRef.current && typeof audio.setSinkId === "function") {
        audio.setSinkId(selectedOutputRef.current).catch(() => setError("This browser could not switch party audio to that output device."));
      }
      audio.play().catch(() => setError("Your browser blocked audio playback. Click Start voice again."));
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannelsRef.current.set(peerId, channel);
      channel.onmessage = (messageEvent) => {
        try {
          const message = JSON.parse(messageEvent.data);
          if (message.type === "chat" && typeof message.text === "string") {
            setMessages((current) => [...current, { id: makePeerId(), username: message.username || peerName || "Party member", text: message.text.slice(0, 1000), at: new Date().toISOString(), p2p: true }].slice(-200));
          }
        } catch { /* Ignore malformed peer data. */ }
      };
      channel.onopen = updatePeers;
      channel.onclose = updatePeers;
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) closePeer(peerId);
      else updatePeers();
    };

    if (initiator) {
      const channel = pc.createDataChannel("party-chat", { ordered: true });
      dataChannelsRef.current.set(peerId, channel);
      channel.onmessage = (messageEvent) => {
        try {
          const message = JSON.parse(messageEvent.data);
          if (message.type === "chat" && typeof message.text === "string") {
            setMessages((current) => [...current, { id: makePeerId(), username: message.username || peerName || "Party member", text: message.text.slice(0, 1000), at: new Date().toISOString(), p2p: true }].slice(-200));
          }
        } catch { /* Ignore malformed peer data. */ }
      };
    }
    updatePeers();
    return pc;
  }, [closePeer, sendSignal, updatePeers]);

  const startVoice = useCallback(async () => {
    setError("");
    if (!partyRef.current?.id) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access requires a secure context. Use the desktop app or an HTTPS deployment.");
      return;
    }
    try {
      const audioConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      if (selectedInputRef.current) audioConstraints.deviceId = { exact: selectedInputRef.current };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      localStreamRef.current = stream;
      setInCall(true);
      for (const pc of peersRef.current.values()) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }
      const socket = new WebSocket(getSignalingUrl());
      socketRef.current = socket;
      socket.onopen = () => {
        setConnected(true);
        sendSignal({ type: "join", partyId: partyRef.current.id, peerId: peerIdRef.current, username: usernameRef.current });
      };
      socket.onmessage = async (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === "peers") {
          for (const peer of message.peers || []) {
            peerNamesRef.current.set(peer.peerId, peer.username);
            const pc = addPeer(peer.peerId, peer.username, true);
            if (pc) {
              try { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); sendSignal({ type: "offer", to: peer.peerId, description: pc.localDescription }); }
              catch (err) { setError(`Couldn't start call with ${peer.username}: ${err.message}`); }
            }
          }
          updatePeers();
        } else if (message.type === "peer-joined") {
          peerNamesRef.current.set(message.peerId, message.username);
          updatePeers();
        } else if (message.type === "offer") {
          const pc = addPeer(message.from, message.username, false);
          if (!pc) return;
          try { await pc.setRemoteDescription(message.description); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); sendSignal({ type: "answer", to: message.from, description: pc.localDescription }); }
          catch (err) { setError(`Call negotiation failed: ${err.message}`); }
        } else if (message.type === "answer") {
          const pc = peersRef.current.get(message.from);
          if (pc) { try { await pc.setRemoteDescription(message.description); } catch (err) { setError(err.message); } }
        } else if (message.type === "ice") {
          const pc = peersRef.current.get(message.from);
          if (pc && message.candidate) { try { await pc.addIceCandidate(message.candidate); } catch { /* ICE candidates can arrive after a peer has closed. */ } }
        } else if (message.type === "peer-left") {
          closePeer(message.peerId);
        } else if (message.type === "error") setError(message.message || "Party signaling error.");
      };
      socket.onerror = () => setError("Couldn't connect to the party signaling server.");
      socket.onclose = () => setConnected(false);
    } catch (err) {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setInCall(false);
      setError(err.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access and try again." : `Couldn't start voice: ${err.message}`);
    }
  }, [addPeer, closePeer, sendSignal, updatePeers]);

  const endVoice = useCallback(() => {
    sendSignal({ type: "leave" });
    socketRef.current?.close();
    socketRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    [...peersRef.current.keys()].forEach(closePeer);
    setConnected(false);
    setInCall(false);
    setMuted(false);
  }, [closePeer, sendSignal]);

  useEffect(() => () => {
    socketRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peersRef.current.forEach((peer) => peer.close());
    audioElementsRef.current.forEach((audio) => { audio.srcObject = null; audio.remove(); });
  }, []);

  useEffect(() => {
    endVoice();
    setMessages([]);
    setError("");
    // A new party uses a fresh peer identity and signaling room.
    peerIdRef.current = makePeerId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party?.id]);

  function toggleMute() {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  function sendPeerMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !inCall) return;
    const packet = JSON.stringify({ type: "chat", username, text: text.slice(0, 1000) });
    let sent = false;
    for (const channel of dataChannelsRef.current.values()) {
      if (channel.readyState === "open") { channel.send(packet); sent = true; }
    }
    if (sent) setMessages((current) => [...current, { id: makePeerId(), username, text, at: new Date().toISOString(), p2p: true }].slice(-200));
    else setError("No peer-to-peer connection yet. Ask another party member to join voice, then try again.");
    setDraft("");
  }

  return <section className="peer-call-panel">
    <header className="peer-call-heading"><div><span className="peer-call-kicker">DIRECT CONNECTION</span><h3><Headphones size={19}/> P2P Voice & Chat</h3><p>Audio and text are sent directly between party members when a connection is established.</p></div><span className={connected ? "peer-status online" : "peer-status"}>{connected ? <Wifi size={14}/> : <WifiOff size={14}/>} {connected ? "Signaling connected" : "Not connected"}</span></header>
    <div className="peer-call-controls">
      {!inCall ? <button className="social-primary" onClick={startVoice}><Mic size={16}/> Start voice & P2P chat</button> : <>
        <button className="social-secondary" onClick={toggleMute}>{muted ? <MicOff size={16}/> : <Mic size={16}/>} {muted ? "Unmute mic" : "Mute mic"}</button>
        <button className="peer-hangup" onClick={endVoice}><PhoneOff size={16}/> Leave voice</button>
      </>}
      <span><Volume2 size={15}/> {peers.filter(peer => peer.connected).length} peer connection(s)</span>
    </div>
    <div className="peer-members">{peers.length ? peers.map(peer => <span key={peer.id} className="peer-member"><i className={peer.connected ? "connected" : ""}/>{peer.name}</span>) : <span className="peer-empty">When friends start voice, they appear here.</span>}</div>
    <div className="peer-chat-messages" aria-live="polite">{messages.map(message => <article key={message.id} className={message.username === username ? "peer-chat-message own" : "peer-chat-message"}><div><strong>{message.username}</strong><small>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · P2P</small></div><p>{message.text}</p></article>)}{messages.length === 0 && <p className="peer-empty">Peer-to-peer messages will appear here once at least two people connect.</p>}</div>
    <form className="peer-chat-form" onSubmit={sendPeerMessage}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder={inCall ? "Message connected party members…" : "Start voice to enable P2P chat"} maxLength={1000} disabled={!inCall}/><button className="social-primary" aria-label="Send P2P message" disabled={!inCall || !draft.trim()}><Send size={16}/></button></form>
    {error && <p className="peer-call-error" role="alert">{error}</p>}
    <p className="peer-call-footnote">Uses browser WebRTC with STUN-assisted connection discovery. Some networks require a TURN relay. The signaling service only exchanges connection setup messages; it does not carry the voice audio or P2P chat content.</p>
  </section>;
}
