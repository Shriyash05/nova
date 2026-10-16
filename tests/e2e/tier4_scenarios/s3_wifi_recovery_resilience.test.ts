import { describe, it, expect } from 'vitest';
import { MockFirmwareDevice } from '../fixtures/mockFirmwareDevice';
import { MockBackendServer } from '../fixtures/mockBackendServer';

describe('Tier 4: Scenario 3 — Network Disruption & Automated Recovery Resilience Journey', () => {
  it('Executes router drop during operation, graceful offline transition, outbox buffering, and reconnection reconciliation', async () => {
    const server = new MockBackendServer();
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Primary_AP');
    dev.boot();

    // 1. Hardware enrolls with cloud
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: dev.deviceId,
        macAddress: dev.macAddress,
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    const deviceKey = bootRes.body.data.deviceKey;

    // 2. Add multiple Wi-Fi profiles into cloud vault
    await server.handleRequest({
      method: 'POST',
      path: `/api/v1/devices/${dev.deviceId}/wifi-profiles`,
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'Home Studio', ssid: 'Primary_AP', password: 'pass1', isDefault: true },
    });
    await server.handleRequest({
      method: 'POST',
      path: `/api/v1/devices/${dev.deviceId}/wifi-profiles`,
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { name: 'Mobile Hotspot', ssid: 'Backup_Hotspot', password: 'pass2', isDefault: false },
    });

    // 3. Router suddenly powers down: Wi-Fi disconnect occurs
    dev.disconnectWifi();
    expect(dev.state).toBe('OFFLINE');
    expect(dev.isWifiConnected).toBe(false);
    expect(dev.oled.currentPrimitive).toBe('offline');

    // 4. While offline, user records an urgent memo -> buffered in NVS outbox queue
    const queuedId = dev.nvs.enqueue('voice_memo', '{"memo": "sync this when back online"}');
    expect(dev.nvs.getQueueCount()).toBe(1);

    // 5. Hardware scans available networks, detects Backup_Hotspot, and reconnects
    const reconnected = dev.reconnectWifi('Backup_Hotspot', -62);
    expect(reconnected).toBe(true);
    expect(dev.state).toBe('IDLE');
    expect(dev.isWifiConnected).toBe(true);

    // 6. Report Wi-Fi connection result to cloud backend
    const resultRes = await server.handleRequest({
      method: 'POST',
      path: `/api/v1/devices/${dev.deviceId}/wifi-profile-result`,
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: {
        profileId: 'prof_backup',
        result: 'connected',
        rssi: -62,
        appliedVersion: 2,
      },
    });
    expect(resultRes.status).toBe(200);
    expect(resultRes.body.data.acknowledged).toBe(true);

    // 7. Drain and acknowledge buffered NVS outbox queue item
    const peeked = dev.nvs.peekQueue();
    expect(peeked?.id).toBe(queuedId);
    const acked = dev.nvs.ackQueue(queuedId);
    expect(acked).toBe(true);
    expect(dev.nvs.getQueueCount()).toBe(0);

    // 8. Send fresh heartbeat
    const hb = await server.handleRequest({
      method: 'POST',
      path: `/api/v1/devices/${dev.deviceId}/heartbeat`,
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: { rssi: -62, oledState: 'idle' },
    });
    expect(hb.status).toBe(200);
  });
});
