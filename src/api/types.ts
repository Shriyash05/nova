import type { DeviceTelemetry, DeviceId } from '../domain/device';
import type { WifiNetwork, WifiStatus } from '../domain/wifi';
import type { NotionConnectionInfo } from '../domain/notion';
export type { NotionSyncTestResult } from '../domain/notion';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface BootstrapDevicePayload {
  deviceId: string;
  macAddress: string;
  firmwareVersion?: string;
  bootstrapSecret?: string;
  serialNumber?: string;
  wifiSsid?: string;
  ipAddress?: string;
  rssi?: number;
}

export interface BootstrapDeviceResult {
  deviceId: string;
  serialNumber: string;
  macAddress: string;
  firmwareVersion: string;
  claimToken: string;
  shortCode: string;
  expiresAt: string;
  expiresInSeconds: number;
  deviceKey: string;
  portalUrl: string;
}

export interface ClaimDevicePayload {
  claimToken?: string;
  shortCode?: string;
}

export interface ClaimDeviceResult {
  pairingSessionId: string;
  deviceId: DeviceId;
  serialNumber: string;
  hardwareModel: string;
  expiresInSeconds: number;
}

export interface DeviceHeartbeatPayload {
  firmwareVersion?: string;
  wifiConnected?: boolean;
  rssi?: number | null;
  ipAddress?: string | null;
  queueCount?: number;
  oledState?: string;
}

export interface DeviceHeartbeatResult {
  acknowledged: boolean;
  deviceId: string;
  serverTime: string;
  status: string;
  oledState: string;
  queueCount: number;
}

export interface DeviceFullStatusResponse {
  device: DeviceTelemetry;
  wifi: WifiStatus;
  notion: NotionConnectionInfo;
}

export interface WifiScanResult {
  networks: WifiNetwork[];
  scanTimestamp: string;
}

export interface WifiProvisionPayload {
  pairingSessionId?: string;
  ssid: string;
  password?: string;
  hidden?: boolean;
}

export interface WifiProvisionResult {
  status: 'connecting' | 'connected' | 'auth_failed' | 'timeout';
  ipAddress?: string;
  message: string;
}

export interface NotionAuthorizePayload {
  deviceId: DeviceId;
  pairingSessionId?: string;
  redirectUri: string;
}

export interface NotionAuthorizeResult {
  authorizationUrl: string;
  stateToken: string;
}

export interface NotionCallbackPayload {
  code: string;
  state: string;
  deviceId: DeviceId;
  redirectUri?: string;
}

export interface NotionDisconnectPayload {
  confirm: boolean;
  revokeToken: boolean;
}

export interface FactoryResetPayload {
  deviceId: DeviceId;
  confirmDeviceSerial: string;
}
