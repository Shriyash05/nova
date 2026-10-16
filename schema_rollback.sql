-- ==============================================================================
-- NOVA Hardware & Onboarding Platform Database Schema Rollback
-- Target: PostgreSQL / Supabase / Neon
-- Purpose: Safely and idempotently revert Phase C Row Level Security (RLS)
--          and RBAC lockdowns to pre-hardening state.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- Migration Safety & Lock Timeout
-- Protects production traffic against lock starvation during DDL execution
-- -----------------------------------------------------------------------------
SET lock_timeout = '5s';

-- -----------------------------------------------------------------------------
-- Table Ownership Normalization
-- Ensures table ownership is aligned to administrative role (postgres) before altering RLS state
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Drop Safe Views
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS user_visible_devices;

-- -----------------------------------------------------------------------------
-- 1. Drop All Explicit Row Level Security Policies
-- -----------------------------------------------------------------------------

-- Devices
DROP POLICY IF EXISTS service_role_all_devices ON devices;
DROP POLICY IF EXISTS authenticated_select_user_devices ON devices;

-- Device Bootstrap Credentials
DROP POLICY IF EXISTS service_role_all_bootstrap ON device_bootstrap_credentials;

-- Wi-Fi Profiles
DROP POLICY IF EXISTS service_role_all_wifi ON wifi_profiles;
DROP POLICY IF EXISTS authenticated_select_user_wifi ON wifi_profiles;

-- Claim Tokens
DROP POLICY IF EXISTS service_role_all_claim_tokens ON claim_tokens;

-- Pairing Sessions
DROP POLICY IF EXISTS service_role_all_pairing_sessions ON pairing_sessions;

-- Notion Authorizations
DROP POLICY IF EXISTS service_role_all_notion ON notion_authorizations;
DROP POLICY IF EXISTS authenticated_select_user_notion ON notion_authorizations;

-- Device Actions
DROP POLICY IF EXISTS service_role_all_device_actions ON device_actions;
DROP POLICY IF EXISTS authenticated_select_user_actions ON device_actions;
DROP POLICY IF EXISTS authenticated_insert_user_actions ON device_actions;

-- Rate Limits
DROP POLICY IF EXISTS service_role_all_rate_limits ON rate_limits;

-- OAuth States
DROP POLICY IF EXISTS service_role_all_oauth_states ON oauth_states;

-- Launch Subscribers
DROP POLICY IF EXISTS service_role_all_subscribers ON launch_subscribers;

-- Users
DROP POLICY IF EXISTS service_role_all_users ON users;
DROP POLICY IF EXISTS authenticated_select_own_user ON users;
DROP POLICY IF EXISTS authenticated_update_own_user ON users;

-- User Devices
DROP POLICY IF EXISTS service_role_all_user_devices ON user_devices;
DROP POLICY IF EXISTS authenticated_select_own_user_devices ON user_devices;
DROP POLICY IF EXISTS authenticated_insert_own_user_devices ON user_devices;
DROP POLICY IF EXISTS authenticated_update_own_user_devices ON user_devices;
DROP POLICY IF EXISTS authenticated_delete_own_user_devices ON user_devices;

-- User Sessions
DROP POLICY IF EXISTS service_role_all_user_sessions ON user_sessions;

-- -----------------------------------------------------------------------------
-- 2. Disable and Unforce Row Level Security on all 12 tables
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE devices NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE devices DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on devices: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_bootstrap_credentials' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE device_bootstrap_credentials NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE device_bootstrap_credentials DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on device_bootstrap_credentials: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wifi_profiles' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE wifi_profiles NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE wifi_profiles DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on wifi_profiles: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claim_tokens' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE claim_tokens NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE claim_tokens DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on claim_tokens: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pairing_sessions' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE pairing_sessions NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE pairing_sessions DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on pairing_sessions: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notion_authorizations' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE notion_authorizations NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE notion_authorizations DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on notion_authorizations: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_actions' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE device_actions NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE device_actions DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on device_actions: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE rate_limits NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on rate_limits: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oauth_states' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE oauth_states NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE oauth_states DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on oauth_states: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'launch_subscribers' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE launch_subscribers NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE launch_subscribers DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on launch_subscribers: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE users DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on users: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_devices' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE user_devices NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE user_devices DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on user_devices: %', SQLERRM;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE user_sessions NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable RLS on user_sessions: %', SQLERRM;
        END;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Teardown Phase E ephemeral tables
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS user_sessions CASCADE;

-- -----------------------------------------------------------------------------
-- 3. Restore Standard Schema Grants (Pre-Hardening Baseline)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
        GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
        GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
        GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
    END IF;
END $$;
