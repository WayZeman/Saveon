/**
 * Шифрування полів у БД (AES-256-GCM). Існуючі незашифровані значення читаються як текст;
 * скрипт migrate або запис через Prisma застосує префікс enc:v1:
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "enc:v1:";
const SALT = "saveon-field-crypto-v1";

function getKey32(): Buffer {
  const b64 = process.env.DATA_ENCRYPTION_KEY;
  if (b64) {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== 32) {
      throw new Error("DATA_ENCRYPTION_KEY має бути рівно 32 байти у base64");
    }
    return buf;
  }
  const fallback = process.env.SESSION_SECRET || "dev-local-only-key-change-me!!!!";
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[crypto] DATA_ENCRYPTION_KEY не задано — ключ походить від SESSION_SECRET (не рекомендовано для продакшену)."
    );
  }
  return scryptSync(fallback, SALT, 32);
}

export function isEncryptedField(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Зашифрувати plaintext; якщо вже з префіксом — повернути як є */
export function encryptField(plain: string): string {
  if (plain === "" || isEncryptedField(plain)) return plain;
  const iv = randomBytes(12);
  const key = getKey32();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]).toString("base64");
  return `${PREFIX}${packed}`;
}

/** Розшифрувати або повернути legacy plaintext */
export function decryptField(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (raw.length < 12 + 16) return stored;
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const key = getKey32();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
