import type {
  ClaimDevicePayload,
  ClaimDeviceResult,
  DeviceFullStatusResponse,
  WifiScanResult,
  WifiProvisionPayload,
  WifiProvisionResult,
  NotionAuthorizePayload,
  NotionAuthorizeResult,
  NotionCallbackPayload,
  NotionDisconnectPayload,
  ApiResponse,
} from './types';
import type { DeviceTelemetry } from '../domain/device';
import type { WifiStatus, WifiNetwork } from '../domain/wifi';
import type { NotionConnectionInfo, NotionSyncTestResult } from '../domain/notion';

export interface MockConfig {
  latencyMs: number;
  forceError: boolean;
  errorMessage?: string;
  deviceStartsOffline: boolean;
  notionStartsRevoked: boolean;
}

const defaultMockConfig: MockConfig = {
  latencyMs: 400,
  forceError: false,
  deviceStartsOffline: false,
  notionStartsRevoked: false,
};

// In-memory mock device state for development sandbox only
class MockBackendStore {
  private config: MockConfig = { ...defaultMockConfig };
  
  private telemetry: DeviceTelemetry = {
    deviceId: 'nova_c3_84f3eba1',
    serialNumber: 'NOVA-C3-84F3EBA1',
    shortClaimCode: 'NOV-84F3',
    hardwareModel: 'ESP32-C3 Super Mini (RISC-V 160MHz)',
    firmwareVersion: 'v1.0.0-stable',
    batteryPercent: 94,
    isCharging: false,
    status: 'online',
    oledState: 'idle',
    lastHeartbeat: new Date().toISOString(),
    uptimeSeconds: 1200,
    cloudMqttConnected: true,
    pingLatencyMs: 38,
    wakeWordEnabled: true,
    microphoneInput: 'MAX4466 (ADC GPIO1, 16 kHz)',
    displayDriver: 'SSD1306 (I2C 0x3C, GPIO8/GPIO9)',
  };

  private wifi: WifiStatus = {
    state: 'connected',
    connectedSsid: 'Home_Studio_2.4G',
    rssi: -54,
    ipAddress: '192.168.1.188',
    macAddress: '84:F3:EB:A1:0C:4A',
    gatewayIp: '192.168.1.1',
    frequencyBand: '2.4GHz',
  };

  private notion: NotionConnectionInfo = {
    isConnected: true,
    workspaceId: 'ws_notion_prod_7718',
    workspaceName: 'Acme Research & Notes',
    workspaceIcon: '🧠',
    ownerEmail: 'user@example.com',
    botId: 'bot_nova_c3_01',
    targetDatabaseId: 'db_nova_inbox_9901',
    targetDatabaseName: 'NOVA Voice Inbox & Action Items',
    connectedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    pendingSyncCount: 0,
  };

  private availableWifiNetworks: WifiNetwork[] = [
    { ssid: 'Home_Studio_2.4G', rssi: -54, security: 'wpa2_personal', channel: 6 },
    { ssid: 'Quantum_Mesh_IoT', rssi: -62, security: 'wpa3_personal', channel: 1 },
    { ssid: 'Studio_Guest_WiFi', rssi: -78, security: 'open', channel: 11 },
  ];

  public getConfig(): MockConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<MockConfig>) {
    this.config = { ...this.config, ...patch };
    if (this.config.deviceStartsOffline) {
      this.telemetry.status = 'offline';
      this.telemetry.cloudMqttConnected = false;
      this.telemetry.oledState = 'offline';
      this.wifi.state = 'idle';
      this.wifi.connectedSsid = null;
    } else {
      this.telemetry.status = 'online';
      this.telemetry.cloudMqttConnected = true;
      this.telemetry.oledState = 'idle';
      this.wifi.state = 'connected';
      this.wifi.connectedSsid = this.wifi.connectedSsid || 'Home_Studio_2.4G';
    }
  }

  public getTelemetry(): DeviceTelemetry {
    return { ...this.telemetry, lastHeartbeat: new Date().toISOString() };
  }

  public setTelemetry(patch: Partial<DeviceTelemetry>) {
    this.telemetry = { ...this.telemetry, ...patch };
  }

  public getWifi(): WifiStatus {
    return { ...this.wifi };
  }

  public setWifi(patch: Partial<WifiStatus>) {
    this.wifi = { ...this.wifi, ...patch };
  }

  public getNotion(): NotionConnectionInfo {
    return { ...this.notion };
  }

  public setNotion(patch: Partial<NotionConnectionInfo>) {
    this.notion = { ...this.notion, ...patch };
  }

  public getWifiNetworks(): WifiNetwork[] {
    return [...this.availableWifiNetworks];
  }

  public resetToFactory() {
    this.telemetry.status = 'offline';
    this.telemetry.oledState = 'pairing_qr';
    this.telemetry.cloudMqttConnected = false;
    this.wifi = {
      state: 'idle',
      connectedSsid: null,
      rssi: null,
      ipAddress: null,
      macAddress: '84:F3:EB:A1:0C:4A',
      gatewayIp: null,
      frequencyBand: '2.4GHz',
    };
    this.notion = {
      isConnected: false,
      workspaceId: null,
      workspaceName: null,
      workspaceIcon: null,
      ownerEmail: null,
      botId: null,
      targetDatabaseId: null,
      targetDatabaseName: null,
      connectedAt: null,
      lastSyncAt: null,
      pendingSyncCount: 0,
    };
  }

  public async delay(): Promise<void> {
    if (this.config.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.latencyMs));
    }
    if (this.config.forceError) {
      throw new Error(this.config.errorMessage || 'Mock simulated backend failure (HTTP 500)');
    }
  }
}

export const mockBackendStore = new MockBackendStore();

export const mockApi = {
  async claimDevice(payload: ClaimDevicePayload): Promise<ApiResponse<ClaimDeviceResult>> {
    await mockBackendStore.delay();

    const token = payload.claimToken || payload.shortCode;
    if (!token || token.trim() === '') {
      return {
        success: false,
        error: {
          code: 'INVALID_CLAIM_CODE',
          message: 'Please provide a valid QR claim token or shortcode shown on your OLED.',
        },
      };
    }

    const cleanToken = token.trim().toUpperCase();
    if (cleanToken === 'ERROR-TEST' || cleanToken === 'INVALID') {
      return {
        success: false,
        error: {
          code: 'CLAIM_TOKEN_EXPIRED',
          message: 'This device claim token has already been redeemed or has expired (15-min lifespan).',
        },
      };
    }

    mockBackendStore.setTelemetry({
      status: 'provisioning',
      oledState: 'wifi_setup',
    });

    return {
      success: true,
      data: {
        pairingSessionId: `sess_${Math.random().toString(36).substring(2, 12)}`,
        deviceId: 'nova_c3_84f3eba1',
        serialNumber: 'NOVA-C3-84F3EBA1',
        hardwareModel: 'ESP32-C3 Super Mini',
        expiresInSeconds: 900,
      },
    };
  },

  async getDeviceStatus(deviceId: string): Promise<ApiResponse<DeviceFullStatusResponse>> {
    await mockBackendStore.delay();

    if (!deviceId) {
      return {
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: 'Device ID was not provided.',
        },
      };
    }

    return {
      success: true,
      data: {
        device: mockBackendStore.getTelemetry(),
        wifi: mockBackendStore.getWifi(),
        notion: mockBackendStore.getNotion(),
      },
    };
  },

  async scanWifi(): Promise<ApiResponse<WifiScanResult>> {
    await mockBackendStore.delay();

    return {
      success: true,
      data: {
        networks: mockBackendStore.getWifiNetworks(),
        scanTimestamp: new Date().toISOString(),
      },
    };
  },

  async provisionWifi(payload: WifiProvisionPayload): Promise<ApiResponse<WifiProvisionResult>> {
    await mockBackendStore.delay();

    if (!payload.ssid) {
      return {
        success: false,
        error: {
          code: 'MISSING_SSID',
          message: 'Wi-Fi Network SSID is required.',
        },
      };
    }

    if (payload.password === 'wrong') {
      mockBackendStore.setWifi({
        state: 'failed_auth',
        lastError: 'Wi-Fi authentication failed. Invalid WPA Pre-Shared Key.',
      });
      return {
        success: false,
        error: {
          code: 'WIFI_AUTH_FAILED',
          message: 'Authentication failed for the selected Wi-Fi network. Please check your password.',
        },
      };
    }

    mockBackendStore.setWifi({
      state: 'connected',
      connectedSsid: payload.ssid,
      rssi: -54,
      ipAddress: '192.168.1.188',
      gatewayIp: '192.168.1.1',
      frequencyBand: '2.4GHz',
      lastError: undefined,
    });

    mockBackendStore.setTelemetry({
      status: 'online',
      cloudMqttConnected: true,
      oledState: 'idle',
    });

    return {
      success: true,
      data: {
        status: 'connected',
        ipAddress: '192.168.1.188',
        message: `Successfully authenticated and connected to ${payload.ssid}. Assigned IP: 192.168.1.188`,
      },
    };
  },

  async authorizeNotion(payload: NotionAuthorizePayload): Promise<ApiResponse<NotionAuthorizeResult>> {
    await mockBackendStore.delay();

    const stateToken = `state_${Math.random().toString(36).substring(2, 15)}`;
    const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?owner=user&client_id=nova_iot_c3_client&response_type=code&redirect_uri=${encodeURIComponent(
      payload.redirectUri
    )}&state=${stateToken}`;

    return {
      success: true,
      data: {
        authorizationUrl: notionAuthUrl,
        stateToken,
      },
    };
  },

  async callbackNotion(payload: NotionCallbackPayload): Promise<ApiResponse<NotionConnectionInfo>> {
    await mockBackendStore.delay();

    if (!payload.code) {
      return {
        success: false,
        error: {
          code: 'OAUTH_CODE_MISSING',
          message: 'Authorization code was missing from OAuth callback.',
        },
      };
    }

    const updatedNotion: NotionConnectionInfo = {
      isConnected: true,
      workspaceId: 'ws_notion_prod_7718',
      workspaceName: 'Acme Research & Notes',
      workspaceIcon: '🧠',
      ownerEmail: 'user@example.com',
      botId: 'bot_nova_c3_01',
      targetDatabaseId: 'db_nova_inbox_9901',
      targetDatabaseName: 'NOVA Voice Inbox & Action Items',
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      pendingSyncCount: 0,
    };

    mockBackendStore.setNotion(updatedNotion);

    return {
      success: true,
      data: updatedNotion,
    };
  },

  async disconnectNotion(_payload: NotionDisconnectPayload): Promise<ApiResponse<{ disconnected: boolean }>> {
    await mockBackendStore.delay();

    mockBackendStore.setNotion({
      isConnected: false,
      workspaceId: null,
      workspaceName: null,
      workspaceIcon: null,
      ownerEmail: null,
      botId: null,
      targetDatabaseId: null,
      targetDatabaseName: null,
      connectedAt: null,
      lastSyncAt: null,
      pendingSyncCount: 0,
    });

    return {
      success: true,
      data: { disconnected: true },
    };
  },

  async testSync(): Promise<ApiResponse<NotionSyncTestResult>> {
    await mockBackendStore.delay();

    const notion = mockBackendStore.getNotion();
    if (!notion.isConnected) {
      return {
        success: false,
        error: {
          code: 'NOTION_NOT_CONNECTED',
          message: 'Cannot run sync test because Notion workspace is not connected.',
        },
      };
    }

    mockBackendStore.setTelemetry({
      status: 'syncing',
      oledState: 'synced',
    });

    setTimeout(() => {
      mockBackendStore.setTelemetry({
        status: 'online',
        oledState: 'idle',
      });
      mockBackendStore.setNotion({
        lastSyncAt: new Date().toISOString(),
        pendingSyncCount: 0,
      });
    }, 1500);

    return {
      success: true,
      data: {
        success: true,
        pageTitle: `NOVA Voice Note (ESP32-C3) — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        pageUrl: 'https://notion.so/nova-voice-inbox/Test-Note-ESP32-C3-Heartbeat-84f3eba1',
        databaseName: notion.targetDatabaseName || 'NOVA Voice Inbox',
        latencyMs: 290,
        syncedTimestamp: new Date().toISOString(),
      },
    };
  },

  async factoryReset(): Promise<ApiResponse<{ reset: boolean }>> {
    await mockBackendStore.delay();
    mockBackendStore.resetToFactory();
    return {
      success: true,
      data: { reset: true },
    };
  },
};
