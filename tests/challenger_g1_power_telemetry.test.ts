import { describe, it, expect } from 'vitest';
import { MockBackendServer } from './e2e/fixtures/mockBackendServer';

describe('Challenger G1: Adversarial Power Telemetry & Truth-in-Hardware Probes', () => {
  const server = new MockBackendServer();
  const TEST_DEVICE_A = 'nova-c3-5c20dc4239fca9ec';
  const TEST_DEVICE_B = 'nova-c3-7b31aa1102bb88cc';
  const FACTORY_SECRET_A = 'factory_bootstrap_secret_12345';
  const FACTORY_SECRET_B = 'factory_bootstrap_secret_67890';
  let deviceKeyA = '';
  let deviceKeyB = '';

  it('Setup: Bootstrap test devices A and B', async () => {
    // Seed device B
    const crypto = await import('crypto');
    const hashB = crypto.createHash('sha256').update(FACTORY_SECRET_B).digest('hex');
    server.bootstrapCredentials.set(TEST_DEVICE_B, { hash: hashB, isUsed: false });

    // Bootstrap A
    const resA = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: TEST_DEVICE_A,
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: FACTORY_SECRET_A,
      },
    });
    expect(resA.status).toBe(200);
    deviceKeyA = resA.body.data.deviceKey;

    // Bootstrap B
    const resB = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: TEST_DEVICE_B,
        macAddress: '48:F6:EE:17:34:D9',
        bootstrapSecret: FACTORY_SECRET_B,
      },
    });
    expect(resB.status).toBe(200);
    deviceKeyB = resB.body.data.deviceKey;
  });

  describe('Adversarial Power Source Spoofing Probes', () => {
    const invalidSources = [
      'battery',
      'lipo',
      '18650_cell',
      'solar',
      'poe_48v',
      'car_12v',
      'wireless_qi',
      '',
      '   ',
      'usb_5v_fake',
      '5v_battery',
      'lithium_ion',
      'coin_cell',
    ];

    for (const source of invalidSources) {
      it(`rejects fabricated power source "${source}" with 400 INVALID_POWER_TELEMETRY`, async () => {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: {
            power_source: source,
            rssi: -50,
          },
        });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
      });
    }

    it('rejects powerSource when provided as numeric voltage', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          powerSource: 5000,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });
  });

  describe('Adversarial Battery Metric Spoofing Probes', () => {
    const batteryAttacks = [
      { name: 'batteryPercent: 0 (zero percent)', body: { batteryPercent: 0 } },
      { name: 'batteryPercent: 100 (full charge)', body: { batteryPercent: 100 } },
      { name: 'batteryPercent: -1 (negative percent)', body: { batteryPercent: -1 } },
      { name: 'batteryPercent: 42.5 (float percent)', body: { batteryPercent: 42.5 } },
      { name: 'battery_percent: 75 (snake_case)', body: { battery_percent: 75 } },
      { name: 'batteryMv: 3700 (LiPo nominal mV)', body: { batteryMv: 3700 } },
      { name: 'battery_mv: 4200 (LiPo charged mV)', body: { battery_mv: 4200 } },
      { name: 'stealth attack: valid usb_5v + batteryPercent: 90', body: { power_source: 'usb_5v', batteryPercent: 90 } },
      { name: 'stealth attack: valid usb-c_5v + batteryMv: 4100', body: { powerSource: 'usb-c_5v', batteryMv: 4100 } },
      { name: 'stealth attack: valid power_line_usb_5v + battery_percent: 20', body: { powerStatus: 'power_line_usb_5v', battery_percent: 20 } },
    ];

    for (const attack of batteryAttacks) {
      it(`strictly rejects ${attack.name} with 400 INVALID_POWER_TELEMETRY`, async () => {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: attack.body,
        });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
      });
    }
  });

  describe('Truth-in-Hardware Valid Payloads & Null Resilience', () => {
    const legitimateVariants = [
      'usb_5v',
      'USB_5V',
      'usb-c_5v',
      'USB-C_5V',
      'usb_c_5v',
      'power_line_usb_5v',
      'POWER_LINE_USB_5V',
      'usb-c 5v bus',
      ' USB-C 5V BUS ',
    ];

    for (const variant of legitimateVariants) {
      it(`accepts legitimate USB power source variant "${variant}" with 200 OK`, async () => {
        const res = await server.handleRequest({
          method: 'POST',
          path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
          headers: { Authorization: `Bearer ${deviceKeyA}` },
          body: {
            power_source: variant,
            rssi: -60,
            oledState: 'idle',
          },
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    }

    it('accepts legitimate payload with explicit null battery values (firmware contract)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          power_source: 'usb_5v',
          batteryMv: null,
          batteryPercent: null,
          battery_mv: null,
          battery_percent: null,
          rssi: -58,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.acknowledged).toBe(true);
    });
  });

  describe('Authorization & Cross-Device Spoofing Probes', () => {
    it('rejects cross-device heartbeat spoofing (Device A key calling Device B endpoint)', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_B}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: { power_source: 'usb_5v' },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CROSS_DEVICE_FORBIDDEN');
    });

    it('rejects unauthenticated heartbeat request with 401 UNAUTHORIZED', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
        body: { power_source: 'usb_5v' },
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid device bearer token with 401 UNAUTHORIZED', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
        headers: { Authorization: 'Bearer totally_bogus_token_xyz' },
        body: { power_source: 'usb_5v' },
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('strictly rejects secret Wi-Fi credentials embedded in telemetry payload', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_A}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKeyA}` },
        body: {
          power_source: 'usb_5v',
          wifiPassword: 'my_secret_wifi_password_123',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TELEMETRY');
    });
  });
});
