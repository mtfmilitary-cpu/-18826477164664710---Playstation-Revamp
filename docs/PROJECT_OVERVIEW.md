# PlayStation Revamp — Electron Steam Console
## Project overview
**Project:** PlayStation Revamp / Electron Steam Console  
**Repository:** `mtfmilitary-cpu/-18826477164664710---Playstation-Revamp`  
**Active development branch:** `electron-steam-console`  
**Platform target:** Windows desktop first, using an Electron shell  
**Product goal:** A PlayStation-inspired console interface for PC that connects to Steam for game discovery, local installed-game browsing, profile information, achievements, and social/party features.

> Status labels in this document mean: **Implemented in code** = visible in the current branch; **Partial / needs testing** = code exists but is incomplete or not verified end-to-end; **Planned** = not yet complete. GitHub code review is not the same as a successful local build or device test.

## 1. Languages and technologies
- **JavaScript (ES modules and React JSX):** primary language for the interface, Electron main process, and Node backend.
- **HTML/CSS:** page structure and PlayStation-inspired styling.
- **Node.js:** runtime for the local backend and desktop-side JavaScript.
- **React 19:** component-based user interface.
- **Vite 7:** frontend development server and production bundler.
- **Electron 40:** Windows desktop window and operating-system integration.
- **Express 5:** local HTTP API.
- **WebSocket (`ws`):** real-time signaling / controller communication.
- **WebRTC:** peer-to-peer voice media and data channels in party chat.
- **Three.js + React Three Fiber + Drei:** 3D controller showcase.
- **Framer Motion and GSAP:** interface transitions and animations.
- **React Router:** in-app page navigation.
- **Lucide React:** interface icons.
- **Tailwind CSS tooling:** available in project dependencies; existing UI also uses component CSS and inline styles.
- **JSON and environment variables:** API responses and configuration. A local `.env` file can hold secrets; secrets must not be exposed to the renderer or committed to Git.
- **Python:** a separate/optional VOIP-server code path has been part of the wider project work; the primary desktop app and its current local API are JavaScript/Node-based.

## 2. Architecture
1. **React renderer** draws the console UI and calls the local HTTP API.
2. **Vite** serves the frontend during development and builds static assets.
3. **Electron main process** creates the desktop window, handles selected OS-level operations, opens approved Steam links externally, and starts the local Node server.
4. **Electron preload** exposes a small, restricted bridge; Node integration is disabled and context isolation is enabled.
5. **Express API** provides versioned routes under `/api/v1` for Steam profile/store/library and party features.
6. **Steam integration** reads configured Steam profile/API data and scans local Steam app manifests for installed games; Steam protocol links hand launch requests to the Steam client.
7. **Party voice** uses WebSocket signaling and WebRTC peer connections. The signaling server coordinates peers; the voice media itself is peer-to-peer in the current design.
8. **Diagnostics** record application startup, HTTP activity, Electron lifecycle, Steam configuration checks, and errors without intentionally logging request bodies or credentials.

## 3. Features in the current branch

### Console interface
- **Implemented in code:** PlayStation-inspired home/dashboard layout, page routing, animated game cards/background transitions, visual focus states, and custom cursor/virtual cursor work.
- **Implemented in code:** Quick Menu with Sound and Devices, Friends, Party Chat, Music, Achievements, Customize Console, and Sleep Mode/Power sections.
- **Implemented in code:** Quick Menu keyboard arrow navigation and focus highlighting; selected controller navigation paths exist.
- **Partial / needs testing:** Full DualShock/controller parity and reliable focus behavior across every page and control.

### Steam library and launch
- **Implemented in code:** API helpers for installed Steam games, library refresh, and game launch.
- **Implemented in code:** Local Steam game discovery via app manifest files and launch handoff through the Steam protocol.
- **Design requirement:** The Library is intended to show **installed Steam games**, not every game in the Steam store.
- **Partial / needs testing:** Installed-game detection, launch behavior, artwork matching, and error handling on the target Windows PC need end-to-end verification.

### Steam Store
- **Implemented in code:** In-app featured-game loading, search, game detail panels, available price/genre/description data, sharing links, and Play/View on Steam actions.
- **Implemented in code:** An **Open full Steam Store** link to the official storefront.
- **Limitation:** The complete official Steam Store is **not embedded inside the console**. The full-store link opens Steam's official site externally; the in-app view is a smaller discovery/search interface.

### Steam profile and achievements
- **Implemented in code:** Profile endpoint integration for persona name and profile information; the Steam username is shown instead of an editable console identity field when profile data is available.
- **Implemented in code:** Quick Menu action to request and display all returned achievements, grouped by game, with unlock information.
- **Partial / needs testing:** The data available depends on Steam API configuration, profile privacy, and API response availability. Achievement volume and performance should be tested with a large account.

### Friends, parties, text, and voice
- **Implemented in code:** Party creation, open-party listing, joining/leaving, invites, party messages, and a party room UI against the local API.
- **Implemented in code:** WebSocket signaling and WebRTC peer-to-peer voice/data-channel scaffolding; microphone mute and selected audio input/output handling are present in the client.
- **Partial / needs testing:** Microphone switching and output routing use browser/Electron media APIs and must be tested on Windows hardware. Output routing uses `setSinkId` where supported; this is not system-wide Windows audio control.
- **Important security limitation:** Party names and usernames supplied by the client are not proof of Steam identity. **Steam-friends-only access is not securely enforced yet.** Do not treat the current invite UI or submitted usernames as authentication.

### Customize Console and devices
- **Implemented in code:** Inline Quick Menu appearance controls for accent color, backdrop, and font, stored in local storage and applied to the UI.
- **Implemented in code:** Audio input/output device enumeration and selection controls.
- **Planned:** Native Windows master-volume/system-default-device control and broader device settings.

### Diagnostics and configuration
- **Implemented in code:** Diagnostic events for startup/file checks, Electron window lifecycle, HTTP status and duration, Steam configuration checks, and related errors.
- **Implemented in code:** `.env` parsing and checks for Steam API key, Steam ID64, and Steam installation path; secrets should remain private.
- **Partial / needs testing:** Full diagnostics coverage and production logging/rotation behavior should be tested in a real install.

## 4. Current launch workflow
From a terminal in the repository:
```bash
git switch electron-steam-console
git pull origin electron-steam-console
npm install
npm run electron:dev
```
The development script starts Vite on localhost and launches Electron after the frontend is available. This command is documented from the current package scripts; successful execution on a particular PC still needs local testing.

For a production frontend build:
```bash
npm run build
```
The package also defines `npm run desktop` for a build followed by Electron launch. Packaging/distribution as a polished Windows installer is a separate task.

## 5. Version history and release numbering
### What is verified
- The current `package.json` still declares version **`0.0.0`**.
- The branch name is `electron-steam-console`.
- The project evolved from a browser-based PlayStation-style web experience toward a desktop Electron console with Steam integration.
- No reliable official release-tag/semantic-version count was established during this review. Therefore, the numbered milestones below are a **proposed reconstructed development history**, not a claim that GitHub already contains releases or tags for each number.

### Proposed milestone map
| Version label | Milestone |
|---|---|
| **1.0** | Original iteration: PlayStation-inspired web UI / initial console experience. |
| **1.1** | Dashboard and navigation polish: game cards, page layout, animation and focus improvements. |
| **1.2** | Steam data integration: store search/details and profile/library API foundations. |
| **1.3** | Desktop conversion: Electron main/preload integration and local Node/Express API. |
| **1.4** | Local Steam library discovery, refresh, and launch handoff. |
| **1.5** | Steam profile/stat panels and achievements integration. |
| **1.6** | Quick Menu, party rooms, party messaging, and WebRTC voice scaffolding. |
| **1.7** | Current integration milestone: inline customization, audio device selection, achievement access, external full-store link, and keyboard/controller focus improvements. |
| **1.8A** | Next development stage: test and stabilize the current features; fix integration bugs found on the target PC. |
| **1.8B** | Native controller pass: complete button mappings, focus recovery, and USB/Bluetooth testing. |
| **1.8C** | Audio and party reliability: verify device switching, call cleanup/reconnect, and error reporting. |
| **1.9A** | Steam identity and security foundation: authenticated Steam IDs and server-side authorization design. |
| **1.9B** | Friend-only parties: verify Steam friendship and enforce access on the backend for listing, joining, invites, and voice signaling. |
| **1.9C** | Hosted multi-user backend and deployment/security hardening. |
| **2.0** | Major milestone only after core integrations are tested and the desktop experience is stable; set the actual package version and release/tag then. |

**How to interpret the count:** This plan names **8 numbered milestones from 1.0 through 1.7** as a reconstructed history, plus upcoming lettered development stages. It does **not** establish that eight formal releases have shipped. The exact number of historical iterations/releases cannot be verified from the package version alone.

## 6. Planned / future support
Priority order:
1. **Reliability pass:** build and run the current branch locally, test each page/API, and fix errors before adding major features.
2. **Complete controller support:** D-pad and analog navigation, repeat timing, Cross/select, Circle/back or close, L1/R1 section navigation, Share/Home, Options/Quick Menu, and PS button integration where technically available; test wired and Bluetooth controllers.
3. **Steam authentication:** use a real authenticated Steam identity rather than a user-entered display name.
4. **Secure friends-only parties:** verify friendship server-side and apply authorization to every party/voice entry point.
5. **Reachable shared backend:** support different users on different PCs; current in-memory party rooms are local to the running server and reset when it restarts.
6. **Audio improvements:** verify microphone changes, output routing, device disappearance/reconnection, and call recovery; add native Windows system-volume/default-device controls if required.
7. **Music source integration:** controls are present, but a concrete provider/source and playback integration still need to be selected and implemented.
8. **Store expansion:** improve in-app search and catalog details. Keep the full official Steam storefront external unless a supported, permitted integration approach is established.
9. **Packaging and release engineering:** Windows installer, app icon, version metadata, update strategy, clean install/uninstall testing, and documented release notes.
10. **Automated tests:** API tests, UI smoke tests, controller/audio test checklist, and a repeatable release build.

## 7. Current known limitations
- Full Steam Store experience is an external link, not an embedded storefront.
- Steam-friends-only party authorization is not implemented securely.
- Party rooms currently live in server memory and reset when the server restarts; multi-PC party access requires a reachable shared backend.
- Audio controls are for party voice media, not global Windows sound settings.
- Music provider/playback integration is not complete.
- Controller support is still subject to hardware and focus testing.
- No successful local build or Windows hardware test is asserted by this document.

## 8. Versioning recommendation
Before calling a build a release:
1. Update `package.json` from `0.0.0` to the intended version.
2. Update this document and release notes.
3. Run `npm run lint` and `npm run build`; launch and test the Electron app locally.
4. Verify Steam launch, profile, library, store, party messaging/voice, audio-device switching, and controller paths.
5. Create a Git tag such as `v1.8.0` only after the release candidate passes those checks.

This document is an engineering overview, not a guarantee that every feature has passed end-to-end testing.
