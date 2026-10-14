export interface DeviceRecord {
  id: string; // e.g. "nova_c3_84f3eba1"
  serial_number: string; // e.g. "NOVA-C3-84F3EBA1"
  mac_address: string; // e.g. "84:F3:EB:A1:0C:4A"
  hardware_model: string; // "ESP32-C3 Super Mini"
  firmware_version: string; // "v1.0.0"
  status: 'online' | 'offline';
  ip_address: string | null;
  wifi_ssid: string | null;
  wifi_rssi: number | null;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimTokenRecord {
  token: string;
  device_id: string;
  short_code: string;
  expires_at: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

export interface PairingSessionRecord {
  id: string;
  device_id: string;
  claim_token: string;
  expires_at: string;
  created_at: string;
}

export interface NotionAuthRecord {
  device_id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  workspace_icon: string | null;
  bot_id: string | null;
  encrypted_access_token: string;
  target_database_id: string | null;
  target_database_name: string | null;
  owner_email: string | null;
  last_sync_at: string | null;
  connected_at: string;
  updated_at: string;
}

export interface DeviceActionRecord {
  id: string;
  device_id: string;
  action_type: string;
  idempotency_key: string;
  payload_json: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'acknowledged' | 'failed';
  response_json: Record<string, unknown> | null;
  created_at: string;
  acknowledged_at: string | null;
}
