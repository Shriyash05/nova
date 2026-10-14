import type {
  ApiResponse,
  BootstrapDevicePayload,
  BootstrapDeviceResult,
  ClaimDevicePayload,
  ClaimDeviceResult,
  DeviceFullStatusResponse,
  DeviceHeartbeatPayload,
  DeviceHeartbeatResult,
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
      body: JSON.stringify({
        bootstrapSecret: 'nova_sec_c3_hardware_bootstrap_2026',
        ...payload,
      }),
    });
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
