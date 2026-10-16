import { describe, it, expect } from 'vitest';
import { MockBackendServer } from '../fixtures/mockBackendServer';

describe('Tier 2: Boundary & Corner Cases — R6 Hardened Backend & Data Architecture', () => {
  it('T2-R6-01: Verifies expired claim token (15-minute boundary) returns 400 CLAIM_TOKEN_EXPIRED', async () => {
    const server = new MockBackendServer();
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    const claimToken = bootRes.body.data.claimToken;

    // Fast-forward token expiration (15 minutes + 1 second)
    const tokenRec = server.claimTokens.get(claimToken);
    if (tokenRec) {
      tokenRec.expiresAt = new Date(Date.now() - 1000);
    }

    const claimRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: { claimToken },
    });

    expect(claimRes.status).toBe(400);
    expect(claimRes.body.error.code).toBe('CLAIM_TOKEN_EXPIRED');
  });

  it('T2-R6-02: Verifies tampered AES-256-GCM auth tag throws decryption error', () => {
    const server = new MockBackendServer();
    const plaintext = 'top_secret_credentials';
    const encrypted = server.encrypt(plaintext);

    const parts = encrypted.split(':');
    // Tamper with auth tag (flip last character)
    const tamperedTag = parts[1].slice(0, -1) + (parts[1].endsWith('0') ? '1' : '0');
    const tamperedCiphertext = `${parts[0]}:${tamperedTag}:${parts[2]}`;

    expect(() => server.decrypt(tamperedCiphertext)).toThrow();
  });

  it('T2-R6-03: Verifies 90-second heartbeat liveness boundary marks device offline and scrubs IP', async () => {
    const server = new MockBackendServer();
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    const deviceKey = bootRes.body.data.deviceKey;

    const dev = server.devices.get('nova-c3-5c20dc4239fca9ec');
    expect(dev).toBeDefined();

    // Case 1: Fresh heartbeat (30s ago) -> online
    dev!.lastHeartbeat = new Date(Date.now() - 30000);
    const freshStatus = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });
    expect(freshStatus.body.data.status).toBe('online');
    expect(freshStatus.body.data.online).toBe(true);

    // Case 2: Stale heartbeat (91s ago) -> offline, transient telemetry scrubbed
    dev!.lastHeartbeat = new Date(Date.now() - 91000);
    const staleStatus = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });
    expect(staleStatus.body.data.status).toBe('offline');
    expect(staleStatus.body.data.online).toBe(false);
    expect(staleStatus.body.data.wifi.ipAddress).toBeNull();
    expect(staleStatus.body.data.wifi.rssi).toBeNull();
  });

  it('T2-R6-04: Verifies HTTP 304 Not Modified caching with ETag headers', async () => {
    const server = new MockBackendServer();
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    const deviceKey = bootRes.body.data.deviceKey;

    // First query retrieves vault and ETag
    const firstRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });
    expect(firstRes.status).toBe(200);
    const etag = firstRes.headers['ETag'];
    expect(etag).toBeDefined();

    // Second query with matching If-None-Match returns 304
    const cachedRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: {
        Authorization: `Bearer ${deviceKey}`,
        'if-none-match': etag,
      },
    });
    expect(cachedRes.status).toBe(304);

    // Third query with stale ETag returns fresh 200
    const staleRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: {
        Authorization: `Bearer ${deviceKey}`,
        'if-none-match': 'W/"vault-nova-c3-5c20dc4239fca9ec-v999"',
      },
    });
    expect(staleRes.status).toBe(200);
  });

  it('T2-R6-05: Verifies endpoint rejects empty body payloads on required POST routes', async () => {
    const server = new MockBackendServer();

    const emptyBootstrap = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {},
    });
    expect(emptyBootstrap.status).toBe(400);

    const emptyClaim = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: {},
    });
    expect(emptyClaim.status).toBe(400);
  });
});
