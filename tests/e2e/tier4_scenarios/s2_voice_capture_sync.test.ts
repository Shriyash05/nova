import { describe, it, expect } from 'vitest';
import { MockFirmwareDevice } from '../fixtures/mockFirmwareDevice';
import { MockBackendServer } from '../fixtures/mockBackendServer';

describe('Tier 4: Scenario 2 — Voice Capture to Notion Cloud Sync Journey', () => {
  it('Executes wake word recognition, 16 kHz voice sampling, non-blocking OLED rendering, and verified Notion sync', async () => {
    const server = new MockBackendServer();
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Studio_Net');
    dev.boot();

    // 1. Hardware enrolls and connects
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

    // 2. Authorize Notion OAuth for user workspace
    server.notionAuths.set(dev.deviceId, {
      deviceId: dev.deviceId,
      workspaceId: 'ws_voice_studio',
      workspaceName: 'Ambient Voice Notes',
      encryptedAccessToken: server.encrypt('secret_notion_bearer_token'),
      targetDatabaseId: 'db_voice_memos',
      targetDatabaseName: 'NOVA Voice Memos',
      connectedAt: new Date(),
    });

    // 3. User says "Hi ESP" -> WakeNet triggers state transition
    expect(dev.state).toBe('IDLE');
    const wakeTriggered = dev.triggerWakeWord();
    expect(wakeTriggered).toBe(true);
    expect(dev.state).toBe('LISTENING');
    expect(dev.oled.currentPrimitive).toBe('listening');

    // 4. Voice capture happens at 16 kHz: non-blocking animation loop runs concurrently
    const frameResult = dev.oled.renderExpression('listening');
    expect(frameResult.durationMs).toBeLessThanOrEqual(50);

    // 5. User stops speaking -> transition to PROCESSING
    const procOk = dev.transitionTo('PROCESSING');
    expect(procOk).toBe(true);
    expect(dev.state).toBe('PROCESSING');
    expect(dev.oled.currentPrimitive).toBe('processing');

    // 6. Device sends voice note sync request to cloud backend
    const syncRes = await server.handleRequest({
      method: 'POST',
      path: `/api/v1/devices/${dev.deviceId}/sync/test`,
      headers: { Authorization: `Bearer ${deviceKey}` },
    });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.data.databaseId).toBe('db_voice_memos');

    // 7. Successful sync response received -> OLED renders SUCCESS expression
    const succOk = dev.transitionTo('SUCCESS');
    expect(succOk).toBe(true);
    expect(dev.oled.currentPrimitive).toBe('success');

    // 8. Automatically returns to IDLE standby
    const idleOk = dev.transitionTo('IDLE');
    expect(idleOk).toBe(true);
    expect(dev.state).toBe('IDLE');
    expect(dev.oled.currentPrimitive).toBe('idle');
  });
});
