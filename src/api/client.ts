import type {
  ApiResponse,
  BootstrapDevicePayload,
  BootstrapDeviceResult,
  RotateDeviceKeyResult,
  CreateClaimTokenResult,
  ClaimDevicePayload,
  ClaimDeviceResult,
  DeviceFullStatusResponse,
  DeviceHeartbeatPayload,
  DeviceHeartbeatResult,
  WifiProfile,
  WifiProfileVaultResponse,
  CreateWifiProfilePayload,
  UpdateWifiProfilePayload,
  BulkUpdateWifiProfilesPayload,
  WifiProfileResultPayload,
  WifiScanResult,
  WifiProvisionPayload,
  WifiProvisionResult,
  NotionAuthorizePayload,
  NotionAuthorizeResult,
  NotionCallbackPayload,
  NotionDisconnectPayload,
} from './types';
import type { NotionConnectionInfo, NotionSyncTestResult } from '../domain/notion';
import { mockApi } from './mockApi';

export class NovaApiClient {
  private baseUrl: string;
  private useMock: boolean;
  private sessionToken: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    
    // In production builds, mock mode is strictly disabled and CANNOT run!
    if (import.meta.env.PROD) {
      this.useMock = false;
    } else {
      // In development, defaults to real backend unless VITE_MOCK_API=true is set
      this.useMock = import.meta.env.VITE_MOCK_API === 'true';
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        this.sessionToken = localStorage.getItem('nova_session_token');
      } catch {
        this.sessionToken = null;
      }
    }
  }

  public setSessionToken(token: string | null) {
    this.sessionToken = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (token) {
          localStorage.setItem('nova_session_token', token);
        } else {
          localStorage.removeItem('nova_session_token');
        }
      } catch {
        // Storage not accessible
      }
    }
  }

  public getSessionToken(): string | null {
    return this.sessionToken;
  }

  public setMockMode(enabled: boolean) {
    if (import.meta.env.PROD) {
      console.warn('Mock mode cannot be enabled in a production build.');
      this.useMock = false;
      return;
    }
    this.useMock = enabled;
  }

  public isMockMode(): boolean {
    return this.useMock;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    explicitToken?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const authToken = explicitToken || this.sessionToken;
    if (authToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 304) {
        return {
          success: true,
          data: undefined,
        };
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data?.error?.code || `HTTP_${response.status}`,
            message: data?.error?.message || response.statusText || 'API request failed',
            details: data?.error?.details,
          },
        };
      }

      return {
        success: true,
        data: data?.data ?? data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown network failure';
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: `Unable to connect to NOVA cloud backend at ${this.baseUrl || 'configured endpoint'}: ${message}`,
        },
      };
    }
  }

  public async bootstrapDevice(
    payload: BootstrapDevicePayload
  ): Promise<ApiResponse<BootstrapDeviceResult>> {
    return this.request<BootstrapDeviceResult>('/api/v1/devices/bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async rotateDeviceKey(
    deviceId: string,
    authToken?: string
  ): Promise<ApiResponse<RotateDeviceKeyResult>> {
    return this.request<RotateDeviceKeyResult>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/device-key/rotate`,
      {
        method: 'POST',
      },
      authToken
    );
  }

  public async createClaimToken(
    deviceId: string,
    authToken?: string
  ): Promise<ApiResponse<CreateClaimTokenResult>> {
    return this.request<CreateClaimTokenResult>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/claim-token`,
      {
        method: 'POST',
      },
      authToken
    );
  }

  public async claimDevice(payload: ClaimDevicePayload): Promise<ApiResponse<ClaimDeviceResult>> {
    if (this.useMock) {
      return mockApi.claimDevice(payload);
    }
    const res = await this.request<ClaimDeviceResult>('/api/v1/devices/claim', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data?.pairingSessionId) {
      this.setSessionToken(res.data.pairingSessionId);
    }

    return res;
  }

  public async getDeviceStatus(
    deviceId: string,
    authToken?: string
  ): Promise<ApiResponse<DeviceFullStatusResponse>> {
    if (this.useMock) {
      return mockApi.getDeviceStatus(deviceId);
    }
    return this.request<DeviceFullStatusResponse>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/status`,
      {
        method: 'GET',
      },
      authToken
    );
  }

  public async sendHeartbeat(
    deviceId: string,
    payload: DeviceHeartbeatPayload,
    deviceKey: string
  ): Promise<ApiResponse<DeviceHeartbeatResult>> {
    return this.request<DeviceHeartbeatResult>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/heartbeat`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      deviceKey
    );
  }

  // ---------------------------------------------------------------------------
  // Wi-Fi Profile Vault Methods
  // ---------------------------------------------------------------------------
  public async getWifiProfiles(
    deviceId: string,
    authToken?: string,
    versionQuery?: number
  ): Promise<ApiResponse<WifiProfileVaultResponse>> {
    const query = typeof versionQuery === 'number' ? `?version=${versionQuery}` : '';
    return this.request<WifiProfileVaultResponse>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi-profiles${query}`,
      {
        method: 'GET',
      },
      authToken
    );
  }

  public async createWifiProfile(
    deviceId: string,
    payload: CreateWifiProfilePayload,
    authToken?: string
  ): Promise<ApiResponse<{ profile: WifiProfile; vaultVersion: number }>> {
    return this.request<{ profile: WifiProfile; vaultVersion: number }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi-profiles`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      authToken
    );
  }

  public async updateWifiProfile(
    deviceId: string,
    profileId: string,
    payload: UpdateWifiProfilePayload,
    authToken?: string
  ): Promise<ApiResponse<{ profile: WifiProfile; vaultVersion: number }>> {
    return this.request<{ profile: WifiProfile; vaultVersion: number }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi-profiles/${encodeURIComponent(profileId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      authToken
    );
  }

  public async bulkUpdateWifiProfiles(
    deviceId: string,
    payload: BulkUpdateWifiProfilesPayload,
    authToken?: string
  ): Promise<ApiResponse<WifiProfileVaultResponse>> {
    return this.request<WifiProfileVaultResponse>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi-profiles`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      authToken
    );
  }

  public async deleteWifiProfile(
    deviceId: string,
    profileId: string,
    authToken?: string
  ): Promise<ApiResponse<{ deleted: boolean; profileId: string; vaultVersion: number }>> {
    return this.request<{ deleted: boolean; profileId: string; vaultVersion: number }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi-profiles/${encodeURIComponent(profileId)}`,
      {
        method: 'DELETE',
      },
      authToken
    );
  }

  public async makeDefaultWifiProfile(
    deviceId: string,
    profileId: string,
    authToken?: string
  ): Promise<ApiResponse<{ profileId: string; isDefault: boolean; vaultVersion: number }>> {
    return this.request<{ profileId: string; isDefault: boolean; vaultVersion: number }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi-profiles/${encodeURIComponent(profileId)}/make-default`,
      {
        method: 'POST',
      },
      authToken
    );
  }

  public async reportWifiProfileResult(
    deviceId: string,
    payload: WifiProfileResultPayload,
    authToken?: string
  ): Promise<ApiResponse<{ acknowledged: boolean; profileId?: string; result: string; serverTime: string }>> {
    return this.request<{ acknowledged: boolean; profileId?: string; result: string; serverTime: string }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi-profile-result`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      authToken
    );
  }

  // ---------------------------------------------------------------------------
  // Legacy / SoftAP Scan & Auth
  // ---------------------------------------------------------------------------
  public async scanWifi(deviceId?: string): Promise<ApiResponse<WifiScanResult>> {
    if (this.useMock) {
      return mockApi.scanWifi();
    }
    const path = deviceId ? `/api/v1/devices/${encodeURIComponent(deviceId)}/wifi/scan` : '/api/v1/wifi/scan';
    return this.request<WifiScanResult>(path, {
      method: 'GET',
    });
  }

  public async provisionWifi(deviceId: string, payload: WifiProvisionPayload): Promise<ApiResponse<WifiProvisionResult>> {
    if (this.useMock) {
      return mockApi.provisionWifi(payload);
    }
    return this.request<WifiProvisionResult>(`/api/v1/devices/${encodeURIComponent(deviceId)}/wifi/provision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async authorizeNotion(payload: NotionAuthorizePayload): Promise<ApiResponse<NotionAuthorizeResult>> {
    if (this.useMock) {
      return mockApi.authorizeNotion(payload);
    }
    return this.request<NotionAuthorizeResult>('/api/v1/auth/notion/authorize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async callbackNotion(payload: NotionCallbackPayload): Promise<ApiResponse<NotionConnectionInfo>> {
    if (this.useMock) {
      return mockApi.callbackNotion(payload);
    }
    return this.request<NotionConnectionInfo>('/api/v1/auth/notion/callback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async disconnectNotion(
    deviceId: string,
    payload: NotionDisconnectPayload,
    authToken?: string
  ): Promise<ApiResponse<{ disconnected: boolean }>> {
    if (this.useMock) {
      return mockApi.disconnectNotion(payload);
    }
    return this.request<{ disconnected: boolean }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/notion/disconnect`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      authToken
    );
  }

  public async testSync(
    deviceId: string,
    authToken?: string
  ): Promise<ApiResponse<NotionSyncTestResult>> {
    if (this.useMock) {
      return mockApi.testSync();
    }
    return this.request<NotionSyncTestResult>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/sync/test`,
      {
        method: 'POST',
        headers: {
          'x-idempotency-key': `sync_${deviceId}_${Date.now()}`,
        },
      },
      authToken
    );
  }

  public async factoryReset(deviceId: string, confirmSerial: string): Promise<ApiResponse<{ reset: boolean }>> {
    if (this.useMock) {
      return mockApi.factoryReset();
    }
    return this.request<{ reset: boolean }>(`/api/v1/devices/${encodeURIComponent(deviceId)}/factory-reset`, {
      method: 'POST',
      body: JSON.stringify({ confirmSerial }),
    });
  }
}

// Global singleton client
export const apiClient = new NovaApiClient();
