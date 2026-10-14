import { describe, it, expect, beforeAll } from 'vitest';
import handler from '../../api/index.ts';
import healthHandler from '../../api/health.ts';
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

describe('NOVA Real ESP32-C3 Firmware Integration & Security Suite', () => {
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
    for (let i = 0; i < 25; i++) {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/claim',
        body: { claimToken: 'bogus_claim_token_spam' },
      });
      if (res.statusCode === 429) {
        hitRateLimit = true;
        expect(res.body.error?.code).toBe('RATE_LIMIT_EXCEEDED');
        break;
      }
    }
    expect(hitRateLimit).toBe(true);
  });
});
