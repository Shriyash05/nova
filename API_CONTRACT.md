# NOVA Production Backend API Contract & Hardware Architecture

This document defines the production REST API contract, security architecture, database persistence models, and hardware specifications for the **NOVA Ambient Voice Assistant Keychain**.

---

## 1. Physical Hardware Target Specifications

- **Microcontroller**: ESP32-C3 Super Mini (Single-core 32-bit RISC-V @ 160MHz, 400KB SRAM, 4MB Flash, 2.4GHz 802.11b/g/n Wi-Fi & BLE 5.0).
- **Physical Device ID**: `nova-c3-5c20dc4239fca9ec`
- **Factory MAC Address**: `48:F6:EE:17:34:D8`
- **Monochrome Display**: 0.96-inch SSD1306 OLED screen (128×64 pixels, I2C address `0x3C`, connected on `GPIO8` [SDA] and `GPIO9` [SCL]).
- **Microphone**: MAX4466 Electret Microphone Module on analog `ADC GPIO1` (16 kHz audio sampling).
- **Voice Trigger**: WakeNet offline neural wake-word recognition trained on **"Hi ESP"**.
- **User Interface**: Hands-free voice activation and on-screen OLED status animations. **No RGB light ring, no speaker, no vibration motor, and no push-to-talk button**.
- **Wi-Fi Provisioning Model**: Local password-protected **SoftAP (SSID: `NOVA-Setup-A9EC`)** with captive portal at `http://192.168.4.1`. Wi-Fi credentials are sent directly from browser to hardware over the local Wi-Fi link. **Credentials never pass through Vercel or cloud servers.**
- **Pairing Trigger**: Once online, the ESP32-C3 connects via TLS to the cloud backend (`POST /api/v1/devices/bootstrap`) with a bootstrap credential to register its cloud state and receive a persistent `deviceKey` and single-use 15-minute claim token, which the firmware renders as a QR code on the SSD1306 OLED.

---

## 2. Serverless API Endpoint Implementation Status

Live Production Base URL: `https://buynovastore.vercel.app`

| Method | Endpoint | Authentication | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health, Supabase pooler status, and hardware confirmation | **Verified (200 OK)** |
| `POST` | `/api/v1/devices/bootstrap` | Bootstrap Credential | Enrolls new physical hardware & issues 15-min claim token + deviceKey | **Verified (200 OK / 401)** |
| `POST` | `/api/v1/devices/claim` | Ephemeral Claim Token | Redeems OLED QR claim token and issues 30-day web pairing session | **Verified (200 OK / 400)** |
| `POST` | `/api/v1/devices/:deviceId/heartbeat` | `Bearer <deviceKey>` | Firmware telemetry heartbeat (RSSI, local IP, queue count, OLED state) | **Verified (200 OK / 401 / 403)** |
| `GET` | `/api/v1/devices/:deviceId/status` | `Bearer <session \| deviceKey>` | Fetch verified device telemetry, Wi-Fi status, and Notion auth from DB | **Verified (200 OK / 401 / 403)** |
| `POST` | `/api/v1/devices/:deviceId/wifi/provision` | N/A (Blocked) | Cloud provision guard (rejects with 400; SoftAP local only) | **Verified (400 Guard)** |
| `POST` | `/api/v1/auth/notion/authorize` | Public / Device ID | Generate signed Notion OAuth URL with CSRF state token | **Verified (200 OK)** |
| `GET` | `/api/v1/auth/notion/callback` | OAuth Code | Exchange OAuth code for token & encrypt at rest with AES-256-GCM | **Verified (302 Redirect)** |
| `POST` | `/api/v1/devices/:deviceId/sync/test` | `Bearer <session \| deviceKey>` | Idempotent test voice note creation in Notion database | **Verified (400 / 200)** |
| `POST` | `/api/v1/devices/:deviceId/notion/disconnect` | `Bearer <session \| deviceKey>` | Revoke Notion integration & scrub encrypted tokens from database | **Verified (200 OK)** |

---

## 3. Database Migration (DDL)

Applied to live PostgreSQL database (Supabase project `jcwlxiujyjlessgfwjgu`):

```sql
-- 1. Devices: Durable identity surviving Wi-Fi reconnects & recovery
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,                             -- e.g. 'nova-c3-5c20dc4239fca9ec'
    serial_number VARCHAR(64) NOT NULL UNIQUE,              -- e.g. 'NOVA-C3-5C20DC4239FCA9EC'
    mac_address VARCHAR(32) NOT NULL,                       -- e.g. '48:F6:EE:17:34:D8'
    hardware_model VARCHAR(64) NOT NULL DEFAULT 'ESP32-C3 Super Mini',
    firmware_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0-c3',
    status VARCHAR(16) NOT NULL DEFAULT 'offline',          -- 'online' | 'offline'
    device_secret VARCHAR(128),                             -- Persistent device key for firmware heartbeat auth
    ip_address VARCHAR(45),
    wifi_connected BOOLEAN NOT NULL DEFAULT FALSE,
    wifi_ssid VARCHAR(64),
    wifi_rssi INTEGER,
    oled_state VARCHAR(32) NOT NULL DEFAULT 'idle',         -- 'idle' | 'listening' | 'pairing_qr' | 'wifi_setup' | 'synced' | 'offline'
    queue_count INTEGER NOT NULL DEFAULT 0,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Claim Tokens: 15-minute single-use ephemeral tokens shown on SSD1306 OLED QR
CREATE TABLE IF NOT EXISTS claim_tokens (
    token VARCHAR(128) PRIMARY KEY,                         -- e.g. 'clm_live_af8405f4'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    short_code VARCHAR(16) NOT NULL,                        -- e.g. 'NOV-AF84'
    expires_at TIMESTAMPTZ NOT NULL,                        -- Valid for 15 minutes only
    is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,             -- Single-use guarantee
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_tokens_short_code ON claim_tokens(short_code);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_device_id ON claim_tokens(device_id);

-- 3. Pairing Sessions: Active web pairing sessions established after valid claim
CREATE TABLE IF NOT EXISTS pairing_sessions (
    id VARCHAR(128) PRIMARY KEY,                            -- e.g. 'sess_26f0ac0a8c91a00b75cf7615eb7c2a0b'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    claim_token VARCHAR(128),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pairing_sessions_device ON pairing_sessions(device_id);

-- 4. Notion Authorizations: Server-side OAuth metadata; tokens encrypted at rest with AES-256-GCM
CREATE TABLE IF NOT EXISTS notion_authorizations (
    device_id VARCHAR(64) PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64),
    workspace_name VARCHAR(255),
    workspace_icon VARCHAR(255),
    bot_id VARCHAR(128),
    encrypted_access_token TEXT NOT NULL,                   -- Encrypted via AES-256-GCM
    target_database_id VARCHAR(128),
    target_database_name VARCHAR(255),
    owner_email VARCHAR(255),
    last_sync_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Device Actions & Idempotent Sync Queue
CREATE TABLE IF NOT EXISTS device_actions (
    id VARCHAR(64) PRIMARY KEY,                             -- Action ID
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL,                       -- 'sync_note' | 'heartbeat'
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,           -- Unique key preventing duplicate insertion
    payload_json JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',          -- 'pending' | 'delivered' | 'acknowledged' | 'failed'
    response_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);
```

---

## 4. Exact JSON Contracts

### 4.1 Device Enrollment: `POST /api/v1/devices/bootstrap`
Called over TLS when physical ESP32-C3 connects to Wi-Fi to register cloud state.
Protected by `bootstrapSecret` (or `x-nova-bootstrap` header / `Authorization: Bearer <secret>`).

#### Request:
```http
POST /api/v1/devices/bootstrap HTTP/1.1
Host: buynovastore.vercel.app
Content-Type: application/json

{
  "deviceId": "nova-c3-5c20dc4239fca9ec",
  "macAddress": "48:F6:EE:17:34:D8",
  "firmwareVersion": "v1.0.0-c3",
  "bootstrapSecret": "nova_sec_c3_hardware_bootstrap_2026",
  "wifiSsid": "Home_Studio_2.4G",
  "ipAddress": "192.168.1.142",
  "rssi": -56
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "serialNumber": "NOVA-C3-5C20DC4239FCA9EC",
    "macAddress": "48:F6:EE:17:34:D8",
    "firmwareVersion": "v1.0.0-c3",
    "claimToken": "clm_live_af8405f4",
    "shortCode": "NOV-AF8405F4",
    "expiresAt": "2026-10-14T22:44:22.663Z",
    "expiresInSeconds": 900,
    "deviceKey": "dkey_b1f92750e8013c7b61b75b4d38fabc30",
    "portalUrl": "https://buynovastore.vercel.app/?token=clm_live_af8405f4"
  }
}
```

#### Response `401 Unauthorized` (Invalid/Missing Secret):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_BOOTSTRAP_CREDENTIAL",
    "message": "Invalid or missing device bootstrap credential. Unauthorized device enrollment."
  }
}
```

---

### 4.2 Firmware Telemetry Heartbeat: `POST /api/v1/devices/:deviceId/heartbeat`
Called periodically by firmware. Authenticated with `Authorization: Bearer <deviceKey>`.
Accepts **only non-secret telemetry**. Rejects Wi-Fi passwords.

#### Request:
```http
POST /api/v1/devices/nova-c3-5c20dc4239fca9ec/heartbeat HTTP/1.1
Host: buynovastore.vercel.app
Authorization: Bearer dkey_b1f92750e8013c7b61b75b4d38fabc30
Content-Type: application/json

{
  "firmwareVersion": "v1.0.0-c3",
  "wifiConnected": true,
  "rssi": -49,
  "ipAddress": "192.168.1.142",
  "queueCount": 0,
  "oledState": "idle"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "acknowledged": true,
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "serverTime": "2026-10-14T22:30:10.292Z",
    "status": "online",
    "oledState": "idle",
    "queueCount": 0
  }
}
```

#### Response `400 Bad Request` (If Secret Included):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TELEMETRY",
    "message": "Heartbeat must only contain non-secret telemetry. Do not send Wi-Fi credentials to cloud APIs."
  }
}
```

---

### 4.3 Authenticated Device Status: `GET /api/v1/devices/:deviceId/status`
Requires `Authorization: Bearer <pairingSessionId | deviceKey>`.
Returns `401` for absent/invalid credentials and `403` for credentials belonging to a different device.

#### Request:
```http
GET /api/v1/devices/nova-c3-5c20dc4239fca9ec/status HTTP/1.1
Host: buynovastore.vercel.app
Authorization: Bearer sess_26f0ac0a8c91a00b75cf7615eb7c2a0b
```

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "device": {
      "deviceId": "nova-c3-5c20dc4239fca9ec",
      "serialNumber": "NOVA-C3-5C20DC4239FCA9EC",
      "hardwareModel": "ESP32-C3 Super Mini",
      "firmwareVersion": "v1.0.0-c3",
      "status": "online",
      "oledState": "idle",
      "queueCount": 0,
      "lastHeartbeat": "2026-10-14T22:30:10.290Z",
      "ipAddress": "192.168.1.142"
    },
    "wifi": {
      "state": "connected",
      "connected": true,
      "connectedSsid": "Home_Studio_2.4G",
      "rssi": -49,
      "ipAddress": "192.168.1.142",
      "macAddress": "48:F6:EE:17:34:D8",
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

#### Response `401 Unauthorized` (Missing Authorization):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Provide Authorization: Bearer <device session or device credential>."
  }
}
```

#### Response `403 Forbidden` (Cross-Device Credential):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Device credential does not grant access to device 'nova-c3-other99887766'."
  }
}
```

---

### 4.4 Web Claim Redemption: `POST /api/v1/devices/claim`
Redeems single-use ephemeral OLED QR token and creates a 30-day web pairing session.

#### Request:
```http
POST /api/v1/devices/claim HTTP/1.1
Host: buynovastore.vercel.app
Content-Type: application/json

{
  "claimToken": "clm_live_af8405f4"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "pairingSessionId": "sess_26f0ac0a8c91a00b75cf7615eb7c2a0b",
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "serialNumber": "NOVA-C3-5C20DC4239FCA9EC",
    "hardwareModel": "ESP32-C3 Super Mini",
    "expiresInSeconds": 2592000
  }
}
```

#### Response `400 Bad Request` (Duplicate Redemption Attempt):
```json
{
  "success": false,
  "error": {
    "code": "CLAIM_TOKEN_ALREADY_REDEEMED",
    "message": "This claim token has already been claimed."
  }
}
```
