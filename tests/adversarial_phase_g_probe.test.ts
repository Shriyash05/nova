import { describe, it, expect } from 'vitest';
import { MockBackendServer } from './e2e/fixtures/mockBackendServer';

describe('Adversarial Phase G Probes: Power Telemetry, FSM Transitions & Hardware Truth', () => {
  const server = new MockBackendServer();
  const DEVICE_A = 'nova-c3-5c20dc4239fca9ec';
  const DEVICE_B = 'nova-c3-b8f6ee1734d8a1b2';
  const FACTORY_SECRET = 'factory_bootstrap_secret_12345';
  let deviceAKey = '';
  let claimTokenA = '';

  it('Setup: Bootstrap Device A to acquire authentic device key', async () => {
    const res = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: DEVICE_A,
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: FACTORY_SECRET,
      },
    });
    expect(res.status).toBe(200);
    deviceAKey = res.body.data.deviceKey;
    claimTokenA = res.body.data.claimToken;
    expect(deviceAKey).toBeTruthy();
  });

  describe('Adversarial Power Source Probing: Enforce USB-C 5V Bus Line Only', () => {
    const validSources = [
      'usb_5v',
      'usb-c_5v',
      'usb_c_5v',
      'power_line_usb_5v',
      'usb-c 5v bus',
      'USB_5V',
      'USB-C_5V',
      '  usb_5v  ',
    ];

    for (const src of validSources) {
      it(`accepts legitimate line-powered descriptor: "${src}"`, async () => {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceAKey}` },
          body: {
            power_source: src,
            rssi: -50,
          },
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.powerSource).toBe('usb_5v');
      });
    }

    const invalidSources = [
      'battery',
      'lipo',
      'lipo_battery',
      '18650',
      'solar',
      'poe',
      '3.3v',
      '12v_barrel',
      'unknown',
      'ac_mains',
      '   ',
    ];

    for (const badSrc of invalidSources) {
      it(`strictly rejects unauthorized / fake power source: "${badSrc}" with 400`, async () => {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceAKey}` },
          body: {
            power_source: badSrc,
            rssi: -50,
          },
        });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
      });
    }

    it('strictly rejects empty string power_source: "" with 400 INVALID_POWER_TELEMETRY (nullish coalescing hardened)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceAKey}` },
        body: {
          power_source: '',
          rssi: -50,
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });

    it('rejects powerSource field sent via alternative key names if invalid', async () => {
      const res1 = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceAKey}` },
        body: { powerSource: 'battery_pack' },
      });
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('INVALID_POWER_TELEMETRY');

      const res2 = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceAKey}` },
        body: { powerStatus: 'nimh_cells' },
      });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });
  });

  describe('Adversarial Battery Telemetry Probing: Prohibit Fake Battery Numbers', () => {
    const fakeBatteryPayloads = [
      { label: 'batteryPercent: 0 (even 0% is fake battery)', body: { batteryPercent: 0 } },
      { label: 'batteryPercent: 85 (typical fake reading)', body: { batteryPercent: 85 } },
      { label: 'batteryPercent: 100', body: { batteryPercent: 100 } },
      { label: 'batteryPercent: -10 (negative)', body: { batteryPercent: -10 } },
      { label: 'battery_percent: 50 (snake_case)', body: { battery_percent: 50 } },
      { label: 'batteryMv: 4150 (legacy hardcoded firmware reading)', body: { batteryMv: 4150 } },
      { label: 'batteryMv: 3700 (nominal LiPo voltage)', body: { batteryMv: 3700 } },
      { label: 'batteryMv: 0', body: { batteryMv: 0 } },
      { label: 'battery_mv: 4200 (snake_case)', body: { battery_mv: 4200 } },
    ];

    for (const testCase of fakeBatteryPayloads) {
      it(`strictly rejects fake metric [${testCase.label}] with 400 INVALID_POWER_TELEMETRY`, async () => {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceAKey}` },
          body: {
            power_source: 'usb_5v',
            ...testCase.body,
          },
        });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
      });
    }

    it('accepts explicit null values for battery metrics (truth-in-hardware firmware contract)', async () => {
      // Firmware nova_net.c explicitly adds cJSON_AddNullToObject(body, "batteryMv")
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceAKey}` },
        body: {
          power_source: 'usb_5v',
          batteryMv: null,
          batteryPercent: null,
          rssi: -48,
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.acknowledged).toBe(true);
    });
  });

  describe('Adversarial Credential & Injection Probing in Heartbeat', () => {
    it('strictly rejects Wi-Fi passwords inside heartbeat telemetry (prevent credential leak to telemetry logs)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceAKey}` },
        body: {
          power_source: 'usb_5v',
          wifiPassword: 'my_secret_wifi_password_123',
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TELEMETRY');
    });

    it('strictly rejects password field inside heartbeat telemetry', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceAKey}` },
        body: {
          power_source: 'usb_5v',
          password: 'injected_admin_password',
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TELEMETRY');
    });

    it('rejects cross-device heartbeat forgery: Device A key sent to Device B path (403)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_B}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceAKey}` },
        body: { power_source: 'usb_5v' },
      });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CROSS_DEVICE_FORBIDDEN');
    });

    it('rejects unauthenticated heartbeat with 401', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${DEVICE_A}/heartbeat`,
        body: { power_source: 'usb_5v' },
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Direct Heartbeat Route Probing (/api/v1/devices/heartbeat)', () => {
    it('accepts valid deviceId via x-nova-device-id header with deviceKey', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/heartbeat',
        headers: {
          Authorization: `Bearer ${deviceAKey}`,
          'x-nova-device-id': DEVICE_A,
        },
        body: {
          powerSource: 'usb_5v',
          rssi: -60,
          oledState: 'idle',
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deviceId).toBe(DEVICE_A);
    });

    it('rejects direct heartbeat when deviceId mismatches authenticated bearer token (403)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/heartbeat',
        headers: {
          Authorization: `Bearer ${deviceAKey}`,
          'x-nova-device-id': DEVICE_B,
        },
        body: { powerSource: 'usb_5v' },
      });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
