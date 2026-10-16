import { describe, it, expect } from 'vitest';
import { MockBackendServer } from '../fixtures/mockBackendServer';

describe('Tier 2: Boundary & Corner Cases — R7 Security Threat Model & Red-Team Audit', () => {
  it('T2-R7-01: Verifies SQL injection patterns in Authorization headers return 401 safely', async () => {
    const server = new MockBackendServer();
    const sqliHeader = "Bearer ' OR '1'='1; DROP TABLE devices; --";

    const res = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: sqliHeader },
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('T2-R7-02: Verifies path traversal attacks in deviceId parameter do not expose host filesystem', async () => {
    const server = new MockBackendServer();

    const traversalRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/../../etc/passwd/status',
      headers: { Authorization: 'Bearer test' },
    });

    expect([401, 403, 404]).toContain(traversalRes.status);
  });

  it('T2-R7-03: Verifies device key rotation immediately invalidates the old deviceKey', async () => {
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
    const oldKey = bootRes.body.data.deviceKey;

    // Rotate key
    const rotRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/device-key/rotate',
      headers: { Authorization: `Bearer ${oldKey}` },
    });
    expect(rotRes.status).toBe(200);
    const newKey = rotRes.body.data.deviceKey;
    expect(newKey).not.toBe(oldKey);

    // Old key must now be rejected with 401
    const oldKeyRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: `Bearer ${oldKey}` },
    });
    expect(oldKeyRes.status).toBe(401);

    // New key succeeds
    const newKeyRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: `Bearer ${newKey}` },
    });
    expect(newKeyRes.status).toBe(200);
  });

  it('T2-R7-04: Verifies heartbeat telemetry rejects payloads containing cleartext passwords', async () => {
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

    const leakRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/heartbeat',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: {
        rssi: -50,
        wifiPassword: 'my_home_wifi_password_leaked',
      },
    });

    expect(leakRes.status).toBe(400);
    expect(leakRes.body.error.code).toBe('INVALID_TELEMETRY');
  });

  it('T2-R7-05: Verifies expired pairing sessions are rejected with 401 SESSION_EXPIRED', async () => {
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
    const claimRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: { claimToken: bootRes.body.data.claimToken },
    });
    const sessionId = claimRes.body.data.pairingSessionId;

    // Fast-forward session expiration
    const session = server.pairingSessions.get(sessionId);
    if (session) {
      session.expiresAt = new Date(Date.now() - 1000);
    }

    const accessRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: `Bearer ${sessionId}` },
    });

    expect(accessRes.status).toBe(401);
    expect(accessRes.body.error.code).toBe('SESSION_EXPIRED');
  });
});
