# Secure voice, identity, and update migration

Target branch: `electron-steam-console`.

## New modules
- `server/steamAuth.js`: Steam OpenID 2.0 start/callback/poll flow. The backend validates the OpenID assertion directly with Valve and issues a one-hour HS256 token using Node's built-in crypto.
- `server/updateService.js`: semantic-version comparison and update manifest shape validation.
- `electron/updater.js`: Ed25519-signed manifest verification, HTTPS same-origin asset downloads, SHA-256 checks, staging, and rollback-capable replacement of changed built frontend assets. Electron exposes this through the restricted `checkForUpdates()` preload method.
- `POST /api/v1/system/update-check`: mounted version-check endpoint; reports the configured version and manifest URL.
- `consoleBridge.checkForUpdates()`: verifies and stages changed `dist/` assets, asks before applying, then restarts the app.

## Private configuration
Add these to local `.env` only; never commit real secrets:

```dotenv
STEAM_SESSION_SECRET=replace_with_at_least_32_random_bytes
STEAM_OPENID_ORIGIN=http://127.0.0.1:3000
CONSOLE_UPDATE_VERSION=0.0.0
CONSOLE_UPDATE_MANIFEST_URL=https://your-host.example/manifest.signed.json
CONSOLE_UPDATE_PUBLIC_KEY_B64=base64_encoded_DER_Ed25519_public_key
```

For a hosted service, use HTTPS and configure the exact public HTTPS origin. Loopback HTTP is only for local development.

## Authentication flow
1. Renderer calls `POST /api/v1/auth/steam/start` and opens the returned URL in the system browser.
2. Steam returns to `GET /api/v1/auth/steam/return`; the backend checks state, exact callback, SteamID format, and asks Valve to validate the assertion.
3. Renderer polls `GET /api/v1/auth/steam/poll?state=...`; the token is returned once and expires after one hour.
4. Party REST calls send the JWT as a Bearer token. Before voice signaling, the client requests `POST /api/v1/auth/voice-ticket`; the backend returns a single-use ticket that expires in 60 seconds. The WebSocket URL carries only that short-lived ticket, not the one-hour JWT.

**Current limits:** Party REST routes require a valid session token; the `/party-ws` / `/party-ws-secure` signaling paths require a single-use 60-second ticket minted from that token. Server-side party usernames are derived from the verified Steam ID. Open parties are still joinable by any authenticated user, and invitations still use display-name text rather than a verified Steam-friends relationship. Do not describe this as Steam-friends-only access.

## Voice architecture
Existing party audio is WebRTC peer-to-peer; a WebSocket signaling server alone does not relay audio. A real SFU requires mediasoup (or equivalent), UDP/NAT/TURN configuration, per-room routing, transport lifecycle management, and testing. Keep the existing P2P path until an SFU is deployed and clients are migrated. An SFU hides peers' public IPs from one another, but the relay sees their network connections.

## Windows shortcuts
Use Electron's focused-window keyboard handling and the existing in-app power flow. Electron cannot reliably block the Windows key globally without native hooks or kiosk policy. This project does not install a global low-level keyboard interceptor.

## Delta updates
Create the signing key on a trusted machine and keep the private key off the CDN and out of Git:

```bash
openssl genpkey -algorithm ED25519 -out update-private.pem
openssl pkey -in update-private.pem -pubout -outform DER -out update-public.der
node -e "console.log(require('node:fs').readFileSync('update-public.der').toString('base64'))"
node scripts/sign-update-manifest.js manifest.json manifest.signed.json update-private.pem
```

Copy the printed public-key value into `CONSOLE_UPDATE_PUBLIC_KEY_B64`; publish only `manifest.signed.json` and the referenced assets over HTTPS. `manifest.json` must contain a semantic `version` and `files` entries with `path`, `sha256`, and same-origin HTTPS `url` values. Set `CONSOLE_UPDATE_VERSION` to the same version.
The updater currently supports only unpackaged repository builds with a writable `dist/` folder. It requires an HTTPS manifest envelope signed with Ed25519; configure `CONSOLE_UPDATE_PUBLIC_KEY_B64` with the base64-encoded DER SubjectPublicKeyInfo public key, and configure `CONSOLE_UPDATE_MANIFEST_URL`. The signed payload is JSON with `version` and `files: [{ path, sha256, url }]`. Assets must be hosted on the same HTTPS origin as the manifest, and only `dist/assets/*` plus `dist/index.html` can be replaced. Downloads are SHA-256 checked and staged before the user confirms applying the update; replacement includes rollback on failure. Packaged Electron builds are deliberately rejected; use a signed installer/update provider for production packages. Never trust a plain hash list served by an unsigned LAN server.
