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
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
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
  ip_address: string | null;
  wifi_connected?: boolean | null;
  wifi_ssid: string | null;
  wifi_rssi: number | null;
  oled_state?: string | null;
  queue_count?: number | null;
  last_heartbeat: string | null;
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
// Crypto Utilities (AES-256-GCM)
// -----------------------------------------------------------------------------
function getEncryptionKey(): Buffer {
  const envKey = process.env.NOTION_ENCRYPTION_KEY;
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
// Request / Response Helpers
// -----------------------------------------------------------------------------
async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
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
// 1. Device credential (devices.device_secret) - used by firmware (heartbeat/status)
// 2. Active pairing session (pairing_sessions.id) - used by web client (status/sync/disconnect)
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

  // 1. Check if token matches a device_secret (firmware credential)
  const deviceBySecret = await queryDb<{ id: string }>(
    'SELECT id FROM devices WHERE device_secret = $1',
    [token]
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
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-nova-key, x-nova-bootstrap, x-idempotency-key');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method?.toUpperCase() || 'GET';

  if (method === 'POST' || method === 'PUT') {
    req.body = await parseJsonBody(req);
  }

  try {
    // =========================================================================
    // 1. GET /api/health or /api/v1/health
    // Public health check returning database status and hardware configuration
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
    // Called over TLS when ESP32-C3 connects to Wi-Fi to register cloud state
    // and generate its single-use 15-minute OLED claim QR token.
    // Protected by device bootstrap credential.
    // =========================================================================
    if (pathname === '/api/v1/devices/bootstrap' && method === 'POST') {
      const bootstrapSecret =
        (req.body?.bootstrapSecret as string) ||
        (req.body?.bootstrapCredential as string) ||
        (req.headers['x-nova-bootstrap'] as string) ||
        (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].substring(7).trim() : '');

      const expectedBootstrapSecret = process.env.NOVA_BOOTSTRAP_SECRET || 'nova_sec_c3_hardware_bootstrap_2026';
      if (!bootstrapSecret || bootstrapSecret !== expectedBootstrapSecret) {
        sendJson(res, 401, {
          success: false,
          error: {
            code: 'INVALID_BOOTSTRAP_CREDENTIAL',
            message: 'Invalid or missing device bootstrap credential. Unauthorized device enrollment.',
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

      const wifiSsid = (req.body?.wifiSsid as string) || null;
      const ipAddress = (req.body?.ipAddress as string) || null;
      const rssi = typeof req.body?.rssi === 'number' ? req.body.rssi : null;

      // Check if device already has a persistent device_secret, otherwise generate one
      const existingDevice = await queryDb<{ device_secret: string | null }>(
        'SELECT device_secret FROM devices WHERE id = $1',
        [deviceId]
      );
      const deviceKey = existingDevice[0]?.device_secret || `dkey_${crypto.randomBytes(16).toString('hex')}`;

      // Upsert device in PostgreSQL
      const upsertDeviceSql = `
        INSERT INTO devices (
          id, serial_number, mac_address, hardware_model, firmware_version,
          status, device_secret, ip_address, wifi_connected, wifi_ssid, wifi_rssi,
          oled_state, queue_count, last_heartbeat, updated_at
        )
        VALUES (
          $1, $2, $3, 'ESP32-C3 Super Mini', $4,
          'online', $5, $6, TRUE, $7, $8,
          'pairing_qr', 0, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          mac_address = EXCLUDED.mac_address,
          firmware_version = EXCLUDED.firmware_version,
          status = 'online',
          device_secret = COALESCE(devices.device_secret, EXCLUDED.device_secret),
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
        deviceKey,
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
          deviceKey: devices[0]?.device_secret || deviceKey,
          portalUrl: `https://buynovastore.vercel.app/?token=${token}`,
        },
      });
      return;
    }

    // =========================================================================
    // 3. POST /api/v1/devices/:deviceId/heartbeat
    // Firmware telemetry endpoint. Authenticated via deviceKey.
    // Accepts non-secret telemetry: firmwareVersion, wifiConnected, rssi, ipAddress, queueCount, oledState.
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

      const updateSql = `
        UPDATE devices SET
          firmware_version = COALESCE($2, firmware_version),
          wifi_connected = COALESCE($3, wifi_connected),
          wifi_rssi = COALESCE($4, wifi_rssi),
          ip_address = COALESCE($5, ip_address),
          queue_count = COALESCE($6, queue_count),
          oled_state = COALESCE($7, oled_state),
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
        },
      });
      return;
    }

    // =========================================================================
    // 4. POST /api/v1/devices/claim
    // Validates 15-minute ephemeral token and grants durable pairing session
    // =========================================================================
    if (pathname === '/api/v1/devices/claim' && method === 'POST') {
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
    // 5. GET /api/v1/devices/:deviceId/status
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
      const notionAuths = await queryDb<NotionAuthRecord>('SELECT * FROM notion_authorizations WHERE device_id = $1', [targetDeviceId]);
      const pendingRes = await queryDb<{ count: string }>(
        "SELECT count(*) as count FROM device_actions WHERE device_id = $1 AND status = 'pending'",
        [targetDeviceId]
      );
      const pendingSyncCount = parseInt(pendingRes[0]?.count || '0', 10);
      const notionAuth = notionAuths[0] || null;

      sendJson(res, 200, {
        success: true,
        data: {
          device: {
            deviceId: device.id,
            serialNumber: device.serial_number,
            hardwareModel: device.hardware_model,
            firmwareVersion: device.firmware_version,
            status: device.status,
            oledState: device.oled_state || 'idle',
            queueCount: device.queue_count || 0,
            lastHeartbeat: device.last_heartbeat,
            ipAddress: device.ip_address,
          },
          wifi: {
            state: device.wifi_connected || device.wifi_ssid ? 'connected' : 'disconnected',
            connected: Boolean(device.wifi_connected),
            connectedSsid: device.wifi_ssid,
            rssi: device.wifi_rssi,
            ipAddress: device.ip_address,
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
    // 6. Wi-Fi Provisioning Guard
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
    // 7. POST / GET /api/v1/auth/notion/authorize
    // =========================================================================
    if (pathname === '/api/v1/auth/notion/authorize') {
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

      const stateToken = `state_${deviceId}_${crypto.randomBytes(8).toString('hex')}`;
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
        },
      });
      return;
    }

    // =========================================================================
    // 8. POST / GET /api/v1/auth/notion/callback
    // =========================================================================
    if (pathname === '/api/v1/auth/notion/callback') {
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

      const stateParts = state.split('_');
      const deviceId = (req.body?.deviceId as string) || (stateParts.length >= 2 ? stateParts[1] : null);

      if (!deviceId) {
        sendJson(res, 400, {
          success: false,
          error: { code: 'INVALID_STATE', message: 'Missing target deviceId in OAuth state.' },
        });
        return;
      }

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
    // 9. POST /api/v1/devices/:deviceId/notion/disconnect
    // Enforces Bearer authentication.
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
    // 10. POST /api/v1/devices/:deviceId/sync/test
    // Idempotent sync test to Notion database
    // Enforces Bearer authentication.
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
        (req.headers['x-idempotency-key'] as string) ||
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
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error(`[API ERROR] ${method} ${pathname}:`, errorMsg);
    sendJson(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMsg,
      },
    });
  }
}
