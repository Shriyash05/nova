/**
 * Phase E Remediated Backend Adversarial Penetration Challenge Suite
 * Challenger: challenger_e3
 * Role: critic, specialist
 *
 * Empirical verification of three critical security invariants:
 * 1. POST /api/v1/devices/claim: Raw device IDs strictly return 400 (NO claim bypass)
 * 2. GET /api/v1/user/devices: Device pairing tokens strictly return 401 (NO session elevation)
 * 3. POST /api/v1/auth/google: Mismatched token audience (aud) strictly returns 401 (NO confused deputy)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import handler, { ensureUserTables, getUserIdFromSession } from '../api/index.ts';
import crypto from 'crypto';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const { Pool } = pg;

// Load local testing environment variables if not already set
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

describe('Challenger E3: Remediated Phase E Security Invariant Verification', { timeout: 60000 }, () => {
  const TEST_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';
  const OTHER_DEVICE_ID = 'nova-c3-other99887766';
  let pool: pg.Pool;

  beforeAll(async () => {
    if (!DB_URL) {
      throw new Error('DATABASE_URL must be configured.');
    }
    pool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
    });
    await ensureUserTables();
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  // ===========================================================================
  // Requirement 1: Probe POST /devices/claim: Confirm raw device IDs strictly return 400
  // ===========================================================================
  describe('1. Device Claim Flow — Raw Device ID Bypass Prevention', () => {
    it('strictly returns 400 INVALID_CLAIM_CODE when raw TEST_DEVICE_ID is supplied as claimToken', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/claim',
        body: {
          claimToken: TEST_DEVICE_ID,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('INVALID_CLAIM_CODE');
      expect(res.body.error?.message).toBe('No claim record matches this claim code.');
    });

    it('strictly returns 400 INVALID_CLAIM_CODE when raw TEST_DEVICE_ID is supplied as shortCode', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/claim',
        body: {
          shortCode: TEST_DEVICE_ID,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('INVALID_CLAIM_CODE');
    });

    it('strictly returns 400 INVALID_CLAIM_CODE when OTHER_DEVICE_ID is supplied', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/devices/claim',
        body: {
          claimToken: OTHER_DEVICE_ID,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('INVALID_CLAIM_CODE');
    });

    it('strictly returns 400 when empty, whitespace, or missing claimToken is supplied', async () => {
      const emptyBodies = [
        {},
        { claimToken: '' },
        { claimToken: '   ' },
        { shortCode: ' \t\r\n ' },
        { claimToken: null },
      ];

      for (const b of emptyBodies) {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/devices/claim',
          body: b as any,
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error?.code).toBe('INVALID_CLAIM_CODE');
      }
    });

    it('strictly returns 400 when SQL injection payload targeting devices table is supplied as claimToken', async () => {
      const sqliPayloads = [
        `${TEST_DEVICE_ID}' OR '1'='1`,
        `' UNION SELECT * FROM devices --`,
        `nova-c3-5c20dc4239fca9ec; DROP TABLE pairing_sessions; --`,
      ];

      for (const payload of sqliPayloads) {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/devices/claim',
          body: { claimToken: payload },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error?.code).toBe('INVALID_CLAIM_CODE');
      }
    });

    it('allows redemption ONLY when an authentic, active claim token exists in claim_tokens', async () => {
      const legitimateToken = `clm_test_${crypto.randomBytes(8).toString('hex')}`;
      const shortCode = crypto.randomBytes(3).toString('hex').toUpperCase();

      // Insert authentic 15-minute claim token
      await pool.query(
        `INSERT INTO claim_tokens (token, device_id, short_code, expires_at, is_redeemed)
         VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', FALSE)`,
        [legitimateToken, TEST_DEVICE_ID, shortCode]
      );

      try {
        // First claim: should succeed with 200
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/devices/claim',
          body: { claimToken: legitimateToken },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.deviceId).toBe(TEST_DEVICE_ID);
        expect(res.body.data.pairingSessionId).toBeDefined();
        expect(res.body.data.pairingSessionId.startsWith('sess_')).toBe(true);

        // Second claim attempt: should be rejected as already redeemed
        const res2 = await simulateRequest({
          method: 'POST',
          url: '/api/v1/devices/claim',
          body: { claimToken: legitimateToken },
        });

        expect(res2.statusCode).toBe(400);
        expect(res2.body.error?.code).toBe('CLAIM_TOKEN_ALREADY_REDEEMED');
      } finally {
        await pool.query('DELETE FROM pairing_sessions WHERE claim_token = $1', [legitimateToken]);
        await pool.query('DELETE FROM claim_tokens WHERE token = $1', [legitimateToken]);
      }
    });

    it('strictly returns 410 CLAIM_TOKEN_EXPIRED when claim token has expired', async () => {
      const expiredToken = `clm_expired_${crypto.randomBytes(8).toString('hex')}`;

      await pool.query(
        `INSERT INTO claim_tokens (token, device_id, short_code, expires_at, is_redeemed)
         VALUES ($1, $2, 'EXPRD1', NOW() - INTERVAL '5 minutes', FALSE)`,
        [expiredToken, TEST_DEVICE_ID]
      );

      try {
        const res = await simulateRequest({
          method: 'POST',
          url: '/api/v1/devices/claim',
          body: { claimToken: expiredToken },
        });

        expect(res.statusCode).toBe(410);
        expect(res.body.error?.code).toBe('CLAIM_TOKEN_EXPIRED');
      } finally {
        await pool.query('DELETE FROM claim_tokens WHERE token = $1', [expiredToken]);
      }
    });
  });

  // ===========================================================================
  // Requirement 2: Probe GET /user/devices with device pairing tokens: Confirm 401 rejection
  // ===========================================================================
  describe('2. User Session Elevation — Pairing Token Isolation', () => {
    const testUserId = `usr_e3_test_${Date.now()}`;
    const testUserEmail = `${testUserId}@challenger.test`;
    const validUserSession = `usess_e3_${Date.now()}`;
    const devicePairingSession = `sess_pairing_probe_${Date.now()}`;

    beforeAll(async () => {
      // Create user
      await pool.query(
        `INSERT INTO users (id, email, name, updated_at) VALUES ($1, $2, 'Challenger User', NOW())`,
        [testUserId, testUserEmail]
      );

      // Create genuine user session in user_sessions
      await pool.query(
        `INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 day')`,
        [validUserSession, testUserId]
      );

      // Link TEST_DEVICE_ID to testUserId in user_devices
      await pool.query(
        `INSERT INTO user_devices (user_id, device_id, label, is_primary)
         VALUES ($1, $2, 'Challenger Keychain', TRUE)
         ON CONFLICT (user_id, device_id) DO NOTHING`,
        [testUserId, TEST_DEVICE_ID]
      );

      // Create a device pairing session in pairing_sessions (simulating device-side pairing token)
      await pool.query(
        `INSERT INTO pairing_sessions (id, device_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
        [devicePairingSession, TEST_DEVICE_ID]
      );
    });

    afterAll(async () => {
      await pool.query('DELETE FROM pairing_sessions WHERE id = $1', [devicePairingSession]);
      await pool.query('DELETE FROM user_devices WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    });

    it('confirms getUserIdFromSession returns null for device pairing tokens', async () => {
      const resolvedFromPairing = await getUserIdFromSession(devicePairingSession);
      expect(resolvedFromPairing).toBeNull();

      const resolvedFromUserSess = await getUserIdFromSession(validUserSession);
      expect(resolvedFromUserSess).toBe(testUserId);
    });

    it('strictly returns 401 UNAUTHORIZED when GET /api/v1/user/devices is called with a device pairing token', async () => {
      const res = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: {
          Authorization: `Bearer ${devicePairingSession}`,
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
      expect(res.body.error?.message).toContain('Invalid or expired user session token');
      expect(res.body.data).toBeUndefined();
    });

    it('strictly returns 401 UNAUTHORIZED when POST /api/v1/user/devices/link is called with a device pairing token', async () => {
      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/user/devices/link',
        headers: {
          Authorization: `Bearer ${devicePairingSession}`,
        },
        body: {
          deviceId: OTHER_DEVICE_ID,
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('succeeds with 200 when GET /api/v1/user/devices is called with authentic user session', async () => {
      const res = await simulateRequest({
        method: 'GET',
        url: '/api/v1/user/devices',
        headers: {
          Authorization: `Bearer ${validUserSession}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(testUserId);
      expect(res.body.data.devices.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.devices.some((d: any) => d.id === TEST_DEVICE_ID)).toBe(true);
    });
  });

  // ===========================================================================
  // Requirement 3: Probe POST /auth/google: Confirm mismatched aud is rejected with 401
  // ===========================================================================
  describe('3. Google Auth Flow — Token Audience (aud) Validation', () => {
    const origFetch = global.fetch;
    const origClientId = process.env.GOOGLE_CLIENT_ID;
    const origViteClientId = process.env.VITE_GOOGLE_CLIENT_ID;

    const EXPECTED_CLIENT_ID = '987654321-legitimateapp.apps.googleusercontent.com';
    const ROGUE_CLIENT_ID = '123456789-maliciousattackerapp.apps.googleusercontent.com';

    afterAll(() => {
      global.fetch = origFetch;
      if (origClientId !== undefined) {
        process.env.GOOGLE_CLIENT_ID = origClientId;
      } else {
        delete process.env.GOOGLE_CLIENT_ID;
      }
      if (origViteClientId !== undefined) {
        process.env.VITE_GOOGLE_CLIENT_ID = origViteClientId;
      } else {
        delete process.env.VITE_GOOGLE_CLIENT_ID;
      }
    });

    it('strictly returns 401 INVALID_CREDENTIALS when token aud does NOT match GOOGLE_CLIENT_ID', async () => {
      process.env.GOOGLE_CLIENT_ID = EXPECTED_CLIENT_ID;
      delete process.env.VITE_GOOGLE_CLIENT_ID;

      // Mock Google tokeninfo returning a rogue aud from another Google Cloud project
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          aud: ROGUE_CLIENT_ID,
          email: 'victim_user@gmail.com',
          email_verified: true,
          name: 'Victim User',
          sub: 'goog_sub_victim_123',
        }),
      } as any);

      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: {
          credential: 'mock_jwt_issued_for_rogue_app',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error?.message).toContain('Token audience mismatch: Google credential was not issued for this application.');
    });

    it('strictly returns 401 INVALID_CREDENTIALS when aud is missing and GOOGLE_CLIENT_ID is configured', async () => {
      process.env.GOOGLE_CLIENT_ID = EXPECTED_CLIENT_ID;

      // Mock Google tokeninfo returning no aud field
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          email: 'no_aud_user@gmail.com',
          email_verified: true,
          name: 'No Aud User',
          sub: 'goog_sub_no_aud',
        }),
      } as any);

      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: {
          credential: 'mock_jwt_without_aud',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error?.message).toContain('Token audience mismatch');
    });

    it('strictly returns 401 INVALID_CREDENTIALS when aud mismatches VITE_GOOGLE_CLIENT_ID fallback', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      process.env.VITE_GOOGLE_CLIENT_ID = EXPECTED_CLIENT_ID;

      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          aud: 'rogue-vite-client.apps.googleusercontent.com',
          email: 'vite_fallback_user@gmail.com',
          email_verified: true,
          name: 'Vite Fallback User',
          sub: 'goog_sub_vite_1',
        }),
      } as any);

      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: {
          credential: 'mock_jwt_vite_mismatch',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error?.message).toContain('Token audience mismatch');
    });

    it('succeeds with 200 and issues user session when token aud matches expected GOOGLE_CLIENT_ID', async () => {
      process.env.GOOGLE_CLIENT_ID = EXPECTED_CLIENT_ID;
      const testEmail = `legit_user_${Date.now()}@gmail.com`;

      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          aud: EXPECTED_CLIENT_ID,
          email: testEmail,
          email_verified: true,
          name: 'Legitimate User',
          sub: `goog_sub_legit_${Date.now()}`,
        }),
      } as any);

      const res = await simulateRequest({
        method: 'POST',
        url: '/api/v1/auth/google',
        body: {
          credential: 'mock_jwt_valid_audience',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.sessionToken).toBeDefined();
      expect(res.body.data.sessionToken.startsWith('usess_')).toBe(true);

      // Cleanup
      const createdUserId = res.body.data.user.id;
      await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [createdUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [createdUserId]);
    });
  });
});
