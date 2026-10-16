import { describe, it, expect } from 'vitest';
import { MockBackendServer } from './e2e/fixtures/mockBackendServer';

describe('Phase G: End-to-End System Integration & Contract Validation', () => {
  const server = new MockBackendServer();
  const TEST_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';
  const FACTORY_BOOTSTRAP_SECRET = 'factory_bootstrap_secret_12345';
  let deviceKey = '';
  let claimToken = '';
  let pairingSessionId = '';

  it('1. POST /api/v1/devices/bootstrap: Enrolls physical hardware and yields deviceKey & claimToken', async () => {
    const res = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: TEST_DEVICE_ID,
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: FACTORY_BOOTSTRAP_SECRET,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe(TEST_DEVICE_ID);
    expect(res.body.data.deviceKey).toBeDefined();
    expect(res.body.data.claimToken).toBeDefined();

    deviceKey = res.body.data.deviceKey;
    claimToken = res.body.data.claimToken;
  });

  it('2. POST /api/v1/devices/claim: Exchanges claim token for 30-day web pairing session', async () => {
    const res = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: {
        claimToken,
        userId: 'usr_owner_001',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pairingSessionId).toBeDefined();
    expect(res.body.data.deviceId).toBe(TEST_DEVICE_ID);

    pairingSessionId = res.body.data.pairingSessionId;
  });

  describe('3. POST /api/v1/devices/heartbeat & Truth-in-Hardware Validation', () => {
    it('accepts valid power telemetry (usb_5v) with 200 OK', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKey}` },
        body: {
          power_source: 'usb_5v',
          rssi: -52,
          oledState: 'idle',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.acknowledged).toBe(true);
      expect(res.body.data.powerSource).toBe('usb_5v');
    });

    it('accepts valid direct heartbeat POST /api/v1/devices/heartbeat with x-nova-device-id', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/heartbeat',
        headers: {
          Authorization: `Bearer ${deviceKey}`,
          'x-nova-device-id': TEST_DEVICE_ID,
        },
        body: {
          powerSource: 'usb-c_5v',
          rssi: -55,
          oledState: 'listening',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deviceId).toBe(TEST_DEVICE_ID);
    });

    it('strictly rejects non-USB power source (e.g. battery) with 400 INVALID_POWER_TELEMETRY', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKey}` },
        body: {
          power_source: 'battery',
          rssi: -50,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });

    it('strictly rejects fake battery percentage (e.g. batteryPercent: 85) with 400', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKey}` },
        body: {
          power_source: 'usb_5v',
          batteryPercent: 85,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_POWER_TELEMETRY');
    });

    it('strictly rejects Wi-Fi passwords in heartbeat telemetry with 400 INVALID_TELEMETRY', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/heartbeat`,
        headers: { Authorization: `Bearer ${deviceKey}` },
        body: {
          power_source: 'usb_5v',
          wifiPassword: 'super_secret_wifi_key',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TELEMETRY');
    });
  });

  describe('4. GET /api/v1/devices/:id/status: Telemetry and Health Queries', () => {
    it('returns device status to authenticated device bearer', async () => {
      const res = await server.handleRequest({
        method: 'GET',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/status`,
        headers: { Authorization: `Bearer ${deviceKey}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(TEST_DEVICE_ID);
      expect(res.body.data.status).toBe('online');
      expect(res.body.data.hardwareModel).toBe('ESP32-C3 Super Mini');
    });

    it('returns device status to web client with pairing session', async () => {
      const res = await server.handleRequest({
        method: 'GET',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/status`,
        headers: { Authorization: `Bearer ${pairingSessionId}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(TEST_DEVICE_ID);
    });

    it('rejects unauthenticated status requests with 401', async () => {
      const res = await server.handleRequest({
        method: 'GET',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/status`,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. GET /api/v1/devices/:id/wifi-profiles: Provisioning Vault Contracts', () => {
    it('creates a profile and enforces password masking for web clients vs decryption for firmware', async () => {
      // 1. Create a profile
      const createRes = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/wifi-profiles`,
        headers: { Authorization: `Bearer ${deviceKey}` },
        body: {
          name: 'Lab Studio AP',
          ssid: 'NOVA_Lab_WiFi',
          password: 'secret_wpa2_password_xyz',
          isDefault: true,
        },
      });
      expect(createRes.status).toBe(201);

      // 2. Query as Web Client (pairing session) -> Password MUST be masked
      const webRes = await server.handleRequest({
        method: 'GET',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/wifi-profiles`,
        headers: { Authorization: `Bearer ${pairingSessionId}` },
      });
      expect(webRes.status).toBe(200);
      expect(webRes.body.data.profiles[0].hasPassword).toBe(true);
      expect(webRes.body.data.profiles[0].password).toBeUndefined();

      // 3. Query as Firmware -> Password MUST be decrypted for physical connection
      const hwRes = await server.handleRequest({
        method: 'GET',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/wifi-profiles`,
        headers: { Authorization: `Bearer ${deviceKey}` },
      });
      expect(hwRes.status).toBe(200);
      expect(hwRes.body.data.profiles[0].password).toBe('secret_wpa2_password_xyz');
    });
  });

  describe('6. POST /api/v1/devices/actions/sync: Cloud Action Synchronization', () => {
    it('supports direct actions/sync route with deviceKey and x-nova-device-id header', async () => {
      // Authorize Notion mock for device
      server.notionAuths.set(TEST_DEVICE_ID, {
        encryptedAccessToken: 'enc_token_valid',
        workspaceName: 'Acme Research',
        targetDatabaseId: 'db_notion_001',
      });

      const res = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/actions/sync',
        headers: {
          Authorization: `Bearer ${deviceKey}`,
          'x-nova-device-id': TEST_DEVICE_ID,
        },
        body: {
          actionType: 'voice_memo',
          sampleCount: 32000,
          speechEnergy: 450,
          source: 'MAX4466_GPIO1',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pageId).toBeDefined();
    });

    it('supports parameterized /api/v1/devices/:id/actions/sync route', async () => {
      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/actions/sync`,
        headers: { Authorization: `Bearer ${deviceKey}` },
        body: {
          actionType: 'voice_memo',
          sampleCount: 16000,
          speechEnergy: 520,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects sync request when Notion is not connected with 400 NOTION_NOT_CONNECTED', async () => {
      // Remove Notion authorization for device
      server.notionAuths.delete(TEST_DEVICE_ID);

      const res = await server.handleRequest({
        method: 'POST',
        path: `/api/v1/devices/${TEST_DEVICE_ID}/actions/sync`,
        headers: { Authorization: `Bearer ${deviceKey}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOTION_NOT_CONNECTED');
    });
  });
});
