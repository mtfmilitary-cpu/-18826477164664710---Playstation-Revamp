# Secure voice, identity, and update migration

Target branch: `electron-steam-console`.

## New modules
- `server/steamAuth.js`: Steam OpenID 2.0 start/callback/poll flow. The backend validates the OpenID assertion directly with Valve and issues a one-hour HS256 token using Node's built-in crypto.
- `server/updateService.js`: semantic-version comparison and update manifest shape validation.
- `POST /api/v1/system/update-check`: mounted version-check endpoint; it reports the configured version and manifest URL but does not download or install updates.

## Private configuration
Add these to local `.env` only; never commit real secrets:

```dotenv
STEAM_SESSION_SECRET=replace_with_at_least_32_random_bytes
STEAM_OPENID_ORIGIN=http://127.0.0.1:3000
CONSOLE_UPDATE_VERSION=0.0.0
CONSOLE_UPDATE_MANIFEST_URL=
```

For a hosted service, use HTTPS and configure the exact public HTTPS origin. Loopback HTTP is only for local development.

## Authentication flow
1. Renderer calls `POST /api/v1/auth/steam/start` and opens the returned URL in the system browser.
2. Steam returns to `GET /api/v1/auth/steam/return`; the backend checks state, exact callback, SteamID format, and asks Valve to validate the assertion.
3. Renderer polls `GET /api/v1/auth/steam/poll?state=...`; the token is returned once and expires after one hour.

**Current limits:** Party REST routes and the `/party-ws` / `/party-ws-secure` signaling paths now require a valid session token, and server-side party usernames are derived from the verified Steam ID. Open parties are still joinable by any authenticated user, and invitations still use display-name text rather than a verified Steam-friends relationship. Do not describe this as Steam-friends-only access.

## Voice architecture
Existing party audio is WebRTC peer-to-peer; a WebSocket signaling server alone does not relay audio. A real SFU requires mediasoup (or equivalent), UDP/NAT/TURN configuration, per-room routing, transport lifecycle management, and testing. Keep the existing P2P path until an SFU is deployed and clients are migrated. An SFU hides peers' public IPs from one another, but the relay sees their network connections.

## Windows shortcuts
Use Electron's focused-window keyboard handling and the existing in-app power flow. Electron cannot reliably block the Windows key globally without native hooks or kiosk policy. This project does not install a global low-level keyboard interceptor.

## Delta updates
The version-check endpoint and manifest-shape helper are not a complete updater. A production updater must verify a signed manifest, allowlist destinations, stage downloads, hash every file, atomically swap files, preserve rollback, and relaunch only after successful verification. Hashes alone do not authenticate an unsigned manifest.
