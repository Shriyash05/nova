# NOVA — Production Onboarding Portal & Cloud Backend

A production-ready onboarding portal and serverless cloud backend for **NOVA**, an ESP32-C3-based voice assistant keychain that captures voice notes hands-free via WakeNet and automatically syncs them into Notion.

Live Deployment: [buynovastore.vercel.app](https://buynovastore.vercel.app/)

---

## ⚡ Physical Hardware Architecture

NOVA runs on dedicated embedded hardware:
- **MCU**: **ESP32-C3 Super Mini** (Single-core 32-bit RISC-V @ 160MHz, 4MB Flash, Wi-Fi 4 802.11b/g/n + BLE 5.0).
- **Monochrome Display**: **SSD1306 OLED** (0.96", 128x64 pixels, I2C address `0x3C`, connected on `GPIO8` [SDA] and `GPIO9` [SCL]).
- **Microphone**: **MAX4466 Electret Microphone** with adjustable gain on analog `ADC GPIO1` (16 kHz audio sampling).
- **Voice Trigger**: **WakeNet offline wake word engine** recognizing **"Hi ESP"**.
- **No RGB LED ring**, **no speaker**, **no vibration motor**, and **no push-to-talk button**. All interactions are hands-free ("Hi ESP") with visual feedback rendered directly on the SSD1306 monochrome OLED screen.

---

## 🚀 Key Features

1. **Production Serverless Backend (`/api/v1/...`)**:
   - Deployed on Vercel as native serverless functions (`api/index.ts`).
   - All API routes return clean, validated, structured JSON responses (no HTML fallback).
   - Strict input validation, HTTP status codes (`200`, `400`, `401`, `404`, `409`, `410`, `500`), and real error objects.

2. **Secure Ephemeral Pairing**:
   - The ESP32-C3 firmware renders a single-use claim token on the SSD1306 OLED screen (`clm_live_...`).
   - Claim tokens expire within **15 minutes** and are invalidated immediately upon first redemption.
   - Zero credentials or permanent device keys are embedded in QR codes or stored in browser storage.
   - Successful claim establishes an authenticated pairing session (`sess_...`).

3. **Server-Side Notion OAuth 2.0 Integration**:
   - Public client ID initiates redirect; token exchange occurs exclusively on the backend (`POST https://api.notion.com/v1/oauth/token`).
   - Notion access tokens are **encrypted at rest using AES-256-GCM** with a server-side encryption key (`NOTION_ENCRYPTION_KEY`).
   - Token secrets never touch browser storage or client-side JavaScript.

4. **Idempotent Queue & Action Acknowledgements**:
   - Every note sync uses an `idempotency_key` stored in the `device_actions` table.
   - Retries, intermittent Wi-Fi drops, or power cycles will never create duplicate Notion entries.

5. **Safe Wi-Fi Recovery (Non-Destructive)**:
   - When router Wi-Fi is lost, NOVA automatically renders a **Recovery QR Code** on the OLED screen.
   - Reconnecting Wi-Fi updates only the network credentials on the ESP32-C3 NVS flash.
   - Permanent device identity, Notion authorization, and queued audio notes remain **100% intact**.

6. **Development-Only Mock Mode**:
   - Mock mode is **strictly disabled in production builds** (`import.meta.env.PROD`).
   - In local development, a floating Hardware Sandbox drawer enables offline simulation, latency adjustments, and fault injection.

---

## 🗄️ Database Schema

The database schema is defined in [`schema.sql`](file:///d:/Personal%20projects/nova/schema.sql) and runs on PostgreSQL, Supabase, or Neon:

```sql
-- 1. Devices (Durable identity surviving Wi-Fi reconnects & recovery)
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    serial_number VARCHAR(64) NOT NULL UNIQUE,
    mac_address VARCHAR(32) NOT NULL,
    hardware_model VARCHAR(64) NOT NULL DEFAULT 'ESP32-C3 Super Mini',
    firmware_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0',
    status VARCHAR(16) NOT NULL DEFAULT 'offline',
    ip_address VARCHAR(45),
    wifi_ssid VARCHAR(64),
    wifi_rssi INTEGER,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Claim Tokens (15-minute single-use ephemeral tokens shown on OLED QR)
CREATE TABLE IF NOT EXISTS claim_tokens (
    token VARCHAR(128) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    short_code VARCHAR(16) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Pairing Sessions
CREATE TABLE IF NOT EXISTS pairing_sessions (
    id VARCHAR(128) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    claim_token VARCHAR(128),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Notion Authorizations (Tokens encrypted with AES-256-GCM)
CREATE TABLE IF NOT EXISTS notion_authorizations (
    device_id VARCHAR(64) PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64),
    workspace_name VARCHAR(255),
    workspace_icon VARCHAR(255),
    bot_id VARCHAR(128),
    encrypted_access_token TEXT NOT NULL,
    target_database_id VARCHAR(128),
    target_database_name VARCHAR(255),
    owner_email VARCHAR(255),
    last_sync_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Device Actions & Idempotent Sync Queue
CREATE TABLE IF NOT EXISTS device_actions (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    payload_json JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    response_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);
```

---

## 🔑 Required Environment Variables

Set these in Vercel **Project Settings → Environment Variables**:

| Variable Name | Required By | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `NOTION_CLIENT_ID` | Backend | Notion Public Client ID from Integrations Portal | `132e0123-4567-89ab-cdef...` |
| `NOTION_CLIENT_SECRET` | Backend | Secret key for exchanging OAuth codes | `secret_abcdef123456...` |
| `NOTION_REDIRECT_URI` | Backend | OAuth callback endpoint | `https://buynovastore.vercel.app/api/v1/auth/notion/callback` |
| `NOTION_ENCRYPTION_KEY` | Backend | 32-byte (64 hex chars) key for AES-256-GCM | `openssl rand -hex 32` |
| `DATABASE_URL` | Backend | PostgreSQL / Supabase pooler connection URL | `postgresql://user:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` |
| `VITE_API_BASE_URL` | Frontend | Leave blank for relative `/api/v1` calls | `""` |
| `VITE_MOCK_API` | Frontend | Set to `false` in production | `false` |
| `VITE_NOTION_CLIENT_ID` | Frontend | Public Client ID for redirect building | `132e0123-4567-89ab-cdef...` |

---

## 🔗 Notion OAuth Configuration

In your [Notion Integrations Portal](https://www.notion.so/profile/integrations):
1. Create a Public Integration named **NOVA Voice Assistant**.
2. Under **OAuth Domain & URIs**, add the Redirect URI:
   - **Production**: `https://buynovastore.vercel.app/api/v1/auth/notion/callback`
   - **Local Development**: `http://localhost:5173/api/v1/auth/notion/callback`
3. Under **User Capabilities**, enable:
   - Read content
   - Update content
   - Insert content
   - Read user information (email)

---

## 💻 Local Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (both frontend and local /api serverless functions)
npm run dev

# 3. Run test suite (Vitest: 21 passing tests across frontend & backend)
npm run test

# 4. Run linter (Oxlint: 0 warnings, 0 errors)
npm run lint

# 5. Build production bundle
npm run build
```

---

## 📋 Summary of Frontend Changes for ESP32-C3 OLED Hardware

| Component | Previous Mock Implementation | Updated Real Hardware Implementation |
| :--- | :--- | :--- |
| **Microcontroller Identity** | Referenced ESP32-S3 WROOM | Aligned to **ESP32-C3 Super Mini** (RISC-V 160MHz, 4MB Flash) |
| **Hardware Visual Mockup** | Rendered round talk button & circular RGB LED ring | Rendered **ESP32-C3 module + SSD1306 monochrome OLED screen (0x3C)** and MAX4466 microphone capsule |
| **Recording Trigger** | Claimed "Press and hold center button" | Aligned to **WakeNet offline wake word ("Hi ESP")** with 10-second listening window |
| **OLED Status Animations** | Pulsing cyan, solid teal, flashing red LED | Monochrome blue/white pixel states: `idle`, `wake_word` ("Hi ESP"), `listening` (waveform), `pairing_qr`, `wifi_setup`, `synced`, `offline` |
| **Hardware Reference Guide** | `LedRingGuide.tsx` (explaining LED colors) | Replaced with `OledDisplayGuide.tsx` explaining SSD1306 OLED screen states |
| **Wi-Fi Recovery Flow** | Instructed "Hold button for 5 seconds" | Aligned to **OLED Recovery QR Code** automatically displayed when disconnected from router |
| **Device Dashboard** | Displayed fake RGB LED status | Displays truthful states: Paired, Wi-Fi SSID/RSSI, Cloud MQTT latency, Notion sync status, pending queue count |
| **API Integration** | Returned HTML fallback on `/api/v1/...` | Replaced with live serverless JSON backend (`api/index.ts`) and idempotent note creation |
