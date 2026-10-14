-- ==============================================================================
-- NOVA Hardware & Onboarding Platform Database Schema
-- Target: PostgreSQL / Supabase / Neon
-- Hardware Target: ESP32-C3 Super Mini + SSD1306 OLED (0x3C) + MAX4466 Mic
-- ==============================================================================

-- 1. Devices: Durable identity surviving Wi-Fi reconnects & recovery
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,                             -- e.g. 'nova-c3-5c20dc4239fca9ec'
    serial_number VARCHAR(64) NOT NULL UNIQUE,              -- e.g. 'NOVA-C3-5C20DC4239FCA9EC'
    mac_address VARCHAR(32) NOT NULL,                       -- e.g. '48:F6:EE:17:34:D8'
    hardware_model VARCHAR(64) NOT NULL DEFAULT 'ESP32-C3 Super Mini',
    firmware_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0-c3',
    status VARCHAR(16) NOT NULL DEFAULT 'offline',          -- 'online' | 'offline'
    device_secret VARCHAR(128),                             -- Persistent device key for heartbeat auth
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
    token VARCHAR(128) PRIMARY KEY,                         -- e.g. 'clm_live_9f82d1c74a0e'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    short_code VARCHAR(16) NOT NULL,                        -- e.g. 'NOV-84F3'
    expires_at TIMESTAMPTZ NOT NULL,                        -- Valid for 15 minutes only
    is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,             -- Single-use guarantee
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_tokens_short_code ON claim_tokens(short_code);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_device_id ON claim_tokens(device_id);

-- 3. Pairing Sessions: Active web pairing sessions established after valid claim
CREATE TABLE IF NOT EXISTS pairing_sessions (
    id VARCHAR(128) PRIMARY KEY,                             -- e.g. 'sess_918237fa9c82'
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

CREATE INDEX IF NOT EXISTS idx_device_actions_pending ON device_actions(device_id, status);
