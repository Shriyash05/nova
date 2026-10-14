import crypto from 'crypto';

// Standard 32-byte key for AES-256-GCM.
// In production, NOTION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).
function getEncryptionKey(): Buffer {
  const envKey = process.env.NOTION_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // Deterministic fallback derived from server environment or host identity
  const fallbackSeed = process.env.VERCEL_PROJECT_ID || process.env.NOTION_CLIENT_SECRET || 'nova_default_local_vault_key_2026';
  return crypto.createHash('sha256').update(fallbackSeed).digest();
}

/**
 * Encrypts a sensitive secret string using AES-256-GCM.
 * Output format: "iv_hex:auth_tag_hex:cipher_text_hex"
 */
export function encryptSecret(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a secret encrypted with AES-256-GCM.
 */
export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
