import { describe, it, expect, beforeAll } from 'vitest';
import handler, { ensureUserTables } from '../api/index.ts';
import crypto from 'crypto';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const { Pool } = pg;

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

function simulateRequest(options: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve) => {
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

    handler(req, res).catch((err: any) => {
      resolve({
        statusCode: 500,
        headers: resHeaders,
        body: { error: err.message },
      });
    });
  });
}

describe('Challenger E1: Phase E Backend Hardening Adversarial Stress Suite', { timeout: 45000 }, () => {
  const TEST_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';
  const TEST_MAC = '48:F6:EE:17:34:D8';
  const TEST_BOOTSTRAP = 'nova_c3_5c20dc4239fca9ec_boot_8f9c2d1e4a7b3c6d';
  const OTHER_DEVICE_ID = 'nova-c3-other99887766';
  const OTHER_BOOTSTRAP = 'nova_c3_other99887766_boot_sec_11223344';

  let testDeviceKey = '';
  let otherDeviceKey = '';

  beforeAll(async () => {
    if (!DB_URL) {
      throw new Error('DATABASE_URL must be configured.');
    }
    const pool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    try {
      await pool.query(
        `UPDATE device_bootstrap_credentials SET is_used = FALSE WHERE device_id IN ($1, $2)`,
        [TEST_DEVICE_ID, OTHER_DEVICE_ID]
      );
      await ensureUserTables();
    } finally {
      await pool.end();
    }

    // Bootstrap test devices to acquire genuine deviceKeys
    const b1 = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: TEST_DEVICE_ID,
        macAddress: TEST_MAC,
        bootstrapCredential: TEST_BOOTSTRAP,
        recovery: true,
      },
    });
    if (b1.statusCode === 200) {
      testDeviceKey = b1.body.data.deviceKey;
    }

    const b2 = await simulateRequest({
      method: 'POST',
      url: '/api/v1/devices/bootstrap',
      body: {
        deviceId: OTHER_DEVICE_ID,
        macAddress: '48:F6:EE:99:88:77',
        bootstrapCredential: OTHER_BOOTSTRAP,
        recovery: true,
      },
    });
    if (b2.statusCode === 200) {
      otherDeviceKey = b2.body.data.deviceKey;
    }
  });

  // ===========================================================================
  // Section 1: Google OAuth Flow Adversarial Probes
  // ===========================================================================
  describe('1. Google Auth Flow Adversarial Vectors', () => {
    it('probes empty payload: rejects with 401 INVALID_CREDENTIALS', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: {},
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('probes legacy raw email injection: rejects with 401 INVALID_CREDENTIALS', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: { email: 'victim@nova.io' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('probes whitespace and newline credentials: rejects with 401 INVALID_CREDENTIALS', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: { credential: '   \r\n\t  ' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('probes non-string types in credential (number, boolean, object, array): rejects with 401', async () => {
      for (const invalidCred of [12345, true, false, { token: 'abc' }, ['cred1', 'cred2']]) {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: { credential: invalidCred as any },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('probes SQL injection strings in credential: fails verification safely without DB syntax error', async () => {
      const sqlInjections = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "admin'--",
        "1 UNION SELECT 1, 2, 3",
      ];
      for (const sqli of sqlInjections) {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: { credential: sqli },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('probes oversized credential payload (128 KB): rejects cleanly without crash', async () => {
      const oversizedCred = 'A'.repeat(128 * 1024);
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: { credential: oversizedCred },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('probes unverified email claim from Google (email_verified: false): rejects with 401', async () => {
      const origFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          email: 'unverified@gmail.com',
          email_verified: false,
          name: 'Unverified Guy',
          sub: 'goog_unverified_1',
        }),
      } as any);

      try {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: { credential: 'mock_unverified_token' },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
        expect(res.body.error?.message).toContain('not verified');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('probes string boolean unverified claim (email_verified: "false"): rejects with 401', async () => {
      const origFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          email: 'unverified2@gmail.com',
          email_verified: 'false',
          name: 'String False',
          sub: 'goog_unverified_2',
        }),
      } as any);

      try {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: { credential: 'mock_string_false_token' },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('probes missing or malformed email from Google tokeninfo: rejects with 401', async () => {
      const origFetch = global.fetch;
      try {
        // Missing email
        global.fetch = async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            email_verified: true,
            name: 'No Email Guy',
            sub: 'goog_no_email',
          }),
        } as any);

        const res1 = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: { credential: 'mock_no_email_token' },
        });
        expect(res1.statusCode).toBe(401);
        expect(res1.body.error?.code).toBe('INVALID_CREDENTIALS');

        // Email without @
        global.fetch = async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            email: 'malformed_email_no_at',
            email_verified: true,
            name: 'Malformed Email',
            sub: 'goog_bad_email',
          }),
        } as any);

        const res2 = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: { credential: 'mock_bad_email_token' },
        });
        expect(res2.statusCode).toBe(401);
        expect(res2.body.error?.code).toBe('INVALID_CREDENTIALS');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('probes Google tokeninfo 500 error / network exception: rejects with 401', async () => {
      const origFetch = global.fetch;
      try {
        global.fetch = async () => {
          throw new Error('Google tokeninfo endpoint timed out');
        };

        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: { credential: 'mock_network_fail_token' },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('probes spoofed userId injection in payload: authenticates strictly by verified Google email', async () => {
      const origFetch = global.fetch;
      const verifiedEmail = `verified_victim_${Date.now()}@gmail.com`;
      const verifiedSub = `goog_sub_vic_${Date.now()}`;
      const expectedUserId = `usr_${crypto.createHash('sha256').update(verifiedEmail).digest('hex').substring(0, 16)}`;

      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          email: verifiedEmail,
          email_verified: true,
          name: 'Verified Target',
          sub: verifiedSub,
        }),
      } as any);

      try {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/auth/google',
          body: {
            credential: 'valid_mock_token_spoof_test',
            userId: 'usr_admin_spoofed',
            id: 'usr_admin_spoofed',
          },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.id).toBe(expectedUserId);
        expect(res.body.data.user.id).not.toBe('usr_admin_spoofed');

        // Cleanup
        const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
        try {
          await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [expectedUserId]);
          await pool.query('DELETE FROM users WHERE id = $1', [expectedUserId]);
        } finally {
          await pool.end();
        }
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  // ===========================================================================
  // Section 2: User Device IDOR Protection Adversarial Probes
  // ===========================================================================
  describe('2. User Device IDOR Protection Vectors', () => {
    let aliceId: string;
    let bobId: string;
    let aliceSession: string;
    let bobSession: string;
    let expiredSession: string;

    beforeAll(async () => {
      const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
      const now = Date.now();
      aliceId = `usr_alice_${now}`;
      bobId = `usr_bob_${now}`;
      aliceSession = `usess_alice_${now}`;
      bobSession = `usess_bob_${now}`;
      expiredSession = `usess_expired_${now}`;

      try {
        await pool.query(
          `INSERT INTO users (id, email, name, updated_at) VALUES
           ($1, $2, 'Alice Challenger', NOW()),
           ($3, $4, 'Bob Challenger', NOW())`,
          [aliceId, `${aliceId}@nova.test`, bobId, `${bobId}@nova.test`]
        );
        await pool.query(
          `INSERT INTO user_sessions (id, user_id, expires_at) VALUES
           ($1, $2, NOW() + INTERVAL '1 day'),
           ($3, $4, NOW() + INTERVAL '1 day'),
           ($5, $2, NOW() - INTERVAL '1 hour')`,
          [aliceSession, aliceId, bobSession, bobId, expiredSession]
        );
        // Link TEST_DEVICE_ID to Alice
        await pool.query(
          `INSERT INTO user_devices (user_id, device_id, label, is_primary) VALUES
           ($1, $2, 'Alice Keychain', TRUE)
           ON CONFLICT (user_id, device_id) DO NOTHING`,
          [aliceId, TEST_DEVICE_ID]
        );
      } finally {
        await pool.end();
      }
    });

    it('GET /api/v1/user/devices: rejects missing or malformed Authorization headers', async () => {
      // Missing
      const r1 = await simulateRequest({ method: 'GET', url: '/api/v1/user/devices' });
      expect(r1.statusCode).toBe(401);
      expect(r1.body.error?.code).toBe('UNAUTHORIZED');

      // Empty Bearer
      const r2 = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: { Authorization: 'Bearer   ' },
      });
      expect(r2.statusCode).toBe(401);

      // Basic Auth
      const r3 = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      expect(r3.statusCode).toBe(401);
    });

    it('GET /api/v1/user/devices: rejects non-existent and expired session tokens', async () => {
      // Non-existent
      const r1 = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: { Authorization: 'Bearer usess_nonexistent_token_999' },
      });
      expect(r1.statusCode).toBe(401);
      expect(r1.body.error?.code).toBe('UNAUTHORIZED');

      // Expired
      const r2 = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: { Authorization: `Bearer ${expiredSession}` },
      });
      expect(r2.statusCode).toBe(401);
      expect(r2.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/user/devices: blocks cross-user IDOR via header x-nova-user-id with 403', async () => {
      const res = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: {
          Authorization: `Bearer ${bobSession}`,
          'x-nova-user-id': aliceId,
        },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/user/devices: blocks cross-user IDOR via query parameter ?userId= with 403', async () => {
      const res = await simulateRequest({
        method: 'GET',
        url: `/api/v1/user/devices?userId=${aliceId}`,
        headers: { Authorization: `Bearer ${bobSession}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/user/devices: blocks SQL injection in query parameter ?userId=', async () => {
      const res = await simulateRequest({
        method: 'GET',
        url: `/api/v1/user/devices?userId=${encodeURIComponent("' OR 1=1 --")}`,
        headers: { Authorization: `Bearer ${bobSession}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/user/devices: returns own claimed devices cleanly for legitimate session', async () => {
      const res = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: { Authorization: `Bearer ${aliceSession}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(aliceId);
      expect(res.body.data.devices.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.devices.some((d: any) => d.id === TEST_DEVICE_ID)).toBe(true);
    });

    it('POST /api/v1/user/devices/link: rejects unauthenticated link attempts with 401', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/user/devices/link',
        body: { deviceId: TEST_DEVICE_ID },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/user/devices/link: blocks cross-user linking attempt with 403 FORBIDDEN', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/user/devices/link',
        headers: { Authorization: `Bearer ${bobSession}` },
        body: { userId: aliceId, deviceId: OTHER_DEVICE_ID },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/user/devices/link: rejects linking non-existent device with 404', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/user/devices/link',
        headers: { Authorization: `Bearer ${aliceSession}` },
        body: { deviceId: 'nova-c3-nonexistent_device_99999' },
      });
      expect(res.statusCode).toBe(404);
      expect(res.body.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('POST /api/v1/user/devices/link: rejects SQL injection in deviceId with 404', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/user/devices/link',
        headers: { Authorization: `Bearer ${aliceSession}` },
        body: { deviceId: "nova-c3-test' OR '1'='1" },
      });
      expect(res.statusCode).toBe(404);
      expect(res.body.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('POST /api/v1/user/devices/link: idempotently links device and updates label', async () => {
      // 1. Link OTHER_DEVICE_ID to Bob
      const r1 = await simulateRequest({
        method: 'POST',
        url: '/api/v1/user/devices/link',
        headers: { Authorization: `Bearer ${bobSession}` },
        body: { deviceId: OTHER_DEVICE_ID, label: 'Bob Initial Label' },
      });
      expect(r1.statusCode).toBe(200);
      expect(r1.body.data.linked).toBe(true);

      // 2. Re-link same device to Bob with updated label (Idempotency test)
      const r2 = await simulateRequest({
        method: 'POST',
        url: '/api/v1/user/devices/link',
        headers: { Authorization: `Bearer ${bobSession}` },
        body: { deviceId: OTHER_DEVICE_ID, label: 'Bob Updated Label' },
      });
      expect(r2.statusCode).toBe(200);
      expect(r2.body.data.linked).toBe(true);
    });
  });

  // ===========================================================================
  // Section 3: Device Heartbeat Idempotency & Security Adversarial Probes
  // ===========================================================================
  describe('3. Device Heartbeat Idempotency & Security Vectors', () => {
    it('heartbeat: rejects missing authentication with 401', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        body: { wifiConnected: true },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('heartbeat: rejects forged / invalid Bearer credential with 401', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        headers: { Authorization: 'Bearer forged_device_key_12345' },
        body: { wifiConnected: true },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('heartbeat: blocks cross-device spoofing (Device B key used for Device A) with 403', async () => {
      if (!otherDeviceKey) return;
      const res = await simulateRequest({
        method: 'POST',
        url: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        headers: { Authorization: `Bearer ${otherDeviceKey}` },
        body: { wifiConnected: true },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('heartbeat: rejects Wi-Fi passwords / secrets in telemetry payload with 400', async () => {
      if (!testDeviceKey) return;
      for (const secretKey of ['password', 'wifiPassword', 'passphrase']) {
        const res = await simulateRequest({
          method: 'POST',
          url: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
          headers: { Authorization: `Bearer ${testDeviceKey}` },
          body: {
            wifiConnected: true,
            [secretKey]: 'SuperSecretWiFiPassword123!',
          },
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error?.code).toBe('INVALID_TELEMETRY');
      }
    });

    it('heartbeat: handles negative queueCount by clamping to 0', async () => {
      if (!testDeviceKey) return;
      const res = await simulateRequest({
        method: 'POST',
        url: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        headers: { Authorization: `Bearer ${testDeviceKey}` },
        body: {
          wifiConnected: true,
          queueCount: -50,
          oledState: 'idle',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.queueCount).toBe(0);
    });

    it('heartbeat: executes 10 rapid concurrent requests idempotently with zero failures', async () => {
      if (!testDeviceKey) return;
      const requests = Array.from({ length: 10 }, (_, i) =>
        simulateRequest({
          method: 'POST',
          url: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
          headers: { Authorization: `Bearer ${testDeviceKey}` },
          body: {
            wifiConnected: true,
            rssi: -55 - (i % 5),
            oledState: 'idle',
            queueCount: i,
          },
        })
      );

      const results = await Promise.all(requests);
      for (const res of results) {
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.acknowledged).toBe(true);
        expect(res.body.data.status).toBe('online');
      }
    });

    it('heartbeat: supports direct /api/v1/devices/heartbeat route with x-nova-device-id header', async () => {
      if (!testDeviceKey) return;
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/heartbeat',
        headers: {
          Authorization: `Bearer ${testDeviceKey}`,
          'x-nova-device-id': TEST_DEVICE_ID,
        },
        body: {
          wifiConnected: true,
          rssi: -62,
          oledState: 'processing',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deviceId).toBe(TEST_DEVICE_ID);
      expect(res.body.data.oledState).toBe('processing');
    });
  });
});
