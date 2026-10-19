import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { scanInstalledGames, getInstalledGames, launchInstalledGame } from './server/steamLibrary.js';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { diagnostic } from './server/diagnostics.js';

// Load private project settings from the root .env file without exposing them to the renderer.
// Existing process environment variables take precedence over values in .env.
const envFilePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
try {
  diagnostic('FILE-ACCESS-0000', 'Reading project environment configuration.', null, 'INFO', { file: '.env' });
  const envText = fs.readFileSync(envFilePath, 'utf8');
  diagnostic('ENV-0000', 'Project environment configuration file was read.', null, 'INFO', { file: '.env' });
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[match[1]] = value;
  }
} catch (error) {
  diagnostic(error.code === 'ENOENT' ? 'ENV-0002' : 'ENV-0001',
    error.code === 'ENOENT' ? 'Optional project .env file was not found.' : 'Could not read the project .env file.',
    null, error.code === 'ENOENT' ? 'INFO' : 'WARN',
    { file: '.env', code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'ENV_READ_FAILED' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');

// One timeline for backend activity. Never record query strings, request bodies,
// cookies, authorization headers, or private chat contents.
app.use((req, res, next) => {
  const startedAt = Date.now();
  const route = String(req.path || '/').slice(0, 180);
  diagnostic('HTTP-REQUEST-0001', 'HTTP request started.', null, 'INFO', {
    method: req.method, route,
  });
  res.on('finish', () => {
    const status = res.statusCode;
    diagnostic(
      status >= 500 ? 'HTTP-REQUEST-0003' : status >= 400 ? 'HTTP-REQUEST-0002' : 'HTTP-REQUEST-0004',
      'HTTP request finished.',
      null,
      status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO',
      { method: req.method, route, status, durationMs: Date.now() - startedAt }
    );
  });
  next();
});

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

// Resolve the currently signed-in local Steam account from Steam's loginusers.vdf.
// The Web API key stays server-side in STEAM_WEB_API_KEY and is never returned to the renderer.
function getLocalSteamAccount() {
  const candidates = [];
  if (process.env.STEAM_PATH) candidates.push(process.env.STEAM_PATH);
  if (process.platform === 'win32') {
    try {
      const output = execFileSync('reg.exe', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { encoding: 'utf8', windowsHide: true });
      const match = output.match(/SteamPath\s+REG_SZ\s+(.+)/i);
      if (match?.[1]) candidates.push(match[1].trim().replaceAll('/', '\\'));
    } catch {}
    candidates.push(path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'));
    candidates.push(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Steam'));
  } else if (process.platform === 'darwin') {
    candidates.push(path.join(os.homedir(), 'Library', 'Application Support', 'Steam'));
  } else {
    candidates.push(path.join(os.homedir(), '.steam', 'steam'), path.join(os.homedir(), '.local', 'share', 'Steam'));
  }
  for (const root of candidates) {
    try {
      diagnostic('FILE-ACCESS-0008', 'Reading Steam login account configuration.', null, 'INFO', {
        file: 'config/loginusers.vdf',
      });
      const raw = fs.readFileSync(path.join(root, 'config', 'loginusers.vdf'), 'utf8');
      const entries = [...raw.matchAll(/"([0-9]{17})"\s*\{([^{}]*)\}/g)].map((match) => {
        const body = match[2];
        const field = (name) => body.match(new RegExp('"' + name + '"\\s*"([^"]*)"', 'i'))?.[1] || '';
        return { steamId: match[1], accountName: field('AccountName'), personaName: field('PersonaName'), mostRecent: field('MostRecent') === '1' };
      });
      const account = entries.find((entry) => entry.mostRecent) || entries[0];
      if (account) {
        diagnostic('STEAM-ACCOUNT-0001', 'Local Steam account was identified.', null, 'INFO');
        return { ...account, steamId: process.env.STEAM_ID64 || account.steamId };
      }
      diagnostic('STEAM-ACCOUNT-0002', 'Steam login configuration contained no account entries.', null, 'WARN');
    } catch (error) {
      diagnostic('FILE-ACCESS-0009', 'Steam login account configuration could not be read.', null, 'WARN', {
        file: 'config/loginusers.vdf',
        code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'STEAM_ACCOUNT_FILE_READ_FAILED',
      });
    }
  }
  if (/^[0-9]{17}$/.test(process.env.STEAM_ID64 || '')) return { steamId: process.env.STEAM_ID64, personaName: '', accountName: '', mostRecent: true };
  return null;
}

async function steamWebApi(interfaceName, methodName, params = {}) {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw Object.assign(new Error('STEAM_WEB_API_KEY is not configured.'), { code: 'STEAM_KEY_MISSING' });
  const url = new URL(`https://api.steampowered.com/${interfaceName}/${methodName}/v1/`);
  url.searchParams.set('key', key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  const startedAt = Date.now();
  diagnostic('STEAM-API-0000', 'Steam Web API request started.', null, 'INFO', {
    interface: interfaceName, method: methodName,
  });
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  } catch (error) {
    diagnostic('STEAM-API-0005', 'Steam Web API request failed before receiving a response.', null, 'WARN', {
      interface: interfaceName, method: methodName,
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'NETWORK_OR_TIMEOUT',
      durationMs: Date.now() - startedAt,
    });
    throw Object.assign(new Error('Steam Web API network request failed.'), {
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'STEAM_NETWORK_ERROR',
    });
  }
  if (!response.ok) {
    diagnostic('STEAM-API-0006', 'Steam Web API returned a non-success status.', null, 'WARN', {
      interface: interfaceName, method: methodName, status: response.status,
      durationMs: Date.now() - startedAt,
    });
    throw Object.assign(new Error(`Steam Web API returned HTTP ${response.status}`), {
      code: `STEAM_HTTP_${response.status}`, status: response.status,
    });
  }
  diagnostic('STEAM-API-0007', 'Steam Web API response received.', null, 'INFO', {
    interface: interfaceName, method: methodName, status: response.status,
    durationMs: Date.now() - startedAt,
  });
  return response.json();
}

app.get('/api/v1/profile/me', async (_req, res) => {
  const localAccount = getLocalSteamAccount();
  if (!localAccount?.steamId) {
    return res.json({ connected: false, needsSetup: true, message: 'Sign in to Steam on this PC, or set STEAM_ID64, to identify your account.' });
  }
  const base = {
    connected: true,
    steamId: localAccount.steamId,
    accountName: localAccount.accountName || null,
    personaName: localAccount.personaName || localAccount.accountName || 'Steam user',
    avatar: null,
    profileUrl: `https://steamcommunity.com/profiles/${localAccount.steamId}/`,
    fullStatsAvailable: false,
    statsUnavailableReason: process.env.STEAM_WEB_API_KEY ? null : 'Set STEAM_WEB_API_KEY in the environment used to launch this desktop app to load account statistics.',
    games: null, totalHours: null, friends: null, level: null, recentGames: [], achievementsUnlocked: null,
  };
  try {
    const results = await Promise.allSettled([
      steamWebApi('ISteamUser', 'GetPlayerSummaries', { steamids: localAccount.steamId }),
      steamWebApi('IPlayerService', 'GetOwnedGames', { steamid: localAccount.steamId, include_appinfo: 1, include_played_free_games: 1 }),
      steamWebApi('IPlayerService', 'GetRecentlyPlayedGames', { steamid: localAccount.steamId, count: 10 }),
      steamWebApi('IPlayerService', 'GetSteamLevel', { steamid: localAccount.steamId }),
      steamWebApi('ISteamUser', 'GetFriendList', { steamid: localAccount.steamId, relationship: 'friend' }),
    ]);
    const requestLabels = ['player summaries', 'owned games', 'recently played games', 'Steam level', 'friends list'];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const reason = result.reason;
        const safe = reason instanceof Error
          ? Object.assign(new Error(reason.name || 'Steam request failed'), {
              code: /^[A-Z0-9_-]{1,80}$/i.test(String(reason.code || '')) ? String(reason.code) : 'STEAM_REQUEST_FAILED',
              status: Number.isInteger(reason.status) ? reason.status : undefined,
            })
          : Object.assign(new Error('Steam request failed.'), { code: 'STEAM_REQUEST_FAILED' });
        diagnostic('STEAM-API-0002', 'A Steam profile API request failed.', safe, 'WARN', {
          request: requestLabels[index] || 'unknown request',
        });
      } else {
        diagnostic('STEAM-API-0003', 'A Steam profile API request succeeded.', null, 'INFO', {
          request: requestLabels[index] || 'unknown request',
        });
      }
    });
    const value = (index) => results[index].status === 'fulfilled' ? results[index].value : null;
    const summaryPayload = value(0);
    const gamesPayload = value(1);
    const recentPayload = value(2);
    const levelPayload = value(3);
    const friendsPayload = value(4);
    const player = summaryPayload?.response?.players?.[0] || {};
    const ownedGames = gamesPayload?.response?.games || [];
    const recentGames = recentPayload?.response?.games || [];
    const friends = friendsPayload?.friendslist?.friends || [];
    let steamFriends = [];
    if (friends.length > 0) {
      try {
        const friendIds = friends.map((friend) => friend.steamid).filter((id) => /^[0-9]{17}$/.test(id));
        const friendProfiles = [];
        for (let index = 0; index < friendIds.length; index += 100) {
          const payload = await steamWebApi('ISteamUser', 'GetPlayerSummaries', { steamids: friendIds.slice(index, index + 100).join(',') });
          friendProfiles.push(...(payload.response?.players || []));
        }
        steamFriends = friendProfiles.map((friend) => ({
          steamId: friend.steamid,
          personaName: friend.personaname || 'Steam friend',
          avatar: friend.avatarfull || friend.avatarmedium || null,
          profileUrl: friend.profileurl || null,
          personaState: Number(friend.personastate || 0),
          gameName: friend.gameextrainfo || null,
          gameId: friend.gameid || null,
        }));
      } catch (error) {
        diagnostic('STEAM-API-0004', 'Steam friend profile details could not be loaded.', null, 'WARN', {
          code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'STEAM_FRIEND_DETAILS_FAILED',
          status: Number.isInteger(error?.status) ? error.status : undefined,
        });
      }
    }
    const totalMinutes = ownedGames.reduce((sum, game) => sum + Math.max(0, Number(game.playtime_forever || 0)), 0);
    const normalizedOwnedGames = ownedGames
      .map((game) => ({
        appId: String(game.appid),
        name: game.name || `Steam game ${game.appid}`,
        minutes: Math.max(0, Number(game.playtime_forever || 0)),
        hours: Math.round(Math.max(0, Number(game.playtime_forever || 0)) / 60),
        recentMinutes: Math.max(0, Number(game.playtime_2weeks || 0)),
        recentHours: Math.round(Math.max(0, Number(game.playtime_2weeks || 0)) / 60),
        cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_hero.jpg`,
        steamUrl: `https://store.steampowered.com/app/${game.appid}/`,
      }))
      .sort((a, b) => b.minutes - a.minutes);
    Object.assign(base, {
      personaName: player.personaname || base.personaName,
      avatar: player.avatarfull || player.avatarmedium || null,
      profileUrl: player.profileurl || base.profileUrl,
      memberSince: player.timecreated ? new Date(Number(player.timecreated) * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null,
      games: gamesPayload ? (gamesPayload.response?.game_count ?? ownedGames.length) : null,
      totalHours: gamesPayload ? Math.round(totalMinutes / 60) : null,
      totalPlaytimeMinutes: gamesPayload ? totalMinutes : null,
      ownedGames: gamesPayload ? normalizedOwnedGames : null,
      friends: friendsPayload ? friends.length : null,
      steamFriends: friendsPayload ? steamFriends : null,
      level: levelPayload?.response?.player_level ?? null,
      recentGames: recentGames.map((game) => ({
        appId: String(game.appid),
        name: game.name,
        hours: Math.round(Number(game.playtime_forever || 0) / 60),
        recentHours: Math.round(Number(game.playtime_2weeks || 0) / 60),
        cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        steamUrl: `https://store.steampowered.com/app/${game.appid}/`,
      })),
      fullStatsAvailable: Boolean(summaryPayload || gamesPayload || recentPayload || levelPayload || friendsPayload),
      statsUnavailableReason: results.some((result) => result.status === 'rejected')
        ? 'Some Steam profile fields could not be returned. Check the profile privacy settings and whether the Web API key is valid.'
        : null,
      // Steam has no single API endpoint for an account-wide achievements total.
      achievementsUnlocked: null,
    });
    res.json(base);
  } catch (error) {
    diagnostic('STEAM-API-0001', 'Steam profile request could not be completed.', error, 'WARN');
    base.statsUnavailableReason = error.message || 'Steam account statistics could not be loaded.';
    res.json(base);
  }
});


// Load available achievement records across the owned Steam library.
// The client requests this when the profile opens; unavailable/private game stats are skipped and reported.
const allAchievementCache = new Map();
app.get('/api/v1/profile/achievements/all', async (_req, res) => {
  const account = getLocalSteamAccount();
  if (!account?.steamId) return res.status(400).json({ error: 'Sign in to Steam on this PC or configure STEAM_ID64 first.' });
  const cached = allAchievementCache.get(account.steamId);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return res.json(cached.data);
  try {
    const gamesPayload = await steamWebApi('IPlayerService', 'GetOwnedGames', {
      steamid: account.steamId, include_appinfo: 1, include_played_free_games: 1,
    });
    const games = gamesPayload.response?.games || [];
    const achievementGames = [];
    const unavailableGames = [];
    // Keep concurrency low to avoid flooding Steam's Web API.
    for (let index = 0; index < games.length; index += 3) {
      const batch = games.slice(index, index + 3);
      const results = await Promise.allSettled(batch.map(async (game) => {
        const payload = await steamWebApi('ISteamUserStats', 'GetPlayerAchievements', {
          steamid: account.steamId, appid: String(game.appid), l: 'english',
        });
        const stats = payload.playerstats;
        if (!stats?.success) throw new Error(stats?.error || 'Achievement data unavailable');
        const achievements = (stats.achievements || []).map((item) => ({
          apiName: item.apiname,
          name: item.name || item.apiname,
          description: item.description || '',
          achieved: Number(item.achieved) === 1,
          unlockTime: Number(item.unlocktime || 0) || null,
        }));
        return {
          appId: String(game.appid),
          gameName: game.name || stats.gameName || `Steam game ${game.appid}`,
          hours: Math.round(Number(game.playtime_forever || 0) / 60),
          total: achievements.length,
          unlocked: achievements.filter((item) => item.achieved).length,
          achievements,
        };
      }));
      results.forEach((result, offset) => {
        if (result.status === 'fulfilled') {
          if (result.value.total > 0) achievementGames.push(result.value);
        } else {
          unavailableGames.push({ appId: String(batch[offset].appid), gameName: batch[offset].name || `Steam game ${batch[offset].appid}` });
        }
      });
    }
    achievementGames.sort((a, b) => a.gameName.localeCompare(b.gameName));
    const data = {
      gamesChecked: games.length,
      gamesWithAchievements: achievementGames.length,
      gamesUnavailable: unavailableGames,
      total: achievementGames.reduce((sum, game) => sum + game.total, 0),
      unlocked: achievementGames.reduce((sum, game) => sum + game.unlocked, 0),
      games: achievementGames,
    };
    allAchievementCache.set(account.steamId, { at: Date.now(), data });
    res.json(data);
  } catch (error) {
    diagnostic('STEAM-ACHIEVEMENTS-0001', 'Steam library achievements request failed.', null, 'WARN', {
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'STEAM_ACHIEVEMENTS_FAILED',
      status: Number.isInteger(error?.status) ? error.status : undefined,
    });
    res.status(502).json({ error: 'Steam achievements could not be loaded.' });
  }
});

// Per-game achievement data comes from Steam's official user-stats endpoint.
app.get('/api/v1/profile/achievements/:appId', async (req, res) => {
  const appId = String(req.params.appId || '');
  if (!/^\d+$/.test(appId)) return res.status(400).json({ error: 'A valid Steam App ID is required.' });
  const account = getLocalSteamAccount();
  if (!account?.steamId) return res.status(400).json({ error: 'Sign in to Steam on this PC or configure STEAM_ID64 first.' });
  try {
    const payload = await steamWebApi('ISteamUserStats', 'GetPlayerAchievements', {
      steamid: account.steamId, appid: appId, l: 'english',
    });
    const response = payload.playerstats;
    if (!response?.success) return res.status(404).json({ error: response?.error || 'Steam achievement data is unavailable for this game.' });
    const achievements = (response.achievements || []).map((achievement) => ({
      apiName: achievement.apiname,
      name: achievement.name || achievement.apiname,
      description: achievement.description || '',
      achieved: Number(achievement.achieved) === 1,
      unlockTime: Number(achievement.unlocktime || 0) || null,
    }));
    res.json({
      appId, gameName: response.gameName || null,
      total: achievements.length,
      unlocked: achievements.filter((achievement) => achievement.achieved).length,
      achievements,
    });
  } catch (error) {
    diagnostic('STEAM-ACHIEVEMENTS-0002', 'Steam per-game achievements request failed.', null, 'WARN', {
      appId,
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'STEAM_ACHIEVEMENTS_FAILED',
      status: Number.isInteger(error?.status) ? error.status : undefined,
    });
    res.status(502).json({ error: 'Steam achievement data is temporarily unavailable.' });
  }
});

// Installed games are discovered from local Steam appmanifest files; no login
// or Steam credentials are requested or stored.
app.get('/api/v1/library/installed', (_req, res) => {
  try { res.json(getInstalledGames()); }
  catch (error) {
    diagnostic('LIBRARY-0001', 'Installed game library read failed.', null, 'ERROR', {
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'LIBRARY_READ_FAILED',
    });
    res.status(500).json({ error: 'Installed game library could not be read.' });
  }
});

app.post('/api/v1/library/refresh', (_req, res) => {
  try {
    const result = scanInstalledGames();
    diagnostic('LIBRARY-0002', 'Installed Steam library scan completed.', null, 'INFO', {
      gamesFound: result.games.length, librariesFound: result.libraryCount,
    });
    res.json(result);
  } catch (error) {
    diagnostic('LIBRARY-0003', 'Installed Steam library scan failed.', null, 'ERROR', {
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'LIBRARY_SCAN_FAILED',
    });
    res.status(500).json({ error: 'Installed Steam library scan failed.' });
  }
});

app.post('/api/v1/library/launch', async (req, res) => {
  try {
    const result = await launchInstalledGame(req.body?.appId);
    diagnostic('GAME-LAUNCH-0001', 'Steam game launch request completed.', null, 'INFO', { appId: result.appId });
    res.json(result);
  } catch (error) {
    diagnostic('GAME-LAUNCH-0002', 'Steam game launch request failed.', null, 'WARN', {
      appId: /^\\d{1,12}$/.test(String(req.body?.appId || '')) ? String(req.body.appId) : 'invalid',
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'GAME_LAUNCH_FAILED',
    });
    res.status(400).json({ error: 'The requested Steam game could not be launched.' });
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
    diagnostic('STEAM-STORE-0001', 'Steam Store search request failed.', null, 'WARN', {
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'STORE_REQUEST_FAILED',
    });
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
  diagnostic('WS-0001', 'WebSocket connection opened.', null, 'INFO', { mode: ws.mode || 'unknown' });
  ws.on('error', (error) => {
    diagnostic('WS-0002', 'WebSocket connection error.', null, 'WARN', {
      mode: ws.mode || 'unknown',
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'WEBSOCKET_ERROR',
    });
  });
  ws.on('message', (rawMessage) => {
    let message;
    try { message = JSON.parse(rawMessage.toString()); } catch {
      diagnostic('WS-MESSAGE-0002', 'WebSocket received invalid JSON.', null, 'WARN', { mode: ws.mode || 'unknown' });
      return;
    }
    diagnostic('WS-MESSAGE-0001', 'WebSocket message received.', null, 'INFO', {
      mode: ws.mode || 'unknown',
      type: typeof message?.type === 'string' ? message.type.slice(0, 40) : 'untyped',
    });

    if (ws.mode !== 'party') {
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === 1 && client.mode !== 'party' && client.session === ws.session) {
          client.send(rawMessage.toString());
        }
      });
      return;
    }

    if (message.type === 'join') {
      diagnostic('PARTY-WS-0001', 'Party voice signaling join received.', null, 'INFO');
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
      diagnostic('PARTY-WS-0002', 'Party voice signaling message routed.', null, 'INFO', { type: message.type });
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

  ws.on('close', (code) => {
    diagnostic('WS-0003', 'WebSocket connection closed.', null, 'INFO', { mode: ws.mode || 'unknown', code });
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

app.use((error, req, res, _next) => {
  diagnostic('HTTP-ERROR-0001', 'Unhandled backend route error.', null, 'ERROR', {
    method: req.method,
    route: String(req.path || '/').slice(0, 180),
    code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'ROUTE_ERROR',
  });
  if (res.headersSent) return;
  res.status(500).json({ error: 'An unexpected backend error occurred.' });
});

export function startServer(port = PORT, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    if (server.listening) return resolve(server);
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      diagnostic('SERVER-0000', 'Backend server is listening.', null, 'INFO', {
        host, port: server.address().port, pid: process.pid, platform: process.platform,
      });
      resolve(server);
    });
  });
}

process.on('uncaughtException', (error) => {
  diagnostic('SERVER-FATAL-0001', 'Uncaught exception in backend process.', null, 'FATAL', {
    name: String(error?.name || 'Error').slice(0, 80),
    code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'UNCAUGHT_EXCEPTION',
  });
  process.exitCode = 1;
});
process.on('unhandledRejection', (reason) => {
  diagnostic('SERVER-PROMISE-0001', 'Unhandled promise rejection in backend process.', null, 'ERROR', {
    name: String(reason?.name || 'Error').slice(0, 80),
    code: /^[A-Z0-9_-]{1,80}$/i.test(String(reason?.code || '')) ? String(reason.code) : 'UNHANDLED_REJECTION',
  });
});
process.on('exit', (code) => {
  diagnostic('SERVER-EXIT-0001', 'Backend process is exiting.', null, code === 0 ? 'INFO' : 'ERROR', { exitCode: code });
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  diagnostic('SERVER-BOOT-0000', 'Backend process starting.', null, 'INFO', {
    pid: process.pid, platform: process.platform, node: process.version,
  });
  startServer(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1')
    .catch((error) => { diagnostic('SERVER-0001', 'Backend server failed to start.', null, 'FATAL', {
      code: /^[A-Z0-9_-]{1,80}$/i.test(String(error?.code || '')) ? String(error.code) : 'SERVER_START_FAILED',
    }); process.exitCode = 1; });
}
