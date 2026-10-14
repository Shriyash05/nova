# NOVA Backend & Firmware API Contract

This document specifies the exact REST API contract, WebSocket/MQTT telemetry expectations, and physical hardware provisioning protocols required by the NOVA Onboarding Platform.

---

## 1. Architectural Principles & Security Rules

1. **Zero Permanent Secrets in Browser**: Neither device flash encryption keys nor permanent Notion OAuth tokens are ever handled or stored in the browser (`localStorage`, `sessionStorage`, or cookies).
2. **Ephemeral Pairing Mechanism**:
   - Factory QR codes encode a single-use token: `https://onboard.nova.hardware/setup?claim_token=clm_...`
   - Claim tokens expire within 15 minutes of generation and are invalidated immediately upon first redemption.
3. **Backend Authority Pattern**:
   - The cloud backend validates hardware serial numbers, issues pairing sessions, holds the Notion Client Secret, and exchanges OAuth codes directly with `api.notion.com`.
   - All Notion access tokens are encrypted at rest using Cloud KMS and tied to the user's account and device record.
4. **Non-Destructive Wi-Fi Recovery**:
   - Changing Wi-Fi credentials updates the ESP32's local NVS storage without revoking Notion tokens or wiping user audio note logs.
   - Factory reset is an isolated, destructive action requiring both a physical hardware hold (15 seconds) and explicit confirmation in the cloud dashboard.

---

## 2. Endpoint Implementation Status

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/devices/claim` | Validate single-use claim token / shortcode | **Backend In Progress** (Mocked in Frontend) |
| `GET` | `/api/v1/devices/:deviceId/status` | Fetch real-time device telemetry & Notion status | **Backend In Progress** (Mocked in Frontend) |
| `GET` | `/api/v1/devices/:deviceId/wifi/scan` | Trigger ESP32 Wi-Fi scan for visible 2.4GHz SSIDs | **Firmware Pending** (Mocked in Frontend) |
| `POST` | `/api/v1/devices/:deviceId/wifi/provision` | Transmit SSID & WPA2/WPA3 credentials to device | **Firmware Pending** (Mocked in Frontend) |
| `POST` | `/api/v1/auth/notion/authorize` | Generate signed Notion OAuth URL with CSRF state | **Backend In Progress** (Mocked in Frontend) |
| `POST` | `/api/v1/auth/notion/callback` | Exchange OAuth `code` for token & store in KMS | **Backend In Progress** (Mocked in Frontend) |
| `POST` | `/api/v1/devices/:deviceId/notion/disconnect` | Revoke Notion OAuth token & unlink database | **Backend In Progress** (Mocked in Frontend) |
| `POST` | `/api/v1/devices/:deviceId/sync/test` | Trigger synthetic voice note sync to Notion DB | **Backend In Progress** (Mocked in Frontend) |
| `POST` | `/api/v1/devices/:deviceId/factory-reset` | Clear cloud ownership & wipe device storage | **Backend In Progress** (Mocked in Frontend) |

---

## 3. REST Endpoint Specifications

### 3.1 Device Claim
- **Endpoint**: `POST /api/v1/devices/claim`
- **Auth Required**: Optional (Session Cookie if logged in, or anonymous onboarding)
- **Request Body**:
```json
{
  "claimToken": "clm_live_9f82d1c74a0e",
  "shortCode": "NOV-84F3"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "pairingSessionId": "sess_918237fa9c82",
    "deviceId": "nova_s3_84f3eba1",
    "serialNumber": "NOVA-S3-84F3EBA1",
    "hardwareModel": "ESP32-S3-WROOM-1",
    "expiresInSeconds": 900
  }
}
```
- **Error Responses**:
  - `400 Bad Request` (`INVALID_CLAIM_CODE`): Missing or malformed token.
  - `410 Gone` (`CLAIM_TOKEN_EXPIRED`): Token already claimed or expired.

---

### 3.2 Device Status & Telemetry
- **Endpoint**: `GET /api/v1/devices/:deviceId/status`
- **Auth Required**: Yes (Session or `pairingSessionId` header)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "device": {
      "deviceId": "nova_s3_84f3eba1",
      "serialNumber": "NOVA-S3-84F3EBA1",
      "shortClaimCode": "NOV-84F3",
      "hardwareModel": "ESP32-S3-WROOM-1 (Dual-Core 240MHz)",
      "firmwareVersion": "v1.2.4-stable",
      "batteryPercent": 88,
      "isCharging": false,
      "status": "online",
      "ledState": "solid_teal",
      "lastHeartbeat": "2026-10-14T14:45:00.000Z",
      "uptimeSeconds": 1420,
      "cloudMqttConnected": true,
      "pingLatencyMs": 38
    },
    "wifi": {
      "state": "connected",
      "connectedSsid": "Home_Studio_2.4G",
      "rssi": -54,
      "ipAddress": "192.168.1.142",
      "macAddress": "84:F3:EB:A1:0C:4A",
      "gatewayIp": "192.168.1.1",
      "frequencyBand": "2.4GHz"
    },
    "notion": {
      "isConnected": true,
      "workspaceId": "ws_notion_prod_7718",
      "workspaceName": "Acme Research & Notes",
      "workspaceIcon": "🧠",
      "ownerEmail": "user@example.com",
      "botId": "bot_nova_prod_01",
      "targetDatabaseId": "db_nova_inbox_9901",
      "targetDatabaseName": "NOVA Voice Inbox & Action Items",
      "connectedAt": "2026-10-11T12:00:00.000Z",
      "lastSyncAt": "2026-10-14T14:32:00.000Z",
      "pendingSyncCount": 0
    }
  }
}
```

---

### 3.3 Wi-Fi Provisioning
- **Endpoint**: `POST /api/v1/devices/:deviceId/wifi/provision`
- **Request Body**:
```json
{
  "pairingSessionId": "sess_918237fa9c82",
  "ssid": "QuantumLabs-2.4G",
  "password": "StrongWifiPassword123!",
  "hidden": false
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "ipAddress": "192.168.1.188",
    "message": "Successfully authenticated and connected to QuantumLabs-2.4G"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized` (`WIFI_AUTH_FAILED`): Incorrect Pre-Shared Key.
  - `408 Request Timeout` (`WIFI_TIMEOUT`): Device failed to obtain DHCP lease.

---

### 3.4 Notion OAuth Flow

#### Step 1: Request Authorization URL
- **Endpoint**: `POST /api/v1/auth/notion/authorize`
- **Request Body**:
```json
{
  "deviceId": "nova_s3_84f3eba1",
  "pairingSessionId": "sess_918237fa9c82",
  "redirectUri": "https://onboard.nova.hardware/setup/callback"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://api.notion.com/v1/oauth/authorize?owner=user&client_id=...&response_type=code&redirect_uri=...&state=...",
    "stateToken": "state_918203fbc829"
  }
}
```

#### Step 2: Handle OAuth Callback
- **Endpoint**: `POST /api/v1/auth/notion/callback`
- **Request Body**:
```json
{
  "code": "notion_oauth_code_abc123",
  "state": "state_918203fbc829",
  "deviceId": "nova_s3_84f3eba1"
}
```
- **Response `200 OK`**: Returns updated `NotionConnectionInfo`.

---

## 4. Hardware Provisioning Protocols

### 4.1 Web Bluetooth (Web BLE) GATT Service (ESP32-S3)
- **Primary Service UUID**: `00000001-6e6f-7661-7769-6669-70726f760000`
- **Characteristics**:
  - `WIFI_PROV_CHAR` (`00000002-...`): Write encrypted Protocomm / Improv Wi-Fi packet containing SSID & PSK.
  - `STATUS_CHAR` (`00000003-...`): Read/Notify connection state (`0x00` idle, `0x01` connecting, `0x02` connected, `0x03` auth failure).

### 4.2 Guided SoftAP Fallback (Mobile Safari / iOS)
- When Web BLE is unavailable, NOVA broadcasts an open Wi-Fi AP: `NOVA-Setup-XXXX` (where `XXXX` is the last 4 characters of the MAC address).
- Embedded HTTP Server on ESP32 listens on `http://192.168.4.1/api/wifi/configure`.
- The onboarding web app guides the user to submit network credentials directly to the local gateway or auto-detects when the device joins the cloud via backend MQTT telemetry.
