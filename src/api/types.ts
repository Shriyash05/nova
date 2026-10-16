import type { DeviceTelemetry, DeviceId } from '../domain/device';
import type { WifiNetwork, WifiStatus } from '../domain/wifi';
import type { NotionConnectionInfo } from '../domain/notion';
export type { NotionSyncTestResult } from '../domain/notion';

export type VoiceSlot = 'network one' | 'network two' | 'network three' | 'network four' | 'network five';
export type WifiConnectionResult = 'connected' | 'auth_failed' | 'timeout' | 'not_found' | 'pending';

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
  bootstrapCredential?: string;
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

export interface RotateDeviceKeyResult {
  deviceId: string;
  deviceKey: string;
  rotatedAt: string;
}

export interface CreateClaimTokenResult {
  deviceId: string;
  claimToken: string;
  shortCode: string;
  expiresAt: string;
  expiresInSeconds: number;
  portalUrl: string;
}

export interface ClaimDevicePayload {
  claimToken?: string;
  shortCode?: string;
  deviceId?: string;
  userId?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  google_id: string | null;
}

export interface GoogleAuthPayload {
  credential?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  googleId?: string;
}

export interface GoogleAuthResult {
  user: UserProfile;
  sessionToken: string;
}

export interface UserRegisteredDevice {
  id: string;
  serial_number: string;
  mac_address: string;
  hardware_model: string;
  firmware_version: string;
  status: string;
  ip_address: string | null;
  wifi_connected: boolean | null;
  wifi_ssid: string | null;
  wifi_rssi: number | null;
  oled_state: string | null;
  queue_count: number | null;
  last_heartbeat: string | null;
  label: string;
  is_primary: boolean;
  linked_at: string;
  notion_workspace: string | null;
  notion_authorized: boolean;
}

export interface UserDevicesResult {
  userId: string;
  devices: UserRegisteredDevice[];
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
  wifiVaultVersion?: number;
}

export interface DeviceFullStatusResponse {
  device: DeviceTelemetry;
  wifi: WifiStatus;
  notion: NotionConnectionInfo;
}

export interface WifiProfile {
  id: string;
  name: string;
  voiceSlot: VoiceSlot;
  slotNumber: number;
  ssid: string;
  hasPassword?: boolean;
  password?: string | null;
  isDefault: boolean;
  version: number;
  lastConnectionResult: WifiConnectionResult;
  lastAttemptedAt: string | null;
  lastRssi: number | null;
  updatedAt?: string;
}

export interface WifiProfileVaultResponse {
  deviceId: string;
  vaultVersion: number;
  profileCount: number;
  maxProfiles: number;
  profiles: WifiProfile[];
}

export interface CreateWifiProfilePayload {
  name: string;
  ssid: string;
  password?: string;
  isDefault?: boolean;
}

export interface UpdateWifiProfilePayload {
  name?: string;
  ssid?: string;
  password?: string;
  isDefault?: boolean;
  slotNumber?: number;
}

export interface BulkUpdateWifiProfilesPayload {
  profiles: Array<{
    id?: string;
    name: string;
    ssid: string;
    password?: string;
    isDefault?: boolean;
    slotNumber?: number;
  }>;
}

export interface WifiProfileResultPayload {
  profileId?: string;
  ssid?: string;
  result: WifiConnectionResult;
  rssi?: number;
  attemptedAt?: string;
  appliedVersion?: number;
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
