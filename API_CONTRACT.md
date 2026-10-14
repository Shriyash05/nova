# NOVA Production Backend API Contract & Hardware Integration Specification

This document defines the production REST API contract, security architecture, database persistence models, and hardware specifications for the **NOVA Ambient Voice Assistant Keychain**.

---

## 1. Physical Hardware Target Specifications

- **Microcontroller**: ESP32-C3 Super Mini (Single-core 32-bit RISC-V, 160MHz, 400KB SRAM, 4MB Flash, 2.4GHz 802.11b/g/n Wi-Fi & BLE 5.0).
- **Monochrome Display**: 0.96-inch SSD1306 OLED screen (128x64 pixels, I2C address `0x3C`, connected on `GPIO8` [SDA] and `GPIO9` [SCL]).
- **Microphone**: MAX4466 Electret Microphone Module on analog `ADC GPIO1` (16 kHz audio sampling).
- **Voice Trigger**: WakeNet offline neural wake-word recognition trained on **"Hi ESP"**.
- **User Interface**: Hands-free voice activation and on-screen OLED status animations. **No RGB light ring, no speaker, no vibration motor, and no push-to-talk button**.
- **Pairing Trigger**: On power-up or whenever Wi-Fi connection is lost, firmware automatically generates and renders an ephemeral QR code on the SSD1306 OLED display.

---

## 2. Serverless API Endpoint Implementation Status

All endpoints are implemented in the production backend router (`api/index.ts`) deployed as Vercel Serverless Functions:

| Method | Endpoint | Description | Implementation Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/devices/claim` | Redeem single-use 15-min claim token or shortcode | **Production Ready** |
| `GET` | `/api/v1/devices/:deviceId/status` | Fetch verified device, Wi-Fi, and Notion state | **Production Ready** |
| `POST` | `/api/v1/devices/:deviceId/wifi/provision` | Provision 2.4GHz Wi-Fi credentials to ESP32-C3 | **Production Ready** |
| `GET` | `/api/v1/devices/:deviceId/wifi/scan` | Retrieve visible 2.4GHz Wi-Fi networks | **Production Ready** |
| `POST` | `/api/v1/auth/notion/authorize` | Generate Notion OAuth URL with CSRF state token | **Production Ready** |
| `GET` | `/api/v1/auth/notion/callback` | Exchange OAuth code for token & encrypt at rest | **Production Ready** |
| `POST` | `/api/v1/devices/:deviceId/notion/disconnect` | Unlink Notion integration & scrub encrypted tokens | **Production Ready** |
| `POST` | `/api/v1/devices/:deviceId/sync/test` | Idempotent test voice note creation in Notion | **Production Ready** |
| `GET` | `/api/health` | Service health, database, and Notion credentials check | **Production Ready** |

---

## 3. Detailed API Endpoint Specifications & Payloads

### 3.1 Device Claim & Pairing
Validates the ephemeral single-use token rendered on the SSD1306 OLED screen and establishes an active pairing session.

- **Endpoint**: `POST /api/v1/devices/claim`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "claimToken": "clm_live_9f82d1c74a0e"
}
```
*(Or via 8-character OLED shortcode: `{"shortCode": "NOV-84F3"}`)*

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "pairingSessionId": "sess_918237fa9c82_m3n4b5",
    "deviceId": "nova_c3_84f3eba1",
    "serialNumber": "NOVA-C3-84F3EBA1",
    "hardwareModel": "ESP32-C3 Super Mini",
    "expiresInSeconds": 900
  }
}
```

- **Error Responses**:
  - `400 Bad Request` (`INVALID_CLAIM_CODE`): Empty or malformed claim token.
  - `400 Bad Request` (`CLAIM_TOKEN_ALREADY_REDEEMED`): Token was already redeemed (single-use guarantee).
  - `410 Gone` (`CLAIM_TOKEN_EXPIRED`): Token lifespan exceeded 15 minutes.

---

### 3.2 Real Device Status & Truthful Telemetry
Returns current network connectivity, cloud status, and Notion synchronization health as recorded by backend database.

- **Endpoint**: `GET /api/v1/devices/:deviceId/status`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "device": {
      "deviceId": "nova_c3_84f3eba1",
      "serialNumber": "NOVA-C3-84F3EBA1",
      "hardwareModel": "ESP32-C3 Super Mini",
      "firmwareVersion": "v1.0.0",
      "status": "online",
      "lastHeartbeat": "2026-10-15T02:00:00.000Z",
      "ipAddress": "192.168.1.188"
    },
    "wifi": {
      "state": "connected",
      "connectedSsid": "Home_Studio_2.4G",
      "rssi": -54,
      "ipAddress": "192.168.1.188",
      "macAddress": "84:F3:EB:A1:0C:4A",
      "frequencyBand": "2.4GHz"
    },
    "notion": {
      "isConnected": true,
      "workspaceId": "ws_notion_prod_7718",
      "workspaceName": "Acme Research & Notes",
      "workspaceIcon": "🧠",
      "ownerEmail": "user@example.com",
      "botId": "bot_nova_c3_01",
      "targetDatabaseId": "db_nova_inbox_9901",
      "targetDatabaseName": "NOVA Notes",
      "connectedAt": "2026-10-13T12:00:00.000Z",
      "lastSyncAt": "2026-10-15T01:50:00.000Z",
      "pendingSyncCount": 0
    }
  }
}
```

---

### 3.3 Wi-Fi Provisioning
Transmits network credentials to the device record and queues a provisioning action.

- **Endpoint**: `POST /api/v1/devices/:deviceId/wifi/provision`
- **Request Body**:
```json
{
  "ssid": "QuantumLabs-2.4G",
  "password": "RouterPassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "ipAddress": "192.168.1.188",
    "message": "Wi-Fi provisioned for QuantumLabs-2.4G. Hardware verified on ESP32-C3."
  }
}
```

---

### 3.4 Notion OAuth Flow

#### Step 1: Request Authorization URL
- **Endpoint**: `POST /api/v1/auth/notion/authorize`
- **Request Body**:
```json
{
  "deviceId": "nova_c3_84f3eba1",
  "redirectUri": "https://buynovastore.vercel.app/api/v1/auth/notion/callback"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://api.notion.com/v1/oauth/authorize?client_id=...&response_type=code&owner=user&redirect_uri=...&state=state_nova_c3_84f3eba1_9x8c7v",
    "stateToken": "state_nova_c3_84f3eba1_9x8c7v"
  }
}
```

#### Step 2: Handle OAuth Callback
- **Endpoint**: `GET /api/v1/auth/notion/callback?code=...&state=...`
- **Behavior**:
  1. Exchanges authorization `code` with `https://api.notion.com/v1/oauth/token` using server-side client secret.
  2. Encrypts the resulting `access_token` using AES-256-GCM (`NOTION_ENCRYPTION_KEY`).
  3. Saves workspace metadata in database.
  4. Issues an HTTP 302 redirect back to `/setup?notion_auth=success`.

---

### 3.5 Idempotent Voice Note Sync Test
Creates a test voice note in the user's connected Notion workspace while guaranteeing idempotency against network retries or power interruptions.

- **Endpoint**: `POST /api/v1/devices/:deviceId/sync/test`
- **Headers**:
  - `Content-Type: application/json`
  - `x-idempotency-key: sync_nova_c3_84f3eba1_1729000000` *(Optional, generated if omitted)*
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "pageTitle": "NOVA Voice Note (ESP32-C3) — 07:42 PM",
    "pageUrl": "https://notion.so/nova-voice-inbox/Test-Note-ESP32-C3-84f3eba1",
    "databaseName": "NOVA Notes & Voice Inbox",
    "latencyMs": 310,
    "syncedTimestamp": "2026-10-15T02:12:00.000Z"
  }
}
```
*If a request is retried with the same `x-idempotency-key`, the existing created page URL is returned immediately without creating a duplicate Notion entry.*
