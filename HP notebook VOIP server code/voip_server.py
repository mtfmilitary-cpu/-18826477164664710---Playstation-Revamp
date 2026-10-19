"""LAN-only WebRTC signaling relay for the console's Party Chat.

This relays SDP/ICE setup packets only; audio travels peer-to-peer via WebRTC.
Keep the listening port restricted to your trusted LAN. Do not port-forward it.
"""
import asyncio
import json
import logging
import os
import re
from pathlib import Path

try:
    from websockets.asyncio.server import serve
except ImportError as exc:
    raise SystemExit("Missing dependency. Run: python -m pip install -r requirements.txt") from exc

ROOT = Path(__file__).resolve().parent
def load_env(path: Path):
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

load_env(ROOT / ".env")
HOST = os.getenv("VOIP_BIND_HOST", "0.0.0.0")
PORT = int(os.getenv("VOIP_PORT", "8766"))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
rooms: dict[str, dict[str, dict]] = {}
peer_rooms: dict[str, str] = {}

def packet(data):
    return json.dumps(data, separators=(",", ":"))

async def send(ws, data):
    try:
        await ws.send(packet(data))
    except Exception:
        # A peer may disconnect between room lookup and send.
        return

async def handler(ws):
    party_id = peer_id = username = None
    try:
        async for raw in ws:
            if len(raw) > 64_000:
                await send(ws, {"type": "error", "message": "Signaling packet too large."})
                await ws.close(code=1009, reason="Packet too large")
                break
            try:
                msg = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                await send(ws, {"type": "error", "message": "Invalid JSON signaling packet."})
                continue
            kind = msg.get("type")
            if kind == "join":
                new_party = str(msg.get("partyId", ""))[:80]
                new_peer = str(msg.get("peerId", ""))[:100]
                new_name = re.sub(r"[\r\n\x00-\x1f]", "", str(msg.get("username", "Party member")))[:32].strip() or "Party member"
                if not new_party or not new_peer:
                    await send(ws, {"type": "error", "message": "Party ID and peer ID are required."})
                    continue
                if peer_id:
                    await send(ws, {"type": "error", "message": "This socket already joined a party."})
                    continue
                party_id, peer_id, username = new_party, new_peer, new_name
                room = rooms.setdefault(party_id, {})
                if peer_id in room:
                    await send(ws, {"type": "error", "message": "That peer ID is already in use."})
                    party_id = peer_id = username = None
                    continue
                existing = list(room.values())
                await send(ws, {"type": "peers", "peers": [{"peerId": p["peer_id"], "username": p["username"]} for p in existing]})
                room[peer_id] = {"ws": ws, "peer_id": peer_id, "username": username}
                peer_rooms[peer_id] = party_id
                for p in existing:
                    await send(p["ws"], {"type": "peer-joined", "peerId": peer_id, "username": username})
                logging.info("Peer joined a voice room (members=%d).", len(room))
                continue
            if not party_id or not peer_id:
                await send(ws, {"type": "error", "message": "Join a party before sending signaling packets."})
                continue
            if kind in ("offer", "answer", "ice"):
                target_id = str(msg.get("to", ""))[:100]
                target = rooms.get(party_id, {}).get(target_id)
                if target and target["ws"] is not ws:
                    forwarded = {k: msg[k] for k in ("type", "description", "candidate") if k in msg}
                    forwarded.update({"from": peer_id, "username": username})
                    await send(target["ws"], forwarded)
            elif kind == "leave":
                await remove_peer(party_id, peer_id)
                party_id = peer_id = username = None
    except Exception as exc:
        logging.info("Signaling socket closed (%s).", type(exc).__name__)
    finally:
        if party_id and peer_id:
            await remove_peer(party_id, peer_id)

async def remove_peer(party_id, peer_id):
    room = rooms.get(party_id, {})
    entry = room.pop(peer_id, None)
    peer_rooms.pop(peer_id, None)
    if entry:
        for other in list(room.values()):
            try:
                await send(other["ws"], {"type": "peer-left", "peerId": peer_id})
            except Exception:
                pass
    if not room:
        rooms.pop(party_id, None)

async def main():
    logging.info("Party VOIP signaling listening on %s:%s", HOST, PORT)
    async with serve(handler, HOST, PORT, max_size=64_000, ping_interval=20, ping_timeout=20):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
