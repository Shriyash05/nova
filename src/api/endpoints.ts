export interface EndpointMeta {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
  authRequired: boolean;
  status: 'production_ready' | 'backend_in_progress' | 'firmware_pending';
}

export const API_ENDPOINTS: Record<string, EndpointMeta> = {
  health: {
    path: '/api/health',
    method: 'GET',
    description: 'System health check confirming database connectivity and hardware target specs.',
    authRequired: false,
    status: 'production_ready',
  },
  bootstrap: {
    path: '/api/v1/devices/bootstrap',
    method: 'POST',
    description: 'Enrolls physical ESP32-C3 hardware using its unique bootstrap credential; returns deviceKey and initial claim token.',
    authRequired: false,
    status: 'production_ready',
  },
  claimToken: {
    path: '/api/v1/devices/:deviceId/claim-token',
    method: 'POST',
    description: 'Generates a short-lived 15-minute single-use claim token rendered as a QR code on the SSD1306 OLED.',
    authRequired: true,
    status: 'production_ready',
  },
  claimDevice: {
    path: '/api/v1/devices/claim',
    method: 'POST',
    description: 'Validates single-use claim token or short code and creates a secure web pairing session.',
    authRequired: false,
    status: 'production_ready',
  },
  rotateDeviceKey: {
    path: '/api/v1/devices/:deviceId/device-key/rotate',
    method: 'POST',
    description: 'Rotates per-device authentication credentials without global shared secrets.',
    authRequired: true,
    status: 'production_ready',
  },
  getDeviceStatus: {
    path: '/api/v1/devices/:deviceId/status',
    method: 'GET',
    description: 'Retrieves verified telemetry, stale-heartbeat detection (>90s = offline), Wi-Fi connection, and Notion integration state.',
    authRequired: true,
    status: 'production_ready',
  },
  deviceHeartbeat: {
    path: '/api/v1/devices/:deviceId/heartbeat',
    method: 'POST',
    description: 'Firmware telemetry heartbeat over TLS reporting RSSI, local IP, OLED state, and action queue count.',
    authRequired: true,
    status: 'production_ready',
  },
  getWifiProfiles: {
    path: '/api/v1/devices/:deviceId/wifi-profiles',
    method: 'GET',
    description: 'Fetches Wi-Fi profile vault (max 5) with ETag/304 support. Redacts passwords for web clients; decrypts for firmware.',
    authRequired: true,
    status: 'production_ready',
  },
  getBootWifiProfile: {
    path: '/api/v1/devices/:deviceId/wifi-profiles/boot',
    method: 'GET',
    description: 'Dedicated boot endpoint for ESP32-C3 firmware over TLS returning ONLY the single default profile.',
    authRequired: true,
    status: 'production_ready',
  },
  createWifiProfile: {
    path: '/api/v1/devices/:deviceId/wifi-profiles',
    method: 'POST',
    description: 'Adds a Wi-Fi profile (enforces 5-profile limit and assigns stable voice slot network one..five).',
    authRequired: true,
    status: 'production_ready',
  },
  putWifiProfiles: {
    path: '/api/v1/devices/:deviceId/wifi-profiles',
    method: 'PUT',
    description: 'Atomically updates or reorders profile vault; validates max 5 profiles and single default transactionally.',
    authRequired: true,
    status: 'production_ready',
  },
  makeDefaultWifiProfile: {
    path: '/api/v1/devices/:deviceId/wifi-profiles/:profileId/make-default',
    method: 'POST',
    description: 'Transactionally sets target profile as boot default and clears default on all other profiles.',
    authRequired: true,
    status: 'production_ready',
  },
  updateWifiProfile: {
    path: '/api/v1/devices/:deviceId/wifi-profiles/:profileId',
    method: 'PATCH',
    description: 'Updates profile name, SSID, encrypted password, or default designation transactionally.',
    authRequired: true,
    status: 'production_ready',
  },
  deleteWifiProfile: {
    path: '/api/v1/devices/:deviceId/wifi-profiles/:profileId',
    method: 'DELETE',
    description: 'Deletes profile and recompacts remaining slots (network one..five) transactionally.',
    authRequired: true,
    status: 'production_ready',
  },
  reportWifiResult: {
    path: '/api/v1/devices/:deviceId/wifi-profile-result',
    method: 'POST',
    description: 'Firmware reports connection attempt outcome (connected, auth_failed, not_found, timeout).',
    authRequired: true,
    status: 'production_ready',
  },
  notionAuthorize: {
    path: '/api/v1/auth/notion/authorize',
    method: 'POST',
    description: 'Generates signed Notion OAuth authorization URL with anti-CSRF state token tied to pairing session.',
    authRequired: false,
    status: 'production_ready',
  },
  notionCallback: {
    path: '/api/v1/auth/notion/callback',
    method: 'GET',
    description: 'Exchanges OAuth code for Notion access token on backend and encrypts token at rest with AES-256-GCM.',
    authRequired: false,
    status: 'production_ready',
  },
  notionDisconnect: {
    path: '/api/v1/devices/:deviceId/notion/disconnect',
    method: 'POST',
    description: 'Revokes Notion token, unlinks workspace, but keeps device hardware registration and identity intact.',
    authRequired: true,
    status: 'production_ready',
  },
  testSync: {
    path: '/api/v1/devices/:deviceId/sync/test',
    method: 'POST',
    description: 'Triggers synthetic test note from backend to Notion database to verify integration pipeline.',
    authRequired: true,
    status: 'production_ready',
  },
};
