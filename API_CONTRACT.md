# NOVA Production Backend API Contract & Hardware Architecture

This document defines the production REST API contract, security architecture, database persistence models, and hardware specifications for the **NOVA Ambient Voice Assistant Keychain**.

---

## 1. Physical Hardware Target Specifications

- **Microcontroller**: ESP32-C3 Super Mini (Single-core 32-bit RISC-V, 160MHz, 400KB SRAM, 4MB Flash, 2.4GHz 802.11b/g/n Wi-Fi & BLE 5.0).
- **Monochrome Display**: 0.96-inch SSD1306 OLED screen (128x64 pixels, I2C address `0x3C`, connected on `GPIO8` [SDA] and `GPIO9` [SCL]).
- **Microphone**: MAX4466 Electret Microphone Module on analog `ADC GPIO1` (16 kHz audio sampling).
- **Voice Trigger**: WakeNet offline neural wake-word recognition trained on **"Hi ESP"**.
- **User Interface**: Hands-free voice activation and on-screen OLED status animations. **No RGB light ring, no speaker, no vibration motor, and no push-to-talk button**.
- **Provisioning Model**: Local password-protected **SoftAP (SSID: `NOVA-Setup-84F3`)** with captive portal at `http://192.168.4.1`. Wi-Fi credentials are sent directly from browser to hardware over the local Wi-Fi link. **Credentials never pass through Vercel or cloud servers.**
- **Pairing Trigger**: Once online, the ESP32-C3 connects via TLS to the cloud backend (`POST /api/v1/devices/bootstrap`) to register its cloud state and receive a single-use 15-minute claim token, which the firmware renders as a QR code on the SSD1306 OLED.

---

## 2. Serverless API Endpoint Implementation Status

Deployed as Vercel Serverless Functions on `https://buynovastore.vercel.app`:

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health check, PostgreSQL pooler status, and hardware target confirmation | **Deployed & Verified (200 OK)** |
| `POST` | `/api/v1/devices/bootstrap` | TLS registration from ESP32-C3 hardware to cloud upon connecting to Wi-Fi | **Deployed & Verified (200 OK)** |
| `POST` | `/api/v1/devices/claim` | Redeem single-use 15-min claim token rendered on OLED QR code | **Deployed & Verified (200 OK)** |
| `GET` | `/api/v1/devices/:deviceId/status` | Fetch verified device telemetry, Wi-Fi status, and Notion auth from DB | **Deployed & Verified (200 OK)** |
| `POST` | `/api/v1/auth/notion/authorize` | Generate signed Notion OAuth URL with CSRF state token | **Deployed & Verified (200 OK)** |
| `GET` | `/api/v1/auth/notion/callback` | Exchange OAuth code for token & encrypt at rest with AES-256-GCM | **Deployed & Verified (302 Redirect)** |
| `POST` | `/api/v1/devices/:deviceId/notion/disconnect` | Revoke Notion integration & scrub encrypted tokens from database | **Deployed & Verified (200 OK)** |
| `POST` | `/api/v1/devices/:deviceId/sync/test` | Idempotent test voice note creation in Notion database | **Deployed & Verified (200 OK / 400)** |

---

## 3. Detailed API Endpoint Specifications & Verified Responses

### 3.1 Service Health: `GET /api/health`
- **Request**:
  `GET https://buynovastore.vercel.app/api/health`
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "service": "NOVA Cloud API",
  "hardware": {
    "chipset": "ESP32-C3 Super Mini (RISC-V @ 160MHz)",
    "display": "SSD1306 monochrome 128x64 OLED (0x3C, GPIO8/GPIO9)",
    "microphone": "MAX4466 analog electret (ADC GPIO1)",
    "wakeWord": "Hi ESP (WakeNet)",
    "provisioning": "Local password-protected SoftAP (192.168.4.1)"
  },
  "database": {
    "status": "connected",
    "registeredDevices": 1
  },
  "notionConfigured": true,
  "timestamp": "2026-10-14T21:19:21.378Z"
}
```

---

### 3.2 Device Bootstrap / TLS Registration: `POST /api/v1/devices/bootstrap`
Called by ESP32-C3 firmware over TLS when it connects to Wi-Fi:
- **Request**:
```json
{
  "deviceId": "nova_c3_84f3eba1",
  "serialNumber": "NOVA-C3-84F3EBA1",
  "macAddress": "84:F3:EB:A1:0C:4A",
  "wifiSsid": "Studio_2.4G",
  "ipAddress": "192.168.1.188",
  "rssi": -58
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova_c3_84f3eba1",
    "serialNumber": "NOVA-C3-84F3EBA1",
    "claimToken": "clm_live_c87e614a",
    "shortCode": "NOV-C87E",
    "expiresAt": "2026-10-14T21:34:34.382Z",
    "portalUrl": "https://buynovastore.vercel.app/?token=clm_live_c87e614a"
  }
}
```

---

### 3.3 Device Claim & Pairing: `POST /api/v1/devices/claim`
- **Request**:
```json
{
  "claimToken": "clm_live_c87e614a"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "pairingSessionId": "sess_dd88f0ee403e66e45786039e6f8158df",
    "deviceId": "nova_c3_84f3eba1",
    "serialNumber": "NOVA-C3-84F3EBA1",
    "hardwareModel": "ESP32-C3 Super Mini",
    "expiresInSeconds": 2592000
  }
}
```
- **Single-Use Rejection `400 Bad Request`**:
```json
{
  "success": false,
  "error": {
    "code": "CLAIM_TOKEN_ALREADY_REDEEMED",
    "message": "This claim token has already been claimed."
  }
}
```

---

### 3.4 Live Device Status: `GET /api/v1/devices/:deviceId/status`
- **Request**:
  `GET https://buynovastore.vercel.app/api/v1/devices/nova_c3_84f3eba1/status`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "device": {
      "deviceId": "nova_c3_84f3eba1",
      "serialNumber": "NOVA-C3-84F3EBA1",
      "hardwareModel": "ESP32-C3 Super Mini",
      "firmwareVersion": "v1.0.0-c3",
      "status": "online",
      "lastHeartbeat": "2026-10-14T21:17:52.585Z",
      "ipAddress": "192.168.1.188"
    },
    "wifi": {
      "state": "connected",
      "connectedSsid": "Home_2.4G",
      "rssi": -54,
      "ipAddress": "192.168.1.188",
      "macAddress": "84:F3:EB:A1:0C:4A",
      "frequencyBand": "2.4GHz"
    },
    "notion": {
      "isConnected": false,
      "workspaceId": null,
      "workspaceName": null,
      "workspaceIcon": null,
      "ownerEmail": null,
      "botId": null,
      "targetDatabaseId": null,
      "targetDatabaseName": "NOVA Notes",
      "connectedAt": null,
      "lastSyncAt": null,
      "pendingSyncCount": 0
    }
  }
}
```

---

### 3.5 Notion OAuth Authorize: `POST /api/v1/auth/notion/authorize`
- **Request**:
```json
{
  "deviceId": "nova_c3_84f3eba1"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://api.notion.com/v1/oauth/authorize?client_id=3f9d872b-594c-81fe-b945-00373d142af3&response_type=code&owner=user&redirect_uri=https%3A%2F%2Fbuynovastore.vercel.app%2Fapi%2Fv1%2Fauth%2Fnotion%2Fcallback&state=state_nova_c3_84f3eba1_6c68c25c4701b1eb",
    "stateToken": "state_nova_c3_84f3eba1_6c68c25c4701b1eb"
  }
}
```

---

### 3.6 Notion OAuth Callback: `GET /api/v1/auth/notion/callback`
Exchanges the authorization code for an access token, encrypts it using AES-256-GCM, stores it in `notion_authorizations`, and redirects the browser back to the onboarding UI.

---

### 3.7 Idempotent Test Sync: `POST /api/v1/devices/:deviceId/sync/test`
- **Request**:
```json
{
  "idempotencyKey": "test_sync_key_9f82d1"
}
```
- **Response `400 Bad Request`** (When Notion not yet linked):
```json
{
  "success": false,
  "error": {
    "code": "NOTION_NOT_CONNECTED",
    "message": "Cannot run test sync because Notion is not linked for this device."
  }
}
```
