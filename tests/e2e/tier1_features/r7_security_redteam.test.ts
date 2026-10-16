import { describe, it, expect } from 'vitest';
import { MockBackendServer } from '../fixtures/mockBackendServer';
import crypto from 'crypto';

describe('Tier 1: Feature Coverage — R7 Security Threat Model & Red-Team Audit', () => {
  it('T1-R7-01: Verifies IDOR prevention: Token for Device A cannot access Device B resources (403)', async () => {
    const server = new MockBackendServer();

    // Setup Device A
    const bootA = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    const deviceKeyA = bootA.body.data.deviceKey;

    // Pre-enroll Device B
    const devBId = 'nova-c3-victim99887766';
    const secretB = 'victim_secret_777';
    server.bootstrapCredentials.set(devBId, {
      hash: crypto.createHash('sha256').update(secretB).digest('hex'),
      isUsed: false,
    });
    const bootB = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: devBId,
        macAddress: '11:22:33:44:55:66',
        bootstrapSecret: secretB,
      },
    });
    expect(bootB.status).toBe(200);

    // Attacker uses Device A key to access Device B profiles
    const idorRes = await server.handleRequest({
      method: 'GET',
      path: `/api/v1/devices/${devBId}/wifi-profiles`,
      headers: { Authorization: `Bearer ${deviceKeyA}` },
    });

    expect(idorRes.status).toBe(403);
    expect(idorRes.body.error.code).toBe('CROSS_DEVICE_FORBIDDEN');
  });

  it('T1-R7-02: Verifies device spoofing rejection: Invalid or forged credentials return 401', async () => {
    const server = new MockBackendServer();

    const forgedRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/heartbeat',
      headers: { Authorization: 'Bearer dkey_forged_random_attacker_key' },
      body: { rssi: -40 },
    });

    expect(forgedRes.status).toBe(401);
  });

  it('T1-R7-03: Verifies single-use bootstrap guarantee: Replay returns 409 BOOTSTRAP_ALREADY_USED', async () => {
    const server = new MockBackendServer();

    // First enrollment succeeds
    const firstRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    expect(firstRes.status).toBe(200);

    // Attacker replays bootstrap request
    const replayRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });

    expect(replayRes.status).toBe(409);
    expect(replayRes.body.error.code).toBe('BOOTSTRAP_ALREADY_USED');
  });

  it('T1-R7-04: Verifies cloud provisioning guard rejects direct cloud Wi-Fi provisioning (400)', async () => {
    const server = new MockBackendServer();

    const guardRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi/provision',
      body: { ssid: 'RogueAP', password: 'malicious_pass' },
    });

    expect(guardRes.status).toBe(400);
    expect(guardRes.body.error.code).toBe('LOCAL_PROVISIONING_REQUIRED');
  });

  it('T1-R7-05: Verifies claim token single-use guarantee: Replay returns 400 CLAIM_TOKEN_ALREADY_USED', async () => {
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

    // First claim succeeds
    const claim1 = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: { claimToken },
    });
    expect(claim1.status).toBe(200);

    // Second claim fails
    const claim2 = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: { claimToken },
    });
    expect(claim2.status).toBe(400);
    expect(claim2.body.error.code).toBe('CLAIM_TOKEN_ALREADY_USED');
  });
});
