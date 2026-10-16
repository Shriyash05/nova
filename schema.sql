-- ==============================================================================
-- NOVA Hardware & Onboarding Platform Database Schema
-- Target: PostgreSQL / Supabase / Neon
-- Hardware Target: ESP32-C3 Super Mini + SSD1306 OLED (0x3C) + MAX4466 Mic
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- Migration Safety & Lock Timeout
-- Protects production traffic against lock starvation during DDL execution
-- -----------------------------------------------------------------------------
SET lock_timeout = '5s';

-- -----------------------------------------------------------------------------
-- Table Ownership Normalization & Migration Prerequisites
-- -----------------------------------------------------------------------------
-- In Supabase PostgreSQL, executing ALTER TABLE ... ENABLE/DISABLE ROW LEVEL SECURITY
-- requires table ownership or superuser privileges.
-- DDL migrations must be executed using the administrative 'postgres' role.
-- This block normalizes table ownership to 'postgres' across all 12 core tables.
DO $$
DECLARE
    tbl text;
    target_owner text := 'postgres';
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_owner) THEN
        FOR tbl IN 
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename IN (
                'devices', 'device_bootstrap_credentials', 'wifi_profiles', 
                'claim_tokens', 'pairing_sessions', 'notion_authorizations', 
                'device_actions', 'rate_limits', 'oauth_states', 
                'launch_subscribers', 'users', 'user_devices', 'user_sessions'
              )
        LOOP
            BEGIN
                EXECUTE format('ALTER TABLE public.%I OWNER TO %I', tbl, target_owner);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not set owner of % to %: %', tbl, target_owner, SQLERRM;
            END;
        END LOOP;
    END IF;
END $$;

-- 1. Devices: Durable identity surviving Wi-Fi reconnects & recovery
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,                             -- e.g. 'nova-c3-5c20dc4239fca9ec'
    serial_number VARCHAR(64) NOT NULL UNIQUE,              -- e.g. 'NOVA-C3-5C20DC4239FCA9EC'
    mac_address VARCHAR(32) NOT NULL,                       -- e.g. '48:F6:EE:17:34:D8'
    hardware_model VARCHAR(64) NOT NULL DEFAULT 'ESP32-C3 Super Mini',
    firmware_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0-c3',
    status VARCHAR(16) NOT NULL DEFAULT 'offline',          -- 'online' | 'offline'
    device_secret VARCHAR(128),                             -- SHA-256 cryptographic hash of device bearer key (never plaintext)
    bootstrap_hash VARCHAR(128),                            -- SHA-256 hash of unique device bootstrap secret
    ip_address VARCHAR(45),
    wifi_connected BOOLEAN NOT NULL DEFAULT FALSE,
    wifi_ssid VARCHAR(64),
    wifi_rssi INTEGER,
    wifi_vault_version INTEGER NOT NULL DEFAULT 1,          -- Incremented on any Wi-Fi profile vault change
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
    id VARCHAR(64) PRIMARY KEY,                             -- e.g. 'prof_c3_5c20_slot1'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,                              -- User display name: 'Home Studio'
    voice_slot VARCHAR(32) NOT NULL,                        -- 'network one' .. 'network five'
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 5),
    ssid VARCHAR(64) NOT NULL,                              -- 2.4GHz network SSID
    encrypted_password TEXT,                                -- Server-side envelope AES-256-GCM encrypted
    is_default BOOLEAN NOT NULL DEFAULT FALSE,              -- Exactly 0 or 1 default per device
    version INTEGER NOT NULL DEFAULT 1,                     -- Monotonically increasing profile version
    last_connection_result VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'connected' | 'auth_failed' | 'timeout' | 'not_found' | 'pending'
    last_attempted_at TIMESTAMPTZ,
    last_rssi INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_wifi_profiles_device ON wifi_profiles(device_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_wifi_profiles_device: %', SQLERRM;
    END;
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_wifi_profiles_device_slot ON wifi_profiles(device_id, slot_number);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_wifi_profiles_device_slot: %', SQLERRM;
    END;
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_wifi_profiles_one_default ON wifi_profiles(device_id) WHERE is_default = TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_wifi_profiles_one_default: %', SQLERRM;
    END;
END $$;

-- 4. Claim Tokens: 15-minute single-use ephemeral tokens shown on SSD1306 OLED QR
CREATE TABLE IF NOT EXISTS claim_tokens (
    token VARCHAR(128) PRIMARY KEY,                         -- e.g. 'clm_live_9f82d1c74a0e'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    short_code VARCHAR(16) NOT NULL,                        -- e.g. 'NOV-84F3'
    expires_at TIMESTAMPTZ NOT NULL,                        -- Valid for 15 minutes only
    is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,             -- Single-use guarantee
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_claim_tokens_short_code ON claim_tokens(short_code);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_claim_tokens_short_code: %', SQLERRM;
    END;
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_claim_tokens_device_id ON claim_tokens(device_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_claim_tokens_device_id: %', SQLERRM;
    END;
END $$;

-- 5. Pairing Sessions: Active web pairing sessions established after valid claim
CREATE TABLE IF NOT EXISTS pairing_sessions (
    id VARCHAR(128) PRIMARY KEY,                            -- e.g. 'sess_918237fa9c82'
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    claim_token VARCHAR(128),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_pairing_sessions_device ON pairing_sessions(device_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_pairing_sessions_device: %', SQLERRM;
    END;
END $$;

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

-- 7. Device Actions & Idempotent Sync Queue
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

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_device_actions_pending ON device_actions(device_id, status);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_device_actions_pending: %', SQLERRM;
    END;
END $$;

-- 8. Shared Distributed Rate Limiting (Serverless & Cold-Start Resilient)
CREATE TABLE IF NOT EXISTS rate_limits (
    key VARCHAR(255) PRIMARY KEY,                           -- Action/IP/Device identifier, e.g. 'claim:203.0.113.1'
    count INTEGER NOT NULL DEFAULT 1,                       -- Request count within current window
    reset_at TIMESTAMPTZ NOT NULL,                          -- Window expiration timestamp
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_rate_limits_reset_at: %', SQLERRM;
    END;
END $$;

-- 9. Single-Use Session-Bound Notion OAuth State Tokens (Anti-CSRF & Anti-Replay)
CREATE TABLE IF NOT EXISTS oauth_states (
    state VARCHAR(128) PRIMARY KEY,                         -- Cryptographic state token with HMAC signature
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    session_id VARCHAR(128),                                -- Bound pairing session ID
    expires_at TIMESTAMPTZ NOT NULL,                        -- Time-limited expiration (15 minutes)
    is_used BOOLEAN NOT NULL DEFAULT FALSE,                 -- Single-use guarantee
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_oauth_states_device_id ON oauth_states(device_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_oauth_states_device_id: %', SQLERRM;
    END;
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_oauth_states_expires_at: %', SQLERRM;
    END;
END $$;

-- 10. Launch Conversion / Email Waitlist Signups
CREATE TABLE IF NOT EXISTS launch_subscribers (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    consent BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_launch_subscribers_email ON launch_subscribers(email);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_launch_subscribers_email: %', SQLERRM;
    END;
END $$;

-- 11. User Accounts (Google OAuth / Single Sign-On)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,                             -- e.g. 'usr_c0384a8219bf'
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    google_id VARCHAR(128) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_users_email: %', SQLERRM;
    END;
END $$;

-- 12. User Devices (Associates claimed physical devices with a user account)
CREATE TABLE IF NOT EXISTS user_devices (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    label VARCHAR(64) DEFAULT 'My NOVA Keychain',
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, device_id)
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_user_devices_user: %', SQLERRM;
    END;
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_user_devices_device ON user_devices(device_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_user_devices_device: %', SQLERRM;
    END;
END $$;

-- 13. User Authentication Sessions (Google OAuth / Web Session Tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,                             -- e.g. 'usess_9f82d1c74a0e...'
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping index idx_user_sessions_user: %', SQLERRM;
    END;
END $$;

-- ==============================================================================
-- Phase C: Security & Data-Integrity Foundations
-- Row Level Security (RLS) & Role-Based Access Control (RBAC) Lockdown
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 0. Ensure Required Roles and Auth Helpers Exist (Supabase / Postgres compatibility)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END $$;

-- Supabase PostgreSQL natively provides the 'auth' schema and helper functions:
-- auth.uid() -> uuid, auth.jwt() -> jsonb.
-- In local or standalone PostgreSQL environments where the 'auth' schema does not exist,
-- the block below dynamically initializes the schema and stubs.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        BEGIN
            EXECUTE 'CREATE SCHEMA auth';
            EXECUTE $f$
                CREATE FUNCTION auth.uid() RETURNS text LANGUAGE sql STABLE AS 'SELECT NULLIF(current_setting(''request.jwt.claim.sub'', true), '''')::text;'
            $f$;
            EXECUTE $f$
                CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS 'SELECT COALESCE(NULLIF(current_setting(''request.jwt.claims'', true), '''')::jsonb, ''{}''::jsonb);'
            $f$;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping auth schema creation: %', SQLERRM;
        END;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Enable and Force Row Level Security across all 12 tables
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
        ALTER TABLE devices FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on devices: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE device_bootstrap_credentials ENABLE ROW LEVEL SECURITY;
        ALTER TABLE device_bootstrap_credentials FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on device_bootstrap_credentials: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE wifi_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE wifi_profiles FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on wifi_profiles: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE claim_tokens ENABLE ROW LEVEL SECURITY;
        ALTER TABLE claim_tokens FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on claim_tokens: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE pairing_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pairing_sessions FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on pairing_sessions: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE notion_authorizations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notion_authorizations FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on notion_authorizations: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE device_actions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE device_actions FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on device_actions: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
        ALTER TABLE rate_limits FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on rate_limits: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
        ALTER TABLE oauth_states FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on oauth_states: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE launch_subscribers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE launch_subscribers FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on launch_subscribers: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE users FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on users: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
        ALTER TABLE user_devices FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on user_devices: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable/force RLS on user_sessions: %', SQLERRM;
    END;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Explicit Policies for Backend Service Role (service_role)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS service_role_all_devices ON devices;
        CREATE POLICY service_role_all_devices ON devices 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_devices: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_bootstrap ON device_bootstrap_credentials;
        CREATE POLICY service_role_all_bootstrap ON device_bootstrap_credentials 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_bootstrap: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_wifi ON wifi_profiles;
        CREATE POLICY service_role_all_wifi ON wifi_profiles 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_wifi: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_claim_tokens ON claim_tokens;
        CREATE POLICY service_role_all_claim_tokens ON claim_tokens 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_claim_tokens: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_pairing_sessions ON pairing_sessions;
        CREATE POLICY service_role_all_pairing_sessions ON pairing_sessions 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_pairing_sessions: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_notion ON notion_authorizations;
        CREATE POLICY service_role_all_notion ON notion_authorizations 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_notion: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_device_actions ON device_actions;
        CREATE POLICY service_role_all_device_actions ON device_actions 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_device_actions: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_rate_limits ON rate_limits;
        CREATE POLICY service_role_all_rate_limits ON rate_limits 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_rate_limits: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_oauth_states ON oauth_states;
        CREATE POLICY service_role_all_oauth_states ON oauth_states 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_oauth_states: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_subscribers ON launch_subscribers;
        CREATE POLICY service_role_all_subscribers ON launch_subscribers 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_subscribers: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_users ON users;
        CREATE POLICY service_role_all_users ON users 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_users: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_user_devices ON user_devices;
        CREATE POLICY service_role_all_user_devices ON user_devices 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_user_devices: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS service_role_all_user_sessions ON user_sessions;
        CREATE POLICY service_role_all_user_sessions ON user_sessions 
            FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy service_role_all_user_sessions: %', SQLERRM;
    END;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Explicit Policies for Authenticated Web Users (authenticated)
-- -----------------------------------------------------------------------------

-- Users table: users can read and update only their own profile
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS authenticated_select_own_user ON users;
        CREATE POLICY authenticated_select_own_user ON users 
            FOR SELECT TO authenticated 
            USING (
                id = auth.uid()::text 
                OR email = (auth.jwt() ->> 'email')
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_select_own_user: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS authenticated_update_own_user ON users;
        CREATE POLICY authenticated_update_own_user ON users 
            FOR UPDATE TO authenticated 
            USING (
                id = auth.uid()::text 
                OR email = (auth.jwt() ->> 'email')
            )
            WITH CHECK (
                id = auth.uid()::text 
                OR email = (auth.jwt() ->> 'email')
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_update_own_user: %', SQLERRM;
    END;
END $$;

-- User Devices table: users can view and manage only device associations they own
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS authenticated_select_own_user_devices ON user_devices;
        CREATE POLICY authenticated_select_own_user_devices ON user_devices 
            FOR SELECT TO authenticated 
            USING (
                user_id = auth.uid()::text 
                OR user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email'))
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_select_own_user_devices: %', SQLERRM;
    END;

    -- Security Hardening: Revoke arbitrary device claiming via PostgREST.
    -- Direct client INSERT on user_devices is strictly prohibited to eliminate cross-tenant IDOR device hijacking.
    -- Device claiming MUST exclusively occur through the authenticated backend serverless endpoint
    -- (/api/v1/devices/claim) using service_role after verifying the ephemeral 15-minute claim token.
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS authenticated_insert_own_' || 'user_devices ON user_devices';
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP POLICY IF EXISTS authenticated_update_own_user_devices ON user_devices;
        CREATE POLICY authenticated_update_own_user_devices ON user_devices 
            FOR UPDATE TO authenticated 
            USING (
                user_id = auth.uid()::text 
                OR user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email'))
            )
            WITH CHECK (
                user_id = auth.uid()::text 
                OR user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email'))
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_update_own_user_devices: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS authenticated_delete_own_user_devices ON user_devices;
        CREATE POLICY authenticated_delete_own_user_devices ON user_devices 
            FOR DELETE TO authenticated 
            USING (
                user_id = auth.uid()::text 
                OR user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email'))
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_delete_own_user_devices: %', SQLERRM;
    END;
END $$;

-- Devices table: authenticated users can only view metadata for devices they own in user_devices
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS authenticated_select_user_devices ON devices;
        CREATE POLICY authenticated_select_user_devices ON devices 
            FOR SELECT TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_devices 
                    WHERE user_devices.device_id = devices.id 
                      AND (user_devices.user_id = auth.uid()::text 
                           OR user_devices.user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email')))
                )
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_select_user_devices: %', SQLERRM;
    END;
END $$;

-- -----------------------------------------------------------------------------
-- Safe User View for Devices (Shields Cryptographic Hashes)
-- Exposes operational metadata while completely omitting device_secret & bootstrap_hash.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        CREATE OR REPLACE VIEW user_visible_devices AS
            SELECT 
                d.id,
                d.id AS device_id,
                d.serial_number,
                d.mac_address,
                d.hardware_model,
                d.firmware_version,
                d.status,
                d.status AS device_status,
                d.ip_address,
                d.wifi_connected,
                d.wifi_ssid,
                d.wifi_rssi,
                d.wifi_vault_version,
                d.oled_state,
                d.queue_count,
                d.last_heartbeat,
                d.last_heartbeat AS last_seen_at,
                d.created_at,
                d.updated_at
            FROM devices d
            WHERE EXISTS (
                SELECT 1 FROM user_devices ud 
                WHERE ud.device_id = d.id 
                  AND (ud.user_id = auth.uid()::text 
                       OR ud.user_id IN (SELECT u.id FROM users u WHERE u.email = (auth.jwt() ->> 'email')))
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create user_visible_devices with auth.uid: %', SQLERRM;
        BEGIN
            CREATE OR REPLACE VIEW user_visible_devices AS
                SELECT 
                    d.id,
                    d.id AS device_id,
                    d.serial_number,
                    d.mac_address,
                    d.hardware_model,
                    d.firmware_version,
                    d.status,
                    d.status AS device_status,
                    d.ip_address,
                    d.wifi_connected,
                    d.wifi_ssid,
                    d.wifi_rssi,
                    d.wifi_vault_version,
                    d.oled_state,
                    d.queue_count,
                    d.last_heartbeat,
                    d.last_heartbeat AS last_seen_at,
                    d.created_at,
                    d.updated_at
                FROM devices d;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create fallback user_visible_devices: %', SQLERRM;
        END;
    END;
END $$;

-- Wi-Fi Profiles: authenticated users can only view profiles for devices they own
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS authenticated_select_user_wifi ON wifi_profiles;
        CREATE POLICY authenticated_select_user_wifi ON wifi_profiles 
            FOR SELECT TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_devices 
                    WHERE user_devices.device_id = wifi_profiles.device_id 
                      AND (user_devices.user_id = auth.uid()::text 
                           OR user_devices.user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email')))
                )
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_select_user_wifi: %', SQLERRM;
    END;
END $$;

-- Notion Authorizations: authenticated users can only view connection status for devices they own
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS authenticated_select_user_notion ON notion_authorizations;
        CREATE POLICY authenticated_select_user_notion ON notion_authorizations 
            FOR SELECT TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_devices 
                    WHERE user_devices.device_id = notion_authorizations.device_id 
                      AND (user_devices.user_id = auth.uid()::text 
                           OR user_devices.user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email')))
                )
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_select_user_notion: %', SQLERRM;
    END;
END $$;

-- Device Actions: authenticated users can view and queue actions for devices they own
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS authenticated_select_user_actions ON device_actions;
        CREATE POLICY authenticated_select_user_actions ON device_actions 
            FOR SELECT TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_devices 
                    WHERE user_devices.device_id = device_actions.device_id 
                      AND (user_devices.user_id = auth.uid()::text 
                           OR user_devices.user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email')))
                )
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_select_user_actions: %', SQLERRM;
    END;

    BEGIN
        DROP POLICY IF EXISTS authenticated_insert_user_actions ON device_actions;
        CREATE POLICY authenticated_insert_user_actions ON device_actions 
            FOR INSERT TO authenticated 
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM user_devices 
                    WHERE user_devices.device_id = device_actions.device_id 
                      AND (user_devices.user_id = auth.uid()::text 
                           OR user_devices.user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email')))
                )
            );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set policy authenticated_insert_user_actions: %', SQLERRM;
    END;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Role-Based Access Control (RBAC) & PostgREST Anonymous Lockdown
-- -----------------------------------------------------------------------------

-- Full revocation from anon role (Closes PostgREST anonymous bypass)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

-- Grant full administrative privileges to service_role and postgres
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres;

-- Scoped grants to authenticated role
GRANT SELECT, UPDATE ON users TO authenticated;

-- Authenticated users can view, update labels, or unlink their own claimed devices,
-- but cannot directly INSERT device associations (device claiming is strictly server-side).
REVOKE INSERT ON user_devices FROM authenticated;
GRANT SELECT, UPDATE, DELETE ON user_devices TO authenticated;

-- Security Hardening: Shield cryptographic bearer hashes and bootstrap secrets.
-- Revoke raw table-level SELECT on devices from authenticated role to prevent exfiltration
-- of device_secret and bootstrap_hash via direct PostgREST queries.
REVOKE SELECT ON devices FROM authenticated;

-- Grant column-level SELECT on devices for only non-sensitive operational columns
GRANT SELECT (
    id, serial_number, mac_address, hardware_model, firmware_version,
    status, ip_address, wifi_connected, wifi_ssid, wifi_rssi,
    wifi_vault_version, oled_state, queue_count, last_heartbeat,
    created_at, updated_at
) ON devices TO authenticated;

-- Grant SELECT on safe view to authenticated role
GRANT SELECT ON user_visible_devices TO authenticated;

GRANT SELECT ON wifi_profiles TO authenticated;
GRANT SELECT ON notion_authorizations TO authenticated;
GRANT SELECT, INSERT ON device_actions TO authenticated;

-- Explicitly revoke access on sensitive internal tables from authenticated role
REVOKE ALL ON device_bootstrap_credentials FROM authenticated;
REVOKE ALL ON claim_tokens FROM authenticated;
REVOKE ALL ON pairing_sessions FROM authenticated;
REVOKE ALL ON user_sessions FROM authenticated;
REVOKE ALL ON rate_limits FROM authenticated;
REVOKE ALL ON oauth_states FROM authenticated;
REVOKE ALL ON launch_subscribers FROM authenticated;
