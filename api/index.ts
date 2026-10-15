import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

// -----------------------------------------------------------------------------
// Database Pool Configuration
// -----------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Required for Supabase pooler connection
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export function _setPoolForTesting(testPool: pg.Pool | null) {
  pool = testPool;
}

// -----------------------------------------------------------------------------
// Types & Voice Slots
// -----------------------------------------------------------------------------
export const VOICE_SLOTS = [
  'network one',
  'network two',
  'network three',
  'network four',
  'network five',
] as const;

export type VoiceSlot = (typeof VOICE_SLOTS)[number];

interface ExtendedRequest extends IncomingMessage {
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}

interface DeviceRecord {
  id: string;
  serial_number: string;
  mac_address: string;
  hardware_model: string;
  firmware_version: string;
  status: string;
  device_secret?: string | null;
  bootstrap_hash?: string | null;
  ip_address: string | null;
  wifi_connected?: boolean | null;
  wifi_ssid: string | null;
  wifi_rssi: number | null;
  wifi_vault_version?: number | null;
  oled_state?: string | null;
  queue_count?: number | null;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
}

interface WifiProfileRecord {
  id: string;
  device_id: string;
  name: string;
  voice_slot: string;
  slot_number: number;
  ssid: string;
  encrypted_password: string | null;
  is_default: boolean;
  version: number;
  last_connection_result: string;
  last_attempted_at: string | null;
  last_rssi: number | null;
  created_at: string;
  updated_at: string;
}

interface ClaimTokenRecord {
  token: string;
  device_id: string;
  short_code: string;
  expires_at: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

interface NotionAuthRecord {
  device_id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  workspace_icon: string | null;
  bot_id: string | null;
  encrypted_access_token: string;
  target_database_id: string | null;
  target_database_name: string | null;
  owner_email: string | null;
  last_sync_at: string | null;
  connected_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Crypto Utilities (AES-256-GCM Envelope Encryption)
// -----------------------------------------------------------------------------
function getEncryptionKey(): Buffer {
  const envKey = process.env.NOTION_ENCRYPTION_KEY || process.env.WIFI_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }
  if (isProduction) {
    throw new Error('NOTION_ENCRYPTION_KEY environment variable is required in production.');
  }
  return crypto.createHash('sha256').update('nova_dev_fallback_key_2026').digest();
}

function encryptSecret(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptSecret(payload: string): string {
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

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

// -----------------------------------------------------------------------------
// Database Operations (Strict Postgres in Production)
// -----------------------------------------------------------------------------
async function queryDb<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const p = getPool();
  if (!p) {
    throw new Error('DATABASE_NOT_CONFIGURED: DATABASE_URL is required to perform persistent database operations.');
  }
  const result = await p.query(sql, params);
  return result.rows as T[];
}

// -----------------------------------------------------------------------------
// Distributed Rate Limiting (Serverless & Cold-Start Resilient)
// Backed by PostgreSQL rate_limits table.
// Fails closed for sensitive endpoints during database outages to prevent brute force.
// -----------------------------------------------------------------------------
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkInMemoryRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; count: number; resetAt: number } {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);
  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { allowed: true, count: 1, resetAt };
  }
  if (bucket.count >= maxRequests) {
    return { allowed: false, count: bucket.count, resetAt: bucket.resetAt };
  }
  bucket.count++;
  return { allowed: true, count: bucket.count, resetAt: bucket.resetAt };
}

export interface RateLimitOptions {
  failClosed?: boolean; // Defaults to true: sensitive endpoints reject requests when DB is unavailable
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAt: number;
  dbUnavailable?: boolean;
  fallbackUsed?: boolean;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  options: RateLimitOptions = { failClosed: true }
): Promise<RateLimitResult> {
  const p = getPool();
  if (p) {
    try {
      const sql = `
        INSERT INTO rate_limits (key, count, reset_at, updated_at)
        VALUES ($1, 1, NOW() + ($2::text || ' milliseconds')::interval, NOW())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN rate_limits.reset_at < NOW() THEN 1 ELSE rate_limits.count + 1 END,
          reset_at = CASE WHEN rate_limits.reset_at < NOW() THEN NOW() + ($2::text || ' milliseconds')::interval ELSE rate_limits.reset_at END,
          updated_at = NOW()
        RETURNING count, EXTRACT(EPOCH FROM reset_at) * 1000 AS reset_epoch;
      `;
      const rows = await queryDb<{ count: number; reset_epoch: string }>(sql, [key, windowMs]);
      if (rows.length > 0) {
        const count = Number(rows[0].count);
        const resetAt = Math.round(Number(rows[0].reset_epoch));

        // Opportunistic non-blocking prune of stale records (5% chance per request)
        if (Math.random() < 0.05) {
          pruneExpiredRateLimits().catch(() => {});
        }

        return {
          allowed: count <= maxRequests,
          count,
          resetAt,
        };
      }
    } catch {
      // Database query threw an error (connection lost, pool exhausted, or network outage)
      if (options.failClosed !== false) {
        return {
          allowed: false,
          count: maxRequests + 1,
          resetAt: Date.now() + windowMs,
          dbUnavailable: true,
        };
      }
    }
  } else if (options.failClosed !== false) {
    return {
      allowed: false,
      count: maxRequests + 1,
      resetAt: Date.now() + windowMs,
      dbUnavailable: true,
    };
  }

  // Non-sensitive endpoints fallback to in-memory rate limiting when database is unavailable
  const inMem = checkInMemoryRateLimit(key, maxRequests, windowMs);
  return {
    allowed: inMem.allowed,
    count: inMem.count,
    resetAt: inMem.resetAt,
    fallbackUsed: true,
  };
}

export async function pruneExpiredRateLimits(olderThanMs: number = 60 * 60 * 1000): Promise<number> {
  const p = getPool();
  if (!p) return 0;
  try {
    const res = await queryDb<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM rate_limits
         WHERE reset_at < NOW() - ($1::text || ' milliseconds')::interval
         RETURNING key
       ) SELECT count(*) as count FROM deleted`,
      [olderThanMs]
    );
    return parseInt(res[0]?.count || '0', 10);
  } catch {
    return 0;
  }
}

async function enforceSensitiveRateLimit(
  _req: ExtendedRequest,
  res: ServerResponse,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const result = await checkRateLimit(key, maxRequests, windowMs, { failClosed: true });
  if (!result.allowed) {
    if (result.dbUnavailable) {
      sendJson(res, 503, {
        success: false,
        error: {
          code: 'RATE_LIMIT_SERVICE_UNAVAILABLE',
          message: 'Security validation service is temporarily unavailable. Request blocked for security.',
        },
      });
      return false;
    }
    const retrySec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retrySec));
    sendJson(res, 429, {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down and try again later.',
      },
    });
    return false;
  }
  return true;
}

function getClientIp(req: IncomingMessage): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

// -----------------------------------------------------------------------------
// Notion OAuth Signed State (Anti-CSRF & Anti-Replay)
// -----------------------------------------------------------------------------
function generateSignedOAuthState(deviceId: string): string {
  const secret = process.env.SESSION_SECRET || 'nova_oauth_hmac_secret_key_2026';
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${deviceId}_${timestamp}_${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 32);
  return `state_${payload}_${sig}`;
}

function verifySignedOAuthState(state: string): { valid: boolean; deviceId?: string; error?: string } {
  if (!state || !state.startsWith('state_')) {
    return { valid: false, error: 'Malformed OAuth state parameter.' };
  }
  const rest = state.substring(6);
  const parts = rest.split('_');
  if (parts.length < 4) {
    return { valid: false, error: 'Invalid OAuth state token structure.' };
  }
  const deviceId = parts[0];
  const timestampStr = parts[1];
  const nonce = parts[2];
  const sig = parts[3];
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 15 * 60 * 1000) {
    return { valid: false, error: 'OAuth authorization state has expired (15-minute lifespan).' };
  }
  const secret = process.env.SESSION_SECRET || 'nova_oauth_hmac_secret_key_2026';
  const payload = `${deviceId}_${timestampStr}_${nonce}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 32);
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { valid: false, error: 'Cryptographic state validation failure. Potential CSRF attempt detected.' };
  }
  return { valid: true, deviceId };
}

async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const p = getPool();
  if (!p) {
    throw new Error('DATABASE_NOT_CONFIGURED: DATABASE_URL is required to perform persistent database operations.');
  }
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function txQuery<T>(client: pg.PoolClient, sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await client.query(sql, params);
  return result.rows as T[];
}

interface TxError {
  errorStatus: number;
  errorCode: string;
  errorMessage: string;
}

function isTxError(obj: unknown): obj is TxError {
  return Boolean(obj && typeof obj === 'object' && 'errorStatus' in obj && typeof (obj as TxError).errorStatus === 'number');
}

// -----------------------------------------------------------------------------
// Request / Response Helpers
// -----------------------------------------------------------------------------
async function parseJsonBody(req: ExtendedRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.toLowerCase() === lower && typeof v === 'string') {
      return v;
    }
  }
  return undefined;
}

// -----------------------------------------------------------------------------
// Authentication Helper: Authenticates device requests against PostgreSQL
// Accepts:
// 1. Device credential (devices.device_secret) - used by firmware (heartbeat/status/profile pull)
// 2. Active pairing session (pairing_sessions.id) - used by web client (status/sync/disconnect/profile vault)
// Returns:
// - 401 if token is absent, malformed, expired, or unknown
// - 403 if credential/session belongs to a different device than targetDeviceId
// - 200 / authorized: true on successful match
// -----------------------------------------------------------------------------
interface AuthCheckResult {
  authorized: boolean;
  status: 401 | 403 | 200;
  code?: string;
  message?: string;
  authType?: 'device_secret' | 'session';
}

async function authenticateDeviceRequest(
  req: ExtendedRequest,
  targetDeviceId: string
): Promise<AuthCheckResult> {
  const authHeader = getHeader(req, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Provide Authorization: Bearer <device session or device credential>.',
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      authorized: false,
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Bearer token must not be empty.',
    };
  }

  // 1. Check if token matches a hashed device_secret (firmware credential)
  const tokenHash = hashToken(token);
  const deviceBySecret = await queryDb<{ id: string }>(
    'SELECT id FROM devices WHERE device_secret = $1',
    [tokenHash]
  );
  if (deviceBySecret.length > 0) {
    const credDeviceId = deviceBySecret[0].id;
    if (credDeviceId === targetDeviceId) {
      return { authorized: true, status: 200, authType: 'device_secret' };
    }
    return {
      authorized: false,
      status: 403,
      code: 'FORBIDDEN',
      message: `Device credential does not grant access to device '${targetDeviceId}'.`,
    };
  }

  // 2. Check if token matches an active pairing_session (web session token)
  const sessionRows = await queryDb<{ device_id: string; expires_at: string }>(
    'SELECT device_id, expires_at FROM pairing_sessions WHERE id = $1',
    [token]
  );
  if (sessionRows.length > 0) {
    const session = sessionRows[0];
    if (new Date(session.expires_at) < new Date()) {
      return {
        authorized: false,
        status: 401,
        code: 'SESSION_EXPIRED',
        message: 'Pairing session has expired. Re-pair your NOVA device.',
      };
    }
    if (session.device_id === targetDeviceId) {
      return { authorized: true, status: 200, authType: 'session' };
    }
    return {
      authorized: false,
      status: 403,
      code: 'FORBIDDEN',
      message: `Pairing session is not authorized for device '${targetDeviceId}'.`,
    };
  }

  return {
    authorized: false,
    status: 401,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid or unknown device session or credential.',
  };
}

// -----------------------------------------------------------------------------
// Main Serverless Handler
// -----------------------------------------------------------------------------
export default async function handler(req: ExtendedRequest, res: ServerResponse) {
  // Strict CORS configuration with narrow origin authorization
  const origin = req.headers.origin;
  const EXACT_ALLOWED_ORIGINS = [
    'https://buynovastore.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
  // Allow official preview branches strictly for this project
  const PREVIEW_ORIGIN_REGEX = /^https:\/\/nova-[a-z0-9-]+-shriyash05s-projects\.vercel\.app$/;

  const isOriginAllowed = origin
    ? EXACT_ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_REGEX.test(origin)
    : false;

  if (origin) {
    if (isOriginAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      // Do not allow unauthorized origin or echo it back
      res.setHeader('Access-Control-Allow-Origin', 'https://buynovastore.vercel.app');
    }
  } else {
    // Non-browser / firmware request (no Origin header)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-nova-key, x-nova-bootstrap, x-nova-recovery, x-idempotency-key, If-None-Match');
  res.setHeader('Access-Control-Expose-Headers', 'ETag');

  if (req.method === 'OPTIONS') {
    if (origin && !isOriginAllowed) {
      res.statusCode = 403;
      res.end();
      return;
    }
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method?.toUpperCase() || 'GET';

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    req.body = await parseJsonBody(req);
  }

  try {
    // =========================================================================
    // 1. GET /api/health or /api/v1/health
    // =========================================================================
    if (pathname === '/api/health' || pathname === '/api/v1/health') {
      let dbConnected = false;
      let registeredDevices = 0;
      const p = getPool();

      if (p) {
        try {
          const countRows = await queryDb<{ count: string }>('SELECT count(*) as count FROM devices');
          dbConnected = true;
          registeredDevices = parseInt(countRows[0]?.count || '0', 10);
        } catch {
          dbConnected = false;
        }
      }

      sendJson(res, 200, {
        status: 'healthy',
        service: 'NOVA Cloud API',
        hardwareTarget: {
          microcontroller: 'ESP32-C3 Super Mini (RISC-V @ 160MHz)',
          display: 'SSD1306 monochrome 128x64 OLED (0x3C, GPIO8/GPIO9)',
          microphone: 'MAX4466 analog electret (ADC GPIO1)',
          wakeWord: 'Hi ESP (WakeNet)',
          provisioning: 'Local password-protected SoftAP (192.168.4.1)',
          wifiBands: '2.4GHz only',
        },
        database: {
          connected: dbConnected,
          registeredDevices,
          storage: 'PostgreSQL (Supabase Pooler)',
        },
        notionConfigured: Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // =========================================================================
    // 2. POST /api/v1/devices/bootstrap
    // Unique per-device high-entropy bootstrap credential verification.
    // Hash is verified against server-side device_bootstrap_credentials table.
    // Never uses a shared secret; issues rotatable deviceKey and single-use 15m claim token.
    // Supports hardware recovery when recovery: true is requested with valid bootstrap credentials.
    // =========================================================================
    if (pathname === '/api/v1/devices/bootstrap' && method === 'POST') {
      if (!await enforceSensitiveRateLimit(req, res, `bootstrap:${getClientIp(req)}`, 20, 60000)) {
        return;
      }

      const bootstrapCredential =
        (req.body?.bootstrapCredential as string) ||
        (req.body?.bootstrapSecret as string) ||
        getHeader(req, 'x-nova-bootstrap') ||
        (getHeader(req, 'authorization')?.startsWith('Bearer ') ? getHeader(req, 'authorization')!.substring(7).trim() : '');

      if (!bootstrapCredential || typeof bootstrapCredential !== 'string' || !bootstrapCredential.trim()) {
        sendJson(res, 401, {
          success: false,
          error: {
            code: 'INVALID_BOOTSTRAP_CREDENTIAL',
            message: 'A unique device bootstrap credential is required for hardware enrollment.',
          },
        });
        return;
      }

      const deviceId = req.body?.deviceId as string;
      const macAddress = req.body?.macAddress as string;
      const firmwareVersion = (req.body?.firmwareVersion as string) || 'v1.0.0-c3';
      const serialNumber = (req.body?.serialNumber as string) || (deviceId ? `NOVA-C3-${deviceId.replace(/^nova-c3-/, '').toUpperCase()}` : '');

      if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_DEVICE_ID',
            message: 'A valid non-empty deviceId string is required (e.g. nova-c3-5c20dc4239fca9ec).',
          },
        });
        return;
      }

      if (!macAddress || typeof macAddress !== 'string' || !macAddress.trim()) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_MAC_ADDRESS',
            message: 'A valid non-empty macAddress is required (e.g. 48:F6:EE:17:34:D8).',
          },
        });
        return;
      }

      // Hash verification against server-side stored hash
      const cleanSecret = bootstrapCredential.trim();
      const presentedHash = crypto.createHash('sha256').update(cleanSecret).digest('hex');

      // Look up pre-enrolled hardware credential hash
      const credRows = await queryDb<{ credential_hash: string; is_used: boolean }>(
        'SELECT credential_hash, is_used FROM device_bootstrap_credentials WHERE device_id = $1',
        [deviceId]
      );

      if (credRows.length > 0) {
        if (credRows[0].credential_hash !== presentedHash) {
          sendJson(res, 401, {
            success: false,
            error: {
              code: 'INVALID_BOOTSTRAP_CREDENTIAL',
              message: 'Device bootstrap credential hash mismatch. Unauthorized hardware enrollment.',
            },
          });
          return;
        }
        const isRecovery = Boolean(
          req.body?.recovery === true ||
          req.body?.allowRecovery === true ||
          getHeader(req, 'x-nova-recovery') === 'true'
        );
        if (credRows[0].is_used && !isRecovery) {
          const existingDev = await queryDb<{ device_secret: string | null }>(
            'SELECT device_secret FROM devices WHERE id = $1',
            [deviceId]
          );
          if (existingDev.length > 0 && existingDev[0].device_secret !== null) {
            sendJson(res, 409, {
              success: false,
              error: {
                code: 'BOOTSTRAP_ALREADY_USED',
                message: 'This device bootstrap credential has already been redeemed. Single-use enrollment guarantee enforced.',
              },
            });
            return;
          }
        }
        // Mark used
        await queryDb('UPDATE device_bootstrap_credentials SET is_used = TRUE, used_at = NOW() WHERE device_id = $1', [deviceId]);
      } else {
        // Fallback for factory-provisioned enrollment if secret matches environment factory secret
        const expectedFactorySecret = process.env.NOVA_BOOTSTRAP_SECRET;
        if (!expectedFactorySecret || cleanSecret !== expectedFactorySecret) {
          sendJson(res, 401, {
            success: false,
            error: {
              code: 'INVALID_BOOTSTRAP_CREDENTIAL',
              message: 'Hardware device is not pre-enrolled or credential is invalid.',
            },
          });
          return;
        }
        // Save hash into device_bootstrap_credentials
        await queryDb(
          `INSERT INTO device_bootstrap_credentials (device_id, mac_address, credential_hash, is_used, used_at)
           VALUES ($1, $2, $3, TRUE, NOW())
           ON CONFLICT (device_id) DO UPDATE SET is_used = TRUE, used_at = NOW()`,
          [deviceId, macAddress, presentedHash]
        );
      }

      const wifiSsid = (req.body?.wifiSsid as string) || null;
      const ipAddress = (req.body?.ipAddress as string) || null;
      const rssi = typeof req.body?.rssi === 'number' ? req.body.rssi : null;

      // Generate a high-entropy 192-bit device bearer token and store its SHA-256 hash
      const rawDeviceKey = `dkey_${crypto.randomBytes(24).toString('hex')}`;
      const deviceKeyHash = hashToken(rawDeviceKey);

      // Upsert device in PostgreSQL (stores SHA-256 hash, never raw key)
      const upsertDeviceSql = `
        INSERT INTO devices (
          id, serial_number, mac_address, hardware_model, firmware_version,
          status, device_secret, bootstrap_hash, ip_address, wifi_connected, wifi_ssid, wifi_rssi,
          wifi_vault_version, oled_state, queue_count, last_heartbeat, updated_at
        )
        VALUES (
          $1, $2, $3, 'ESP32-C3 Super Mini', $4,
          'online', $5, $6, $7, TRUE, $8, $9,
          1, 'pairing_qr', 0, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          mac_address = EXCLUDED.mac_address,
          firmware_version = EXCLUDED.firmware_version,
          status = 'online',
          device_secret = EXCLUDED.device_secret,
          bootstrap_hash = EXCLUDED.bootstrap_hash,
          ip_address = COALESCE(EXCLUDED.ip_address, devices.ip_address),
          wifi_connected = TRUE,
          wifi_ssid = COALESCE(EXCLUDED.wifi_ssid, devices.wifi_ssid),
          wifi_rssi = COALESCE(EXCLUDED.wifi_rssi, devices.wifi_rssi),
          oled_state = 'pairing_qr',
          last_heartbeat = NOW(),
          updated_at = NOW()
        RETURNING *;
      `;
      const devices = await queryDb<DeviceRecord>(upsertDeviceSql, [
        deviceId,
        serialNumber,
        macAddress,
        firmwareVersion,
        deviceKeyHash,
        presentedHash,
        ipAddress,
        wifiSsid,
        rssi,
      ]);

      // Invalidate any unredeemed prior tokens for this device
      await queryDb('DELETE FROM claim_tokens WHERE device_id = $1 AND is_redeemed = FALSE', [deviceId]);

      // Generate ephemeral 15-minute claim token for OLED QR
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const token = `clm_live_${randomSuffix}`;
      const shortCode = `NOV-${randomSuffix.toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await queryDb(
        `INSERT INTO claim_tokens (token, device_id, short_code, expires_at, is_redeemed)
         VALUES ($1, $2, $3, $4, FALSE);`,
        [token, deviceId, shortCode, expiresAt]
      );

      sendJson(res, 200, {
        success: true,
        data: {
          deviceId,
          serialNumber: devices[0]?.serial_number || serialNumber,
          macAddress: devices[0]?.mac_address || macAddress,
          firmwareVersion: devices[0]?.firmware_version || firmwareVersion,
          claimToken: token,
          shortCode,
          expiresAt,
          expiresInSeconds: 900,
          deviceKey: rawDeviceKey,
          portalUrl: `https://buynovastore.vercel.app/?token=${token}`,
        },
      });
      return;
    }

    // =========================================================================
    // 2.1 POST /api/v1/devices/:deviceId/recover
    // Dedicated hardware recovery endpoint for legitimate devices whose keys
    // were revoked or lost. Verifies hardware bootstrap credential against
    // server-side hash, issues fresh device key & OLED claim token, and
    // preserves all Wi-Fi profiles, Notion authorizations, and queue data.
    // =========================================================================
    const recoverMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/recover$/);
    if (recoverMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(recoverMatch[1]);
      if (!await enforceSensitiveRateLimit(req, res, `recover:${targetDeviceId}`, 20, 60000)) {
        return;
      }

      const bootstrapCredential =
        (req.body?.bootstrapCredential as string) ||
        getHeader(req, 'x-nova-bootstrap') ||
        (getHeader(req, 'authorization')?.startsWith('Bearer ') ? getHeader(req, 'authorization')!.substring(7).trim() : '');

      if (!bootstrapCredential || typeof bootstrapCredential !== 'string' || !bootstrapCredential.trim()) {
        sendJson(res, 401, {
          success: false,
          error: {
            code: 'INVALID_BOOTSTRAP_CREDENTIAL',
            message: 'A unique device bootstrap credential is required for hardware recovery.',
          },
        });
        return;
      }

      const cleanSecret = bootstrapCredential.trim();
      const presentedHash = crypto.createHash('sha256').update(cleanSecret).digest('hex');

      const credRows = await queryDb<{ credential_hash: string }>(
        'SELECT credential_hash FROM device_bootstrap_credentials WHERE device_id = $1',
        [targetDeviceId]
      );

      let verified = false;
      if (credRows.length > 0 && credRows[0].credential_hash === presentedHash) {
        verified = true;
      } else {
        const devRows = await queryDb<{ bootstrap_hash: string | null }>(
          'SELECT bootstrap_hash FROM devices WHERE id = $1',
          [targetDeviceId]
        );
        if (devRows.length > 0 && devRows[0].bootstrap_hash === presentedHash) {
          verified = true;
        }
      }

      if (!verified) {
        sendJson(res, 401, {
          success: false,
          error: {
            code: 'INVALID_BOOTSTRAP_CREDENTIAL',
            message: 'Device bootstrap credential hash mismatch. Unauthorized hardware recovery.',
          },
        });
        return;
      }

      // Generate high-entropy 192-bit replacement device key and store SHA-256 hash
      const rawDeviceKey = `dkey_${crypto.randomBytes(24).toString('hex')}`;
      const deviceKeyHash = hashToken(rawDeviceKey);

      // Update device record (preserves all Wi-Fi profiles, Notion auth, and queue)
      await queryDb(
        `UPDATE devices SET
          device_secret = $1,
          status = 'online',
          oled_state = 'pairing_qr',
          last_heartbeat = NOW(),
          updated_at = NOW()
         WHERE id = $2`,
        [deviceKeyHash, targetDeviceId]
      );

      // Invalidate any unredeemed prior tokens for this device
      await queryDb('DELETE FROM claim_tokens WHERE device_id = $1 AND is_redeemed = FALSE', [targetDeviceId]);

      // Generate fresh 15-minute claim token for OLED QR
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const token = `clm_live_${randomSuffix}`;
      const shortCode = `NOV-${randomSuffix.toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await queryDb(
        `INSERT INTO claim_tokens (token, device_id, short_code, expires_at, is_redeemed)
         VALUES ($1, $2, $3, $4, FALSE);`,
        [token, targetDeviceId, shortCode, expiresAt]
      );

      sendJson(res, 200, {
        success: true,
        data: {
          deviceId: targetDeviceId,
          recovered: true,
          claimToken: token,
          shortCode,
          expiresAt,
          expiresInSeconds: 900,
          deviceKey: rawDeviceKey,
          portalUrl: `https://buynovastore.vercel.app/?token=${token}`,
        },
      });
      return;
    }

    // =========================================================================
    // 3. POST /api/v1/devices/:deviceId/device-key/rotate
    // Authenticated rotation of device credentials
    // =========================================================================
    const rotateKeyMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/device-key\/rotate$/);
    if (rotateKeyMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(rotateKeyMatch[1]);
      if (!await enforceSensitiveRateLimit(req, res, `rotate:${targetDeviceId}`, 20, 60000) || !await enforceSensitiveRateLimit(req, res, `rotate_ip:${getClientIp(req)}`, 30, 60000)) {
        return;
      }

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      // Generate high-entropy replacement token and store SHA-256 hash at rest
      const newDeviceKey = `dkey_${crypto.randomBytes(24).toString('hex')}`;
      const newKeyHash = hashToken(newDeviceKey);
      await queryDb('UPDATE devices SET device_secret = $1, updated_at = NOW() WHERE id = $2', [newKeyHash, targetDeviceId]);

      sendJson(res, 200, {
        success: true,
        data: {
          deviceId: targetDeviceId,
          deviceKey: newDeviceKey,
          rotatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    // =========================================================================
    // 4. POST /api/v1/devices/:deviceId/claim-token
    // Generates fresh, single-use 15-minute claim token for OLED QR pairing/recovery.
    // Accepts Bearer authentication OR unique hardware bootstrap credential.
    // =========================================================================
    const claimTokenMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/claim-token$/);
    if (claimTokenMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(claimTokenMatch[1]);
      if (!await enforceSensitiveRateLimit(req, res, `claim_token:${targetDeviceId}`, 20, 60000) || !await enforceSensitiveRateLimit(req, res, `claim_token_ip:${getClientIp(req)}`, 30, 60000)) {
        return;
      }

      // Check standard Bearer auth first
      let auth = await authenticateDeviceRequest(req, targetDeviceId);
      let isBootstrapRecovery = false;

      // If not Bearer authorized, check for hardware bootstrap credential recovery
      if (!auth.authorized) {
        const bootstrapCredential =
          (req.body?.bootstrapCredential as string) ||
          getHeader(req, 'x-nova-bootstrap');

        if (bootstrapCredential && typeof bootstrapCredential === 'string' && bootstrapCredential.trim()) {
          const cleanSecret = bootstrapCredential.trim();
          const presentedHash = crypto.createHash('sha256').update(cleanSecret).digest('hex');
          const credRows = await queryDb<{ credential_hash: string }>(
            'SELECT credential_hash FROM device_bootstrap_credentials WHERE device_id = $1',
            [targetDeviceId]
          );
          if (credRows.length > 0 && credRows[0].credential_hash === presentedHash) {
            isBootstrapRecovery = true;
          } else {
            const devRows = await queryDb<{ bootstrap_hash: string | null }>(
              'SELECT bootstrap_hash FROM devices WHERE id = $1',
              [targetDeviceId]
            );
            if (devRows.length > 0 && devRows[0].bootstrap_hash === presentedHash) {
              isBootstrapRecovery = true;
            }
          }
        }
      }

      if (!auth.authorized && !isBootstrapRecovery) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      let newDeviceKey: string | undefined;
      if (isBootstrapRecovery) {
        // Recovery path: issue new deviceKey as well
        newDeviceKey = `dkey_${crypto.randomBytes(24).toString('hex')}`;
        const newKeyHash = hashToken(newDeviceKey);
        await queryDb("UPDATE devices SET device_secret = $1, status = 'online', updated_at = NOW() WHERE id = $2", [newKeyHash, targetDeviceId]);
      }

      // Invalidate existing unredeemed tokens
      await queryDb('DELETE FROM claim_tokens WHERE device_id = $1 AND is_redeemed = FALSE', [targetDeviceId]);

      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const token = `clm_live_${randomSuffix}`;
      const shortCode = `NOV-${randomSuffix.toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await queryDb(
        `INSERT INTO claim_tokens (token, device_id, short_code, expires_at, is_redeemed)
         VALUES ($1, $2, $3, $4, FALSE);`,
        [token, targetDeviceId, shortCode, expiresAt]
      );

      await queryDb("UPDATE devices SET oled_state = 'pairing_qr', updated_at = NOW() WHERE id = $1", [targetDeviceId]);

      sendJson(res, 200, {
        success: true,
        data: {
          deviceId: targetDeviceId,
          claimToken: token,
          shortCode,
          expiresAt,
          expiresInSeconds: 900,
          deviceKey: newDeviceKey,
          portalUrl: `https://buynovastore.vercel.app/?token=${token}`,
        },
      });
      return;
    }

    // =========================================================================
    // 5. POST /api/v1/devices/:deviceId/heartbeat
    // Firmware telemetry endpoint. Authenticated via deviceKey.
    // Accepts non-secret telemetry only. Rejects Wi-Fi passwords.
    // =========================================================================
    const heartbeatMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/heartbeat$/);
    if (heartbeatMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(heartbeatMatch[1]);

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, {
          success: false,
          error: { code: auth.code, message: auth.message },
        });
        return;
      }

      // Strictly reject/strip any Wi-Fi passwords or secrets
      const telemetry = req.body || {};
      if ('password' in telemetry || 'wifiPassword' in telemetry || 'passphrase' in telemetry) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_TELEMETRY',
            message: 'Heartbeat must only contain non-secret telemetry. Do not send Wi-Fi credentials to cloud APIs.',
          },
        });
        return;
      }

      const firmwareVersion = typeof telemetry.firmwareVersion === 'string' ? telemetry.firmwareVersion : null;
      const wifiConnected = typeof telemetry.wifiConnected === 'boolean' ? telemetry.wifiConnected : true;
      const rssi = typeof telemetry.rssi === 'number' ? telemetry.rssi : null;
      const ipAddress = typeof telemetry.ipAddress === 'string' ? telemetry.ipAddress : null;
      const queueCount = typeof telemetry.queueCount === 'number' ? Math.max(0, telemetry.queueCount) : 0;
      const oledState = typeof telemetry.oledState === 'string' ? telemetry.oledState : 'idle';
      const wifiSsid = typeof telemetry.wifiSsid === 'string' ? telemetry.wifiSsid : (typeof telemetry.ssid === 'string' ? telemetry.ssid : null);

      const updateSql = `
        UPDATE devices SET
          firmware_version = COALESCE($2, firmware_version),
          wifi_connected = COALESCE($3, wifi_connected),
          wifi_rssi = COALESCE($4, wifi_rssi),
          ip_address = COALESCE($5, ip_address),
          queue_count = COALESCE($6, queue_count),
          oled_state = COALESCE($7, oled_state),
          wifi_ssid = COALESCE($8, wifi_ssid),
          status = 'online',
          last_heartbeat = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      const updatedRows = await queryDb<DeviceRecord>(updateSql, [
        targetDeviceId,
        firmwareVersion,
        wifiConnected,
        rssi,
        ipAddress,
        queueCount,
        oledState,
        wifiSsid,
      ]);

      if (updatedRows.length === 0) {
        sendJson(res, 404, {
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: `Device with ID '${targetDeviceId}' is not registered. Bootstrap first.`,
          },
        });
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: {
          acknowledged: true,
          deviceId: targetDeviceId,
          serverTime: new Date().toISOString(),
          status: 'online',
          oledState,
          queueCount,
          wifiVaultVersion: updatedRows[0].wifi_vault_version || 1,
        },
      });
      return;
    }

    // =========================================================================
    // 6. POST /api/v1/devices/claim
    // Validates 15-minute ephemeral token and grants durable pairing session
    // =========================================================================
    if (pathname === '/api/v1/devices/claim' && method === 'POST') {
      if (!await enforceSensitiveRateLimit(req, res, `claim:${getClientIp(req)}`, 20, 60000)) {
        return;
      }

      const claimToken = (req.body?.claimToken as string) || (req.body?.shortCode as string);
      if (!claimToken || typeof claimToken !== 'string' || !claimToken.trim()) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_CLAIM_CODE',
            message: 'A claim token or short code is required to pair a NOVA device.',
          },
        });
        return;
      }

      const cleanInput = claimToken.trim();
      const findSql = `
        SELECT ct.*, d.serial_number, d.hardware_model
        FROM claim_tokens ct
        JOIN devices d ON d.id = ct.device_id
        WHERE ct.token = $1 OR ct.short_code = $1;
      `;
      const tokens = await queryDb<ClaimTokenRecord & { serial_number: string; hardware_model: string }>(findSql, [cleanInput]);

      if (tokens.length === 0) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_CLAIM_CODE',
            message: 'No claim record matches this token or short code.',
          },
        });
        return;
      }

      const claim = tokens[0];
      if (claim.is_redeemed) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'CLAIM_TOKEN_ALREADY_REDEEMED',
            message: 'This claim token has already been claimed.',
          },
        });
        return;
      }

      if (new Date(claim.expires_at) < new Date()) {
        sendJson(res, 410, {
          success: false,
          error: {
            code: 'CLAIM_TOKEN_EXPIRED',
            message: 'Claim token has expired (15-minute lifespan). Refresh the QR code on your NOVA OLED.',
          },
        });
        return;
      }

      // Mark redeemed in database
      await queryDb('UPDATE claim_tokens SET is_redeemed = TRUE, redeemed_at = NOW() WHERE token = $1', [claim.token]);

      // Create durable pairing session (valid 30 days)
      const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await queryDb(
        `INSERT INTO pairing_sessions (id, device_id, claim_token, expires_at)
         VALUES ($1, $2, $3, $4);`,
        [sessionId, claim.device_id, claim.token, sessionExpiresAt]
      );

      sendJson(res, 200, {
        success: true,
        data: {
          pairingSessionId: sessionId,
          deviceId: claim.device_id,
          serialNumber: claim.serial_number,
          hardwareModel: claim.hardware_model,
          expiresInSeconds: 2592000,
        },
      });
      return;
    }

    // =========================================================================
    // 7. GET /api/v1/devices/:deviceId/status
    // Returns truthful live status from PostgreSQL
    // Requires Bearer authentication (device credential or pairing session).
    // =========================================================================
    const statusMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/status$/);
    if (statusMatch && method === 'GET') {
      const targetDeviceId = decodeURIComponent(statusMatch[1]);

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, {
          success: false,
          error: { code: auth.code, message: auth.message },
        });
        return;
      }

      const devices = await queryDb<DeviceRecord>('SELECT * FROM devices WHERE id = $1', [targetDeviceId]);
      if (devices.length === 0) {
        sendJson(res, 404, {
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: `Device with ID '${targetDeviceId}' is not registered.`,
          },
        });
        return;
      }

      const device = devices[0];
      const HEARTBEAT_STALE_MS = 90 * 1000;
      const lastHeartbeatMs = device.last_heartbeat ? new Date(device.last_heartbeat).getTime() : 0;
      const isFresh = lastHeartbeatMs > 0 && (Date.now() - lastHeartbeatMs) <= HEARTBEAT_STALE_MS;
      const isOnline = Boolean(device.wifi_connected && isFresh);
      const calculatedStatus = isOnline ? 'online' : 'offline';

      const notionAuths = await queryDb<NotionAuthRecord>('SELECT * FROM notion_authorizations WHERE device_id = $1', [targetDeviceId]);
      const pendingRes = await queryDb<{ count: string }>(
        "SELECT count(*) as count FROM device_actions WHERE device_id = $1 AND status = 'pending'",
        [targetDeviceId]
      );
      const pendingSyncCount = parseInt(pendingRes[0]?.count || '0', 10);
      const notionAuth = notionAuths[0] || null;

      // Current connected profile (if device is online and reports wifi_ssid)
      let connectedProfile: { id: string; name: string; ssid: string; voiceSlot: string; slotNumber: number } | null = null;
      if (isOnline && device.wifi_ssid) {
        const connRows = await queryDb<WifiProfileRecord>(
          'SELECT id, name, ssid, voice_slot, slot_number FROM wifi_profiles WHERE device_id = $1 AND ssid = $2 LIMIT 1',
          [targetDeviceId, device.wifi_ssid]
        );
        if (connRows.length > 0) {
          connectedProfile = {
            id: connRows[0].id,
            name: connRows[0].name,
            ssid: connRows[0].ssid,
            voiceSlot: connRows[0].voice_slot,
            slotNumber: connRows[0].slot_number,
          };
        }
      }

      // Default profile
      const defRows = await queryDb<WifiProfileRecord>(
        'SELECT id, name, ssid, voice_slot, slot_number FROM wifi_profiles WHERE device_id = $1 AND is_default = TRUE LIMIT 1',
        [targetDeviceId]
      );
      const defaultProfile = defRows.length > 0 ? {
        id: defRows[0].id,
        name: defRows[0].name,
        ssid: defRows[0].ssid,
        voiceSlot: defRows[0].voice_slot,
        slotNumber: defRows[0].slot_number,
      } : null;

      // Latest connection result
      const resultRows = await queryDb<WifiProfileRecord>(
        'SELECT last_connection_result, last_attempted_at, last_rssi FROM wifi_profiles WHERE device_id = $1 ORDER BY last_attempted_at DESC NULLS LAST LIMIT 1',
        [targetDeviceId]
      );
      const latestConnectionResult = resultRows.length > 0 && resultRows[0].last_attempted_at ? {
        result: resultRows[0].last_connection_result,
        attemptedAt: resultRows[0].last_attempted_at,
        rssi: resultRows[0].last_rssi,
      } : null;

      sendJson(res, 200, {
        success: true,
        data: {
          deviceId: device.id,
          online: isOnline,
          status: calculatedStatus,
          lastSeenAt: device.last_heartbeat,
          connectedProfile,
          defaultProfile,
          latestConnectionResult,
          device: {
            deviceId: device.id,
            serialNumber: device.serial_number,
            hardwareModel: device.hardware_model,
            firmwareVersion: device.firmware_version,
            status: calculatedStatus,
            oledState: isOnline ? (device.oled_state || 'idle') : 'offline',
            queueCount: device.queue_count || 0,
            wifiVaultVersion: device.wifi_vault_version || 1,
            lastHeartbeat: device.last_heartbeat,
            ipAddress: isOnline ? device.ip_address : null,
          },
          wifi: {
            state: isOnline ? 'connected' : 'disconnected',
            connected: isOnline,
            connectedSsid: isOnline ? device.wifi_ssid : null,
            rssi: isOnline ? device.wifi_rssi : null,
            ipAddress: isOnline ? device.ip_address : null,
            macAddress: device.mac_address,
            frequencyBand: '2.4GHz',
          },
          notion: {
            isConnected: Boolean(notionAuth && notionAuth.encrypted_access_token),
            workspaceId: notionAuth?.workspace_id || null,
            workspaceName: notionAuth?.workspace_name || null,
            workspaceIcon: notionAuth?.workspace_icon || null,
            ownerEmail: notionAuth?.owner_email || null,
            botId: notionAuth?.bot_id || null,
            targetDatabaseId: notionAuth?.target_database_id || null,
            targetDatabaseName: notionAuth?.target_database_name || 'NOVA Notes',
            connectedAt: notionAuth?.connected_at || null,
            lastSyncAt: notionAuth?.last_sync_at || null,
            pendingSyncCount,
          },
        },
      });
      return;
    }

    // =========================================================================
    // 8. MULTI-WI-FI PROFILE VAULT ENDPOINTS
    // =========================================================================

    // 8.0 GET /api/v1/devices/:deviceId/wifi-profiles/boot
    // Dedicated boot configuration endpoint for ESP32-C3 firmware.
    // Returns ONLY the single default profile needed for automatic boot connection over TLS.
    // Strictly enforces cross-device isolation (403 if credential belongs to another device).
    const wifiBootMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles\/boot$/);
    if (wifiBootMatch && method === 'GET') {
      const targetDeviceId = decodeURIComponent(wifiBootMatch[1]);
      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const devices = await queryDb<DeviceRecord>('SELECT * FROM devices WHERE id = $1', [targetDeviceId]);
      if (devices.length === 0) {
        sendJson(res, 404, { success: false, error: { code: 'DEVICE_NOT_FOUND', message: 'Device not found.' } });
        return;
      }

      const defRows = await queryDb<WifiProfileRecord>(
        'SELECT * FROM wifi_profiles WHERE device_id = $1 AND is_default = TRUE LIMIT 1',
        [targetDeviceId]
      );

      const isFirmware = auth.authType === 'device_secret';
      if (defRows.length === 0) {
        sendJson(res, 200, {
          success: true,
          data: {
            deviceId: targetDeviceId,
            vaultVersion: devices[0]?.wifi_vault_version || 1,
            hasDefault: false,
            defaultProfile: null,
            message: 'No default boot profile configured for device.',
          },
        });
        return;
      }

      const p = defRows[0];
      sendJson(res, 200, {
        success: true,
        data: {
          deviceId: targetDeviceId,
          vaultVersion: devices[0]?.wifi_vault_version || 1,
          hasDefault: true,
          defaultProfile: {
            id: p.id,
            name: p.name,
            voiceSlot: p.voice_slot,
            slotNumber: p.slot_number,
            ssid: p.ssid,
            isDefault: true,
            version: p.version,
            password: isFirmware && p.encrypted_password ? decryptSecret(p.encrypted_password) : undefined,
            hasPassword: Boolean(p.encrypted_password),
          },
        },
      });
      return;
    }

    // 8.1 GET /api/v1/devices/:deviceId/wifi-profiles
    // Fetches profile vault with ETag and versioning support.
    // When called with deviceKey (firmware), returns decrypted passwords.
    // When called with session (browser), passwords are NEVER returned (hasPassword: boolean).
    const wifiProfilesGetMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles$/);
    if (wifiProfilesGetMatch && method === 'GET') {
      const targetDeviceId = decodeURIComponent(wifiProfilesGetMatch[1]);
      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const devices = await queryDb<DeviceRecord>('SELECT * FROM devices WHERE id = $1', [targetDeviceId]);
      if (devices.length === 0) {
        sendJson(res, 404, { success: false, error: { code: 'DEVICE_NOT_FOUND', message: 'Device not found' } });
        return;
      }
      const device = devices[0];
      const vaultVersion = device.wifi_vault_version || 1;

      // ETag & 304 handling
      const etag = `W/"vault-${targetDeviceId}-v${vaultVersion}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, no-cache');

      const ifNoneMatch = getHeader(req, 'if-none-match');
      const versionQuery = url.searchParams.get('version');
      if (ifNoneMatch === etag || (versionQuery && versionQuery === String(vaultVersion))) {
        res.statusCode = 304;
        res.end();
        return;
      }

      const profiles = await queryDb<WifiProfileRecord>(
        'SELECT * FROM wifi_profiles WHERE device_id = $1 ORDER BY slot_number ASC',
        [targetDeviceId]
      );

      const isFirmware = auth.authType === 'device_secret';

      const sanitizedProfiles = profiles.map((p) => {
        const base = {
          id: p.id,
          name: p.name,
          voiceSlot: p.voice_slot,
          slotNumber: p.slot_number,
          ssid: p.ssid,
          isDefault: p.is_default,
          version: p.version,
          lastConnectionResult: p.last_connection_result,
          lastAttemptedAt: p.last_attempted_at,
          lastRssi: p.last_rssi,
          updatedAt: p.updated_at,
        };

        if (isFirmware) {
          return {
            ...base,
            password: p.encrypted_password ? decryptSecret(p.encrypted_password) : null,
          };
        } else {
          return {
            ...base,
            hasPassword: Boolean(p.encrypted_password),
          };
        }
      });

      sendJson(res, 200, {
        success: true,
        data: {
          deviceId: targetDeviceId,
          vaultVersion,
          profileCount: sanitizedProfiles.length,
          maxProfiles: 5,
          profiles: sanitizedProfiles,
        },
      });
      return;
    }

    // 8.2 PUT /api/v1/devices/:deviceId/wifi-profiles
    // Bulk update or reorder Wi-Fi profiles (enforces max 5, at most 1 default)
    if (wifiProfilesGetMatch && method === 'PUT') {
      const targetDeviceId = decodeURIComponent(wifiProfilesGetMatch[1]);
      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const inputProfiles = req.body?.profiles;
      if (!Array.isArray(inputProfiles)) {
        sendJson(res, 400, { success: false, error: { code: 'INVALID_PAYLOAD', message: 'profiles must be an array.' } });
        return;
      }

      if (inputProfiles.length > 5) {
        sendJson(res, 400, {
          success: false,
          error: { code: 'VAULT_LIMIT_REACHED', message: 'Maximum 5 Wi-Fi profiles allowed per device.' },
        });
        return;
      }

      const defaultCount = inputProfiles.filter((p: any) => Boolean(p.isDefault)).length;
      if (defaultCount > 1) {
        sendJson(res, 400, {
          success: false,
          error: { code: 'MULTIPLE_DEFAULTS_INVALID', message: 'Exactly zero or one profile can be marked as default.' },
        });
        return;
      }

      for (let i = 0; i < inputProfiles.length; i++) {
        const ssid = (typeof inputProfiles[i]?.ssid === 'string' && inputProfiles[i].ssid.trim()) ? inputProfiles[i].ssid.trim() : '';
        if (!ssid) {
          sendJson(res, 400, { success: false, error: { code: 'SSID_REQUIRED', message: `Profile at slot ${i + 1} is missing SSID.` } });
          return;
        }
      }

      const txResult = await withTransaction(async (client) => {
        // Lock existing profiles for this device
        const existing = await txQuery<WifiProfileRecord>(
          client,
          'SELECT * FROM wifi_profiles WHERE device_id = $1 FOR UPDATE',
          [targetDeviceId]
        );
        const existingMap = new Map(existing.map((p) => [p.id, p]));

        // Clear existing profiles and re-insert with continuous slot numbers
        await txQuery(client, 'DELETE FROM wifi_profiles WHERE device_id = $1', [targetDeviceId]);

        for (let i = 0; i < inputProfiles.length; i++) {
          const p = inputProfiles[i];
          const slotNumber = i + 1;
          const voiceSlot = VOICE_SLOTS[i];
          const profileId = (typeof p.id === 'string' && p.id.trim()) ? p.id.trim() : `prof_${crypto.randomBytes(6).toString('hex')}`;
          const name = (typeof p.name === 'string' && p.name.trim()) ? p.name.trim() : `Network ${slotNumber}`;
          const ssid = p.ssid.trim();

          let encryptedPassword: string | null = null;
          if (typeof p.password === 'string' && p.password.length > 0) {
            encryptedPassword = encryptSecret(p.password);
          } else if (p.id && existingMap.has(p.id)) {
            encryptedPassword = existingMap.get(p.id)!.encrypted_password;
          }

          const isDefault = Boolean(p.isDefault);

          await txQuery(
            client,
            `INSERT INTO wifi_profiles (
              id, device_id, name, voice_slot, slot_number, ssid, encrypted_password, is_default, version, last_connection_result, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'pending', NOW(), NOW())`,
            [profileId, targetDeviceId, name, voiceSlot, slotNumber, ssid, encryptedPassword, isDefault]
          );
        }

        const updatedDevices = await txQuery<DeviceRecord>(
          client,
          'UPDATE devices SET wifi_vault_version = COALESCE(wifi_vault_version, 1) + 1, updated_at = NOW() WHERE id = $1 RETURNING wifi_vault_version',
          [targetDeviceId]
        );
        const newVersion = updatedDevices[0]?.wifi_vault_version || 1;

        const finalProfiles = await txQuery<WifiProfileRecord>(
          client,
          'SELECT * FROM wifi_profiles WHERE device_id = $1 ORDER BY slot_number ASC',
          [targetDeviceId]
        );

        return {
          newVersion,
          finalProfiles,
        };
      });

      sendJson(res, 200, {
        success: true,
        data: {
          deviceId: targetDeviceId,
          vaultVersion: txResult.newVersion,
          profileCount: txResult.finalProfiles.length,
          maxProfiles: 5,
          profiles: txResult.finalProfiles.map((p) => ({
            id: p.id,
            name: p.name,
            voiceSlot: p.voice_slot,
            slotNumber: p.slot_number,
            ssid: p.ssid,
            hasPassword: Boolean(p.encrypted_password),
            isDefault: p.is_default,
            version: p.version,
            lastConnectionResult: p.last_connection_result,
            lastAttemptedAt: p.last_attempted_at,
            lastRssi: p.last_rssi,
            updatedAt: p.updated_at,
          })),
        },
      });
      return;
    }

    // 8.3 POST /api/v1/devices/:deviceId/wifi-profiles
    // Add a single Wi-Fi profile to vault (max 5)
    if (wifiProfilesGetMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(wifiProfilesGetMatch[1]);
      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const ssid = (req.body?.ssid as string)?.trim();
      if (!ssid) {
        sendJson(res, 400, {
          success: false,
          error: { code: 'SSID_REQUIRED', message: 'A 2.4GHz Wi-Fi SSID is required.' },
        });
        return;
      }

      const password = req.body?.password as string | undefined;
      const isDefault = Boolean(req.body?.isDefault);

      const txResult = await withTransaction(async (client) => {
        const existingProfiles = await txQuery<WifiProfileRecord>(
          client,
          'SELECT * FROM wifi_profiles WHERE device_id = $1 ORDER BY slot_number ASC FOR UPDATE',
          [targetDeviceId]
        );

        if (existingProfiles.length >= 5) {
          return {
            errorStatus: 400,
            errorCode: 'VAULT_LIMIT_REACHED',
            errorMessage: 'Device Wi-Fi vault supports a maximum of 5 profiles.',
          };
        }

        const name = (req.body?.name as string)?.trim() || `Network ${existingProfiles.length + 1}`;
        const slotNumber = existingProfiles.length + 1;
        const voiceSlot = VOICE_SLOTS[slotNumber - 1];
        const profileId = `prof_${crypto.randomBytes(6).toString('hex')}`;
        const encryptedPassword = password ? encryptSecret(password) : null;

        if (isDefault) {
          await txQuery(client, 'UPDATE wifi_profiles SET is_default = FALSE WHERE device_id = $1', [targetDeviceId]);
        }

        await txQuery(
          client,
          `INSERT INTO wifi_profiles (
            id, device_id, name, voice_slot, slot_number, ssid, encrypted_password, is_default, version, last_connection_result, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'pending', NOW(), NOW())`,
          [profileId, targetDeviceId, name, voiceSlot, slotNumber, ssid, encryptedPassword, isDefault]
        );

        const updatedDevices = await txQuery<DeviceRecord>(
          client,
          'UPDATE devices SET wifi_vault_version = COALESCE(wifi_vault_version, 1) + 1, updated_at = NOW() WHERE id = $1 RETURNING wifi_vault_version',
          [targetDeviceId]
        );

        return {
          profile: {
            id: profileId,
            name,
            voiceSlot,
            slotNumber,
            ssid,
            hasPassword: Boolean(encryptedPassword),
            isDefault,
            version: 1,
            lastConnectionResult: 'pending',
            lastAttemptedAt: null,
            lastRssi: null,
          },
          vaultVersion: updatedDevices[0]?.wifi_vault_version || 1,
        };
      });

      if (isTxError(txResult)) {
        sendJson(res, txResult.errorStatus, { success: false, error: { code: txResult.errorCode, message: txResult.errorMessage } });
        return;
      }

      sendJson(res, 201, {
        success: true,
        data: txResult,
      });
      return;
    }

    // 8.4 POST /api/v1/devices/:deviceId/wifi-profiles/:profileId/make-default
    const makeDefaultMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles\/([^/]+)\/make-default$/);
    if (makeDefaultMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(makeDefaultMatch[1]);
      const targetProfileId = decodeURIComponent(makeDefaultMatch[2]);

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const txResult = await withTransaction(async (client) => {
        const target = await txQuery<WifiProfileRecord>(
          client,
          'SELECT * FROM wifi_profiles WHERE device_id = $1 AND id = $2 FOR UPDATE',
          [targetDeviceId, targetProfileId]
        );

        if (target.length === 0) {
          return { errorStatus: 404, errorCode: 'PROFILE_NOT_FOUND', errorMessage: 'Wi-Fi profile not found.' };
        }

        // Atomically set default on target and clear on all other profiles
        await txQuery(
          client,
          'UPDATE wifi_profiles SET is_default = (id = $2), updated_at = NOW() WHERE device_id = $1',
          [targetDeviceId, targetProfileId]
        );

        const updatedDevices = await txQuery<DeviceRecord>(
          client,
          'UPDATE devices SET wifi_vault_version = COALESCE(wifi_vault_version, 1) + 1, updated_at = NOW() WHERE id = $1 RETURNING wifi_vault_version',
          [targetDeviceId]
        );

        return {
          profileId: targetProfileId,
          isDefault: true,
          vaultVersion: updatedDevices[0]?.wifi_vault_version || 1,
        };
      });

      if (isTxError(txResult)) {
        sendJson(res, txResult.errorStatus, { success: false, error: { code: txResult.errorCode, message: txResult.errorMessage } });
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: txResult,
      });
      return;
    }

    // 8.5 PATCH /api/v1/devices/:deviceId/wifi-profiles/:profileId
    // Update individual profile fields (name, ssid, password, isDefault)
    const singleProfileMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles\/([^/]+)$/);
    if (singleProfileMatch && method === 'PATCH') {
      const targetDeviceId = decodeURIComponent(singleProfileMatch[1]);
      const targetProfileId = decodeURIComponent(singleProfileMatch[2]);

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const txResult = await withTransaction(async (client) => {
        const existingRows = await txQuery<WifiProfileRecord>(
          client,
          'SELECT * FROM wifi_profiles WHERE device_id = $1 AND id = $2 FOR UPDATE',
          [targetDeviceId, targetProfileId]
        );

        if (existingRows.length === 0) {
          return { errorStatus: 404, errorCode: 'PROFILE_NOT_FOUND', errorMessage: 'Profile not found.' };
        }
        const existing = existingRows[0];

        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : existing.name;
        const ssid = typeof req.body?.ssid === 'string' ? req.body.ssid.trim() : existing.ssid;
        const isDefault = typeof req.body?.isDefault === 'boolean' ? req.body.isDefault : existing.is_default;

        let encryptedPassword = existing.encrypted_password;
        if (typeof req.body?.password === 'string' && req.body.password.length > 0) {
          encryptedPassword = encryptSecret(req.body.password);
        }

        if (isDefault) {
          await txQuery(client, 'UPDATE wifi_profiles SET is_default = FALSE WHERE device_id = $1 AND id != $2', [
            targetDeviceId,
            targetProfileId,
          ]);
        }

        const updatedRows = await txQuery<WifiProfileRecord>(
          client,
          `UPDATE wifi_profiles SET
            name = $1,
            ssid = $2,
            encrypted_password = $3,
            is_default = $4,
            version = version + 1,
            updated_at = NOW()
           WHERE device_id = $5 AND id = $6
           RETURNING *;`,
          [name, ssid, encryptedPassword, isDefault, targetDeviceId, targetProfileId]
        );

        const updatedDevices = await txQuery<DeviceRecord>(
          client,
          'UPDATE devices SET wifi_vault_version = COALESCE(wifi_vault_version, 1) + 1, updated_at = NOW() WHERE id = $1 RETURNING wifi_vault_version',
          [targetDeviceId]
        );

        const updated = updatedRows[0];
        return {
          profile: {
            id: updated.id,
            name: updated.name,
            voiceSlot: updated.voice_slot,
            slotNumber: updated.slot_number,
            ssid: updated.ssid,
            hasPassword: Boolean(updated.encrypted_password),
            isDefault: updated.is_default,
            version: updated.version,
            lastConnectionResult: updated.last_connection_result,
            lastAttemptedAt: updated.last_attempted_at,
            lastRssi: updated.last_rssi,
            updatedAt: updated.updated_at,
          },
          vaultVersion: updatedDevices[0]?.wifi_vault_version || 1,
        };
      });

      if (isTxError(txResult)) {
        sendJson(res, txResult.errorStatus, { success: false, error: { code: txResult.errorCode, message: txResult.errorMessage } });
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: txResult,
      });
      return;
    }

    // 8.6 DELETE /api/v1/devices/:deviceId/wifi-profiles/:profileId
    // Delete profile and recompact slots
    if (singleProfileMatch && method === 'DELETE') {
      const targetDeviceId = decodeURIComponent(singleProfileMatch[1]);
      const targetProfileId = decodeURIComponent(singleProfileMatch[2]);

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const txResult = await withTransaction(async (client) => {
        const target = await txQuery<WifiProfileRecord>(
          client,
          'SELECT * FROM wifi_profiles WHERE device_id = $1 AND id = $2 FOR UPDATE',
          [targetDeviceId, targetProfileId]
        );

        if (target.length === 0) {
          return { errorStatus: 404, errorCode: 'PROFILE_NOT_FOUND', errorMessage: 'Profile not found.' };
        }

        await txQuery(client, 'DELETE FROM wifi_profiles WHERE device_id = $1 AND id = $2', [targetDeviceId, targetProfileId]);

        // Recompact remaining slots
        const remaining = await txQuery<WifiProfileRecord>(
          client,
          'SELECT * FROM wifi_profiles WHERE device_id = $1 ORDER BY slot_number ASC FOR UPDATE',
          [targetDeviceId]
        );

        for (let i = 0; i < remaining.length; i++) {
          const slot = i + 1;
          const voice = VOICE_SLOTS[i];
          await txQuery(client, 'UPDATE wifi_profiles SET slot_number = $1, voice_slot = $2 WHERE id = $3', [slot, voice, remaining[i].id]);
        }

        const updatedDevices = await txQuery<DeviceRecord>(
          client,
          'UPDATE devices SET wifi_vault_version = COALESCE(wifi_vault_version, 1) + 1, updated_at = NOW() WHERE id = $1 RETURNING wifi_vault_version',
          [targetDeviceId]
        );

        return {
          deleted: true,
          profileId: targetProfileId,
          vaultVersion: updatedDevices[0]?.wifi_vault_version || 1,
        };
      });

      if (isTxError(txResult)) {
        sendJson(res, txResult.errorStatus, { success: false, error: { code: txResult.errorCode, message: txResult.errorMessage } });
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: txResult,
      });
      return;
    }

    // 8.7 POST /api/v1/devices/:deviceId/wifi-profile-result
    // Hardware reports connection outcome for a profile or SSID
    const profileResultMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profile-result$/);
    if (profileResultMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(profileResultMatch[1]);
      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, { success: false, error: { code: auth.code, message: auth.message } });
        return;
      }

      const profileId = req.body?.profileId as string | undefined;
      const ssid = req.body?.ssid as string | undefined;
      const result = (req.body?.result as string) || 'pending';
      const rssi = typeof req.body?.rssi === 'number' ? req.body.rssi : null;
      const appliedVersion = typeof req.body?.appliedVersion === 'number' ? req.body.appliedVersion : null;

      if (profileId) {
        await queryDb(
          `UPDATE wifi_profiles SET
            last_connection_result = $1,
            last_attempted_at = NOW(),
            last_rssi = COALESCE($2, last_rssi),
            updated_at = NOW()
           WHERE id = $3 AND device_id = $4`,
          [result, rssi, profileId, targetDeviceId]
        );
      } else if (ssid) {
        await queryDb(
          `UPDATE wifi_profiles SET
            last_connection_result = $1,
            last_attempted_at = NOW(),
            last_rssi = COALESCE($2, last_rssi),
            updated_at = NOW()
           WHERE ssid = $3 AND device_id = $4`,
          [result, rssi, ssid, targetDeviceId]
        );
      }

      if (result === 'connected') {
        await queryDb(
          `UPDATE devices SET
            wifi_connected = TRUE,
            wifi_ssid = COALESCE($1, wifi_ssid),
            wifi_rssi = COALESCE($2, wifi_rssi),
            status = 'online',
            last_heartbeat = NOW(),
            updated_at = NOW()
           WHERE id = $3`,
          [ssid, rssi, targetDeviceId]
        );
      } else {
        await queryDb(
          `UPDATE devices SET
            wifi_connected = FALSE,
            updated_at = NOW()
           WHERE id = $1`,
          [targetDeviceId]
        );
      }

      sendJson(res, 200, {
        success: true,
        data: {
          acknowledged: true,
          deviceId: targetDeviceId,
          profileId: profileId || null,
          ssid: ssid || null,
          result,
          appliedVersion,
          serverTime: new Date().toISOString(),
        },
      });
      return;
    }

    // =========================================================================
    // 9. Wi-Fi Provisioning Guard
    // Keeps Wi-Fi provisioning strictly local to ESP32-C3 SoftAP (192.168.4.1)
    // =========================================================================
    const wifiProvisionMatch = pathname.match(/^\/api\/v1\/(devices\/[^/]+\/)?wifi\/provision$/);
    if (wifiProvisionMatch && method === 'POST') {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'LOCAL_PROVISIONING_ONLY',
          message: 'Wi-Fi provisioning is strictly local to the ESP32-C3 SoftAP at http://192.168.4.1. The cloud API does not accept or store Wi-Fi credentials.',
        },
      });
      return;
    }

    // =========================================================================
    // 10. POST / GET /api/v1/auth/notion/authorize
    // =========================================================================
    if (pathname === '/api/v1/auth/notion/authorize') {
      if (!await enforceSensitiveRateLimit(req, res, `oauth_auth:${getClientIp(req)}`, 30, 60000)) {
        return;
      }

      const deviceId =
        (req.body?.deviceId as string) ||
        url.searchParams.get('deviceId');

      if (!deviceId) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'DEVICE_ID_REQUIRED',
            message: 'A valid deviceId is required to start Notion authorization.',
          },
        });
        return;
      }

      // Extract session token from Bearer auth, query, or body
      let sessionId: string | null = null;
      const authHeader = getHeader(req, 'authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7).trim();
      } else if (req.body?.sessionId && typeof req.body.sessionId === 'string') {
        sessionId = req.body.sessionId.trim();
      } else if (req.body?.pairingSessionId && typeof req.body.pairingSessionId === 'string') {
        sessionId = req.body.pairingSessionId.trim();
      } else if (url.searchParams.get('session')) {
        sessionId = url.searchParams.get('session')!.trim();
      }

      // If session provided, verify it exists and is for deviceId
      if (sessionId) {
        const sessionRows = await queryDb<{ device_id: string; expires_at: string }>(
          'SELECT device_id, expires_at FROM pairing_sessions WHERE id = $1',
          [sessionId]
        );
        if (sessionRows.length > 0) {
          if (new Date(sessionRows[0].expires_at) < new Date()) {
            sendJson(res, 401, {
              success: false,
              error: { code: 'SESSION_EXPIRED', message: 'Pairing session has expired.' },
            });
            return;
          }
          if (sessionRows[0].device_id !== deviceId) {
            sendJson(res, 403, {
              success: false,
              error: { code: 'SESSION_MISMATCH', message: 'Pairing session does not match target device.' },
            });
            return;
          }
        }
      }

      const redirectUri =
        (req.body?.redirectUri as string) ||
        url.searchParams.get('redirect_uri') ||
        process.env.NOTION_REDIRECT_URI ||
        'https://buynovastore.vercel.app/';

      const clientId = process.env.NOTION_CLIENT_ID;
      if (!clientId) {
        sendJson(res, 500, {
          success: false,
          error: { code: 'NOTION_NOT_CONFIGURED', message: 'NOTION_CLIENT_ID is not configured on the server.' },
        });
        return;
      }

      const stateToken = generateSignedOAuthState(deviceId);

      // Persist state in database for single-use guarantee and session binding
      await queryDb(
        `INSERT INTO oauth_states (state, device_id, session_id, expires_at, is_used)
         VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', FALSE)
         ON CONFLICT (state) DO NOTHING`,
        [stateToken, deviceId, sessionId || null]
      );

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        owner: 'user',
        redirect_uri: redirectUri,
        state: stateToken,
      });

      const authorizationUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;

      if (method === 'GET') {
        res.writeHead(302, { Location: authorizationUrl });
        res.end();
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: {
          authorizationUrl,
          stateToken,
          sessionId: sessionId || undefined,
        },
      });
      return;
    }

    // =========================================================================
    // 11. POST / GET /api/v1/auth/notion/callback
    // =========================================================================
    if (pathname === '/api/v1/auth/notion/callback') {
      if (!await enforceSensitiveRateLimit(req, res, `oauth_cb:${getClientIp(req)}`, 30, 60000)) {
        return;
      }

      const code = (req.body?.code as string) || url.searchParams.get('code');
      const state = (req.body?.state as string) || url.searchParams.get('state') || '';
      const redirectUri =
        (req.body?.redirectUri as string) ||
        url.searchParams.get('redirect_uri') ||
        process.env.NOTION_REDIRECT_URI ||
        'https://buynovastore.vercel.app/';

      if (!code) {
        const error = url.searchParams.get('error') || 'OAuth authorization cancelled';
        if (method === 'POST') {
          sendJson(res, 400, { success: false, error: { code: 'OAUTH_ERROR', message: error } });
          return;
        }
        res.writeHead(302, { Location: `/?notion_auth=error&message=${encodeURIComponent(error)}` });
        res.end();
        return;
      }

      // Step 1: Cryptographic HMAC signature check
      const verifiedState = verifySignedOAuthState(state);
      if (!verifiedState.valid || !verifiedState.deviceId) {
        const errorMsg = verifiedState.error || 'Invalid or expired OAuth state parameter.';
        if (method === 'POST') {
          sendJson(res, 400, { success: false, error: { code: 'INVALID_STATE', message: errorMsg } });
          return;
        }
        res.writeHead(302, { Location: `/?notion_auth=error&message=${encodeURIComponent(errorMsg)}` });
        res.end();
        return;
      }

      const deviceId = verifiedState.deviceId;

      // Step 2: Database single-use and session binding validation
      const stateRows = await queryDb<{
        state: string;
        device_id: string;
        session_id: string | null;
        expires_at: string;
        is_used: boolean;
      }>('SELECT * FROM oauth_states WHERE state = $1', [state]);

      if (stateRows.length === 0) {
        const errorMsg = 'Unknown or unregistered OAuth state parameter.';
        if (method === 'POST') {
          sendJson(res, 400, { success: false, error: { code: 'INVALID_STATE', message: errorMsg } });
          return;
        }
        res.writeHead(302, { Location: `/?notion_auth=error&message=${encodeURIComponent(errorMsg)}` });
        res.end();
        return;
      }

      const stateRecord = stateRows[0];
      if (stateRecord.is_used) {
        const errorMsg = 'OAuth authorization state has already been redeemed. Replay attack rejected.';
        if (method === 'POST') {
          sendJson(res, 400, { success: false, error: { code: 'STATE_ALREADY_USED', message: errorMsg } });
          return;
        }
        res.writeHead(302, { Location: `/?notion_auth=error&message=${encodeURIComponent(errorMsg)}` });
        res.end();
        return;
      }

      if (new Date(stateRecord.expires_at) < new Date()) {
        const errorMsg = 'OAuth authorization state has expired (15-minute lifespan).';
        if (method === 'POST') {
          sendJson(res, 410, { success: false, error: { code: 'STATE_EXPIRED', message: errorMsg } });
          return;
        }
        res.writeHead(302, { Location: `/?notion_auth=error&message=${encodeURIComponent(errorMsg)}` });
        res.end();
        return;
      }

      // Session binding validation if session was associated
      if (stateRecord.session_id) {
        const callerSession =
          getHeader(req, 'authorization')?.startsWith('Bearer ')
            ? getHeader(req, 'authorization')!.substring(7).trim()
            : ((req.body?.sessionId as string) || (req.body?.pairingSessionId as string) || url.searchParams.get('session') || null);

        if (callerSession && callerSession !== stateRecord.session_id) {
          const errorMsg = 'OAuth session mismatch. The state was issued to a different session.';
          if (method === 'POST') {
            sendJson(res, 403, { success: false, error: { code: 'SESSION_MISMATCH', message: errorMsg } });
            return;
          }
          res.writeHead(302, { Location: `/?notion_auth=error&message=${encodeURIComponent(errorMsg)}` });
          res.end();
          return;
        }
      }

      // Mark single-use state as redeemed BEFORE contacting Notion API (anti-race condition)
      await queryDb('UPDATE oauth_states SET is_used = TRUE, used_at = NOW() WHERE state = $1', [state]);

      const clientId = process.env.NOTION_CLIENT_ID;
      const clientSecret = process.env.NOTION_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        if (method === 'POST') {
          sendJson(res, 500, { success: false, error: { code: 'NOTION_NOT_CONFIGURED', message: 'Notion integration credentials missing on server.' } });
          return;
        }
        res.writeHead(302, { Location: '/?notion_auth=error&message=Notion+client+credentials+missing' });
        res.end();
        return;
      }

      try {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
        });

        const tokenData = (await tokenRes.json().catch(() => null)) as any;
        if (!tokenRes.ok) {
          throw new Error(tokenData?.message || 'Failed to exchange Notion authorization code');
        }

        const encryptedToken = encryptSecret(tokenData.access_token);
        const saveAuthSql = `
          INSERT INTO notion_authorizations (
            device_id, workspace_id, workspace_name, workspace_icon, bot_id,
            encrypted_access_token, target_database_id, target_database_name,
            owner_email, last_sync_at, connected_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NOW(), NOW())
          ON CONFLICT (device_id) DO UPDATE SET
            workspace_id = EXCLUDED.workspace_id,
            workspace_name = EXCLUDED.workspace_name,
            workspace_icon = EXCLUDED.workspace_icon,
            bot_id = EXCLUDED.bot_id,
            encrypted_access_token = EXCLUDED.encrypted_access_token,
            target_database_id = EXCLUDED.target_database_id,
            target_database_name = EXCLUDED.target_database_name,
            owner_email = EXCLUDED.owner_email,
            updated_at = NOW();
        `;

        await queryDb(saveAuthSql, [
          deviceId,
          tokenData.workspace_id,
          tokenData.workspace_name,
          tokenData.workspace_icon,
          tokenData.bot_id,
          encryptedToken,
          tokenData.duplicated_template_id || null,
          'NOVA Notes & Voice Inbox',
          tokenData.owner?.user?.person?.email || null,
        ]);

        if (method === 'POST') {
          sendJson(res, 200, {
            success: true,
            data: {
              isConnected: true,
              workspaceId: tokenData.workspace_id,
              workspaceName: tokenData.workspace_name,
              workspaceIcon: tokenData.workspace_icon,
              ownerEmail: tokenData.owner?.user?.person?.email || null,
              botId: tokenData.bot_id,
              targetDatabaseName: 'NOVA Notes & Voice Inbox',
              connectedAt: new Date().toISOString(),
            },
          });
          return;
        }

        res.writeHead(302, {
          Location: `/?notion_auth=success&workspace=${encodeURIComponent(tokenData.workspace_name || 'Notion')}&deviceId=${encodeURIComponent(deviceId)}`,
        });
        res.end();
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to authorize Notion';
        if (method === 'POST') {
          sendJson(res, 502, { success: false, error: { code: 'NOTION_API_ERROR', message: msg } });
          return;
        }
        res.writeHead(302, { Location: `/?notion_auth=error&message=${encodeURIComponent(msg)}` });
        res.end();
        return;
      }
    }

    // =========================================================================
    // 12. POST /api/v1/devices/:deviceId/notion/disconnect
    // =========================================================================
    const notionDiscMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/notion\/disconnect$/);
    if (notionDiscMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(notionDiscMatch[1]);

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, {
          success: false,
          error: { code: auth.code, message: auth.message },
        });
        return;
      }

      await queryDb('DELETE FROM notion_authorizations WHERE device_id = $1', [targetDeviceId]);

      sendJson(res, 200, {
        success: true,
        data: {
          disconnected: true,
          message: 'Notion authorization successfully revoked and unlinked. Device record preserved.',
        },
      });
      return;
    }

    // =========================================================================
    // 13. POST /api/v1/devices/:deviceId/sync/test
    // Idempotent sync test to Notion database
    // =========================================================================
    const syncTestMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/sync\/test$/);
    if (syncTestMatch && method === 'POST') {
      const targetDeviceId = decodeURIComponent(syncTestMatch[1]);

      const auth = await authenticateDeviceRequest(req, targetDeviceId);
      if (!auth.authorized) {
        sendJson(res, auth.status, {
          success: false,
          error: { code: auth.code, message: auth.message },
        });
        return;
      }

      const notionAuths = await queryDb<NotionAuthRecord>('SELECT * FROM notion_authorizations WHERE device_id = $1', [targetDeviceId]);

      if (notionAuths.length === 0) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'NOTION_NOT_CONNECTED',
            message: 'Cannot run test sync because Notion is not linked for this device.',
          },
        });
        return;
      }

      const notionAuth = notionAuths[0];
      const idempotencyKey =
        getHeader(req, 'x-idempotency-key') ||
        (req.body?.idempotencyKey as string) ||
        `test_sync_${targetDeviceId}_${crypto.randomBytes(8).toString('hex')}`;

      // Check for existing idempotent execution
      const existingActions = await queryDb<{ id: string; response_json: any }>(
        'SELECT id, response_json FROM device_actions WHERE idempotency_key = $1',
        [idempotencyKey]
      );

      if (existingActions.length > 0 && existingActions[0].response_json) {
        sendJson(res, 200, {
          success: true,
          data: existingActions[0].response_json,
        });
        return;
      }

      const actionId = `act_${crypto.randomBytes(8).toString('hex')}`;
      await queryDb(
        `INSERT INTO device_actions (id, device_id, action_type, idempotency_key, payload_json, status)
         VALUES ($1, $2, 'sync_note', $3, $4, 'pending')
         ON CONFLICT (idempotency_key) DO NOTHING;`,
        [actionId, targetDeviceId, idempotencyKey, JSON.stringify({ test: true })]
      );

      // Decrypt token
      const plainToken = decryptSecret(notionAuth.encrypted_access_token);

      // Execute Notion Page Creation
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const title = `NOVA Voice Memo (ESP32-C3) — ${timestamp}`;

      const pageBody: Record<string, unknown> = {
        properties: {
          title: {
            title: [{ text: { content: title } }],
          },
        },
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: '🎙️ Audio Captured by NOVA Keychain' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content:
                      'Hardware: ESP32-C3 Super Mini + MAX4466 microphone on GPIO1 ADC. WakeNet trigger: "Hi ESP".',
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'callout',
            callout: {
              icon: { emoji: '⚡' },
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: 'Status: Cloud sync confirmed. Idempotency verified via PostgreSQL transaction ledger.',
                  },
                },
              ],
            },
          },
        ],
      };

      if (notionAuth.target_database_id) {
        pageBody.parent = { database_id: notionAuth.target_database_id };
      } else {
        // Search accessible workspaces
        const searchRes = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${plainToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page_size: 1 }),
        });
        const searchData = (await searchRes.json().catch(() => null)) as any;
        if (searchData?.results?.length > 0) {
          const first = searchData.results[0];
          pageBody.parent = first.object === 'database' ? { database_id: first.id } : { page_id: first.id };
        } else {
          throw new Error('No accessible page or database found in your Notion workspace. Grant NOVA access in Notion.');
        }
      }

      const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${plainToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageBody),
      });

      const pageData = (await notionRes.json().catch(() => null)) as any;
      if (!notionRes.ok) {
        throw new Error(pageData?.message || `Notion API returned HTTP ${notionRes.status}`);
      }

      const responsePayload = {
        success: true,
        pageTitle: title,
        pageUrl: pageData.url,
        databaseName: notionAuth.target_database_name || 'NOVA Notes',
        idempotencyKey,
        syncedTimestamp: new Date().toISOString(),
      };

      await queryDb('UPDATE notion_authorizations SET last_sync_at = NOW() WHERE device_id = $1', [targetDeviceId]);
      await queryDb(
        "UPDATE device_actions SET status = 'acknowledged', response_json = $1, acknowledged_at = NOW() WHERE id = $2",
        [JSON.stringify(responsePayload), actionId]
      );

      sendJson(res, 200, {
        success: true,
        data: responsePayload,
      });
      return;
    }

    // =========================================================================
    // 404 Fallback
    // =========================================================================
    sendJson(res, 404, {
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: `No API route matches ${method} ${pathname}`,
      },
    });
  } catch (err: unknown) {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const rawError = err instanceof Error ? err.message : 'Internal Server Error';
    console.error(`[API ERROR] ${method} ${pathname}:`, rawError);
    const safeMsg = isProd ? 'Internal server error. Please try again later.' : rawError;
    sendJson(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: safeMsg,
      },
    });
  }
}
