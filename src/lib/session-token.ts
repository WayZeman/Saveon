/** Підписані сесії (HMAC-SHA256). Cookie більше не містить сирий userId — неможливо підставити чужий ID у Postman. */

const TOKEN_PREFIX = "v1";
const encoder = new TextEncoder();

function getDevFallbackSecret(): string {
  return "dev-session-secret-min-32-chars-do-not-use-in-prod!!";
}

export function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (мінімум 32 символи)");
    }
    console.warn(
      "[auth] SESSION_SECRET не задано або занадто короткий — використовується небезпечний dev-значення."
    );
    return getDevFallbackSecret();
  }
  return s;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signPayloadB64(payloadB64: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return base64UrlEncode(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSessionToken(userId: string, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = JSON.stringify({ sub: userId, exp });
  const payloadB64 = base64UrlEncode(encoder.encode(payload));
  const sig = await signPayloadB64(payloadB64, secret);
  return `${TOKEN_PREFIX}.${payloadB64}.${sig}`;
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<string | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  const [payloadB64, sig] = [parts[1], parts[2]];
  if (!payloadB64 || !sig) return null;
  const expectedSig = await signPayloadB64(payloadB64, secret);
  if (!timingSafeEqual(sig, expectedSig)) return null;
  try {
    const json = decoder.decode(base64UrlDecode(payloadB64));
    const parsed = JSON.parse(json) as { sub?: string; exp?: number };
    if (!parsed.sub || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

const decoder = new TextDecoder();
