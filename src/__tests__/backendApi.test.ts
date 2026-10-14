import { describe, it, expect, beforeAll } from 'vitest';
import handler from '../../api/index.ts';
import healthHandler from '../../api/health.ts';
import { EventEmitter } from 'events';

// Set test environment database connection to the live Supabase pooler
beforeAll(() => {
  process.env.DATABASE_URL = 'postgres://nova_app.jcwlxiujyjlessgfwjgu:REDACTED_HISTORICAL_SECRET@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
  process.env.NOTION_ENCRYPTION_KEY = '349012380b9249f86678fb09da0f43daf380cba2612233e6a565eb73c7f00aaf';
  process.env.NOTION_CLIENT_ID = '3f9d872b-594c-81fe-b945-00373d142af3';
  process.env.NOTION_REDIRECT_URI = 'https://buynovastore.vercel.app/';
  process.env.NOVA_BOOTSTRAP_SECRET = 'nova_sec_c3_hardware_bootstrap_2026';
});

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
    const req = new EventEmitter() as any;
    req.method = options.method;
    req.url = options.url;
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

    if (options.body) {
      req.emit('data', JSON.stringify(options.body));
    }
    req.emit('end');
  });
}

describe('NOVA Real ESP32-C3 Firmware Integration & Security Suite', () => {
  const REAL_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';
  const REAL_MAC = '48:F6:EE:17:34:D8';
  const BOOTSTRAP_SECRET = 'nova_sec_c3_hardware_bootstrap_2026';

  let generatedClaimToken = '';
  let issuedDeviceKey = '';
  let establishedPairingSessionId = '';

  // Other device for cross-device authorization checks
  const OTHER_DEVICE_ID = 'nova-c3-other99887766';
  let otherDeviceKey = '';

  it('GET /api/health standalone handler returns database connectivity', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
      handlerFn: healthHandler,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database?.status).toBe('connected');
    expect(res.body.hardware?.chipset).toContain('ESP32-C3 Super Mini');
  });

  it('GET /api/health returns hardware status and database connectivity', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.hardwareTarget?.microcontroller).toContain('ESP32-C3 Super Mini');
    expect(res.body.database?.connected).toBe(true);
  });

  it('POST /api/v1/devices/bootstrap rejects unauthenticated enrollment without secret', async () => {
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

  it('POST /api/v1/devices/bootstrap rejects missing deviceId or macAddress', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        bootstrapSecret: BOOTSTRAP_SECRET,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_DEVICE_ID');
  });

  it('POST /api/v1/devices/bootstrap registers real hardware and creates claim token + deviceKey', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: REAL_DEVICE_ID,
        macAddress: REAL_MAC,
        firmwareVersion: 'v1.0.0-c3',
        bootstrapSecret: BOOTSTRAP_SECRET,
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
        bootstrapSecret: BOOTSTRAP_SECRET,
      },
    });
    expect(res.statusCode).toBe(200);
    otherDeviceKey = res.body.data.deviceKey;
  });

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
    expect(res.body.data.device.oledState).toBe('pairing_qr');
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
  });

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
    // 1. Without auth
    const unauthRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/sync/test`,
      body: { idempotencyKey: 'test_key_sync_1' },
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. With auth
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
    // 1. Without auth
    const unauthRes = await simulateRequest({
      method: 'POST',
      url: `/api/v1/devices/${REAL_DEVICE_ID}/notion/disconnect`,
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. With auth
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
