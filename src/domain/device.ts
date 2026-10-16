export type DeviceId = string;
export type ClaimToken = string;
export type PairingSessionId = string;

export type DeviceStatus = 'online' | 'offline' | 'provisioning' | 'syncing' | 'error';

// Visual states displayed on the physical SSD1306 monochrome OLED display (0x3C)
export type OledScreenState =
  | 'idle'          // Ambient face / status bar (time, Wi-Fi, battery)
  | 'wake_word'      // "Hi ESP" wake word detected animation
  | 'listening'      // 10-second active voice listening waveform
  | 'pairing_qr'     // On-device pairing QR code matrix
  | 'wifi_setup'     // Wi-Fi connecting / provisioning indicator
  | 'synced'         // Notion sync checkmark + note confirmation
  | 'offline';       // Disconnected icon / recovery prompt

export interface DeviceTelemetry {
  deviceId: DeviceId;
  serialNumber: string;
  shortClaimCode: string;
  hardwareModel: string; // "ESP32-C3 Super Mini"
  firmwareVersion: string;
  powerSource: 'USB-C 5V Bus' | 'usb_5v';
  status: DeviceStatus;
  oledState: OledScreenState;
  lastHeartbeat: string; // ISO 8601
  uptimeSeconds: number;
  cloudMqttConnected: boolean;
  pingLatencyMs: number;
  wakeWordEnabled: boolean; // "Hi ESP"
  microphoneInput: 'MAX4466 (ADC GPIO1, 16 kHz)';
  displayDriver: 'SSD1306 (I2C 0x3C, GPIO8/GPIO9)';
}

export interface DeviceClaimRequest {
  claimToken?: string;
  shortCode?: string;
}

export interface DeviceClaimResponse {
  pairingSessionId: PairingSessionId;
  deviceId: DeviceId;
  serialNumber: string;
  hardwareModel: string;
  expiresInSeconds: number;
}
