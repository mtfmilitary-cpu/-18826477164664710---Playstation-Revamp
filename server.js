import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { scanInstalledGames, getInstalledGames, launchInstalledGame } from './server/steamLibrary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use('/api/v1', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});


const partyRooms = new Map();
const cleanLabel = (value, fallback = "") => String(value || fallback).trim().slice(0, 60);
const partySummary = (room) => ({
  id: room.id, name: room.name, host: room.host,
  members: [...room.members], invites: [...room.invites],
  messages: room.messages.map((message) => ({ ...message })),
  createdAt: room.createdAt,
});

// Party rooms are shared by clients connected to this running backend.
// This is a local prototype: rooms reset when the Node process restarts.
app.get('/api/v1/party', (_req, res) => {
  res.json({ parties: [...partyRooms.values()].map((room) => ({
    id: room.id, name: room.name, host: room.host, members: [...room.members], createdAt: room.createdAt,
  })) });
});

app.post('/api/v1/party', (req, res) => {
  const username = cleanLabel(req.body?.username, 'GamerPro').slice(0, 32);
  const name = cleanLabel(req.body?.name, `${username}'s Party`) || `${username}'s Party`;
  const id = randomUUID();
  const room = {
    id, name, host: username, members: [username], invites: [],
    messages: [{ id: randomUUID(), username: 'System', text: `${username} started the party.`, at: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };
  partyRooms.set(id, room);
  res.status(201).json({ party: partySummary(room) });
});

app.get('/api/v1/party/:partyId', (req, res) => {
  const room = partyRooms.get(req.params.partyId);
  if (!room) return res.status(404).json({ error: 'That party no longer exists.' });
  res.json({ party: partySummary(room) });
});

app.post('/api/v1/party/:partyId/join', (req, res) => {
  const room = partyRooms.get(req.params.partyId);
  if (!room) return res.status(404).json({ error: 'That party no longer exists.' });
  const username = cleanLabel(req.body?.username, 'GamerPro').slice(0, 32);
  if (!room.members.includes(username)) room.members.push(username);
  room.invites = room.invites.filter((invite) => invite !== username);
  room.messages.push({ id: randomUUID(), username: 'System', text: `${username} joined the party.`, at: new Date().toISOString() });
  res.json({ party: partySummary(room) });
});

app.post('/api/v1/party/:partyId/invite', (req, res) => {
  const room = partyRooms.get(req.params.partyId);
  if (!room) return res.status(404).json({ error: 'That party no longer exists.' });
  const username = cleanLabel(req.body?.username, 'GamerPro').slice(0, 32);
  const friend = cleanLabel(req.body?.friend).slice(0, 32);
  if (!friend) return res.status(400).json({ error: 'Enter a friend name to invite.' });
  if (friend.toLowerCase() !== username.toLowerCase() && !room.members.includes(friend) && !room.invites.includes(friend)) {
    room.invites.push(friend);
    room.messages.push({ id: randomUUID(), username: 'System', text: `${username} invited ${friend}.`, at: new Date().toISOString() });
  }
  res.json({ party: partySummary(room) });
});

app.post('/api/v1/party/:partyId/messages', (req, res) => {
  const room = partyRooms.get(req.params.partyId);
  if (!room) return res.status(404).json({ error: 'That party no longer exists.' });
  const username = cleanLabel(req.body?.username, 'GamerPro').slice(0, 32);
  const message = String(req.body?.text || '').trim().slice(0, 1000);
  if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });
  if (!room.members.includes(username)) return res.status(403).json({ error: 'Join this party before sending messages.' });
  room.messages.push({ id: randomUUID(), username, text: message, at: new Date().toISOString() });
  if (room.messages.length > 150) room.messages.splice(0, room.messages.length - 150);
  res.json({ party: partySummary(room) });
});

app.post('/api/v1/party/:partyId/leave', (req, res) => {
  const room = partyRooms.get(req.params.partyId);
  if (!room) return res.json({ ok: true });
  const username = cleanLabel(req.body?.username, 'GamerPro').slice(0, 32);
  room.members = room.members.filter((member) => member !== username);
  room.messages.push({ id: randomUUID(), username: 'System', text: `${username} left the party.`, at: new Date().toISOString() });
  if (room.members.length === 0) partyRooms.delete(room.id);
  else if (room.host === username) room.host = room.members[0];
  res.json({ ok: true });
});

const storeCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function cachedStoreRequest(key, url) {
  const cached = storeCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PlayStation-Inspired-Console/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Steam Store returned HTTP ${response.status}`);
  const data = await response.json();
  storeCache.set(key, { at: Date.now(), data });
  return data;
}

// Installed games are discovered from local Steam appmanifest files; no login
// or Steam credentials are requested or stored.
app.get('/api/v1/library/installed', (_req, res) => {
  try { res.json(getInstalledGames()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/v1/library/refresh', (_req, res) => {
  try { res.json(scanInstalledGames()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/v1/library/launch', async (req, res) => {
  try {
    const result = await launchInstalledGame(req.body?.appId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Steam's public Store search endpoint is best-effort and may change or throttle.
app.get('/api/v1/store/search', async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 100);
  if (!query) return res.json({ items: [] });
  try {
    const data = await cachedStoreRequest(
      `search:${query.toLowerCase()}`,
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=us`
    );
    res.json({ items: (data.items || []).map((item) => ({
      appId: String(item.id),
      name: item.name,
      cover: item.tiny_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/header.jpg`,
      price: item.price?.final_formatted || null,
      steamUrl: `https://store.steampowered.com/app/${item.id}/`,
    })) });
  } catch (error) {
    res.status(502).json({ error: 'Steam Store search is temporarily unavailable. Please try again.' });
  }
});

app.get('/api/v1/store/featured', async (_req, res) => {
  try {
    const data = await cachedStoreRequest(
      'featured:us',
      'https://store.steampowered.com/api/featuredcategories/?cc=us&l=english'
    );
    const items = (data.top_sellers?.items || data.specials?.items || []).slice(0, 12).map((item) => ({
      appId: String(item.id),
      name: item.name,
      cover: item.header_image || item.large_capsule_image || null,
      price: item.final_price == null ? null : (item.currency === 'USD' ? `$${(item.final_price / 100).toFixed(2)}` : null),
      steamUrl: `https://store.steampowered.com/app/${item.id}/`,
    }));
    res.json({ items });
  } catch {
    res.status(502).json({ error: 'Steam featured games are temporarily unavailable.' });
  }
});

app.get('/api/v1/store/game/:appId', async (req, res) => {
  const appId = String(req.params.appId || '');
  if (!/^\\d+$/.test(appId)) return res.status(400).json({ error: 'A valid Steam App ID is required.' });
  try {
    const payload = await cachedStoreRequest(
      `details:${appId}`,
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=english`
    );
    const entry = payload[appId];
    if (!entry?.success || !entry.data) return res.status(404).json({ error: 'Game details are unavailable.' });
    const game = entry.data;
    res.json({
      appId,
      name: game.name,
      description: game.short_description || '',
      about: game.about_the_game || '',
      cover: game.header_image || null,
      screenshots: (game.screenshots || []).slice(0, 6).map((shot) => shot.path_thumbnail),
      price: game.is_free ? 'Free' : (game.price_overview?.final_formatted || null),
      developers: game.developers || [],
      publishers: game.publishers || [],
      genres: (game.genres || []).map((genre) => genre.description),
      releaseDate: game.release_date?.date || null,
      steamUrl: `https://store.steampowered.com/app/${appId}/`,
    });
  } catch {
    res.status(502).json({ error: 'Steam game details are temporarily unavailable.' });
  }
});

// Serve the production Vite build. During development Vite serves the renderer.
app.use(express.static(path.join(__dirname, 'dist')));

// WebSocket upgrade handling for the existing mobile-controller experience.
const partySignalingPeers = new Map();

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/playstation-ws') {
    const session = url.searchParams.get('session') || 'default';
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.session = session;
      ws.mode = 'legacy';
      wss.emit('connection', ws, request);
    });
  } else if (url.pathname === '/party-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.mode = 'party';
      wss.emit('connection', ws, request);
    });
  } else socket.destroy();
});

wss.on('connection', (ws) => {
  ws.on('message', (rawMessage) => {
    let message;
    try { message = JSON.parse(rawMessage.toString()); } catch { return; }

    if (ws.mode !== 'party') {
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === 1 && client.mode !== 'party' && client.session === ws.session) {
          client.send(rawMessage.toString());
        }
      });
      return;
    }

    if (message.type === 'join') {
      const partyId = String(message.partyId || '').slice(0, 80);
      const peerId = String(message.peerId || '').slice(0, 100);
      const username = String(message.username || 'Party member').trim().slice(0, 32);
      if (!partyId || !peerId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Party ID and peer ID are required.' }));
        return;
      }
      // Only permit signaling for a currently existing console party.
      const room = partyRooms.get(partyId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'That party no longer exists.' }));
        ws.close(1008, 'Unknown party');
        return;
      }
      if (!room.members.includes(username)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Join the party before connecting voice.' }));
        ws.close(1008, 'Not a party member');
        return;
      }
      ws.partyId = partyId;
      ws.peerId = peerId;
      ws.username = username;
      if (!partySignalingPeers.has(partyId)) partySignalingPeers.set(partyId, new Map());
      const roomPeers = partySignalingPeers.get(partyId);
      const existing = [...roomPeers.values()].filter((peer) => peer !== ws && peer.readyState === 1);
      ws.send(JSON.stringify({ type: 'peers', peers: existing.map((peer) => ({ peerId: peer.peerId, username: peer.username })) }));
      roomPeers.set(peerId, ws);
      existing.forEach((peer) => peer.send(JSON.stringify({ type: 'peer-joined', peerId, username })));
      return;
    }

    if (!ws.partyId || !ws.peerId) return;
    if (['offer', 'answer', 'ice'].includes(message.type)) {
      const targetId = String(message.to || '');
      const target = partySignalingPeers.get(ws.partyId)?.get(targetId);
      if (target && target !== ws && target.readyState === 1) {
        target.send(JSON.stringify({ ...message, from: ws.peerId, username: ws.username }));
      }
    } else if (message.type === 'leave') {
      const roomPeers = partySignalingPeers.get(ws.partyId);
      if (roomPeers?.get(ws.peerId) === ws) roomPeers.delete(ws.peerId);
      roomPeers?.forEach((peer) => {
        if (peer.readyState === 1) peer.send(JSON.stringify({ type: 'peer-left', peerId: ws.peerId }));
      });
      if (roomPeers?.size === 0) partySignalingPeers.delete(ws.partyId);
      ws.partyId = null;
      ws.peerId = null;
    }
  });

  ws.on('close', () => {
    if (ws.mode !== 'party' || !ws.partyId || !ws.peerId) return;
    const roomPeers = partySignalingPeers.get(ws.partyId);
    if (roomPeers?.get(ws.peerId) === ws) roomPeers.delete(ws.peerId);
    roomPeers?.forEach((peer) => {
      if (peer.readyState === 1) peer.send(JSON.stringify({ type: 'peer-left', peerId: ws.peerId }));
    });
    if (roomPeers?.size === 0) partySignalingPeers.delete(ws.partyId);
  });
});

app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (error) => {
    if (error) next(error);
  });
});

export function startServer(port = PORT, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    if (server.listening) return resolve(server);
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      console.log(`Console backend listening on http://${host}:${server.address().port}`);
      resolve(server);
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1')
    .catch((error) => { console.error(error); process.exitCode = 1; });
}
