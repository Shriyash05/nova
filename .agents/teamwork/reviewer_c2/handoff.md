# Adversarial Security Review & Handoff Report — Phase C

**Reviewer**: `reviewer_c2`  
**Role**: Adversarial Security Reviewer & Critic  
**Date**: October 16, 2026  
**Milestone**: Phase C (Security & Data-Integrity Foundations)  
**Parent / Orchestrator**: `orchestrator_1` (`e451ddc2-d7f0-4749-bf7f-ed93de42ccc6`)  
**Target Under Review**:
- `d:\Personal projects\nova\schema.sql` (Row Level Security on all 12 tables, permissions)
- `d:\Personal projects\nova\schema_rollback.sql` (Rollback safety and idempotency)
- `d:\Personal projects\nova\api\index.ts` (DB connection pool SSL validation and security headers)
- `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`

---

## 1. Observation

### 1.1 Empirical Build & Test Execution
1. **Linter Execution**:
   - Command: `npm run lint` (`oxlint src api`)
   - Verbatim Output:
     ```text
     Found 0 warnings and 0 errors.
     Finished in 56ms on 47 files with 116 rules using 8 threads.
     ```
   - Exit code: 0 (`PASS`).

2. **Production Build Execution**:
   - Command: `npm run build` (`tsc -b && vite build`)
   - Verbatim Output:
     ```text
     ✓ 1937 modules transformed.
     dist/index.html                   4.55 kB │ gzip:   1.44 kB
     dist/assets/index-jNGx2VWV.css   15.36 kB │ gzip:   4.04 kB
     dist/assets/index-CBdSL1Ui.js   496.56 kB │ gzip: 149.35 kB
     ✓ built in 349ms
     ```
   - Exit code: 0 (`PASS`).

3. **End-to-End Test Suite Execution**:
   - Command: `node tests/e2e/runner.mjs`
   - Verbatim Output:
     ```text
     Test Files  24 passed (24)
          Tests  105 passed (105)
       Duration  1.53s
     [PASS] NOVA 1.0 E2E Test Suite passed successfully in 3.22s.
     VERDICT: TEST_READY (Exit code 0)
     ```
   - All 4 tiers (Tier 1 Features, Tier 2 Boundaries, Tier 3 Combinations, Tier 4 Scenarios) executed cleanly with 100% pass rate.

---

### 1.2 Direct File Observations & Discovered Vulnerabilities

#### Observation A: Arbitrary Cross-Tenant Device Takeover via PostgREST on `user_devices`
- **Location**: `d:\Personal projects\nova\schema.sql:356-363`, `d:\Personal projects\nova\schema.sql:471`
- **Verbatim Code in `schema.sql`**:
  ```sql
  -- Lines 356-363:
  DROP POLICY IF EXISTS authenticated_insert_own_user_devices ON user_devices;
  CREATE POLICY authenticated_insert_own_user_devices ON user_devices 
      FOR INSERT TO authenticated 
      WITH CHECK (
          user_id = auth.uid()::text 
          OR user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email'))
      );

  -- Line 471:
  GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated;
  ```
- **Finding**: The `WITH CHECK` expression on `user_devices` solely verifies that the `user_id` column belongs to the calling user. It performs **zero validation** on the `device_id` column! Any authenticated user can issue a direct PostgREST request (`POST /rest/v1/user_devices`) providing their own `user_id` and ANY arbitrary victim `device_id`.
- **Downstream Impact on Dependent RLS Policies**:
  Because `schema.sql` gates access to `devices`, `wifi_profiles`, `notion_authorizations`, and `device_actions` via an `EXISTS (SELECT 1 FROM user_devices WHERE user_devices.device_id = ...)` subquery:
  1. `devices` (line 386): Attacker can immediately SELECT victim device record and exfiltrate `device_secret` and `bootstrap_hash`.
  2. `wifi_profiles` (line 398): Attacker can immediately SELECT all victim Wi-Fi profiles and exfiltrate `encrypted_password`.
  3. `notion_authorizations` (line 412): Attacker can immediately SELECT victim `encrypted_access_token`, `workspace_id`, and `owner_email`.
  4. `device_actions` (line 437): Attacker can INSERT arbitrary actions and queue commands on the victim's hardware.
  This completely bypasses the physical SSD1306 QR claim token requirement.

#### Observation B: Information Disclosure of Cryptographic Bearer Key Hashes
- **Location**: `d:\Personal projects\nova\schema.sql:8-27`, `d:\Personal projects\nova\schema.sql:386-395`, `d:\Personal projects\nova\schema.sql:472`
- **Verbatim Code in `schema.sql`**:
  ```sql
  CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(64) PRIMARY KEY,
      ...
      device_secret VARCHAR(128),     -- SHA-256 cryptographic hash of device bearer key
      bootstrap_hash VARCHAR(128),    -- SHA-256 hash of unique device bootstrap secret
      ...
  );

  GRANT SELECT ON devices TO authenticated;
  ```
- **Finding**: PostgreSQL Row Level Security filters rows, not columns. Because `SELECT ON devices` is granted to `authenticated`, any client querying `SELECT * FROM devices` via Supabase PostgREST receives `device_secret` (the SHA-256 hash of the device bearer key) and `bootstrap_hash`. This directly violates Requirement R6: *"Secrets (OAuth tokens, Wi-Fi credentials, private keys) are never exposed via browser network payloads, DOM, or logs."*

#### Observation C: Return Type Conflict and Function Incompatibility with Supabase Auth
- **Location**: `d:\Personal projects\nova\schema.sql:206-211`
- **Verbatim Code in `schema.sql`**:
  ```sql
  CREATE OR REPLACE FUNCTION auth.uid() 
  RETURNS text 
  LANGUAGE sql STABLE 
  AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::text;
  $$;
  ```
- **Finding**: In official Supabase PostgreSQL environments, `auth.uid()` already exists in the `auth` schema and returns `uuid`. In PostgreSQL, attempting `CREATE OR REPLACE FUNCTION auth.uid() RETURNS text` on an existing function with a different return type results in a fatal error: `ERROR: cannot change return type of existing function`.

#### Observation D: Fallback to Unverified Email in RLS Policies
- **Location**: `d:\Personal projects\nova\schema.sql:331-332, 353, 393, 406, 419, 432, 444`
- **Verbatim Code in `schema.sql`**:
  ```sql
  OR email = (auth.jwt() ->> 'email')
  ```
- **Finding**: `users.id` is `VARCHAR(64)` (`usr_...`), which never matches Supabase Auth's `sub` UUID. As a consequence, all policies evaluate solely on the fallback `email = (auth.jwt() ->> 'email')`. This claim is read without verifying `(auth.jwt() ->> 'email_verified')::boolean IS TRUE`.

#### Observation E: Table Lock Contention & Cold-Start Starvation
- **Location**: `d:\Personal projects\nova\schema.sql:223-257`
- **Finding**: Executing `ALTER TABLE <t> FORCE ROW LEVEL SECURITY;` across 12 tables acquires an `ACCESS EXCLUSIVE` lock on each table. Without `SET lock_timeout = '5s';`, concurrent heartbeat updates and status polls from serverless functions queue up, causing connection pool starvation.

#### Observation F: Verified Idempotency of `schema_rollback.sql`
- **Location**: `d:\Personal projects\nova\schema_rollback.sql:1-154`
- **Finding**: `schema_rollback.sql` safely drops all 23 explicit policies via `DROP POLICY IF EXISTS`, unforces and disables RLS on all 12 tables inside `information_schema.tables` guards, and restores standard public schema permissions inside `pg_roles` guards.

#### Observation G: Database SSL Pool Hardening in `api/index.ts`
- **Location**: `d:\Personal projects\nova\api\index.ts:13-35`
- **Verbatim Code in `api/index.ts`**:
  ```typescript
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== undefined
    ? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
    : Boolean(ca || (isProduction && !isTestEnv));
  ```
- **Finding**: Enforces TLS certificate verification in production environments while enabling local test suites and development environments to run without certificate trust errors. Standard defense-in-depth HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`) are correctly set on lines 654–657.

#### Observation H: STRIDE / DREAD Threat Model Integrity
- **Location**: `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`
- **Finding**: Thorough 442-line document mapping 12 specific threat vectors across all 4 attack surfaces (Silicon/Physical, RF/Provisioning, Cloud/Database, Supply Chain) with empirical DREAD scores (/50) and verbatim code citations.

---

## 2. Logic Chain

1. **Premise 1 (Authorization Boundary)**:
   Per `ORIGINAL_REQUEST.md` (R5, R6, R7), pairing a NOVA device to a user account requires physical possession of the device displaying an ephemeral 15-minute QR claim token. Direct cloud API pairing without a claim token is explicitly forbidden.
2. **Premise 2 (Direct PostgREST Access)**:
   In Supabase architectures, clients with valid user JWTs access the database directly via PostgREST. PostgREST enforces permissions solely via SQL GRANTs and Row Level Security policies.
3. **Observation Reference**:
   `schema.sql` lines 356–363 grant `INSERT` on `user_devices` to `authenticated` with `WITH CHECK (user_id = auth.uid()::text OR ...)`.
4. **Deduction (Privilege Escalation)**:
   Because the policy does not restrict or validate `device_id`, an attacker with any valid user account can insert `(attacker_user_id, victim_device_id)` into `user_devices`.
5. **Deduction (Fleet-Wide Compromise)**:
   Once the row is inserted, the attacker satisfies the `EXISTS (SELECT 1 FROM user_devices ...)` clause on `devices`, `wifi_profiles`, `notion_authorizations`, and `device_actions`, allowing full unauthorized exfiltration of Wi-Fi passwords, Notion OAuth tokens, and bearer secret hashes for any device in the fleet.
6. **Premise 3 (Secret Exposure)**:
   `schema.sql` grants `GRANT SELECT ON devices TO authenticated;`. Row-level security cannot hide specific columns.
7. **Deduction (Information Disclosure)**:
   Every authenticated user querying their devices receives the raw SHA-256 hash of the device's bearer secret (`device_secret`) and `bootstrap_hash`.
8. **Conclusion**:
   These flaws represent severe privilege escalation and information disclosure vulnerabilities that violate the fundamental acceptance criteria of Phase C.

---

## 3. Caveats

1. **Shared Database Contention in Parallel Execution**:
   When multiple test runners execute concurrently against the same live Supabase database, concurrent writes to `devices.device_secret` and `rate_limits` cause intermittent test failures in `backendApi.test.ts`. This is an environment concurrency artifact rather than an implementation regression; the isolated test suite `node tests/e2e/runner.mjs` executes 105/105 tests deterministically.
2. **Physical Hardware OTP eFuses**:
   As noted in `THREAT_MODEL_STRIDE.md` (T1, T2), Secure Boot V2 and Flash Encryption eFuses (`SECURE_BOOT_EN`, `SPI_BOOT_CRYPT_CNT`) on `COM5` are one-time programmable (OTP) and intentionally deferred to the final factory release gate.

---

## 4. Conclusion & Explicit Verdict

### **VERDICT: REQUEST_CHANGES**

Phase C deliverables demonstrate exceptional structural quality, comprehensive threat modeling, and passing builds. However, approval is blocked due to two critical security flaws in `schema.sql`:

1. **[CRITICAL] PostgREST Arbitrary Device Claiming Bypass on `user_devices`**:
   - Direct `INSERT, UPDATE, DELETE` must be REVOKED from the `authenticated` role on `user_devices`.
   - Device claiming must occur strictly through the serverless backend (`/api/v1/devices/claim`), which enforces ephemeral claim token validation before inserting into `user_devices`.
   - `authenticated` role should only be granted `SELECT` on `user_devices` (and optionally `UPDATE (label)`).
2. **[CRITICAL] Exfiltration of `device_secret` and `bootstrap_hash` via `devices` Table**:
   - `SELECT` on `devices.device_secret` and `devices.bootstrap_hash` must be REVOKED from `authenticated`, OR a secure view `user_devices_view` excluding cryptographic secrets must be exposed to end users.
3. **[MAJOR] Supabase Auth Compatibility**:
   - Remove `CREATE OR REPLACE FUNCTION auth.uid()` from `schema.sql` or align return type with standard Supabase `uuid` to avoid fatal migration abortion.
4. **[MAJOR] Migration Lock Timeout**:
   - Add `SET lock_timeout = '5s';` at the head of `schema.sql` and `schema_rollback.sql` to protect production traffic against lock starvation.

---

## 5. Verification Method

To verify these findings and reproduce the evaluation:

1. **Verify Linter and Production Build**:
   ```bash
   npm run lint
   npm run build
   ```
   *Expected*: 0 lint errors, build succeeds in <500ms.

2. **Verify E2E Test Suite**:
   ```bash
   node tests/e2e/runner.mjs
   ```
   *Expected*: 105/105 tests pass cleanly across all 4 tiers (`VERDICT: TEST_READY`).

3. **Verify Vulnerability in `schema.sql`**:
   - Inspect lines 356–363:
     ```sql
     CREATE POLICY authenticated_insert_own_user_devices ON user_devices 
         FOR INSERT TO authenticated 
         WITH CHECK (user_id = auth.uid()::text OR user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email')));
     ```
     Observe that `device_id` is unrestricted.
   - Inspect line 471:
     ```sql
     GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated;
     ```
     Observe that `authenticated` clients can insert arbitrary device links.
   - Inspect line 472:
     ```sql
     GRANT SELECT ON devices TO authenticated;
     ```
     Observe that `device_secret` and `bootstrap_hash` columns are not excluded.
