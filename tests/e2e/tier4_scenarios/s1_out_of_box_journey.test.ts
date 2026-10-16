import { describe, it, expect } from 'vitest';
import { MockFirmwareDevice } from '../fixtures/mockFirmwareDevice';
import { MockBackendServer } from '../fixtures/mockBackendServer';

describe('Tier 4: Scenario 1 — End-to-End Out-Of-Box Experience (OOBE) Journey', () => {
  it('Executes complete unboxing, local SoftAP setup, cloud bootstrap, OLED QR claim, and initial heartbeat', async () => {
    const server = new MockBackendServer();
    const dev = new MockFirmwareDevice('nova-c3-5c20dc4239fca9ec', '48:F6:EE:17:34:D8');

    // Step 1: Physical Unboxing & Power On (USB 5V connected)
    dev.boot();
    expect(dev.state).toBe('SETUP');
    expect(dev.isSoftApActive).toBe(true);
    expect(dev.oled.currentPrimitive).toBe('pairing_qr');

    // Step 2: User connects to SoftAP captive portal (http://192.168.4.1) and submits router credentials
    // Note: Credentials are sent directly from browser to hardware over local SoftAP link, NEVER via cloud!
    dev.nvs.set('wifi_ssid', 'MyHomeRouter_2.4G');
    dev.nvs.set('wifi_pass', 'MyRouterPassword_987');
    dev.reconnectWifi('MyHomeRouter_2.4G', -48);
    expect(dev.isWifiConnected).toBe(true);
    expect(dev.state).toBe('IDLE');

    // Step 3: Hardware boots online and performs TLS Cloud Bootstrap
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: dev.deviceId,
        macAddress: dev.macAddress,
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });

    expect(bootRes.status).toBe(200);
    const { deviceKey, claimToken, shortCode, portalUrl } = bootRes.body.data;
    expect(deviceKey).toMatch(/^dkey_/);
    expect(claimToken).toMatch(/^clm_live_/);
    expect(shortCode).toMatch(/^NOV-/);
    expect(portalUrl).toContain(claimToken);

    // Step 4: Hardware stores deviceKey in encrypted NVS and renders QR on SSD1306 OLED
    dev.nvs.set('device_key', deviceKey);
    dev.oled.renderExpression('pairing_qr');
    expect(dev.oled.currentPrimitive).toBe('pairing_qr');

    // Step 5: User scans QR code with smartphone and claims device on web dashboard
    const claimRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: { claimToken },
    });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    const sessionToken = claimRes.body.data.pairingSessionId;
    expect(sessionToken).toMatch(/^sess_/);

    // Step 6: Initial authenticated heartbeat from hardware to cloud
    const heartbeatRes = await server.handleRequest({
      method: 'POST',
      path: `/api/v1/devices/${dev.deviceId}/heartbeat`,
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: {
        rssi: -48,
        ipAddress: '192.168.1.155',
        oledState: 'idle',
      },
    });

    expect(heartbeatRes.status).toBe(200);
    expect(heartbeatRes.body.data.acknowledged).toBe(true);

    // Step 7: Web client verifies device is online in dashboard
    const statusRes = await server.handleRequest({
      method: 'GET',
      path: `/api/v1/devices/${dev.deviceId}/status`,
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.online).toBe(true);
    expect(statusRes.body.data.status).toBe('online');
    expect(statusRes.body.data.wifi.ssid).toBe('Home_Wifi');
  });
});
