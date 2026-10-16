import { describe, it, expect } from 'vitest';
import { MockBackendServer } from '../fixtures/mockBackendServer';

describe('Tier 2: Boundary & Corner Cases — R5 Customer Experience & Modern Web Platform', () => {
  it('T2-R5-01: Verifies vault limit: Adding a 6th Wi-Fi profile returns 400 VAULT_LIMIT_REACHED', async () => {
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

    // Add 5 profiles (maximum capacity)
    for (let i = 1; i <= 5; i++) {
      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
        headers: { Authorization: `Bearer ${deviceKey}` },
        body: {
          name: `Network ${i}`,
          ssid: `SSID_${i}`,
          password: `pass_${i}_secure`,
          isDefault: i === 1,
        },
      });
      expect(res.status).toBe(201);
    }

    // Attempt to add 6th profile
    const overflowRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: {
        name: 'Overflow Network',
        ssid: 'SSID_Overflow',
        password: 'pass_overflow_secure',
      },
    });

    expect(overflowRes.status).toBe(400);
    expect(overflowRes.body.error.code).toBe('VAULT_LIMIT_REACHED');
  });

  it('T2-R5-02: Verifies SSID length boundary: 1 character and 32 characters accepted', async () => {
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

    // 1-char SSID
    const minRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'Min', ssid: 'A', password: 'password123' },
    });
    expect(minRes.status).toBe(201);

    // 32-char SSID (max standard 802.11 SSID length)
    const maxSsid = 'A'.repeat(32);
    const maxRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'Max', ssid: maxSsid, password: 'password123' },
    });
    expect(maxRes.status).toBe(201);
  });

  it('T2-R5-03: Verifies WPA2 password boundary length: 63-character maximum', async () => {
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

    const maxPass = 'P'.repeat(63);
    const res = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'MaxPass', ssid: 'MaxPassNet', password: maxPass },
    });

    expect(res.status).toBe(201);
  });

  it('T2-R5-04: Verifies deleting profile recompacts voice slots to contiguous 1..N order', async () => {
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

    // Add 3 profiles
    await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'P1', ssid: 'SSID_1', password: 'pass1' },
    });
    const p2 = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'P2', ssid: 'SSID_2', password: 'pass2' },
    });
    await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'P3', ssid: 'SSID_3', password: 'pass3' },
    });

    const p2Id = p2.body.data.profile.id;

    // Delete middle profile (P2)
    const delRes = await server.handleRequest({
      method: 'DELETE',
      path: `/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles/${p2Id}`,
      headers: { Authorization: `Bearer ${deviceKey}` },
    });
    expect(delRes.status).toBe(200);

    // List remaining profiles: P3 should now be slot 2 ("network two")
    const listRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });

    const profiles = listRes.body.data.profiles;
    expect(profiles.length).toBe(2);
    expect(profiles[0].slotNumber).toBe(1);
    expect(profiles[0].voiceSlot).toBe('network one');
    expect(profiles[1].slotNumber).toBe(2);
    expect(profiles[1].voiceSlot).toBe('network two');
  });

  it('T2-R5-05: Verifies making profile default ensures exactly one default profile exists', async () => {
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

    await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'P1', ssid: 'SSID_1', password: 'pass1', isDefault: true },
    });
    const p2 = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'P2', ssid: 'SSID_2', password: 'pass2', isDefault: false },
    });

    const p2Id = p2.body.data.profile.id;

    // Set P2 as default
    const makeDefRes = await server.handleRequest({
      method: 'POST',
      path: `/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles/${p2Id}/make-default`,
      headers: { Authorization: `Bearer ${deviceKey}` },
    });
    expect(makeDefRes.status).toBe(200);

    const list = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
    });

    const defaultCount = list.body.data.profiles.filter((p: any) => p.isDefault).length;
    expect(defaultCount).toBe(1);
    expect(list.body.data.profiles.find((p: any) => p.id === p2Id).isDefault).toBe(true);
  });
});
