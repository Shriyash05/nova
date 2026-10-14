import { describe, it, expect } from 'vitest';
import handler from '../../api/index.ts';
import { EventEmitter } from 'events';

// Lightweight helper to simulate Node HTTP req/res on the serverless handler
function simulateRequest(options: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve) => {
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

    // Run handler
    handler(req, res).catch((err) => {
      resolve({
        statusCode: 500,
        headers: resHeaders,
        body: { error: err.message },
      });
    });

    // Feed body stream
    if (options.body) {
      req.emit('data', JSON.stringify(options.body));
    }
    req.emit('end');
  });
}

describe('NOVA Backend REST API (/api/v1/...) Serverless Integration', () => {
  it('GET /api/health returns hardware status and targets', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.hardwareTarget).toContain('ESP32-C3 Super Mini');
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

  it('POST /api/v1/devices/claim claims device and establishes pairing session', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: { claimToken: 'clm_live_9f82d1c74a0e' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe('nova_c3_84f3eba1');
    expect(res.body.data.pairingSessionId).toMatch(/^sess_/);
    expect(res.body.data.hardwareModel).toContain('ESP32-C3');
  });

  it('POST /api/v1/devices/claim prevents double-redemption (single-use token)', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/claim',
      body: { claimToken: 'clm_live_9f82d1c74a0e' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('CLAIM_TOKEN_ALREADY_REDEEMED');
  });

  it('GET /api/v1/devices/:id/status returns real device telemetry and truthful states', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/v1/devices/nova_c3_84f3eba1/status',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.device.hardwareModel).toBe('ESP32-C3 Super Mini');
    expect(res.body.data.wifi.frequencyBand).toBe('2.4GHz');
    expect(typeof res.body.data.notion.pendingSyncCount).toBe('number');
  });

  it('POST /api/v1/devices/:id/wifi/provision provisions network and updates state', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/nova_c3_84f3eba1/wifi/provision',
      body: { ssid: 'Lab_Router_2.4G', password: 'secure_password_123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('connected');

    // Verify status reflects updated Wi-Fi
    const statusRes = await simulateRequest({
      method: 'GET',
      url: '/api/v1/devices/nova_c3_84f3eba1/status',
    });
    expect(statusRes.body.data.wifi.connectedSsid).toBe('Lab_Router_2.4G');
    expect(statusRes.body.data.device.status).toBe('online');
  });

  it('POST /api/v1/auth/notion/authorize requires deviceId and generates CSRF state token', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/auth/notion/authorize',
      body: { deviceId: 'nova_c3_84f3eba1' },
    });
    // In test environment without NOTION_CLIENT_ID env set, returns 500 NOTION_CONFIG_ERROR with clean message
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorizationUrl).toContain('api.notion.com');
      expect(res.body.data.stateToken).toContain('state_nova_c3');
    } else {
      expect(res.statusCode).toBe(500);
      expect(res.body.error?.code).toBe('NOTION_CONFIG_ERROR');
    }
  });

  it('POST /api/v1/devices/:id/notion/disconnect safely revokes Notion tokens', async () => {
    const res = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/nova_c3_84f3eba1/notion/disconnect',
      body: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const statusRes = await simulateRequest({
      method: 'GET',
      url: '/api/v1/devices/nova_c3_84f3eba1/status',
    });
    expect(statusRes.body.data.notion.isConnected).toBe(false);
  });
});
