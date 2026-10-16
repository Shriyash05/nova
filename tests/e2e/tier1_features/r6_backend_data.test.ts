import { describe, it, expect } from 'vitest';
import { MockBackendServer } from '../fixtures/mockBackendServer';

describe('Tier 1: Feature Coverage — R6 Hardened Backend & Data Architecture', () => {
  it('T1-R6-01: Verifies AES-256-GCM envelope encryption format and roundtrip integrity', () => {
    const server = new MockBackendServer();
    const secret = 'my_super_secret_wifi_password_42!';

    const encrypted = server.encrypt(secret);
    // Format must be ivHex:authTagHex:ciphertextHex
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);
    expect(parts[0].length).toBe(24); // 12-byte IV in hex = 24 chars
    expect(parts[1].length).toBe(32); // 16-byte auth tag in hex = 32 chars
    expect(parts[2].length).toBeGreaterThan(0);

    const decrypted = server.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('T1-R6-02: Verifies zero secret leakage: device bearer secrets never appear in status payload', async () => {
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

    const statusRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.deviceKey).toBeUndefined();
    expect(statusRes.body.data.device_secret).toBeUndefined();
    expect(statusRes.body.data.bootstrapHash).toBeUndefined();
  });

  it('T1-R6-03: Verifies unauthenticated requests to device endpoints are strictly rejected (401)', async () => {
    const server = new MockBackendServer();

    const noAuthRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
    });
    expect(noAuthRes.status).toBe(401);
    expect(noAuthRes.body.error.code).toBe('UNAUTHORIZED');

    const badAuthRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/status',
      headers: { Authorization: 'Bearer forged_fake_token_value' },
    });
    expect(badAuthRes.status).toBe(401);
  });

  it('T1-R6-04: Verifies Notion disconnection scrubs tokens and prevents unauthorized sync tests', async () => {
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

    // Seed Notion record
    server.notionAuths.set('nova-c3-5c20dc4239fca9ec', {
      deviceId: 'nova-c3-5c20dc4239fca9ec',
      workspaceId: 'ws_mock_123',
      workspaceName: 'Design Studio',
      encryptedAccessToken: server.encrypt('secret_mock_notion_token'),
      targetDatabaseId: 'db_mock_456',
      targetDatabaseName: 'Quick Notes',
      connectedAt: new Date(),
    });

    // Disconnect Notion
    const discRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/notion/disconnect',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });
    expect(discRes.status).toBe(200);
    expect(discRes.body.data.disconnected).toBe(true);

    // Sync test should now fail with NOTION_NOT_CONNECTED
    const syncRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/sync/test',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });
    expect(syncRes.status).toBe(400);
    expect(syncRes.body.error.code).toBe('NOTION_NOT_CONNECTED');
  });

  it('T1-R6-05: Verifies /wifi-profiles/boot returns default profile with decrypted password for hardware', async () => {
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

    // Add default profile
    await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: {
        name: 'Workshop Boot AP',
        ssid: 'Workshop_2.4G',
        password: 'hardware_boot_secret',
        isDefault: true,
      },
    });

    // Hardware requests boot config
    const bootProfileRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles/boot',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });

    expect(bootProfileRes.status).toBe(200);
    expect(bootProfileRes.body.data.hasDefault).toBe(true);
    expect(bootProfileRes.body.data.defaultProfile.ssid).toBe('Workshop_2.4G');
    expect(bootProfileRes.body.data.defaultProfile.password).toBe('hardware_boot_secret');
  });
});
