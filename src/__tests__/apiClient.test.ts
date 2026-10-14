import { describe, it, expect, beforeEach } from 'vitest';
import { mockApi, mockBackendStore } from '../api/mockApi';

describe('Nova API Client & Mock Store', () => {
  beforeEach(() => {
    mockBackendStore.updateConfig({ latencyMs: 0, forceError: false });
  });

  it('rejects claim request if token is empty', async () => {
    const res = await mockApi.claimDevice({ claimToken: '' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INVALID_CLAIM_CODE');
  });

  it('rejects claim request if token is expired or marked invalid', async () => {
    const res = await mockApi.claimDevice({ claimToken: 'INVALID' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CLAIM_TOKEN_EXPIRED');
  });

  it('successfully claims device with valid token and issues pairingSessionId', async () => {
    const res = await mockApi.claimDevice({ claimToken: 'clm_live_9f82d1c74a0e' });
    expect(res.success).toBe(true);
    expect(res.data?.deviceId).toBe('nova_s3_84f3eba1');
    expect(res.data?.pairingSessionId).toMatch(/^sess_/);
    expect(res.data?.expiresInSeconds).toBe(900);
  });

  it('provisions Wi-Fi network and updates device telemetry', async () => {
    const res = await mockApi.provisionWifi({
      ssid: 'QuantumLabs-2.4G',
      password: 'correct-password',
    });
    expect(res.success).toBe(true);
    expect(res.data?.status).toBe('connected');

    const statusRes = await mockApi.getDeviceStatus('nova_s3_84f3eba1');
    expect(statusRes.data?.wifi.connectedSsid).toBe('QuantumLabs-2.4G');
    expect(statusRes.data?.device.status).toBe('online');
  });

  it('rejects provisioning when invalid password is provided in test mode', async () => {
    const res = await mockApi.provisionWifi({
      ssid: 'QuantumLabs-2.4G',
      password: 'wrong',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('WIFI_AUTH_FAILED');
  });

  it('completes Notion OAuth callback and links workspace', async () => {
    const res = await mockApi.callbackNotion({
      code: 'code_mock_123',
      state: 'state_123',
      deviceId: 'nova_s3_84f3eba1',
    });
    expect(res.success).toBe(true);
    expect(res.data?.isConnected).toBe(true);
    expect(res.data?.workspaceName).toBe('Acme Research & Notes');
  });

  it('safely disconnects Notion without erasing device hardware status', async () => {
    const disconnectRes = await mockApi.disconnectNotion({ confirm: true, revokeToken: true });
    expect(disconnectRes.success).toBe(true);

    const statusRes = await mockApi.getDeviceStatus('nova_s3_84f3eba1');
    expect(statusRes.data?.notion.isConnected).toBe(false);
    // Device hardware must still exist
    expect(statusRes.data?.device.deviceId).toBe('nova_s3_84f3eba1');
  });

  it('runs synthetic voice note sync test and returns confirmation', async () => {
    // Re-link Notion first
    await mockApi.callbackNotion({ code: 'test', state: 'test', deviceId: 'nova_s3_84f3eba1' });
    const syncRes = await mockApi.testSync();
    expect(syncRes.success).toBe(true);
    expect(syncRes.data?.pageUrl).toContain('notion.so');
  });
});
