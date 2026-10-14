export type DeviceId = string;
export type ClaimToken = string;
export type PairingSessionId = string;

export type DeviceStatus = 'online' | 'offline' | 'provisioning' | 'syncing' | 'error';

export type LedRingPattern =
  | 'pulse_cyan'      // Ready to pair / Bluetooth advertising
  | 'pulse_amber'     // Wi-Fi setup mode / SoftAP active
  | 'solid_teal'      // Connected to cloud & idle
  | 'flash_cyan'      // Actively recording or syncing audio note
  | 'flash_red'       // Disconnected / error
  | 'breathe_purple'; // Wi-Fi recovery mode active

export interface DeviceTelemetry {
  deviceId: DeviceId;
  serialNumber: string;
  shortClaimCode: string;
  hardwareModel: string;
  firmwareVersion: string;
  batteryPercent: number;
  isCharging: boolean;
  status: DeviceStatus;
  ledState: LedRingPattern;
  lastHeartbeat: string; // ISO 8601
  uptimeSeconds: number;
  cloudMqttConnected: boolean;
  pingLatencyMs: number;
}

export interface DeviceClaimRequest {
  claimToken?: string;
  shortCode?: string;
}

export interface DeviceClaimResponse {
  pairingSessionId: PairingSessionId;
  deviceId: DeviceId;
  serialNumber: string;
  expiresInSeconds: number;
}
