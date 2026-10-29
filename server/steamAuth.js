import express from "express";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const router = express.Router();
const pending = new Map();
const TTL_MS = 5 * 60 * 1000;
const ISSUER = "playstation-revamp";
const AUDIENCE = "electron-steam-console";
const b64 = (value) => Buffer.from(value).toString("base64url");
function signingSecret() {
  const value = process.env.STEAM_SESSION_SECRET || "";
  if (Buffer.byteLength(value) < 32) throw new Error("STEAM_SESSION_SECRET must be at least 32 bytes.");
  return value;
}
function signToken(payload) {
  const input = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64(JSON.stringify(payload));
  return input + "." + createHmac("sha256", signingSecret()).update(input).digest("base64url");
}
export function verifySteamToken(token) {
  try {
    if (typeof token !== "string" || token.length > 4096) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const expected = createHmac("sha256", signingSecret()).update(parts[0] + "." + parts[1]).digest();
    const supplied = Buffer.from(parts[2], "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (header.alg !== "HS256" || payload.iss !== ISSUER || payload.aud !== AUDIENCE ||
        !/^\d{17}$/.test(payload.steamId || "") || !Number.isFinite(payload.exp) ||
        payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
const validState = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of pending) if (now - entry.createdAt > TTL_MS) pending.delete(key);
}
router.post("/steam/start", (_req, res) => {
  cleanup();
  try { signingSecret(); } catch {
    return res.status(503).json({ error: "Steam sign-in is not configured. Set STEAM_SESSION_SECRET in the private .env file." });
  }
  const state = randomBytes(32).toString("hex");
  const origin = process.env.STEAM_OPENID_ORIGIN || "http://127.0.0.1:3000";
  let base;
  try { base = new URL(origin); } catch { return res.status(503).json({ error: "Steam OpenID origin is invalid." }); }
  if (base.protocol !== "https:" && !["127.0.0.1", "localhost", "::1"].includes(base.hostname)) {
    return res.status(503).json({ error: "Steam OpenID must use HTTPS except for loopback development." });
  }
  const returnTo = new URL("/api/v1/auth/steam/return", base);
  returnTo.searchParams.set("state", state);
  const authUrl = new URL("https://steamcommunity.com/openid/login");
  for (const [key, value] of Object.entries({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo.toString(),
    "openid.realm": base.origin + "/",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })) authUrl.searchParams.set(key, value);
  pending.set(state, { createdAt: Date.now(), status: "pending" });
  res.json({ state, authUrl: authUrl.toString(), expiresInSeconds: TTL_MS / 1000 });
});
router.get("/steam/return", async (req, res) => {
  cleanup();
  const state = String(req.query.state || "");
  const entry = pending.get(state);
  if (!validState(state) || !entry || entry.status !== "pending") {
    return res.status(400).send("This Steam sign-in has expired or was not started by this console. Return to the app and try again.");
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key.startsWith("openid.") && typeof value === "string") query.set(key, value);
  }
  const claimed = query.get("openid.claimed_id") || "";
  const identity = query.get("openid.identity") || "";
  const match = claimed.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (query.get("openid.mode") !== "id_res" || !match || identity !== claimed) {
    pending.delete(state);
    return res.status(400).send("Steam did not return a valid account identity. You can close this page.");
  }
  const origin = process.env.STEAM_OPENID_ORIGIN || "http://127.0.0.1:3000";
  const expectedReturn = new URL("/api/v1/auth/steam/return", origin);
  expectedReturn.searchParams.set("state", state);
  if (query.get("openid.return_to") !== expectedReturn.toString()) {
    pending.delete(state);
    return res.status(400).send("The Steam sign-in callback did not match the original request.");
  }
  query.set("openid.mode", "check_authentication");
  try {
    const response = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "text/plain" },
      body: query,
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.text();
    if (!response.ok || !/^is_valid:true\s*$/m.test(body)) throw new Error("Steam assertion validation failed.");
    const now = Math.floor(Date.now() / 1000);
    const steamId = match[1];
    entry.token = signToken({ iss: ISSUER, aud: AUDIENCE, sub: steamId, steamId, username: "Steam_" + steamId.slice(-6), iat: now, exp: now + 3600 });
    entry.steamId = steamId;
    entry.status = "complete";
    res.status(200).type("html").send("<!doctype html><meta charset=utf-8><title>Steam sign-in complete</title><main style='font:16px system-ui;max-width:34rem;margin:4rem auto;padding:1rem'><h1>Steam sign-in complete</h1><p>Your Steam account was verified. Return to the Electron Steam Console; this window can now be closed.</p></main>");
  } catch {
    pending.delete(state);
    res.status(502).send("Steam could not validate this sign-in. Return to the console and try again.");
  }
});
router.get("/steam/poll", (req, res) => {
  cleanup();
  const state = String(req.query.state || "");
  if (!validState(state)) return res.status(400).json({ error: "Invalid sign-in state." });
  const entry = pending.get(state);
  if (!entry) return res.status(410).json({ error: "Sign-in expired. Please try again." });
  if (entry.status !== "complete") return res.json({ status: "pending" });
  pending.delete(state);
  res.json({ status: "complete", token: entry.token, steamId: entry.steamId, expiresInSeconds: 3600 });
});
export default router;
