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
    req.headers = { host: 'localhost:5173', ...(options.headers || {}) };

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

describe('NOVA Backend Real Database & Hardware Integration API', () => {
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

  let generatedClaimToken = '';

  it('POST /api/v1/devices/bootstrap registers hardware and creates 15-min claim token', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova_c3_84f3eba1',
        serialNumber: 'NOVA-C3-84F3EBA1',
        macAddress: '84:F3:EB:A1:0C:4A',
        wifiSsid: 'Home_2.4G',
        ipAddress: '192.168.1.188',
        rssi: -54,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe('nova_c3_84f3eba1');
    expect(res.body.data.claimToken).toMatch(/^clm_live_/);
    expect(res.body.data.shortCode).toMatch(/^NOV-/);
    generatedClaimToken = res.body.data.claimToken;
  });

  it('POST /api/v1/devices/claim rejects empty token', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_CLAIM_CODE');
  });

  it('POST /api/v1/devices/claim redeems bootstrap token and creates pairing session', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: { claimToken: generatedClaimToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe('nova_c3_84f3eba1');
    expect(res.body.data.pairingSessionId).toMatch(/^sess_/);
  });

  it('POST /api/v1/devices/claim rejects already-redeemed token (single-use guarantee)', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: { claimToken: generatedClaimToken },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('CLAIM_TOKEN_ALREADY_REDEEMED');
  });

  it('GET /api/v1/devices/:id/status returns real device telemetry from PostgreSQL', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/v1/devices/nova_c3_84f3eba1/status',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.device.hardwareModel).toBe('ESP32-C3 Super Mini');
    expect(res.body.data.wifi.frequencyBand).toBe('2.4GHz');
    expect(res.body.data.wifi.connectedSsid).toBe('Home_2.4G');
    expect(typeof res.body.data.notion.pendingSyncCount).toBe('number');
  });

  it('POST /api/v1/devices/:id/sync/test returns structured error when Notion is not connected', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/nova_c3_84f3eba1/sync/test',
      body: {
        idempotencyKey: 'test_key_123',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('NOTION_NOT_CONNECTED');
  });

  it('POST /api/v1/auth/notion/authorize returns configured Notion OAuth URL', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/authorize',
      body: {
        deviceId: 'nova_c3_84f3eba1',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authorizationUrl).toContain('client_id=3f9d872b-594c-81fe-b945-00373d142af3');
    expect(res.body.data.authorizationUrl).toContain('redirect_uri=https%3A%2F%2Fbuynovastore.vercel.app%2F');
    expect(res.body.data.stateToken).toMatch(/^state_nova_c3_84f3eba1_/);
  });

  it('POST /api/v1/devices/:id/notion/disconnect safely disconnects Notion', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/nova_c3_84f3eba1/notion/disconnect',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.disconnected).toBe(true);
  });
});
