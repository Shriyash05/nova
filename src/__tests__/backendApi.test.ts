import { describe, it, expect, beforeAll } from 'vitest';
import handler from '../../api/index.ts';
import healthHandler from '../../api/health.ts';
import pg from 'pg';

const { Pool } = pg;

// Set test environment database connection to the live Supabase pooler
const DB_URL = 'postgres://nova_app.jcwlxiujyjlessgfwjgu:REDACTED_HISTORICAL_SECRET@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

beforeAll(async () => {
  process.env.DATABASE_URL = DB_URL;
  process.env.NOTION_ENCRYPTION_KEY = '349012380b9249f86678fb09da0f43daf380cba2612233e6a565eb73c7f00aaf';
  process.env.NOTION_CLIENT_ID = '3f9d872b-594c-81fe-b945-00373d142af3';
  process.env.NOTION_REDIRECT_URI = 'https://buynovastore.vercel.app/';
  process.env.NOVA_BOOTSTRAP_SECRET = 'nova_sec_c3_hardware_bootstrap_2026';

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
    expect(res.body.success).toBe(true);
    expect(res.body.data.authorizationUrl).toContain('client_id=3f9d872b-594c-81fe-b945-00373d142af3');
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
});
