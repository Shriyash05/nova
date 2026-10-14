export type WifiSecurityType = 'open' | 'wpa2_personal' | 'wpa3_personal' | 'wpa_enterprise';

export interface WifiNetwork {
  ssid: string;
  rssi: number; // dBm e.g. -45 (strong) to -85 (weak)
  security: WifiSecurityType;
  channel: number;
}

export type WifiProvisioningMode = 'web_ble' | 'soft_ap';

export interface WifiCredentials {
  ssid: string;
  password?: string;
  hidden?: boolean;
}

export type WifiConnectionState =
  | 'idle'
  | 'scanning'
  | 'transmitting'
  | 'authenticating'
  | 'connected'
  | 'failed_auth'
  | 'failed_timeout'
  | 'failed_dhcp';

export interface WifiStatus {
  state: WifiConnectionState;
  connectedSsid: string | null;
  rssi: number | null;
  ipAddress: string | null;
  macAddress: string;
  gatewayIp: string | null;
  frequencyBand: '2.4GHz' | '5GHz';
  lastError?: string;
}

export interface SoftApInfo {
  hotspotSsid: string;
  gatewayUrl: string; // e.g. "http://192.168.4.1"
  defaultPassword?: string;
}
