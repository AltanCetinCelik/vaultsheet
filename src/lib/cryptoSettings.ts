import crypto from "crypto";

function deriveAesKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(`vaultsheet-quant:${secret}`).digest();
}

export function encryptCloudSecret(plainText: string, secret: string): string {
  const clean = plainText.trim();
  if (!clean) return "";
  const key = deriveAesKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptCloudSecret(payload: string, secret: string): string {
  const clean = payload.trim();
  if (!clean.startsWith("v1:")) return "";
  const parts = clean.split(":");
  if (parts.length !== 4) return "";
  try {
    const key = deriveAesKey(secret);
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const encrypted = Buffer.from(parts[3], "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function getServerSigningSecret(): string {
  return (
    process.env.POLAR_WEBHOOK_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.POLAR_ACCESS_TOKEN?.trim() ||
    ""
  );
}

export function signSentinelToken(customerId: string, secret: string): string {
  return crypto
    .createHmac("sha256", `sentinel:${secret}`)
    .update(customerId.trim())
    .digest("hex")
    .slice(0, 32);
}

export function verifySentinelToken(
  customerId: string,
  sig: string,
  secret: string
): boolean {
  if (!customerId || !sig || !secret) return false;
  const expected = signSentinelToken(customerId, secret);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
