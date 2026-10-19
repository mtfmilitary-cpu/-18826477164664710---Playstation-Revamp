# HP Notebook 2000 — Party VOIP signaling server

This folder contains a separate, lightweight Python WebSocket signaling server for the console's existing WebRTC Party Chat. It does **not** relay voice audio: WebRTC sends audio peer-to-peer when the network allows it. Some networks need a TURN relay for reliable calls.

## Setup on the HP Notebook 2000

1. Copy this folder onto the HP Notebook 2000.
2. Install Python 3.10+ and run `python -m pip install -r requirements.txt`.
3. Copy `.env.example` to `.env`.
4. On the HP Notebook, run `ipconfig` in Windows (or `ip addr` on Linux) and set `VOIP_ADVERTISE_HOST` to the actual LAN IPv4 address. Do not guess this value. Reserve the address in the router if possible so it stays stable.
5. Run `python voip_server.py`. The listener binds to `0.0.0.0:8766`.
6. Allow TCP port 8766 through the host firewall **only for the Private network profile**. Do not expose/port-forward this signaling port to the public internet.

## Client configuration

Set the Vite client variable in the console project's root `.env` (keep this file private):

```dotenv
VITE_VOIP_SERVER_URL=ws://YOUR_HP_NOTEBOOK_LAN_IPV4:8766
```

Replace the placeholder with the address you confirmed on the HP Notebook. Restart the Vite/Electron app after changing it. For LAN-only use, `ws://` is appropriate. Public internet voice needs HTTPS/WSS signaling and a TURN server; this lightweight signaling server is not a public deployment.

## Protocol and limits

The server accepts the existing Party Chat signaling packet types: `join`, `offer`, `answer`, `ice`, and `leave`. Party IDs should be the existing random UUIDs. This standalone service does not authenticate membership against the console's main party database, so use it only on a trusted LAN and do not expose it to the internet. It holds active room state in RAM and clears rooms when peers leave or the server stops.

## Troubleshooting

- Find the HP's address with `ipconfig` / `ip addr`.
- Ensure the console PC and HP are on the same trusted LAN.
- Confirm port 8766 is allowed on the HP's private firewall profile.
- Browser microphone access may require the Electron desktop app or a secure HTTPS context.
- If peer connections fail despite signaling working, the network may require TURN. STUN alone is not guaranteed to work on every NAT.
