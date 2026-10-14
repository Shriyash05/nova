export interface EndpointMeta {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  authRequired: boolean;
  status: 'production_ready' | 'backend_in_progress' | 'firmware_pending';
}

export const API_ENDPOINTS: Record<string, EndpointMeta> = {
  claimDevice: {
    path: '/api/v1/devices/claim',
    method: 'POST',
    description: 'Validates single-use claim token or short code and creates a temporary pairing session.',
    authRequired: false,
    status: 'backend_in_progress',
  },
  getDeviceStatus: {
    path: '/api/v1/devices/:deviceId/status',
    method: 'GET',
    description: 'Retrieves current telemetry, Wi-Fi status, and Notion connection health as recorded by backend MQTT broker.',
    authRequired: true,
    status: 'backend_in_progress',
  },
  scanWifi: {
    path: '/api/v1/devices/:deviceId/wifi/scan',
    method: 'GET',
    description: 'Triggers ESP32 Wi-Fi scan over Web BLE or device local AP and returns visible 2.4GHz SSIDs.',
    authRequired: false,
    status: 'firmware_pending',
  },
  provisionWifi: {
    path: '/api/v1/devices/:deviceId/wifi/provision',
    method: 'POST',
    description: 'Transmits Wi-Fi credentials to ESP32 over BLE GATT or local SoftAP endpoint and initiates connection.',
    authRequired: false,
    status: 'firmware_pending',
  },
  notionAuthorize: {
    path: '/api/v1/auth/notion/authorize',
    method: 'POST',
    description: 'Generates signed Notion OAuth authorization URL with anti-CSRF state token tied to pairing session.',
    authRequired: false,
    status: 'backend_in_progress',
  },
  notionCallback: {
    path: '/api/v1/auth/notion/callback',
    method: 'POST',
    description: 'Exchanges OAuth code for Notion access token on the backend and binds it to device in encrypted KMS.',
    authRequired: false,
    status: 'backend_in_progress',
  },
  notionDisconnect: {
    path: '/api/v1/devices/:deviceId/notion/disconnect',
    method: 'POST',
    description: 'Revokes Notion token in KMS, unlinks workspace, but keeps device hardware registration intact.',
    authRequired: true,
    status: 'backend_in_progress',
  },
  testSync: {
    path: '/api/v1/devices/:deviceId/sync/test',
    method: 'POST',
    description: 'Triggers a synthetic test note from backend to Notion database to verify integration pipeline.',
    authRequired: true,
    status: 'backend_in_progress',
  },
  factoryReset: {
    path: '/api/v1/devices/:deviceId/factory-reset',
    method: 'POST',
    description: 'Wipes cloud ownership records, unlinks Notion, and commands firmware to clear flash storage.',
    authRequired: true,
    status: 'backend_in_progress',
  },
};
