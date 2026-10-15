import { describe, it, expect, beforeAll } from 'vitest';
import handler, { checkRateLimit, pruneExpiredRateLimits, _setPoolForTesting } from '../../api/index.ts';
import healthHandler from '../../api/health.ts';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

import fs from 'fs';
import path from 'path';

// Automatically load local testing environment variables if not already set
if (!process.env.DATABASE_URL) {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

const DB_URL = process.env.DATABASE_URL || '';

beforeAll(async () => {
  if (!DB_URL) {
    throw new Error('DATABASE_URL must be configured to run database integration test suite.');
  }

  process.env.NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || 'https://buynovastore.vercel.app/';
  process.env.NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || '3f9d872b-594c-81fe-b945-00373d142af3';

  // Clean test fixtures in database
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Reset bootstrap used status for clean repeatable test runs
    await pool.query(
      `UPDATE device_bootstrap_credentials
       SET is_used = FALSE
       WHERE device_id IN ('nova-c3-5c20dc4239fca9ec', 'nova-c3-other99887766')`
    );
    // Clear test wifi profiles
    await pool.query(
      `DELETE FROM wifi_profiles
       WHERE device_id IN ('nova-c3-5c20dc4239fca9ec', 'nova-c3-other99887766')`
    );
    // Clear ephemeral rate limits and oauth states
    await pool.query('DELETE FROM rate_limits');
    await pool.query('DELETE FROM oauth_states');
  } finally {
    await pool.end();
  }
});

import { Readable } from 'stream';

// Lightweight helper to simulate Node HTTP req/res on the serverless handler
function simulateRequest(options: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  handlerFn?: any;
}): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve) => {
    const targetHandler = options.handlerFn || handler;
    const bodyStr = options.body ? JSON.stringify(options.body) : '';
    const req = Readable.from(bodyStr ? [bodyStr] : []) as any;
    req.method = options.method;
    req.url = options.url;
    if (options.body) {
      req.body = options.body;
    }
    const headers: Record<string, string> = { host: 'buynovastore.vercel.app' };
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        headers[k.toLowerCase()] = v;
      }
    }
    req.headers = headers;

    const resHeaders: Record<string, string> = {};
    let responseBody = '';
    let resStatusCode = 200;

    const res: any = {
      setHeader(name: string, value: string) {
        resHeaders[name.toLowerCase()] = value;
      },
      writeHead(status: number, headers?: Record<string, string>) {
        resStatusCode = status;
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            resHeaders[k.toLowerCase()] = v;
          }
        }
      },
      get statusCode() {
        return resStatusCode;
      },
      set statusCode(val: number) {
        resStatusCode = val;
      },
      end(chunk?: string) {
        if (chunk) responseBody += chunk;
        let parsed = responseBody;
        try {
          parsed = JSON.parse(responseBody);
        } catch {}
        resolve({
          statusCode: resStatusCode,
          headers: resHeaders,
          body: parsed,
        });
      },
    };

    targetHandler(req, res).catch((err: any) => {
      resolve({
        statusCode: 500,
        headers: resHeaders,
        body: { error: err.message },
      });
    });
  });
}

describe('NOVA Real ESP32-C3 Firmware Integration & Security Suite', { timeout: 25000 }, () => {
  const REAL_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';
  const REAL_MAC = '48:F6:EE:17:34:D8';
  const REAL_BOOTSTRAP_SECRET = 'nova_c3_5c20dc4239fca9ec_boot_8f9c2d1e4a7b3c6d';

  // Other device for cross-device authorization checks
  const OTHER_DEVICE_ID = 'nova-c3-other99887766';
  const OTHER_BOOTSTRAP_SECRET = 'nova_c3_other99887766_boot_sec_11223344';

  let generatedClaimToken = '';
  let issuedDeviceKey = '';
  let establishedPairingSessionId = '';
  let otherDeviceKey = '';

  // Profile IDs for multi-Wi-Fi testing
  let createdProfileId1 = '';
  let createdProfileId2 = '';

  // ---------------------------------------------------------------------------
  // 1. Health Checks & Hardware Facts
  // ---------------------------------------------------------------------------
  it('GET /api/health standalone handler returns database connectivity and hardware specs', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
      handlerFn: healthHandler,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database?.status).toBe('connected');
    expect(res.body.hardware?.chipset).toContain('ESP32-C3 Super Mini');
    expect(res.body.hardware?.display).toContain('SSD1306 monochrome 128x64 OLED (0x3C, GPIO8/GPIO9)');
    expect(res.body.hardware?.microphone).toContain('MAX4466 analog electret (ADC GPIO1)');
    expect(res.body.hardware?.wakeWord).toContain('Hi ESP');
  });

  it('GET /api/health via router returns hardware status and database connectivity', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.hardwareTarget?.microcontroller).toContain('ESP32-C3 Super Mini');
    expect(res.body.database?.connected).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 2. Unique Device Bootstrap & SHA-256 Hash Verification
  // ---------------------------------------------------------------------------
  it('POST /api/v1/devices/bootstrap rejects enrollment without secret', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: REAL_DEVICE_ID,
        macAddress: REAL_MAC,
        firmwareVersion: 'v1.0.0-c3',
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_BOOTSTRAP_CREDENTIAL');
  });

  it('POST /api/v1/devices/bootstrap rejects mismatched bootstrap credential hash', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: REAL_DEVICE_ID,
        macAddress: REAL_MAC,
        firmwareVersion: 'v1.0.0-c3',
        bootstrapSecret: 'wrong_unauthorized_bootstrap_credential_xyz',
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_BOOTSTRAP_CREDENTIAL');
  });

  it('POST /api/v1/devices/bootstrap rejects missing deviceId or macAddress', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        bootstrapSecret: REAL_BOOTSTRAP_SECRET,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_DEVICE_ID');
  });

  it('POST /api/v1/devices/bootstrap registers real hardware with unique credential hash', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: REAL_DEVICE_ID,
        macAddress: REAL_MAC,
        firmwareVersion: 'v1.0.0-c3',
        bootstrapSecret: REAL_BOOTSTRAP_SECRET,
        wifiSsid: 'Home_Lab_2.4G',
        ipAddress: '192.168.1.142',
        rssi: -58,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe(REAL_DEVICE_ID);
    expect(res.body.data.macAddress).toBe(REAL_MAC);
    expect(res.body.data.claimToken).toMatch(/^clm_live_/);
    expect(res.body.data.shortCode).toMatch(/^NOV-/);
    expect(res.body.data.deviceKey).toMatch(/^dkey_/);
    expect(res.body.data.expiresInSeconds).toBe(900);

    generatedClaimToken = res.body.data.claimToken;
    issuedDeviceKey = res.body.data.deviceKey;
  });

  it('Bootstrap also registers secondary device for cross-device auth tests', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: OTHER_DEVICE_ID,
        macAddress: 'AA:BB:CC:DD:EE:FF',
        firmwareVersion: 'v1.0.0-c3',
        bootstrapSecret: OTHER_BOOTSTRAP_SECRET,
      },
    });
    expect(res.statusCode).toBe(200);
    otherDeviceKey = res.body.data.deviceKey;
  });

  // ---------------------------------------------------------------------------
  // 3. Authenticated Device-Key Rotation
  // ---------------------------------------------------------------------------
  it('POST /api/v1/devices/:id/device-key/rotate rejects unauthenticated request', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/device-key/rotate`,
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/devices/:id/device-key/rotate rejects credential from another device (403)', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/device-key/rotate`,
      headers: {
        Authorization: `Bearer ${otherDeviceKey}`,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.error?.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/devices/:id/device-key/rotate rotates key and authenticates with new key', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/device-key/rotate`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceKey).toMatch(/^dkey_/);
    expect(res.body.data.deviceKey).not.toBe(issuedDeviceKey);

    const oldKey = issuedDeviceKey;
    issuedDeviceKey = res.body.data.deviceKey;

    // Verify old key is now rejected (401)
    const oldKeyRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: { Authorization: `Bearer ${oldKey}` },
    });
    expect(oldKeyRes.statusCode).toBe(401);

    // Verify new key succeeds (200)
    const newKeyRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
    });
    expect(newKeyRes.statusCode).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // 4. Authenticated Claim-Token Generation & Pairing Flow
  // ---------------------------------------------------------------------------
  it('POST /api/v1/devices/:id/claim-token generates fresh 15-minute claim token', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/claim-token`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claimToken).toMatch(/^clm_live_/);
    expect(res.body.data.expiresInSeconds).toBe(900);

    generatedClaimToken = res.body.data.claimToken;
  });

  it('POST /api/v1/devices/claim redeems claim token and creates web pairing session', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: { claimToken: generatedClaimToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe(REAL_DEVICE_ID);
    expect(res.body.data.pairingSessionId).toMatch(/^sess_/);

    establishedPairingSessionId = res.body.data.pairingSessionId;
  });

  it('POST /api/v1/devices/claim enforces single-use: rejects already-redeemed token', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: { claimToken: generatedClaimToken },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('CLAIM_TOKEN_ALREADY_REDEEMED');
  });

  // ---------------------------------------------------------------------------
  // 5. Authentication & Authorization Enforcement
  // ---------------------------------------------------------------------------
  it('GET /api/v1/devices/:id/status returns 401 when Authorization header is absent', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/devices/:id/status returns 401 when Bearer token is invalid/unknown', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: {
        Authorization: 'Bearer invalid_bogus_token_123',
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/v1/devices/:id/status returns 403 when token belongs to another device', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: {
        Authorization: `Bearer ${otherDeviceKey}`,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/devices/:id/status returns 200 with real telemetry when authenticated with deviceKey', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.device.deviceId).toBe(REAL_DEVICE_ID);
    expect(res.body.data.wifi.macAddress).toBe(REAL_MAC);
    expect(res.body.data.wifi.frequencyBand).toBe('2.4GHz');
    expect(res.body.data.device.status).toBe('online');
  });

  it('GET /api/v1/devices/:id/status returns 200 when authenticated with pairingSessionId', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.device.deviceId).toBe(REAL_DEVICE_ID);
  });

  // ---------------------------------------------------------------------------
  // 6. Firmware Heartbeat & Telemetry
  // ---------------------------------------------------------------------------
  it('POST /api/v1/devices/:id/heartbeat rejects unauthenticated request', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/heartbeat`,
      body: {
        firmwareVersion: 'v1.0.0-c3',
        wifiConnected: true,
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/devices/:id/heartbeat rejects Wi-Fi passwords in telemetry', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/heartbeat`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
      body: {
        firmwareVersion: 'v1.0.0-c3',
        password: 'secret_wifi_password',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_TELEMETRY');
  });

  it('POST /api/v1/devices/:id/heartbeat updates non-secret telemetry with deviceKey', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/heartbeat`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
      body: {
        firmwareVersion: 'v1.0.0-c3',
        wifiConnected: true,
        rssi: -52,
        ipAddress: '192.168.1.142',
        queueCount: 0,
        oledState: 'idle',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.acknowledged).toBe(true);
    expect(res.body.data.deviceId).toBe(REAL_DEVICE_ID);
    expect(res.body.data.oledState).toBe('idle');
    expect(res.body.data.wifiVaultVersion).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 7. Multi-Wi-Fi Profile Vault CRUD & Versioning
  // ---------------------------------------------------------------------------
  it('GET /api/v1/devices/:id/wifi-profiles rejects unauthenticated request (401)', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/devices/:id/wifi-profiles creates profile 1 with voice slot "network one"', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
      body: {
        name: 'Home Studio',
        ssid: 'Home_Studio_2.4G',
        password: 'super_secret_wifi_pass_123',
        isDefault: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.voiceSlot).toBe('network one');
    expect(res.body.data.profile.slotNumber).toBe(1);
    expect(res.body.data.profile.isDefault).toBe(true);
    expect(res.body.data.profile.hasPassword).toBe(true);
    // CRITICAL: Password MUST NOT be exposed in response to browser
    expect(res.body.data.profile.password).toBeUndefined();

    createdProfileId1 = res.body.data.profile.id;
  });

  it('POST /api/v1/devices/:id/wifi-profiles creates profile 2 with voice slot "network two"', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
      body: {
        name: 'Office Workshop',
        ssid: 'Office_2.4G',
        password: 'office_secret_pass_456',
        isDefault: false,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.profile.voiceSlot).toBe('network two');
    expect(res.body.data.profile.slotNumber).toBe(2);
    expect(res.body.data.profile.isDefault).toBe(false);

    createdProfileId2 = res.body.data.profile.id;
  });

  it('GET /api/v1/devices/:id/wifi-profiles with pairing session hides passwords (browser view)', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.profiles.length).toBe(2);
    // Never expose password to web session
    for (const p of res.body.data.profiles) {
      expect(p.hasPassword).toBe(true);
      expect(p.password).toBeUndefined();
    }
    expect(res.headers.etag).toBeDefined();
  });

  it('GET /api/v1/devices/:id/wifi-profiles with deviceKey decrypts passwords for ESP32 firmware', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.profiles.length).toBe(2);
    // ESP32 firmware pulling over TLS receives decrypted password
    const p1 = res.body.data.profiles.find((p: any) => p.id === createdProfileId1);
    expect(p1.password).toBe('super_secret_wifi_pass_123');
  });

  it('GET /api/v1/devices/:id/wifi-profiles returns 304 Not Modified when version matches', async () => {
    const initialRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
    });
    const currentEtag = initialRes.headers.etag;
    const currentVersion = initialRes.body.data.vaultVersion;

    const notModifiedRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles?version=${currentVersion}`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
        'if-none-match': currentEtag,
      },
    });
    expect(notModifiedRes.statusCode).toBe(304);
  });

  it('POST /api/v1/devices/:id/wifi-profiles/:profileId/make-default guarantees exactly 1 default', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/${createdProfileId2}/make-default`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.isDefault).toBe(true);

    // Verify profile 1 is no longer default
    const checkRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
    });
    const p1 = checkRes.body.data.profiles.find((p: any) => p.id === createdProfileId1);
    const p2 = checkRes.body.data.profiles.find((p: any) => p.id === createdProfileId2);
    expect(p1.isDefault).toBe(false);
    expect(p2.isDefault).toBe(true);
  });

  it('PATCH /api/v1/devices/:id/wifi-profiles/:profileId updates profile fields', async () => {
    const res = await simulateRequest({
      method: 'PATCH',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/${createdProfileId1}`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
      body: {
        name: 'Home Studio Renovated',
        ssid: 'Home_Studio_New_SSID',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.profile.name).toBe('Home Studio Renovated');
    expect(res.body.data.profile.ssid).toBe('Home_Studio_New_SSID');
  });

  it('Enforces maximum 5 Wi-Fi profiles vault limit', async () => {
    // We already have 2 profiles. Add 3 more to reach 5.
    for (let i = 3; i <= 5; i++) {
      const addRes = await simulateRequest({
        method: 'POST',
        url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
        headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
        body: {
          name: `Spot ${i}`,
          ssid: `Spot_SSID_${i}`,
        },
      });
      expect(addRes.statusCode).toBe(201);
    }

    // Try adding a 6th profile: MUST be rejected with 400 VAULT_LIMIT_REACHED
    const sixthRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
      body: {
        name: 'Overflow Network',
        ssid: 'Overflow_SSID',
      },
    });
    expect(sixthRes.statusCode).toBe(400);
    expect(sixthRes.body.error?.code).toBe('VAULT_LIMIT_REACHED');
  }, 20000);

  it('DELETE /api/v1/devices/:id/wifi-profiles/:profileId deletes and recompacts voice slots', async () => {
    const deleteRes = await simulateRequest({
      method: 'DELETE',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/${createdProfileId1}`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    // Verify remaining profiles are recompacted to slots 1..4 with continuous voice slots
    const checkRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
    });
    expect(checkRes.body.data.profiles.length).toBe(4);
    expect(checkRes.body.data.profiles[0].slotNumber).toBe(1);
    expect(checkRes.body.data.profiles[0].voiceSlot).toBe('network one');
  }, 20000);

  it('POST /api/v1/devices/:id/wifi-profile-result reports firmware connection outcome', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profile-result`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
      body: {
        profileId: createdProfileId2,
        result: 'connected',
        rssi: -48,
        appliedVersion: 3,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.acknowledged).toBe(true);
    expect(res.body.data.result).toBe('connected');

    // Verify status reflects connection
    const statusRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
    });
    expect(statusRes.body.data.wifi.state).toBe('connected');
    expect(statusRes.body.data.wifi.rssi).toBe(-48);
  });

  // ---------------------------------------------------------------------------
  // 8. Provisioning Guard & Notion OAuth
  // ---------------------------------------------------------------------------
  it('Cloud API blocks cloud Wi-Fi provisioning (local SoftAP only)', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi/provision`,
      body: {
        ssid: 'Home_Wifi',
        password: 'secret_password',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe('LOCAL_PROVISIONING_ONLY');
  });

  it('POST /api/v1/auth/notion/authorize returns configured Notion OAuth URL for real device', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/authorize',
      body: {
        deviceId: REAL_DEVICE_ID,
      },
    });
    expect(res.statusCode).toBe(200);
    const expectedClientId = process.env.NOTION_CLIENT_ID || '3f9d872b-594c-81fe-b945-00373d142af3';
    expect(res.body.data.authorizationUrl).toContain(`client_id=${expectedClientId}`);
    expect(res.body.data.stateToken).toMatch(new RegExp(`^state_${REAL_DEVICE_ID}_`));
  });

  it('POST /api/v1/devices/:id/sync/test enforces Bearer auth and reports NOTION_NOT_CONNECTED', async () => {
    const unauthRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/sync/test`,
      body: { idempotencyKey: 'test_key_sync_1' },
    });
    expect(unauthRes.statusCode).toBe(401);

    const authRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/sync/test`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
      body: { idempotencyKey: 'test_key_sync_1' },
    });
    expect(authRes.statusCode).toBe(400);
    expect(authRes.body.error?.code).toBe('NOTION_NOT_CONNECTED');
  });

  it('POST /api/v1/devices/:id/notion/disconnect enforces Bearer auth', async () => {
    const unauthRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/notion/disconnect`,
    });
    expect(unauthRes.statusCode).toBe(401);

    const authRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/notion/disconnect`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(authRes.statusCode).toBe(200);
    expect(authRes.body.success).toBe(true);
    expect(authRes.body.data.disconnected).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 9. Dedicated Boot Profile Endpoint & Cross-Device Firmware Isolation
  // ---------------------------------------------------------------------------
  it('GET /api/v1/devices/:id/wifi-profiles/boot enforces authentication and returns 401 unauth', async () => {
    const unauthRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/boot`,
    });
    expect(unauthRes.statusCode).toBe(401);
  });

  it('GET /api/v1/devices/:id/wifi-profiles/boot rejects cross-device credential with 403', async () => {
    const forbiddenRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/boot`,
      headers: {
        Authorization: `Bearer ${otherDeviceKey}`,
      },
    });
    expect(forbiddenRes.statusCode).toBe(403);
    expect(['FORBIDDEN', 'CROSS_DEVICE_FORBIDDEN']).toContain(forbiddenRes.body.error?.code);
  });

  it('GET /api/v1/devices/:id/wifi-profiles/boot returns ONLY default profile with decrypted password for hardware', async () => {
    // Ensure there is a default profile
    const defRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/${createdProfileId2}/make-default`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(defRes.statusCode).toBe(200);

    const bootRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/boot`,
      headers: {
        Authorization: `Bearer ${issuedDeviceKey}`,
      },
    });
    expect(bootRes.statusCode).toBe(200);
    expect(bootRes.body.success).toBe(true);
    expect(bootRes.body.data.hasDefault).toBe(true);
    expect(bootRes.body.data.defaultProfile).toBeDefined();
    expect(bootRes.body.data.defaultProfile.id).toBe(createdProfileId2);
    expect(bootRes.body.data.defaultProfile.isDefault).toBe(true);
    expect(bootRes.body.data.defaultProfile.password).toBe('office_secret_pass_456');
    // Ensure it does NOT return a list of profiles, only the single default boot profile
    expect(bootRes.body.data.profiles).toBeUndefined();
  }, 20000);

  // ---------------------------------------------------------------------------
  // 10. Deletion of Default Profile & Zero-Default Vault State
  // ---------------------------------------------------------------------------
  it('Deleting default profile recompacts slots and leaves vault without default', async () => {
    const delRes = await simulateRequest({
      method: 'DELETE',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/${createdProfileId2}`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);

    const checkRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
    });
    expect(checkRes.statusCode).toBe(200);
    const hasAnyDefault = checkRes.body.data.profiles.some((p: any) => p.isDefault);
    expect(hasAnyDefault).toBe(false);

    // Boot endpoint now returns hasDefault: false
    const bootRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/boot`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
    });
    expect(bootRes.statusCode).toBe(200);
    expect(bootRes.body.data.hasDefault).toBe(false);
    expect(bootRes.body.data.defaultProfile).toBeNull();
  }, 20000);

  // ---------------------------------------------------------------------------
  // 11. Stale-Heartbeat Handling (>90s = offline)
  // ---------------------------------------------------------------------------
  it('GET /api/v1/devices/:id/status marks device offline when heartbeat >90s stale', async () => {
    const pool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    try {
      // Set last_heartbeat to 3 minutes ago
      await pool.query(
        "UPDATE devices SET last_heartbeat = NOW() - INTERVAL '3 minutes', wifi_connected = TRUE WHERE id = $1",
        [REAL_DEVICE_ID]
      );
    } finally {
      await pool.end();
    }

    const staleStatusRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
    });
    expect(staleStatusRes.statusCode).toBe(200);
    expect(staleStatusRes.body.data.online).toBe(false);
    expect(staleStatusRes.body.data.status).toBe('offline');
    expect(staleStatusRes.body.data.wifi.connected).toBe(false);
    expect(staleStatusRes.body.data.wifi.state).toBe('disconnected');

    // Send a fresh heartbeat
    const freshHb = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/heartbeat`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
      body: {
        wifiConnected: true,
        wifiSsid: 'Fresh_Office_Network',
        wifiRssi: -50,
        oledState: 'idle',
      },
    });
    expect(freshHb.statusCode).toBe(200);

    // Now status should be online
    const freshStatusRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
    });
    expect(freshStatusRes.statusCode).toBe(200);
    expect(freshStatusRes.body.data.online).toBe(true);
    expect(freshStatusRes.body.data.status).toBe('online');
    expect(freshStatusRes.body.data.wifi.connected).toBe(true);
    expect(freshStatusRes.body.data.wifi.state).toBe('connected');
    expect(freshStatusRes.body.data.wifi.connectedSsid).toBe('Fresh_Office_Network');
  }, 20000);

  // ---------------------------------------------------------------------------
  // 12. Identity & Recovery Preservation
  // ---------------------------------------------------------------------------
  it('Recovery claim-token generation preserves device identity, MAC, and serial number', async () => {
    const recoveryRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/claim-token`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
    });
    expect(recoveryRes.statusCode).toBe(200);
    expect(recoveryRes.body.data.claimToken).toBeDefined();

    // Verify durable device record was NOT altered or reset
    const statusRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
    });
    expect(statusRes.body.data.device.deviceId).toBe(REAL_DEVICE_ID);
    expect(statusRes.body.data.device.serialNumber).toBe('NOVA-C3-5C20DC4239FCA9EC');
    expect(statusRes.body.data.device.hardwareModel).toBe('ESP32-C3 Super Mini');
    expect(statusRes.body.data.wifi.macAddress).toBe(REAL_MAC);
  });

  // ---------------------------------------------------------------------------
  // 13. Comprehensive Negative & Security Verification
  // ---------------------------------------------------------------------------
  it('Single-use bootstrap guarantee: replaying bootstrap credential returns 409 BOOTSTRAP_ALREADY_USED', async () => {
    // REAL_BOOTSTRAP_SECRET was already used in section 2
    const replayRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: REAL_DEVICE_ID,
        macAddress: REAL_MAC,
        firmwareVersion: 'v1.0.0-c3',
        bootstrapSecret: REAL_BOOTSTRAP_SECRET,
      },
    });
    expect(replayRes.statusCode).toBe(409);
    expect(replayRes.body.success).toBe(false);
    expect(replayRes.body.error?.code).toBe('BOOTSTRAP_ALREADY_USED');
  });

  it('Cross-user/cross-device isolation: Session for Device A cannot access Device B profiles (403)', async () => {
    const crossRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${OTHER_DEVICE_ID}/wifi-profiles`,
      headers: {
        Authorization: `Bearer ${establishedPairingSessionId}`,
      },
    });
    expect(crossRes.statusCode).toBe(403);
    expect(crossRes.body.success).toBe(false);
    expect(crossRes.body.error?.code).toBe('FORBIDDEN');
  });

  it('Unauthenticated requests are denied on all protected endpoints with 401', async () => {
    const endpoints = [
      `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles/boot`,
      `/api/v1/devices/${REAL_DEVICE_ID}/heartbeat`,
      `/api/v1/devices/${REAL_DEVICE_ID}/device-key/rotate`,
      `/api/v1/devices/${REAL_DEVICE_ID}/claim-token`,
      `/api/v1/devices/${REAL_DEVICE_ID}/notion/disconnect`,
    ];

    for (const ep of endpoints) {
      const res = await simulateRequest({
        method: ep.includes('rotate') || ep.includes('claim-token') || ep.includes('disconnect') || ep.includes('heartbeat') ? 'POST' : 'GET',
        url: ep,
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    }
  });

  it('Raw device bearer keys and passwords never leak in ordinary status or profile responses', async () => {
    const statusRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/status`,
      headers: { Authorization: `Bearer ${issuedDeviceKey}` },
    });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.body.data.deviceKey).toBeUndefined();
    expect(statusRes.body.data.device_secret).toBeUndefined();
    expect(statusRes.body.data.device?.device_secret).toBeUndefined();
    expect(statusRes.body.data.device?.deviceKey).toBeUndefined();

    // Browser session profile view must strictly hide plaintext passwords
    const profRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
    });
    expect(profRes.statusCode).toBe(200);
    for (const p of profRes.body.data.profiles) {
      expect(p.password).toBeUndefined();
      expect(typeof p.hasPassword).toBe('boolean');
    }
  });

  it('Notion OAuth rejects forged or tampered anti-CSRF state token with 400', async () => {
    const tamperedRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/callback',
      body: {
        code: 'fake_oauth_code_123',
        state: `state_${REAL_DEVICE_ID}_forged_signature_attack`,
      },
    });
    expect(tamperedRes.statusCode).toBe(400);
    expect(tamperedRes.body.success).toBe(false);
    expect(tamperedRes.body.error?.code).toBe('INVALID_STATE');
  });

  it('Rate limiter blocks excessive repeated requests with 429 RATE_LIMIT_EXCEEDED', async () => {
    let hitRateLimit = false;
    const spamIp = '198.51.100.99';
    for (let i = 0; i < 25; i++) {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/claim',
        headers: { 'x-forwarded-for': spamIp },
        body: { claimToken: 'bogus_claim_token_spam' },
      });
      if (res.statusCode === 429) {
        hitRateLimit = true;
        expect(res.body.error?.code).toBe('RATE_LIMIT_EXCEEDED');
        break;
      }
    }
    expect(hitRateLimit).toBe(true);

    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      await pool.query('DELETE FROM rate_limits WHERE key = $1', [`claim:${spamIp}`]);
      await pool.query("DELETE FROM rate_limits WHERE key LIKE 'claim:%'");
    } finally {
      await pool.end();
    }
  });

  it('Priority 1: Complete hardware recovery sequence using synthetic test device', async () => {
    const SYNTH_DEVICE_ID = 'nova-c3-synth-recovery-test';
    const SYNTH_MAC = '48:F6:EE:99:AA:BB';
    const SYNTH_BOOTSTRAP_SECRET = 'nova_c3_synth_secret_998877665544332211';
    const synthSecretHash = crypto.createHash('sha256').update(SYNTH_BOOTSTRAP_SECRET).digest('hex');

    // 1. Pre-enroll synthetic device credentials in DB (clearing any prior run artifacts)
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      await pool.query('DELETE FROM notion_authorizations WHERE device_id = $1', [SYNTH_DEVICE_ID]);
      await pool.query('DELETE FROM wifi_profiles WHERE device_id = $1', [SYNTH_DEVICE_ID]);
      await pool.query('DELETE FROM devices WHERE id = $1', [SYNTH_DEVICE_ID]);
      await pool.query(
        `INSERT INTO device_bootstrap_credentials (device_id, mac_address, credential_hash, is_used)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (device_id) DO UPDATE SET credential_hash = $3, is_used = FALSE`,
        [SYNTH_DEVICE_ID, SYNTH_MAC, synthSecretHash]
      );
    } finally {
      await pool.end();
    }

    // 2. Initial bootstrap / registration
    const bootRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: SYNTH_DEVICE_ID,
        macAddress: SYNTH_MAC,
        bootstrapCredential: SYNTH_BOOTSTRAP_SECRET,
        wifiSsid: 'SynthNet',
      },
    });
    expect(bootRes.statusCode).toBe(200);
    expect(bootRes.body.success).toBe(true);
    const synthKeyA = bootRes.body.data.deviceKey;
    const synthClaimToken1 = bootRes.body.data.claimToken;
    expect(synthKeyA).toMatch(/^dkey_/);
    expect(synthClaimToken1).toMatch(/^clm_live_/);

    // 3. User claims device and adds a Wi-Fi profile
    const claimRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: { claimToken: synthClaimToken1 },
    });
    expect(claimRes.statusCode).toBe(200);
    const synthSessionId = claimRes.body.data.pairingSessionId;

    // Create a Wi-Fi profile in vault
    const addProfRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${synthSessionId}` },
      body: {
        ssid: 'SynthNet_Vault',
        password: 'vault_super_secret_password',
        isDefault: true,
      },
    });
    expect(addProfRes.statusCode).toBe(201);

    // Seed Notion auth to verify cloud integrations persist across recovery
    const poolSeed = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      await poolSeed.query(
        `INSERT INTO notion_authorizations (device_id, workspace_name, encrypted_access_token)
         VALUES ($1, 'Synth Workspace', 'enc_mock_token_123')
         ON CONFLICT (device_id) DO UPDATE SET workspace_name = 'Synth Workspace'`,
        [SYNTH_DEVICE_ID]
      );
    } finally {
      await poolSeed.end();
    }

    // 4. Authenticate with synthKeyA (heartbeat)
    const hbResA = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/heartbeat`,
      headers: { Authorization: `Bearer ${synthKeyA}` },
      body: { wifiConnected: true, rssi: -55, oledState: 'idle' },
    });
    expect(hbResA.statusCode).toBe(200);

    // 5. Rotate key to synthKeyB
    const rotRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/device-key/rotate`,
      headers: { Authorization: `Bearer ${synthKeyA}` },
    });
    expect(rotRes.statusCode).toBe(200);
    const synthKeyB = rotRes.body.data.deviceKey;
    expect(synthKeyB).not.toBe(synthKeyA);

    // 6. Confirm synthKeyA is rejected and synthKeyB works
    const hbResOld = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/heartbeat`,
      headers: { Authorization: `Bearer ${synthKeyA}` },
      body: { wifiConnected: true },
    });
    expect(hbResOld.statusCode).toBe(401);

    const hbResNew = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/heartbeat`,
      headers: { Authorization: `Bearer ${synthKeyB}` },
      body: { wifiConnected: true },
    });
    expect(hbResNew.statusCode).toBe(200);

    // 7. Simulate device key revocation / loss
    const pool2 = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      await pool2.query('UPDATE devices SET device_secret = NULL WHERE id = $1', [SYNTH_DEVICE_ID]);
    } finally {
      await pool2.end();
    }

    // Now synthKeyB also fails
    const hbResRevoked = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/heartbeat`,
      headers: { Authorization: `Bearer ${synthKeyB}` },
      body: { wifiConnected: true },
    });
    expect(hbResRevoked.statusCode).toBe(401);

    // 7b. Attempt recovery knowing ONLY the public device ID (no credential) -> MUST be rejected (401)
    const unauthRecover = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/recover`,
      headers: {},
    });
    expect(unauthRecover.statusCode).toBe(401);
    expect(unauthRecover.body.error?.code).toBe('INVALID_BOOTSTRAP_CREDENTIAL');

    // 7c. Attempt recovery with wrong credential -> MUST be rejected (401)
    const wrongCredRecover = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/recover`,
      headers: { 'x-nova-bootstrap': 'wrong_bootstrap_secret_123456789' },
    });
    expect(wrongCredRecover.statusCode).toBe(401);
    expect(wrongCredRecover.body.error?.code).toBe('INVALID_BOOTSTRAP_CREDENTIAL');

    // 8. Recover device via hardware bootstrap credential
    const recoverRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/recover`,
      headers: { 'x-nova-bootstrap': SYNTH_BOOTSTRAP_SECRET },
    });
    expect(recoverRes.statusCode).toBe(200);
    expect(recoverRes.body.success).toBe(true);
    const synthKeyC = recoverRes.body.data.deviceKey;
    expect(synthKeyC).toMatch(/^dkey_/);
    expect(synthKeyC).not.toBe(synthKeyB);

    // 8b. Issue recovery claim token & QR portal URL using the replacement device key
    const recoveryClaimRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/claim-token`,
      headers: { Authorization: `Bearer ${synthKeyC}` },
    });
    expect(recoveryClaimRes.statusCode).toBe(200);
    expect(recoveryClaimRes.body.data.claimToken).toMatch(/^clm_live_/);
    expect(recoveryClaimRes.body.data.portalUrl).toContain('https://buynovastore.vercel.app/?token=');
    expect(recoveryClaimRes.body.data.shortCode).toMatch(/^NOV-/);

    // 9. Confirm new key works and old keys remain rejected
    const hbResRecovered = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/heartbeat`,
      headers: { Authorization: `Bearer ${synthKeyC}` },
      body: { wifiConnected: true },
    });
    expect(hbResRecovered.statusCode).toBe(200);

    // 10. Verify that all Wi-Fi profiles, Notion authorization, and device configuration are preserved intact!
    const vaultRes = await simulateRequest({
      method: 'GET',
      url: `/api/v1/devices/${SYNTH_DEVICE_ID}/wifi-profiles`,
      headers: { Authorization: `Bearer ${synthSessionId}` },
    });
    expect(vaultRes.statusCode).toBe(200);
    expect(vaultRes.body.data.profiles.length).toBe(1);
    expect(vaultRes.body.data.profiles[0].ssid).toBe('SynthNet_Vault');

    const poolCheck = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      const devRows = await poolCheck.query('SELECT serial_number, mac_address FROM devices WHERE id = $1', [SYNTH_DEVICE_ID]);
      expect(devRows.rows.length).toBe(1);
      expect(devRows.rows[0].mac_address).toBe(SYNTH_MAC);

      const notionRows = await poolCheck.query('SELECT workspace_name FROM notion_authorizations WHERE device_id = $1', [SYNTH_DEVICE_ID]);
      expect(notionRows.rows.length).toBe(1);
      expect(notionRows.rows[0].workspace_name).toBe('Synth Workspace');
    } finally {
      await poolCheck.end();
    }

    // 11. Clean up synthetic fixtures
    const pool3 = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      await pool3.query('DELETE FROM devices WHERE id = $1', [SYNTH_DEVICE_ID]);
      await pool3.query('DELETE FROM device_bootstrap_credentials WHERE device_id = $1', [SYNTH_DEVICE_ID]);
      await pool3.query('DELETE FROM wifi_profiles WHERE device_id = $1', [SYNTH_DEVICE_ID]);
      await pool3.query('DELETE FROM pairing_sessions WHERE device_id = $1', [SYNTH_DEVICE_ID]);
      await pool3.query('DELETE FROM claim_tokens WHERE device_id = $1', [SYNTH_DEVICE_ID]);
      await pool3.query('DELETE FROM notion_authorizations WHERE device_id = $1', [SYNTH_DEVICE_ID]);
    } finally {
      await pool3.end();
    }
  });

  it('POST /api/v1/launch-signup validates email, enforces consent, and persists subscribers', async () => {
    // 1. Rejects invalid email
    const invalidEmailRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/launch-signup',
      body: { email: 'not-an-email', consent: true },
    });
    expect(invalidEmailRes.statusCode).toBe(400);
    expect(invalidEmailRes.body.error?.code).toBe('INVALID_EMAIL');

    // 2. Rejects missing consent
    const noConsentRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/launch-signup',
      body: { email: 'maker@example.com', consent: false },
    });
    expect(noConsentRes.statusCode).toBe(400);
    expect(noConsentRes.body.error?.code).toBe('CONSENT_REQUIRED');

    // 3. Honeypot traps bots
    const botRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/launch-signup',
      body: { email: 'bot@spam.com', consent: true, website: 'http://spam.ru' },
    });
    expect(botRes.statusCode).toBe(200);

    // 4. Successful subscriber registration
    const testEmail = `tester_${Date.now()}@novadev.org`;
    const signupRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/launch-signup',
      body: { email: testEmail, consent: true },
    });
    expect(signupRes.statusCode).toBe(200);
    expect(signupRes.body.success).toBe(true);

    // 5. Duplicate signup is handled idempotently
    const dupRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/launch-signup',
      body: { email: testEmail, consent: true },
    });
    expect(dupRes.statusCode).toBe(200);
    expect(dupRes.body.success).toBe(true);

    // Clean up test subscriber
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      await pool.query('DELETE FROM launch_subscribers WHERE email = $1', [testEmail]);
    } finally {
      await pool.end();
    }
  });

  it('Priority 2: Distributed rate limiting creates atomic ledger records in PostgreSQL', async () => {
    const testKey = `test_ratelimit_pg_${Date.now()}`;
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    try {
      const allowed1 = await checkRateLimit(testKey, 2, 60000);
      const allowed2 = await checkRateLimit(testKey, 2, 60000);
      const allowed3 = await checkRateLimit(testKey, 2, 60000);

      expect(allowed1.allowed).toBe(true);
      expect(allowed2.allowed).toBe(true);
      expect(allowed3.allowed).toBe(false);
      expect(allowed3.count).toBe(3);

      const rows = await pool.query<{ key: string; count: number }>('SELECT key, count FROM rate_limits WHERE key = $1', [testKey]);
      expect(rows.rows.length).toBe(1);
      expect(rows.rows[0].count).toBe(3);

      await pool.query('DELETE FROM rate_limits WHERE key = $1', [testKey]);
    } finally {
      await pool.end();
    }
  });

  it('Priority 2: Rate limiter fails closed during database outage for sensitive endpoints, keeps health accessible', async () => {
    const mockErrorPool: any = {
      query: async () => {
        throw new Error('DATABASE_CONNECTION_LOST: connection terminated unexpectedly');
      },
    };

    _setPoolForTesting(mockErrorPool);

    try {
      // 1. checkRateLimit with failClosed: true (default for sensitive endpoints) fails closed
      const sensitiveCheck = await checkRateLimit('sensitive_test_key', 5, 60000, { failClosed: true });
      expect(sensitiveCheck.allowed).toBe(false);
      expect(sensitiveCheck.dbUnavailable).toBe(true);

      // 2. checkRateLimit with failClosed: false (for non-sensitive health endpoints) falls back cleanly
      const publicCheck = await checkRateLimit('public_test_key', 5, 60000, { failClosed: false });
      expect(publicCheck.allowed).toBe(true);
      expect(publicCheck.fallbackUsed).toBe(true);

      // 3. Sensitive endpoint (e.g. bootstrap) returns 503 RATE_LIMIT_SERVICE_UNAVAILABLE
      const bootOutageRes = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/bootstrap',
        body: {
          deviceId: 'nova-test-outage',
          macAddress: '11:22:33:44:55:66',
          bootstrapCredential: 'test_bootstrap_cred',
        },
      });
      expect(bootOutageRes.statusCode).toBe(503);
      expect(bootOutageRes.body.error?.code).toBe('RATE_LIMIT_SERVICE_UNAVAILABLE');

      // 4. Sensitive endpoint (e.g. recover) returns 503 RATE_LIMIT_SERVICE_UNAVAILABLE
      const recoverOutageRes = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/nova-test-outage/recover',
        headers: { 'x-nova-bootstrap': 'test_bootstrap_cred' },
      });
      expect(recoverOutageRes.statusCode).toBe(503);
      expect(recoverOutageRes.body.error?.code).toBe('RATE_LIMIT_SERVICE_UNAVAILABLE');

      // 5. Non-sensitive health check remains available and returns 200 with database disconnected status
      const healthOutageRes = await simulateRequest({
        method: 'GET',
        url: '/api/health',
      });
      expect(healthOutageRes.statusCode).toBe(200);
      expect(healthOutageRes.body.database?.connected).toBe(false);
    } finally {
      // Restore real database pool
      _setPoolForTesting(null);
    }
  });

  it('Priority 2: Concurrent requests are handled atomically by distributed PostgreSQL rate limiter', async () => {
    const concurrentKey = `test_concurrent_${Date.now()}`;
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    try {
      // Fire 10 concurrent requests with maxRequests = 4
      const promises = Array.from({ length: 10 }, () => checkRateLimit(concurrentKey, 4, 60000));
      const results = await Promise.all(promises);

      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(4);
      expect(blockedCount).toBe(6);

      const rows = await pool.query<{ count: number }>('SELECT count FROM rate_limits WHERE key = $1', [concurrentKey]);
      expect(rows.rows.length).toBe(1);
      expect(rows.rows[0].count).toBe(10);
    } finally {
      await pool.query('DELETE FROM rate_limits WHERE key = $1', [concurrentKey]);
      await pool.end();
    }
  });

  it('Priority 2: Counter resets after window expiration', async () => {
    const resetKey = `test_reset_${Date.now()}`;
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    try {
      // Insert pre-expired record (reset_at in the past)
      await pool.query(
        `INSERT INTO rate_limits (key, count, reset_at, updated_at)
         VALUES ($1, 5, NOW() - INTERVAL '5 seconds', NOW())`,
        [resetKey]
      );

      // Next request should reset count to 1 and be allowed
      const result = await checkRateLimit(resetKey, 2, 60000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);

      const rows = await pool.query<{ count: number }>('SELECT count FROM rate_limits WHERE key = $1', [resetKey]);
      expect(rows.rows.length).toBe(1);
      expect(rows.rows[0].count).toBe(1);
    } finally {
      await pool.query('DELETE FROM rate_limits WHERE key = $1', [resetKey]);
      await pool.end();
    }
  });

  it('Priority 2: pruneExpiredRateLimits purges stale records and prevents unbounded growth', async () => {
    const staleKey = `test_stale_${Date.now()}`;
    const freshKey = `test_fresh_${Date.now()}`;
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    try {
      // Insert a stale record (expired 2 hours ago)
      await pool.query(
        `INSERT INTO rate_limits (key, count, reset_at, updated_at)
         VALUES ($1, 10, NOW() - INTERVAL '2 hours', NOW())`,
        [staleKey]
      );

      // Insert a fresh active record (expires in 1 hour)
      await pool.query(
        `INSERT INTO rate_limits (key, count, reset_at, updated_at)
         VALUES ($1, 2, NOW() + INTERVAL '1 hour', NOW())`,
        [freshKey]
      );

      // Prune records older than 30 minutes
      const prunedCount = await pruneExpiredRateLimits(30 * 60 * 1000);
      expect(prunedCount).toBeGreaterThanOrEqual(1);

      // Stale record should be gone
      const staleRows = await pool.query('SELECT key FROM rate_limits WHERE key = $1', [staleKey]);
      expect(staleRows.rows.length).toBe(0);

      // Fresh record should still exist
      const freshRows = await pool.query('SELECT key FROM rate_limits WHERE key = $1', [freshKey]);
      expect(freshRows.rows.length).toBe(1);
    } finally {
      await pool.query('DELETE FROM rate_limits WHERE key IN ($1, $2)', [staleKey, freshKey]);
      await pool.end();
    }
  });

  it('Priority 3: Notion OAuth enforces single-use replay protection (400 STATE_ALREADY_USED)', async () => {
    // 1. Generate legitimate state
    const authRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/authorize',
      body: { deviceId: REAL_DEVICE_ID },
    });
    expect(authRes.statusCode).toBe(200);
    const stateToken = authRes.body.data.stateToken;
    expect(stateToken).toBeDefined();

    // 2. First callback with this state (reaches code exchange; fails gracefully if mock Notion exchange)
    const cb1 = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/callback',
      body: { code: 'test_code_replay_protection', state: stateToken },
    });
    expect([200, 500, 502]).toContain(cb1.statusCode);

    // 3. Second callback with identical state MUST be rejected as replay attack (400 STATE_ALREADY_USED)
    const cb2 = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/callback',
      body: { code: 'test_code_replay_protection', state: stateToken },
    });
    expect(cb2.statusCode).toBe(400);
    expect(cb2.body.error?.code).toBe('STATE_ALREADY_USED');
  });

  it('Priority 3: Notion OAuth rejects session mismatch (403 SESSION_MISMATCH)', async () => {
    // 1. Authorize bound to establishedPairingSessionId
    const authRes = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/authorize',
      headers: { Authorization: `Bearer ${establishedPairingSessionId}` },
      body: { deviceId: REAL_DEVICE_ID },
    });
    expect(authRes.statusCode).toBe(200);
    const stateToken = authRes.body.data.stateToken;

    // 2. Callback with a different session ID
    const cbMismatch = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/callback',
      headers: { Authorization: 'Bearer sess_attacker_session_9999' },
      body: { code: 'test_auth_code_123', state: stateToken },
    });
    expect(cbMismatch.statusCode).toBe(403);
    expect(cbMismatch.body.error?.code).toBe('SESSION_MISMATCH');
  });

  it('Priority 4: Strict CORS origin allowlist rejects arbitrary .vercel.app domains', async () => {
    // Allowed canonical origin
    const prodRes = await simulateRequest({
      method: 'GET',
      url: '/api/health',
      headers: { Origin: 'https://buynovastore.vercel.app' },
    });
    expect(prodRes.headers['access-control-allow-origin']).toBe('https://buynovastore.vercel.app');
    expect(prodRes.headers['access-control-allow-credentials']).toBe('true');

    // Allowed local origin
    const localRes = await simulateRequest({
      method: 'GET',
      url: '/api/health',
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(localRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    // Allowed preview origin
    const previewRes = await simulateRequest({
      method: 'GET',
      url: '/api/health',
      headers: { Origin: 'https://nova-preview-test-shriyash05s-projects.vercel.app' },
    });
    expect(previewRes.headers['access-control-allow-origin']).toBe('https://nova-preview-test-shriyash05s-projects.vercel.app');

    // Arbitrary malicious .vercel.app origin MUST NOT be echoed or allowed credentials
    const evilVercelRes = await simulateRequest({
      method: 'GET',
      url: '/api/health',
      headers: { Origin: 'https://evil-attacker.vercel.app' },
    });
    expect(evilVercelRes.headers['access-control-allow-origin']).toBe('https://buynovastore.vercel.app');
    expect(evilVercelRes.headers['access-control-allow-credentials']).toBeUndefined();

    // Preflight OPTIONS for malicious origin returns 403
    const optionsEvil = await simulateRequest({
      method: 'OPTIONS',
      url: '/api/health',
      headers: { Origin: 'https://evil-attacker.vercel.app' },
    });
    expect(optionsEvil.statusCode).toBe(403);

    // Firmware / non-browser request without Origin header
    const firmwareRes = await simulateRequest({
      method: 'GET',
      url: '/api/health',
    });
    expect(firmwareRes.headers['access-control-allow-origin']).toBe('*');
  });
});
