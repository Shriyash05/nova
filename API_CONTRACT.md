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
- **Pairing Trigger**: Once online, the ESP32-C3 connects via TLS to the cloud backend (`POST /api/v1/devices/bootstrap`) with its unique bootstrap credential to register its cloud state and receive a rotatable `deviceKey` and single-use 15-minute claim token, which the firmware renders as a QR code on the SSD1306 OLED.

---

## 2. Serverless API Endpoint Implementation Status

Live Production Base URL: `https://buynovastore.vercel.app`

| Method | Endpoint | Authentication | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health, Supabase pooler status, and hardware confirmation | **Verified (200 OK)** |
| `POST` | `/api/v1/devices/bootstrap` | Bootstrap Credential | Enrolls hardware with SHA-256 hash check; issues 15-min claim token + deviceKey | **Verified (200 OK / 401)** |
| `POST` | `/api/v1/devices/:deviceId/device-key/rotate` | `Bearer <deviceKey \| session>` | Authenticated rotation of device credentials (`dkey_<hex>`) | **Verified (200 OK / 401 / 403)** |
| `POST` | `/api/v1/devices/:deviceId/claim-token` | `Bearer <deviceKey \| session>` | Authenticated single-use 15-minute claim token creation for OLED QR | **Verified (200 OK / 401 / 403)** |
| `POST` | `/api/v1/devices/claim` | Ephemeral Claim Token | Redeems OLED QR claim token and issues 30-day web pairing session | **Verified (200 OK / 400)** |
| `POST` | `/api/v1/devices/:deviceId/heartbeat` | `Bearer <deviceKey>` | Firmware telemetry heartbeat (RSSI, local IP, queue count, OLED state) | **Verified (200 OK / 401 / 403)** |
| `GET` | `/api/v1/devices/:deviceId/status` | `Bearer <session \| deviceKey>` | Fetch verified device telemetry, Wi-Fi status, and Notion auth from DB | **Verified (200 OK / 401 / 403)** |
| `GET` | `/api/v1/devices/:deviceId/wifi-profiles` | `Bearer <session \| deviceKey>` | Fetch Wi-Fi vault (ETag/304; stripped for browser, decrypted for firmware) | **Verified (200 OK / 304 / 401)** |
| `PUT` | `/api/v1/devices/:deviceId/wifi-profiles` | `Bearer <session \| deviceKey>` | Bulk update or reorder profile vault (enforces max 5, at most 1 default) | **Verified (200 OK / 400 / 401)** |
| `POST` | `/api/v1/devices/:deviceId/wifi-profiles` | `Bearer <session \| deviceKey>` | Add Wi-Fi profile (assigns voice slot `network one`..`network five`, max 5) | **Verified (201 Created / 400)** |
| `POST` | `/api/v1/devices/:deviceId/wifi-profiles/:profileId/make-default` | `Bearer <session \| deviceKey>` | Set profile as boot default (ensures exactly 1 default) | **Verified (200 OK / 401 / 403)** |
| `PATCH` | `/api/v1/devices/:deviceId/wifi-profiles/:profileId` | `Bearer <session \| deviceKey>` | Edit profile name, SSID, encrypted password, or default status | **Verified (200 OK / 401 / 403)** |
| `DELETE` | `/api/v1/devices/:deviceId/wifi-profiles/:profileId` | `Bearer <session \| deviceKey>` | Delete profile and recompact remaining voice slots (1..N) | **Verified (200 OK / 401 / 403)** |
| `POST` | `/api/v1/devices/:deviceId/wifi-profile-result` | `Bearer <deviceKey>` | Firmware reports router connection outcome (`connected`, `auth_failed`, etc.) | **Verified (200 OK / 401)** |
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
    device_secret VARCHAR(128),                             -- SHA-256 cryptographic hash of device bearer key (never plaintext)
    bootstrap_hash VARCHAR(128),                            -- SHA-256 hash of unique device bootstrap credential
    ip_address VARCHAR(45),
    wifi_connected BOOLEAN NOT NULL DEFAULT FALSE,
    wifi_ssid VARCHAR(64),
    wifi_rssi INTEGER,
    wifi_vault_version INTEGER NOT NULL DEFAULT 1,          -- Monotonically incremented on vault changes
    oled_state VARCHAR(32) NOT NULL DEFAULT 'idle',         -- 'idle' | 'listening' | 'pairing_qr' | 'wifi_setup' | 'synced' | 'offline'
    queue_count INTEGER NOT NULL DEFAULT 0,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Pre-enrolled Unique Bootstrap Credentials (Manufacturing / Hardware Binding)
CREATE TABLE IF NOT EXISTS device_bootstrap_credentials (
    device_id VARCHAR(64) PRIMARY KEY,                      -- e.g. 'nova-c3-5c20dc4239fca9ec'
    mac_address VARCHAR(32),
    credential_hash VARCHAR(128) NOT NULL,                  -- SHA-256 hash of unique device bootstrap secret
    is_used BOOLEAN NOT NULL DEFAULT FALSE,                 -- Single-use bootstrap guarantee
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Multi-Wi-Fi Profile Vault: Max 5 profiles per device with stable voice slots
CREATE TABLE IF NOT EXISTS wifi_profiles (
    id VARCHAR(64) PRIMARY KEY,                             -- e.g. 'prof_12ab34cd56ef'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,                              -- User display name: 'Home Studio'
    voice_slot VARCHAR(32) NOT NULL,                        -- 'network one' .. 'network five'
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 5),
    ssid VARCHAR(64) NOT NULL,                              -- 2.4GHz network SSID
    encrypted_password TEXT,                                -- Server-side envelope AES-256-GCM encrypted
    is_default BOOLEAN NOT NULL DEFAULT FALSE,              -- Exactly 0 or 1 default per device
    version INTEGER NOT NULL DEFAULT 1,                     -- Profile revision counter
    last_connection_result VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'connected' | 'auth_failed' | 'timeout' | 'not_found' | 'pending'
    last_attempted_at TIMESTAMPTZ,
    last_rssi INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wifi_profiles_device ON wifi_profiles(device_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wifi_profiles_device_slot ON wifi_profiles(device_id, slot_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wifi_profiles_one_default ON wifi_profiles(device_id) WHERE is_default = TRUE;

-- 4. Claim Tokens: 15-minute single-use ephemeral tokens shown on SSD1306 OLED QR
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

-- 5. Pairing Sessions: Active web pairing sessions established after valid claim
CREATE TABLE IF NOT EXISTS pairing_sessions (
    id VARCHAR(128) PRIMARY KEY,                            -- e.g. 'sess_26f0ac0a8c91a00b75cf7615eb7c2a0b'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    claim_token VARCHAR(128),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pairing_sessions_device ON pairing_sessions(device_id);

-- 6. Notion Authorizations: Server-side OAuth metadata; tokens encrypted at rest with AES-256-GCM
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
```

---

## 4. Multi-Wi-Fi Profile Vault Contract Shapes

### 4.1 GET `/api/v1/devices/:deviceId/wifi-profiles`

**Request Headers**:
- `Authorization: Bearer <sessionToken | deviceKey>`
- `If-None-Match: W/"vault-<deviceId>-v<version>"` (Optional, returns 304 if vault unchanged)

**Browser View (Session Auth) Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "vaultVersion": 4,
    "profileCount": 2,
    "maxProfiles": 5,
    "profiles": [
      {
        "id": "prof_a1b2c3d4e5f6",
        "name": "Home Studio",
        "voiceSlot": "network one",
        "slotNumber": 1,
        "ssid": "Home_Studio_2.4G",
        "hasPassword": true,
        "isDefault": true,
        "version": 1,
        "lastConnectionResult": "connected",
        "lastAttemptedAt": "2026-10-15T04:20:00.000Z",
        "lastRssi": -52,
        "updatedAt": "2026-10-15T04:20:00.000Z"
      },
      {
        "id": "prof_f6e5d4c3b2a1",
        "name": "Office Workshop",
        "voiceSlot": "network two",
        "slotNumber": 2,
        "ssid": "Office_2.4G",
        "hasPassword": true,
        "isDefault": false,
        "version": 1,
        "lastConnectionResult": "pending",
        "lastAttemptedAt": null,
        "lastRssi": null,
        "updatedAt": "2026-10-15T04:21:00.000Z"
      }
    ]
  }
}
```

*Note: Passwords are NEVER included in browser session responses.*

**ESP32 Firmware View (`deviceKey` Auth) Response `200 OK`**:
When called with `Authorization: Bearer <deviceKey>` over TLS, the backend includes the decrypted plaintext `password` property for direct hardware storage in encrypted NVS flash:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "vaultVersion": 4,
    "profileCount": 1,
    "maxProfiles": 5,
    "profiles": [
      {
        "id": "prof_a1b2c3d4e5f6",
        "name": "Home Studio",
        "voiceSlot": "network one",
        "slotNumber": 1,
        "ssid": "Home_Studio_2.4G",
        "password": "<DECRYPTED_PLAINTEXT_PASSWORD>",
        "isDefault": true,
        "version": 1,
        "lastConnectionResult": "connected",
        "lastAttemptedAt": "2026-10-15T04:20:00.000Z",
        "lastRssi": -52,
        "updatedAt": "2026-10-15T04:20:00.000Z"
      }
    ]
  }
}
```

### 4.2 POST `/api/v1/devices/:deviceId/wifi-profiles`

**Request Headers**:
- `Authorization: Bearer <sessionToken | deviceKey>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "name": "Home Studio",
  "ssid": "Home_Studio_2.4G",
  "password": "<ROUTER_PASSWORD>",
  "isDefault": true
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "prof_a1b2c3d4e5f6",
      "name": "Home Studio",
      "voiceSlot": "network one",
      "slotNumber": 1,
      "ssid": "Home_Studio_2.4G",
      "hasPassword": true,
      "isDefault": true,
      "version": 1,
      "lastConnectionResult": "pending",
      "lastAttemptedAt": null,
      "lastRssi": null
    },
    "vaultVersion": 2
  }
}
```

### 4.3 POST `/api/v1/devices/:deviceId/wifi-profiles/:profileId/make-default`

**Request Headers**:
- `Authorization: Bearer <sessionToken | deviceKey>`

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "profileId": "prof_a1b2c3d4e5f6",
    "isDefault": true,
    "vaultVersion": 3
  }
}
```

### 4.4 PATCH `/api/v1/devices/:deviceId/wifi-profiles/:profileId`

**Request Body**:
```json
{
  "name": "Updated Office Label",
  "ssid": "New_SSID_2.4G",
  "password": "<NEW_PASSWORD_OR_OMIT_TO_PRESERVE>",
  "isDefault": false
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "prof_a1b2c3d4e5f6",
      "name": "Updated Office Label",
      "voiceSlot": "network two",
      "slotNumber": 2,
      "ssid": "New_SSID_2.4G",
      "hasPassword": true,
      "isDefault": false,
      "version": 2,
      "lastConnectionResult": "pending",
      "lastAttemptedAt": null,
      "lastRssi": null,
      "updatedAt": "2026-10-15T04:22:00.000Z"
    },
    "vaultVersion": 4
  }
}
```

### 4.5 DELETE `/api/v1/devices/:deviceId/wifi-profiles/:profileId`

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "profileId": "prof_a1b2c3d4e5f6",
    "vaultVersion": 5
  }
}
```

### 4.6 POST `/api/v1/devices/:deviceId/wifi-profile-result`

**Request Headers**:
- `Authorization: Bearer <deviceKey>`

**Request Body**:
```json
{
  "profileId": "prof_a1b2c3d4e5f6",
  "result": "connected",
  "rssi": -48,
  "appliedVersion": 5
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "acknowledged": true,
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "profileId": "prof_a1b2c3d4e5f6",
    "ssid": null,
    "result": "connected",
    "appliedVersion": 5,
    "serverTime": "2026-10-15T04:23:00.000Z"
  }
}
```

### 4.7 POST `/api/v1/devices/:deviceId/device-key/rotate`

**Request Headers**:
- `Authorization: Bearer <deviceKey | sessionToken>`

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "deviceKey": "dkey_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
    "rotatedAt": "2026-10-15T04:24:00.000Z"
  }
}
```

### 4.8 POST `/api/v1/devices/:deviceId/claim-token`

**Request Headers**:
- `Authorization: Bearer <deviceKey | sessionToken>`

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "claimToken": "clm_live_6c7d8e9f",
    "shortCode": "NOV-6C7D",
    "expiresAt": "2026-10-15T04:39:00.000Z",
    "expiresInSeconds": 900,
    "portalUrl": "https://buynovastore.vercel.app/?token=clm_live_6c7d8e9f"
  }
}
```

### 4.9 GET `/api/v1/devices/:deviceId/wifi-profiles/boot`

Dedicated boot configuration endpoint for ESP32-C3 firmware. Returns **ONLY** the single default profile needed for automatic boot connection over TLS.

**Request Headers**:
- `Authorization: Bearer <deviceKey>` (Firmware authentication required)

**Firmware Response `200 OK` (when default profile exists)**:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "vaultVersion": 4,
    "hasDefault": true,
    "defaultProfile": {
      "id": "prof_a1b2c3d4e5f6",
      "name": "Home Studio",
      "voiceSlot": "network one",
      "slotNumber": 1,
      "ssid": "Home_Studio_2.4G",
      "isDefault": true,
      "version": 1,
      "password": "cleartext_password_for_hardware_over_tls",
      "hasPassword": true
    }
  }
}
```

**Firmware Response `200 OK` (when no default configured)**:
```json
{
  "success": true,
  "data": {
    "deviceId": "nova-c3-5c20dc4239fca9ec",
    "vaultVersion": 4,
    "hasDefault": false,
    "defaultProfile": null,
    "message": "No default boot profile configured for device."
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: Absent, invalid, or expired deviceKey.
- `403 FORBIDDEN`: Device key belongs to a different device (`CROSS_DEVICE_FORBIDDEN`).
- `404 NOT_FOUND`: Device ID does not exist in registry.

---

## 5. Security, Heartbeat, and Recovery Constraints

1. **Envelope Encryption at Rest**: Stored Wi-Fi passwords and Notion OAuth access tokens are encrypted at rest with server-side AES-256-GCM authenticated encryption (`iv:authTag:ciphertext`). Decryption keys are held in server environment variables (`NOTION_ENCRYPTION_KEY` / `WIFI_ENCRYPTION_KEY`), strictly outside the database.
2. **Zero Password Leakage**: Passwords submitted by users over HTTPS are write-only. Browser dashboard responses return `hasPassword: true`, never cleartext passwords or hashes. Credentials are never logged in diagnostics, error responses, or test logs.
3. **Hardware Truth Connection Badging**:
   - A saved profile in the vault displays the `Saved` badge by default. It must **never** display `Verified Online` or `Connected` simply because it exists in the database.
   - Connection status is established **only** when an authenticated device heartbeat matching the profile SSID is received within the freshness window.
4. **Heartbeat Liveness & Stale Telemetry Handling**:
   - Heartbeats older than **90 seconds** automatically mark `device.status = 'offline'` and `wifi.state = 'disconnected'`.
   - Stale IP addresses and RSSI values are scrubbed to `null` to prevent misleading "online" false positives in user interfaces.
5. **Per-Device Credentials & Isolation**:
   - Each physical NOVA device has its own unique high-entropy bootstrap credential and independent rotatable device key (`dkey_<hex>`).
   - No shared global device secret exists.
   - Cross-device requests are strictly rejected with `403 FORBIDDEN`.
6. **Voice Slot Stability**:
   - Profiles are mapped to hardware-deterministic voice slots `network one` through `network five`.
   - Voice switching syntax is: *"Hi ESP, connect to network one"*.
7. **Identity & Recovery Preservation**:
   - Changing Wi-Fi profiles or entering recovery mode **never** deletes or resets device identity, account ownership, Notion OAuth authorization, cloud data, sync history, or queued unsent voice memos.
   - Wi-Fi recovery remains strictly isolated from factory reset.

