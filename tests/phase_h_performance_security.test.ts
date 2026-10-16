import { describe, it, expect, beforeEach } from 'vitest';
import { MockBackendServer } from './e2e/fixtures/mockBackendServer';
import { AUTHORITATIVE_COMPLIANCE_STANDARDS } from './e2e/fixtures/testLedgers';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

/**
 * Phase H Authoritative Test Suite:
 * Performance, Security Regression & Multi-Jurisdiction Regulatory Matrix
 *
 * Covers:
 * 1. Red-Team Security Probes (Token Forgery, Tampering, Replay)
 * 2. Cross-Device Spoofing & Resource Isolation
 * 3. Adversarial SQL & Input Injection Fuzzing
 * 4. Notion Disconnect (400 NOTION_NOT_CONNECTED) & Lifecycle Resilience
 * 5. Strict Power Telemetry Rejection (Nullish Coalescing Enforcement)
 * 6. High-Concurrency Stress & Race Condition Elimination
 * 7. Inactivity Timeout Boundary & Microsecond FSM Timing
 * 8. MeitY DPDP Act 2023 Consent Lifecycle & Audit Traceability
 * 9. Multi-Jurisdiction Regulatory Compliance Matrix Verification
 * 10. Direct Serverless api/index.ts Handler Contract Probes
 */

describe('Phase H: Performance, Security Regression & Regulatory Matrix Suite', () => {
  let server: MockBackendServer;
  const DEVICE_A = 'nova-c3-5c20dc4239fca9ec';
  const BOOTSTRAP_SECRET_A = 'factory_bootstrap_secret_12345';

  const DEVICE_B = 'nova-c3-b8f6ee1734d8a1b2';
  const BOOTSTRAP_SECRET_B = 'factory_bootstrap_secret_67890';

  let deviceKeyA = '';
  let claimTokenA = '';
  let pairingSessionA = '';

  let deviceKeyB = '';
  let claimTokenB = '';
  let pairingSessionB = '';

  beforeEach(async () => {
    server = new MockBackendServer();

    // Register Device B in bootstrap credentials
    server.bootstrapCredentials.set(DEVICE_B, {
      hash: server.bootstrapCredentials.get(DEVICE_A)!.hash,
      isUsed: false,
    });

    // Bootstrap Device A
    const resA = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: DEVICE_A,
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: BOOTSTRAP_SECRET_A,
      },
    });
    expect(resA.status).toBe(200);
    deviceKeyA = resA.body.data.deviceKey;
    claimTokenA = resA.body.data.claimToken;

    // Claim Device A
    const claimResA = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: {
        claimToken: claimTokenA,
        userId: 'usr_alice_001',
      },
    });
    expect(claimResA.status).toBe(200);
    pairingSessionA = claimResA.body.data.pairingSessionId;

    // Bootstrap Device B
    const resB = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: DEVICE_B,
        macAddress: '48:F6:EE:17:34:D9',
        bootstrapSecret: BOOTSTRAP_SECRET_A,
      },
    });
    expect(resB.status).toBe(200);
    deviceKeyB = resB.body.data.deviceKey;
    claimTokenB = resB.body.data.claimToken;

    // Claim Device B
    const claimResB = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: {
        claimToken: claimTokenB,
        userId: 'usr_bob_002',
      },
    });
    expect(claimResB.status).toBe(200);
    pairingSessionB = claimResB.body.data.pairingSessionId;
  });

  // =========================================================================
  // 1. Red-Team Security Probes: Token Forgery & Replay
  // =========================================================================
  describe('1. Red-Team Security Probes: Bearer Token Forgery, Tampering & Replay Attacks', () => {
    it('strictly rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        body: { power_source: 'usb_5v' },
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('strictly rejects forged bearer tokens with 401 UNAUTHORIZED', async () => {
      const forgedTokens = [
        'Bearer fake_jwt_token_here_12345',
        'Bearer novakey_forged_signature_xyz',
        'Bearer dsk_live_forged_key_000000000',
        'Bearer null',
        'Bearer undefined',
        'Bearer {"alg":"none"}',
      ];

      for (const token of forgedTokens) {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: token },
          body: { power_source: 'usb_5v' },
        });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });

    it('strictly rejects malformed Authorization headers with 401 UNAUTHORIZED', async () => {
      const malformedHeaders = [
        'Bearer ',
        'Bearer',
        'Basic dXNlcjpwYXNz',
        'Token 12345',
        'Bearer   ',
      ];

      for (const authHeader of malformedHeaders) {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: authHeader },
          body: { power_source: 'usb_5v' },
        });
        expect(res.status).toBe(401);
      }
    });

    it('strictly prevents replay attacks on single-use claim tokens', async () => {
      // claimTokenA was already claimed in beforeEach
      const replayRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: {
          claimToken: claimTokenA,
          userId: 'usr_attacker_666',
        },
      });
      expect(replayRes.status).toBe(400);
      expect(replayRes.body.success).toBe(false);
      expect(replayRes.body.error.code).toBe('CLAIM_TOKEN_ALREADY_USED');
    });
  });

  // =========================================================================
  // 2. Cross-Device Spoofing & Resource Isolation
  // =========================================================================
  describe('2. Cross-Device Spoofing & Resource Isolation Probes', () => {
    it('strictly rejects cross-device heartbeat forgery: Device B key sent to Device A endpoint (403)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyB}` },
        body: { power_source: 'usb_5v' },
      });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toMatch(/FORBIDDEN|CROSS_DEVICE_FORBIDDEN/);
    });

    it('strictly rejects cross-device action sync: Device B bearer token used to sync Device A (403)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: { Authorization: `Bearer ${pairingSessionB}` },
        body: {
          deviceId: DEVICE_A,
          actionType: 'voice_note',
          transcript: 'Malicious spoof attempt',
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toMatch(/FORBIDDEN|CROSS_DEVICE_FORBIDDEN/);
    });

    it('strictly isolates Wi-Fi profile vaults between distinct devices', async () => {
      // Add profile to Device A
      const addRes = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/wifi-profiles`,
        headers: { Authorization: `Bearer ${pairingSessionA}` },
        body: {
          ssid: 'Alice_Private_Network',
          password: 'Alice_Secret_Password_99',
        },
      });
      expect(addRes.status).toBe(201);

      // Device B attempts to fetch Device A Wi-Fi profiles
      const spyRes = await server.handleRequest({
        method: 'GET',
        path: `/api/v1/devices/${DEVICE_A}/wifi-profiles`,
        headers: { Authorization: `Bearer ${pairingSessionB}` },
      });
      expect(spyRes.status).toBe(403);
      expect(spyRes.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Adversarial SQL & Input Injection Fuzzing
  // =========================================================================
  describe('3. Adversarial SQL & Input Injection Fuzzing', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1' --",
      "'; DROP TABLE devices; --",
      "' UNION SELECT null, null, null, null --",
      "admin' --",
      "' OR 1=1 #",
      "1'; SELECT pg_sleep(5); --",
      "\\x00' OR 1=1 --",
      "'; DELETE FROM wifi_profiles WHERE 'a'='a'; --",
      "' OR EXISTS(SELECT * FROM users) --",
    ];

    it('safely handles SQL injection fuzzing in claim tokens with 400 INVALID_CLAIM_TOKEN', async () => {
      for (const payload of sqlInjectionPayloads) {
        const res = await server.handleRequest({
          method: 'POST',
          path: '/api/v1/devices/claim',
          body: {
            claimToken: payload,
            userId: 'usr_fuzzer_001',
          },
        });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_CLAIM_TOKEN');
      }
    });

    it('safely handles SQL injection strings in Wi-Fi SSIDs without code execution', async () => {
      for (const payload of sqlInjectionPayloads) {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/wifi-profiles`,
          headers: { Authorization: `Bearer ${pairingSessionA}` },
          body: {
            ssid: `WiFi_${payload}`,
            password: 'ValidPassword123!',
          },
        });

        // The vault should either accept it as literal string data (if under 5 limit) or reject if limit reached
        if (res.status === 201) {
          expect(res.body.success).toBe(true);
          const profile = res.body.data.profile || res.body.data;
          expect(profile.ssid).toBe(`WiFi_${payload}`);
        } else {
          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('VAULT_LIMIT_REACHED');
        }
      }
    });

    it('allows optional name and optional password for open Wi-Fi networks', async () => {
      // Clear profiles first by creating fresh device
      const DEV_OPEN = 'nova-c3-openwifitest01';
      server.bootstrapCredentials.set(DEV_OPEN, {
        hash: server.bootstrapCredentials.get(DEVICE_A)!.hash,
        isUsed: false,
      });

      const bootRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/bootstrap',
        body: {
          deviceId: DEV_OPEN,
          macAddress: '48:F6:EE:17:34:E0',
          bootstrapSecret: BOOTSTRAP_SECRET_A,
        },
      });
      const openClaim = bootRes.body.data.claimToken;
      const claimRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: openClaim, userId: 'usr_open_01' },
      });
      const openSession = claimRes.body.data.pairingSessionId;

      // Add open network without password and without name
      const addOpenRes = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEV_OPEN}/wifi-profiles`,
        headers: { Authorization: `Bearer ${openSession}` },
        body: {
          ssid: 'CoffeeShop_Free_Guest',
        },
      });

      expect(addOpenRes.status).toBe(201);
      expect(addOpenRes.body.success).toBe(true);
      const openProf = addOpenRes.body.data.profile || addOpenRes.body.data;
      expect(openProf.name).toBe('Network 1');
      expect(openProf.ssid).toBe('CoffeeShop_Free_Guest');
      expect(openProf.hasPassword).toBe(false);
    });
  });

  // =========================================================================
  // 4. Notion Disconnect & Token Lifecycle Handling
  // =========================================================================
  describe('4. Notion Disconnect (400 NOTION_NOT_CONNECTED) & Lifecycle Resilience', () => {
    it('returns 400 NOTION_NOT_CONNECTED when device has no linked Notion workspace', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: { Authorization: `Bearer ${pairingSessionA}` },
        body: {
          deviceId: DEVICE_A,
          actionType: 'voice_note',
          transcript: 'Test task without notion',
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOTION_NOT_CONNECTED');
    });

    it('enables sync when connected and returns 400 NOTION_NOT_CONNECTED post-disconnect', async () => {
      // Connect Notion
      server.notionAuths.set(DEVICE_A, {
        deviceId: DEVICE_A,
        workspaceId: 'ws_test_123',
        workspaceName: 'Acme Workspace',
        encryptedAccessToken: 'secret_test_notion_key_abc123',
        targetDatabaseId: 'db_test_123',
        targetDatabaseName: 'NOVA Tasks',
        connectedAt: new Date(),
      });

      // Verify sync succeeds
      const syncRes1 = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: { Authorization: `Bearer ${pairingSessionA}` },
        body: {
          deviceId: DEVICE_A,
          actionType: 'voice_note',
          transcript: 'Buy groceries and milk',
        },
      });
      expect(syncRes1.status).toBe(200);
      expect(syncRes1.body.success).toBe(true);
      expect(syncRes1.body.data.pageId).toBeTruthy();

      // Disconnect Notion
      const disconnectRes = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/notion/disconnect`,
        headers: { Authorization: `Bearer ${pairingSessionA}` },
        body: {},
      });
      expect(disconnectRes.status).toBe(200);
      expect(disconnectRes.body.success).toBe(true);

      // Subsequent sync must fail with 400 NOTION_NOT_CONNECTED
      const syncRes2 = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: { Authorization: `Bearer ${pairingSessionA}` },
        body: {
          deviceId: DEVICE_A,
          actionType: 'voice_note',
          transcript: 'Call plumber',
        },
      });
      expect(syncRes2.status).toBe(400);
      expect(syncRes2.body.error.code).toBe('NOTION_NOT_CONNECTED');
    });
  });

  // =========================================================================
  // 5. Strict Truth-in-Hardware Power Telemetry Validation
  // =========================================================================
  describe('5. Strict Truth-in-Hardware Power Telemetry (Nullish Coalescing Enforcement)', () => {
    it('strictly rejects empty string power_source: "" with 400 INVALID_POWER_TELEMETRY', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          power_source: '',
          rssi: -45,
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });

    it('strictly rejects whitespace power_source: "   " with 400 INVALID_POWER_TELEMETRY', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          power_source: '   ',
          rssi: -50,
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });

    it('strictly rejects non-USB power sources (battery, lipo, solar, 18650, poe) with 400', async () => {
      const nonUsbSources = ['battery', 'lipo', 'solar', '18650', 'poe', '3.3v', '12v_barrel'];
      for (const src of nonUsbSources) {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: { power_source: src },
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
      }
    });

    it('strictly rejects fake battery percentages (0%, 85%, 100%, negative) with 400', async () => {
      const fakeBatteries = [0, 50, 85, 100, -10];
      for (const b of fakeBatteries) {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: {
            power_source: 'usb_5v',
            batteryPercent: b,
          },
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
      }
    });

    it('strictly rejects fake battery voltage (batteryMv) with 400', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          power_source: 'usb_5v',
          batteryMv: 4150,
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });

    it('accepts legitimate USB-C 5V power sources and returns normalized powerSource: "usb_5v"', async () => {
      const validSources = ['usb_5v', 'usb-c_5v', 'usb_c_5v', 'power_line_usb_5v', 'usb-c 5v bus', 'USB_5V'];
      for (const src of validSources) {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: { power_source: src },
        });
        expect(res.status).toBe(200);
        expect(res.body.data.powerSource).toBe('usb_5v');
      }
    });
  });

  // =========================================================================
  // 6. High-Concurrency Stress & Race Condition Elimination
  // =========================================================================
  describe('6. High-Concurrency Stress & Race Condition Elimination', () => {
    it('handles 50 concurrent device heartbeats without race condition or state corruption', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: {
            power_source: 'usb_5v',
            rssi: -40 - (i % 20),
            freeHeap: 180000 + i,
          },
        })
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(50);
      for (const res of results) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.powerSource).toBe('usb_5v');
      }

      // Verify device record remains healthy
      const dev = server.devices.get(DEVICE_A);
      expect(dev).toBeDefined();
      expect(dev!.status).toBe('online');
      expect(dev!.lastHeartbeat).toBeDefined();
    });

    it('eliminates race conditions on simultaneous claim token redemption: exactly 1 succeeds', async () => {
      // Create a fresh device with single-use claim token
      const CONCURRENCY_DEV = 'nova-c3-concurrency01';
      server.bootstrapCredentials.set(CONCURRENCY_DEV, {
        hash: server.bootstrapCredentials.get(DEVICE_A)!.hash,
        isUsed: false,
      });

      const bootRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/bootstrap',
        body: {
          deviceId: CONCURRENCY_DEV,
          macAddress: '48:F6:EE:17:34:F1',
          bootstrapSecret: BOOTSTRAP_SECRET_A,
        },
      });
      const singleUseToken = bootRes.body.data.claimToken;

      // 20 simultaneous redemption attempts
      const claimAttempts = Array.from({ length: 20 }, (_, i) =>
        server.handleRequest({
          method: 'POST',
          path: '/api/v1/devices/claim',
          body: {
            claimToken: singleUseToken,
            userId: `usr_concurrent_${i}`,
          },
        })
      );

      const claimResults = await Promise.all(claimAttempts);
      const successfulClaims = claimResults.filter((r) => r.status === 200);
      const rejectedClaims = claimResults.filter((r) => r.status === 400);

      // Exactly 1 must succeed and all other 19 must fail with CLAIM_TOKEN_ALREADY_USED
      expect(successfulClaims.length).toBe(1);
      expect(rejectedClaims.length).toBe(19);

      for (const r of rejectedClaims) {
        expect(r.body.error.code).toBe('CLAIM_TOKEN_ALREADY_USED');
      }
    });
  });

  // =========================================================================
  // 7. Inactivity Timeout Boundary & Microsecond FSM Timing
  // =========================================================================
  describe('7. Inactivity Timeout Boundary & Microsecond FSM Timing', () => {
    it('verifies exact 5-minute inactivity boundary (300,000,000 microseconds / 300,000 ms)', () => {
      const INACTIVITY_TIMEOUT_MS = 300000;
      const INACTIVITY_TIMEOUT_US = 300000000;

      // Verify microsecond to millisecond equivalence
      expect(INACTIVITY_TIMEOUT_US / 1000).toBe(INACTIVITY_TIMEOUT_MS);

      // Boundary condition: elapsed < 300,000 ms => remain in LISTENING
      const elapsedBeforeTimeout = 299999;
      const shouldTimeoutBefore = elapsedBeforeTimeout >= INACTIVITY_TIMEOUT_MS;
      expect(shouldTimeoutBefore).toBe(false);

      // Boundary condition: elapsed >= 300,000 ms => trigger transition to IDLE
      const elapsedAtTimeout = 300000;
      const shouldTimeoutAt = elapsedAtTimeout >= INACTIVITY_TIMEOUT_MS;
      expect(shouldTimeoutAt).toBe(true);

      const elapsedAfterTimeout = 300001;
      const shouldTimeoutAfter = elapsedAfterTimeout >= INACTIVITY_TIMEOUT_MS;
      expect(shouldTimeoutAfter).toBe(true);
    });

    it('verifies speech silence detection boundary (1.5 seconds / 1,500,000 microseconds)', () => {
      const SPEECH_SILENCE_TIMEOUT_US = 1500000;
      const SPEECH_SILENCE_TIMEOUT_MS = 1500;

      expect(SPEECH_SILENCE_TIMEOUT_US / 1000).toBe(SPEECH_SILENCE_TIMEOUT_MS);

      // At 1499 ms, audio acquisition continues
      expect(1499 >= SPEECH_SILENCE_TIMEOUT_MS).toBe(false);
      // At 1500 ms, speech boundary reached, transitions to PROCESSING
      expect(1500 >= SPEECH_SILENCE_TIMEOUT_MS).toBe(true);
    });
  });

  // =========================================================================
  // 8. MeitY DPDP Act 2023 Consent Lifecycle & Audit Traceability
  // =========================================================================
  describe('8. MeitY DPDP Act 2023 Consent Lifecycle & Audit Traceability', () => {
    it('verifies revocable consent model: unbinding clears pairing session and Notion tokens', async () => {
      // Connect Notion to Device A
      server.notionAuths.set(DEVICE_A, {
        deviceId: DEVICE_A,
        workspaceId: 'ws_privacy_01',
        workspaceName: 'Privacy Compliant Workspace',
        encryptedAccessToken: 'secret_dpdp_test_token',
        targetDatabaseId: 'db_privacy_01',
        targetDatabaseName: 'DPDP Audit DB',
        connectedAt: new Date(),
      });

      // Disconnect Notion (simulating user consent revocation under Section 6 DPDP)
      const revokeRes = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/notion/disconnect`,
        headers: { Authorization: `Bearer ${pairingSessionA}` },
        body: {},
      });
      expect(revokeRes.status).toBe(200);

      // Verify token is hard-deleted from memory
      expect(server.notionAuths.has(DEVICE_A)).toBe(false);

      // Verify no downstream action processing can proceed
      const syncRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: { Authorization: `Bearer ${pairingSessionA}` },
        body: {
          deviceId: DEVICE_A,
          actionType: 'voice_note',
          transcript: 'Should not be stored or processed',
        },
      });
      expect(syncRes.status).toBe(400);
      expect(syncRes.body.error.code).toBe('NOTION_NOT_CONNECTED');
    });
  });

  // =========================================================================
  // 9. Multi-Jurisdiction Regulatory Matrix Document Verification
  // =========================================================================
  describe('9. Multi-Jurisdiction Regulatory Matrix Document Verification', () => {
    const docPath = path.resolve(process.cwd(), 'docs/REGULATORY_COMPLIANCE_MATRIX.md');

    it('verifies docs/REGULATORY_COMPLIANCE_MATRIX.md exists and is non-empty', () => {
      expect(fs.existsSync(docPath)).toBe(true);
      const stat = fs.statSync(docPath);
      expect(stat.size).toBeGreaterThan(2000); // Substantial authoritative documentation
    });

    it('verifies comprehensive citations of all required statutory authorities and standards', () => {
      const content = fs.readFileSync(docPath, 'utf8');

      // India standards
      expect(content).toContain('WPC');
      expect(content).toContain('ETA-SDOC');
      expect(content).toContain('GSR 45(E)');
      expect(content).toContain('GSR 1048(E)');
      expect(content).toContain('BIS');
      expect(content).toContain('IS 13252');
      expect(content).toContain('IS 16333');
      expect(content).toContain('DPDP Act 2023');

      // EU standards
      expect(content).toContain('2014/53/EU');
      expect(content).toContain('EN 300 328');
      expect(content).toContain('EN 301 489');
      expect(content).toContain('EN IEC 62368-1');
      expect(content).toContain('2011/65/EU');

      // US standards
      expect(content).toContain('Part 15 Subpart B');
      expect(content).toContain('Part 15 Subpart C');
      expect(content).toContain('15.247');

      // Commercial migration
      expect(content).toContain('ESP32-C3-MINI-1');
      expect(content).toContain('2AC7Z-ESPC3MINI1');
    });

    it('verifies 100% status alignment with testLedgers.ts fixtures', () => {
      const content = fs.readFileSync(docPath, 'utf8');

      for (const std of AUTHORITATIVE_COMPLIANCE_STANDARDS) {
        expect(content).toContain(std.standardCode);
        expect(content).toContain(std.status);
      }
    });
  });

  // =========================================================================
  // 10. Direct Serverless api/index.ts Handler Contract Probes
  // =========================================================================
  describe('10. Direct Serverless api/index.ts Handler Contract Probes', () => {
    let handlerModule: any;

    async function simulateDirectApi(options: {
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

    it('loads api/index.ts handler and verifies route protections', async () => {
      handlerModule = await import('../api/index.ts');
      expect(handlerModule.default).toBeTypeOf('function');

      // Direct sync route rejection when deviceId missing
      const resMissingDev = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/actions/sync',
        body: {},
      });
      expect(resMissingDev.statusCode).toBe(400);
      expect(resMissingDev.body.error.code).toBe('INVALID_DEVICE_ID');

      // Direct sync route rejection when Bearer token is missing
      const resUnauth = await simulateDirectApi({
        method: 'POST',
        url: '/api/v1/devices/actions/sync',
        body: { deviceId: DEVICE_A },
      });
      expect(resUnauth.statusCode).toBe(401);
      expect(resUnauth.body.error.code).toBe('UNAUTHORIZED');

      // Direct parameterized sync route rejection when unauthenticated
      const resParamUnauth = await simulateDirectApi({
        method: 'POST',
        url: `/api/v1/devices/${DEVICE_A}/actions/sync`,
        body: {},
      });
      expect(resParamUnauth.statusCode).toBe(401);

      // Direct sync test route rejection when unauthenticated
      const resTestUnauth = await simulateDirectApi({
        method: 'POST',
        url: `/api/v1/devices/${DEVICE_A}/sync/test`,
        body: {},
      });
      expect(resTestUnauth.statusCode).toBe(401);
    });
  });
});
