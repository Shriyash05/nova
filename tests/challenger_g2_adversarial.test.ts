import { describe, it, expect } from 'vitest';
import { MockBackendServer } from './e2e/fixtures/mockBackendServer';
import fs from 'fs';
import path from 'path';

/**
 * Challenger G2 Adversarial Test Suite
 * Stress-testing:
 * 1. Cloud Action Synchronization contracts (POST /api/v1/devices/actions/sync)
 * 2. Cross-device spoofing, unauthenticated tokens, missing device IDs, disconnected Notion
 * 3. Form input fuzzing: Wi-Fi profile credentials & claim token formats
 * 4. UX & Accessibility mathematical contracts: contrast ratios, mobile viewport bounds, modal semantics
 */

describe('Challenger G2: Cloud Action Sync & Security Stress Tests', () => {
  const server = new MockBackendServer();
  const TEST_DEVICE_A = 'nova-c3-5c20dc4239fca9ec';
  const FACTORY_BOOTSTRAP_SECRET_A = 'factory_bootstrap_secret_12345';

  const TEST_DEVICE_B = 'nova-c3-beefcafe12345678';
  const FACTORY_BOOTSTRAP_SECRET_B = 'factory_bootstrap_secret_67890';

  let deviceKeyA = '';
  let claimTokenA = '';
  let pairingSessionA = '';

  let deviceKeyB = '';

  // Setup devices
  it('prepares test devices via bootstrap', async () => {
    // Register Device B in bootstrap credentials
    server.bootstrapCredentials.set(TEST_DEVICE_B, {
      hash: server.bootstrapCredentials.get(TEST_DEVICE_A)!.hash,
      isUsed: false,
    });

    const resA = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: TEST_DEVICE_A,
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: FACTORY_BOOTSTRAP_SECRET_A,
      },
    });
    expect(resA.status).toBe(200);
    deviceKeyA = resA.body.data.deviceKey;
    claimTokenA = resA.body.data.claimToken;

    const claimRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: {
        claimToken: claimTokenA,
        userId: 'usr_owner_001',
      },
    });
    expect(claimRes.status).toBe(200);
    pairingSessionA = claimRes.body.data.pairingSessionId;

    const resB = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: TEST_DEVICE_B,
        macAddress: '48:F6:EE:99:88:77',
        bootstrapSecret: FACTORY_BOOTSTRAP_SECRET_A,
      },
    });
    expect(resB.status).toBe(200);
    deviceKeyB = resB.body.data.deviceKey;
  });

  describe('1. Cloud Action Sync Endpoint Hardening (/api/v1/devices/actions/sync)', () => {
    it('strictly rejects unauthenticated sync request with missing Authorization header (401)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: {
          'x-nova-device-id': TEST_DEVICE_A,
        },
        body: { actionType: 'voice_memo' },
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toMatch(/UNAUTHORIZED|INVALID_TOKEN/);
    });

    it('strictly rejects empty or malformed Bearer tokens (401)', async () => {
      const resEmpty = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: {
          Authorization: 'Bearer ',
          'x-nova-device-id': TEST_DEVICE_A,
        },
        body: { actionType: 'voice_memo' },
      });
      expect(resEmpty.status).toBe(401);

      const resGarbage = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: {
          Authorization: 'Bearer not_a_real_token_1234567890',
          'x-nova-device-id': TEST_DEVICE_A,
        },
        body: { actionType: 'voice_memo' },
      });
      expect(resGarbage.status).toBe(401);
    });

    it('strictly rejects expired pairing session token (401 SESSION_EXPIRED)', async () => {
      // Create an expired pairing session
      const expiredSessionId = 'sess_expired_test_999';
      server.pairingSessions.set(expiredSessionId, {
        id: expiredSessionId,
        deviceId: TEST_DEVICE_A,
        claimToken: 'clm_old_123',
        expiresAt: new Date(Date.now() - 10000), // in the past
      });

      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: {
          Authorization: `Bearer ${expiredSessionId}`,
          'x-nova-device-id': TEST_DEVICE_A,
        },
        body: { actionType: 'voice_memo' },
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('SESSION_EXPIRED');
    });

    it('strictly rejects cross-device action sync spoofing (Device B key trying to sync Device A) (403)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/actions/sync`,
        headers: {
          Authorization: `Bearer ${deviceKeyB}`, // Device B's key!
        },
        body: { actionType: 'voice_memo' },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toMatch(/FORBIDDEN|CROSS_DEVICE_FORBIDDEN/);
    });

    it('strictly returns 400 NOTION_NOT_CONNECTED when Notion workspace is not linked', async () => {
      // Ensure Notion authorization is absent for Device A
      server.notionAuths.delete(TEST_DEVICE_A);

      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: {
          Authorization: `Bearer ${deviceKeyA}`,
          'x-nova-device-id': TEST_DEVICE_A,
        },
        body: {
          actionType: 'voice_memo',
          sampleCount: 32000,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOTION_NOT_CONNECTED');
    });

    it('returns 200 OK with valid pageId when Notion is linked', async () => {
      // Link Notion for Device A
      server.notionAuths.set(TEST_DEVICE_A, {
        deviceId: TEST_DEVICE_A,
        workspaceId: 'ws_test_123',
        workspaceName: 'Test Lab Workspace',
        encryptedAccessToken: 'enc_notion_token_valid',
        targetDatabaseId: 'db_notion_research_01',
        targetDatabaseName: 'NOVA Research Notes',
        connectedAt: new Date(),
      });

      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: {
          Authorization: `Bearer ${deviceKeyA}`,
          'x-nova-device-id': TEST_DEVICE_A,
        },
        body: {
          actionType: 'voice_memo',
          sampleCount: 32000,
          speechEnergy: 480,
          source: 'MAX4466_GPIO1',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pageId).toBeDefined();
      expect(res.body.data.databaseId).toBe('db_notion_research_01');
    });

    it('handles Notion disconnect cleanly and subsequent sync attempts return NOTION_NOT_CONNECTED', async () => {
      const discRes = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/notion/disconnect`,
        headers: {
          Authorization: `Bearer ${deviceKeyA}`,
        },
      });
      expect(discRes.status).toBe(200);
      expect(discRes.body.data.disconnected).toBe(true);

      // Verify sync fails now
      const syncRes = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/actions/sync`,
        headers: {
          Authorization: `Bearer ${deviceKeyA}`,
        },
        body: { actionType: 'voice_memo' },
      });
      expect(syncRes.status).toBe(400);
      expect(syncRes.body.error.code).toBe('NOTION_NOT_CONNECTED');
    });
  });

  describe('2. Form Input Fuzzing: Wi-Fi Profiles & Claim Tokens', () => {
    it('fuzzes Wi-Fi profile creation: empty SSID must be rejected with 400', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/wifi-profiles`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          name: 'Test Network',
          ssid: '',
          password: 'valid_password',
        },
      });
      expect(res.status).toBe(400);
    });

    it('fuzzes Wi-Fi profile creation: preserves unicode and special characters in SSID safely', async () => {
      const unicodeSsid = '⚡ NOVA_Lab_5GHz_📶 🚀';
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/wifi-profiles`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          name: 'Unicode Net',
          ssid: unicodeSsid,
          password: 'unicode_key_123',
        },
      });
      expect(res.status).toBe(201);
      expect(res.body.data.profile.ssid).toBe(unicodeSsid);
    });

    it('fuzzes Wi-Fi profile creation: enforces vault maximum of 5 profiles', async () => {
      // Clear profiles for isolated 5-profile test
      server.wifiProfiles.set(TEST_DEVICE_A, []);

      // Add profiles 1 to 5
      for (let i = 1; i <= 5; i++) {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${TEST_DEVICE_A}/wifi-profiles`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: { name: `Net${i}`, ssid: `Net${i}`, password: `pass${i}` },
        });
        expect(res.status).toBe(201);
      }

      // 6th profile must be rejected with 400 VAULT_LIMIT_REACHED
      const p6 = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/wifi-profiles`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: { name: 'Net6', ssid: 'Net6_Overflow', password: 'pass6' },
      });
      expect(p6.status).toBe(400);
      expect(p6.body.error.code).toBe('VAULT_LIMIT_REACHED');
    });

    it('fuzzes claim token format: empty or non-existent token rejected with 400', async () => {
      const resEmpty = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: '' },
      });
      expect(resEmpty.status).toBe(400);

      const resNonExistent = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: 'clm_totally_fake_token_99999' },
      });
      expect(resNonExistent.status).toBe(400);
      expect(resNonExistent.body.error.code).toMatch(/INVALID_CLAIM/);
    });

    it('fuzzes claim token format: SQL injection payload rejected cleanly', async () => {
      const resSql = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: "' OR '1'='1' --" },
      });
      expect(resSql.status).toBe(400);
      expect(resSql.body.success).toBe(false);
    });

    it('fuzzes claim token redemption: prevents replay attacks on redeemed tokens', async () => {
      // Re-redeem claimTokenA which was already claimed in bootstrap test
      const resReplay = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: claimTokenA },
      });
      expect(resReplay.status).toBe(400);
      expect(resReplay.body.error.code).toMatch(/CLAIM_TOKEN_ALREADY_/);
    });
  });

  describe('3. UX & Accessibility Architectural Verification', () => {
    // Read variables.css and verify color tokens & WCAG AA contrast math
    function luminance(hex: string): number {
      const clean = hex.replace('#', '');
      const rgb = [
        parseInt(clean.substring(0, 2), 16) / 255,
        parseInt(clean.substring(2, 4), 16) / 255,
        parseInt(clean.substring(4, 6), 16) / 255,
      ].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function contrastRatio(hex1: string, hex2: string): number {
      const l1 = luminance(hex1);
      const l2 = luminance(hex2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    it('verifies typography color contrast strictly exceeds WCAG 2.1 AA (4.5:1)', () => {
      const cssPath = path.resolve(process.cwd(), 'src/styles/variables.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      const bgMatch = css.match(/--bg-app:\s*(#[0-9a-fA-F]{6});/);
      const textPrimaryMatch = css.match(/--text-primary:\s*(#[0-9a-fA-F]{6});/);
      const textSecondaryMatch = css.match(/--text-secondary:\s*(#[0-9a-fA-F]{6});/);
      const accentCyanMatch = css.match(/--accent-cyan:\s*(#[0-9a-fA-F]{6});/);
      const textOnAccentMatch = css.match(/--text-on-accent:\s*(#[0-9a-fA-F]{6});/);

      expect(bgMatch).toBeTruthy();
      expect(textPrimaryMatch).toBeTruthy();
      expect(textSecondaryMatch).toBeTruthy();

      const bgApp = bgMatch![1];
      const textPrimary = textPrimaryMatch![1];
      const textSecondary = textSecondaryMatch![1];
      const accentCyan = accentCyanMatch![1];
      const textOnAccent = textOnAccentMatch![1];

      const primaryContrast = contrastRatio(bgApp, textPrimary);
      const secondaryContrast = contrastRatio(bgApp, textSecondary);
      const accentContrast = contrastRatio(bgApp, accentCyan);
      const onAccentContrast = contrastRatio(accentCyan, textOnAccent);

      // Primary text must exceed WCAG AAA (7.0:1)
      expect(primaryContrast).toBeGreaterThan(15.0);
      // Secondary text must exceed WCAG AA (4.5:1)
      expect(secondaryContrast).toBeGreaterThan(4.5);
      // Accent cyan on dark background must exceed 10:1
      expect(accentContrast).toBeGreaterThan(10.0);
      // Text on accent button must exceed 10:1
      expect(onAccentContrast).toBeGreaterThan(10.0);
    });

    it('verifies mobile responsive layout constraint resolution: no horizontal overflow on 320px viewport', () => {
      const setupPath = path.resolve(process.cwd(), 'src/components/setup/SetupExperience.tsx');
      const setupCode = fs.readFileSync(setupPath, 'utf8');

      // Check minmax column sizes - hardened with min(100%, 320px)
      const hasHardenedGrid = setupCode.includes('minmax(min(100%, 320px), 1fr)');
      expect(hasHardenedGrid).toBe(true);

      // Verify responsive clamp padding on main container
      const hasResponsivePadding = setupCode.includes('clamp(0.75rem');
      expect(hasResponsivePadding).toBe(true);

      // Verify 360px fixed minmax is eliminated
      const fixed360Match = /minmax\(360px,\s*1fr\)/.test(setupCode);
      expect(fixed360Match).toBe(false);
    });

    it('audits modal dialog accessibility implementation in QrCameraScannerModal vs LockedActionModal', () => {
      const qrModalPath = path.resolve(process.cwd(), 'src/components/setup/QrCameraScannerModal.tsx');
      const lockedModalPath = path.resolve(process.cwd(), 'src/components/marketing/LockedActionModal.tsx');

      const qrCode = fs.readFileSync(qrModalPath, 'utf8');
      const lockedCode = fs.readFileSync(lockedModalPath, 'utf8');

      // LockedActionModal has full ARIA dialog attributes
      expect(lockedCode).toContain('role="dialog"');
      expect(lockedCode).toContain('aria-modal="true"');
      expect(lockedCode).toContain('handleKeyDown');
      expect(lockedCode).toContain("e.key === 'Escape'");

      // Phase H hardening: QrCameraScannerModal now HAS ARIA dialog attributes, labelledby, and Escape listener
      const qrHasDialogRole = qrCode.includes('role="dialog"');
      const qrHasAriaModal = qrCode.includes('aria-modal="true"');
      const qrHasEscapeListener = qrCode.includes("e.key === 'Escape'") || qrCode.includes("'Escape'");
      const qrHasAriaLabelledBy = qrCode.includes('aria-labelledby="qr-scanner-title"');
      const qrHasCloseLabel = qrCode.includes('aria-label="Close scanner dialog"');

      expect(qrHasDialogRole).toBe(true); // Hardened: role="dialog" present
      expect(qrHasAriaModal).toBe(true); // Hardened: aria-modal="true" present
      expect(qrHasEscapeListener).toBe(true); // Hardened: Escape key listener present
      expect(qrHasAriaLabelledBy).toBe(true); // Hardened: aria-labelledby present
      expect(qrHasCloseLabel).toBe(true); // Hardened: Close button accessible name present
    });
  });

  describe('4. Direct api/index.ts Serverless Handler Contract Stress Tests', () => {
    // Import handler and stream for direct HTTP simulation against api/index.ts
    // (runs without needing active external network/database)
    let handlerModule: any;

    it('loads api/index.ts handler cleanly', async () => {
      handlerModule = await import('../api/index.ts');
      expect(handlerModule.default).toBeTypeOf('function');
    });

    async function simulateDirectApi(options: {
      method: string;
      url: string;
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    }): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
      const { Readable } = await import('stream');
      return new Promise((resolve) => {
        const bodyStr = options.body ? JSON.stringify(options.body) : '';
        const req = Readable.from(bodyStr ? [bodyStr] : []) as any;
        req.method = options.method;
        req.url = options.url;
        if (options.body) req.body = options.body;
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
          writeHead(status: number, hdrs?: Record<string, string>) {
            resStatusCode = status;
            if (hdrs) {
              for (const [k, v] of Object.entries(hdrs)) {
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

        handlerModule.default(req, res).catch((err: any) => {
          resolve({
            statusCode: 500,
            headers: resHeaders,
            body: { error: err.message },
          });
        });
      });
    }

    it('POST /api/v1/devices/actions/sync: strictly rejects missing deviceId with 400 INVALID_DEVICE_ID', async () => {
      const res = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/actions/sync',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DEVICE_ID');
    });

    it('POST /api/v1/devices/actions/sync: strictly rejects whitespace-only deviceId with 400 INVALID_DEVICE_ID', async () => {
      const res = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/actions/sync',
        headers: { 'x-nova-device-id': '     ' },
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DEVICE_ID');
    });

    it('POST /api/v1/devices/actions/sync: strictly rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/actions/sync',
        headers: {
          'x-nova-device-id': 'nova-c3-5c20dc4239fca9ec',
        },
        body: { actionType: 'voice_memo' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/devices/actions/sync: strictly rejects empty Bearer token with 401 UNAUTHORIZED', async () => {
      const res = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/actions/sync',
        headers: {
          'x-nova-device-id': 'nova-c3-5c20dc4239fca9ec',
          authorization: 'Bearer    ',
        },
        body: { actionType: 'voice_memo' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/devices/:id/actions/sync: strictly rejects unauthenticated request on parameterized route with 401 UNAUTHORIZED', async () => {
      const res = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/actions/sync',
        body: { actionType: 'voice_memo' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/devices/:id/sync/test: strictly rejects unauthenticated sync test with 401 UNAUTHORIZED', async () => {
      const res = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/sync/test',
        body: {},
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

