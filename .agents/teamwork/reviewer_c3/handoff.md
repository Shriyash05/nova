# Independent Review & Adversarial Audit Report — Phase C Security Remediation

**Reviewer Agent**: `reviewer_c3`  
**Role**: Security Code Reviewer & Adversarial Critic  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\reviewer_c3`  
**Orchestrator**: `e451ddc2-d7f0-4749-bf7f-ed93de42ccc6`  
**Date**: October 16, 2026  
**Final Verdict**: **APPROVE**  

---

## 1. Observation

Direct, empirical observations of the codebase and test execution:

### 1.1 `user_devices` INSERT Revocation & IDOR Elimination (`d:\Personal projects\nova\schema.sql`)
- At line 602, the former client INSERT policy is explicitly dropped:
  ```sql
  EXECUTE 'DROP POLICY IF EXISTS authenticated_insert_own_' || 'user_devices ON user_devices';
  ```
- At line 824, INSERT permissions are revoked from `authenticated`:
  ```sql
  REVOKE INSERT ON user_devices FROM authenticated;
  GRANT SELECT, UPDATE, DELETE ON user_devices TO authenticated;
  ```
- At lines 537–543, full permissions on `user_devices` remain granted exclusively to `service_role`:
  ```sql
  CREATE POLICY service_role_all_user_devices ON user_devices 
      FOR ALL TO service_role 
      USING (true) WITH CHECK (true);
  ```
- In `api/index.ts` lines 1696–1700, device claiming is performed exclusively via the backend serverless endpoint (`/api/v1/devices/claim`) following ephemeral token verification.

### 1.2 Cryptographic Hash Shielding & Safe View (`d:\Personal projects\nova\schema.sql` and `schema_rollback.sql`)
- In `schema.sql` line 830, raw table-level `SELECT` is revoked from `authenticated`:
  ```sql
  REVOKE SELECT ON devices FROM authenticated;
  ```
- In `schema.sql` lines 833–838, column-level `SELECT` grants on `devices` are restricted to safe operational telemetry, strictly excluding `device_secret` (HMAC key) and `bootstrap_hash` (provisioning credential hash):
  ```sql
  GRANT SELECT (
      id, serial_number, mac_address, hardware_model, firmware_version,
      status, ip_address, wifi_connected, wifi_ssid, wifi_rssi,
      wifi_vault_version, oled_state, queue_count, last_heartbeat,
      created_at, updated_at
  ) ON devices TO authenticated;
  ```
- In `schema.sql` lines 663–720, the safe canonical view `user_visible_devices` is created:
  - Filters by device ownership: `WHERE EXISTS (SELECT 1 FROM user_devices ud WHERE ud.device_id = d.id AND (ud.user_id = auth.uid()::text OR ud.user_id IN (SELECT u.id FROM users u WHERE u.email = (auth.jwt() ->> 'email'))))`
  - Projects only non-secret columns, completely shielding `device_secret` and `bootstrap_hash`.
  - Line 841: `GRANT SELECT ON user_visible_devices TO authenticated;`
- In `schema_rollback.sql` line 47, the view drop is cleanly included:
  ```sql
  DROP VIEW IF EXISTS user_visible_devices;
  ```

### 1.3 Lock Timeout & Ownership Normalization (`schema.sql` & `schema_rollback.sql`)
- In both `schema.sql` (line 11) and `schema_rollback.sql` (line 12):
  ```sql
  SET lock_timeout = '5s';
  ```
- In both `schema.sql` (lines 20–44) and `schema_rollback.sql` (lines 18–42), automated ownership normalization loops through all 12 tables (`devices`, `device_bootstrap_credentials`, `wifi_profiles`, `claim_tokens`, `pairing_sessions`, `notion_authorizations`, `device_actions`, `rate_limits`, `oauth_states`, `launch_subscribers`, `users`, `user_devices`) and executes:
  ```sql
  EXECUTE format('ALTER TABLE public.%I OWNER TO %I', tbl, target_owner);
  ```
  targeting `postgres` with clean exception guards.
- In `schema.sql` lines 325–340, a conditional existence guard wraps `auth` schema initialization:
  ```sql
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN ...
  ```

### 1.4 TLS CA Verification & Zero-Config Supabase Root CA (`api/index.ts` & `.env.example`)
- In `api/index.ts` lines 47–84, `parseSslCa()` normalizes CA inputs across four formats:
  1. Filesystem path (`.crt`, `.pem`, slashes)
  2. Escaped newline strings (`\\n` replaced with `\n`)
  3. Direct PEM certificates (`-----BEGIN CERTIFICATE-----`)
  4. Base64-encoded PEM strings
- In `api/index.ts` lines 15–37, `SUPABASE_ROOT_CA_2021` PEM string is embedded directly in source.
- In `api/certs/supabase-ca.pem`, the identical PEM certificate is bundled on disk.
- In `api/index.ts` lines 93–105, `getPool()` automatically falls back to the bundled or embedded CA when connecting to Supabase poolers (`aws-0-*.pooler.supabase.com`) or in production (`isProduction`).
- In `api/index.ts` lines 110–123, `rejectUnauthorized: true` is strictly enforced in production and whenever a CA certificate is configured.
- In `.env.example` lines 26–33, `DATABASE_SSL_CA` and `DATABASE_SSL_REJECT_UNAUTHORIZED` are clearly documented.

### 1.5 Test & Verification Tool Executions
- **Linter**: `npm run lint` (`oxlint src api`)
  ```
  Found 0 warnings and 0 errors.
  Finished in 59ms on 47 files with 116 rules using 8 threads.
  ```
- **Build**: `npm run build` (`tsc -b && vite build`)
  ```
  ✓ 1937 modules transformed.
  dist/index.html                   4.55 kB │ gzip:   1.44 kB
  dist/assets/index-jNGx2VWV.css   15.36 kB │ gzip:   4.04 kB
  dist/assets/index-CBdSL1Ui.js   496.56 kB │ gzip: 149.35 kB
  ✓ built in 351ms
  ```
- **E2E Test Suite**: `node tests/e2e/runner.mjs`
  ```
  Test Files  24 passed (24)
       Tests  105 passed (105)
  VERDICT: TEST_READY (Exit code 0)
  ```
- **Phase C Empirical Security Verification**: `node tests/verify_phase_c_security.mjs`
  ```
  schema.sql apply result: SUCCESS
  schema_rollback.sql apply result: SUCCESS
  Strict TLS query without root CA: self-signed certificate in certificate chain (SELF_SIGNED_CERT_IN_CHAIN)
  Strict TLS query WITH bundled root CA: SUCCESS (Certificate verified!)
  user_devices RLS: REMEDIATED (Grant: false, Policy: false)
  Cryptographic Hash Shielding: REMEDIATED (Raw select: false, Revoked: true, Safe view: true)
  ```
- **Security & Schema Audit**: `node tests/e2e/security_audit.mjs`
  ```
  AUDIT RESULTS: 90 PASSED, 0 FAILED (Exit code 0)
  ```
- **Rollback SQL Execution**: `node tests/e2e/test_rollback_sql.mjs`
  ```
  [PASS] All 12 tables have NO FORCE and DISABLE ROW LEVEL SECURITY.
  [PASS] Found 23 safe 'DROP POLICY IF EXISTS' statements.
  [PASS] Transaction rolled back cleanly. Database remains intact.
  VERDICT: schema_rollback.sql is syntactically sound and non-destructive.
  ```
- **Live Database Integration Suite**: `npx vitest run src/__tests__/backendApi.test.ts`
  ```
  Test Files  1 passed (1)
       Tests  58 passed (58)
    Duration  131.33s (tests 100%)
  ```

---

## 2. Logic Chain

1. **Elimination of Arbitrary Device Claiming (Finding 1)**:
   - *Premise*: If `authenticated` clients can issue direct `INSERT` statements to `user_devices` in PostgREST, an attacker can bypass physical challenge tokens and bind arbitrary devices to their account.
   - *Observation*: `schema.sql` explicitly revokes `INSERT` on `user_devices` from `authenticated` (line 824) and removes any INSERT policy (line 602).
   - *Inference*: Any direct PostgREST `POST /rest/v1/user_devices` request from an authenticated user is immediately blocked with PostgreSQL permission error 42501.
   - *Conclusion*: Device claiming is exclusively bound to the server-side endpoint `/api/v1/devices/claim` running as `service_role`, requiring proof-of-possession via ephemeral claim tokens.

2. **Elimination of Cryptographic Hash Exfiltration (Finding 2)**:
   - *Premise*: Standard PostgreSQL row-level security filters which rows are returned, but does not omit columns unless column-level grants or views are used. `SELECT * FROM devices` would expose `device_secret` and `bootstrap_hash`.
   - *Observation*: `schema.sql` line 830 revokes table-level `SELECT` on `devices` from `authenticated`. Lines 833–838 grant column-level `SELECT` on only 16 non-sensitive fields. Lines 663–720 create `user_visible_devices` projecting only non-sensitive columns.
   - *Inference*: Direct queries to `/rest/v1/devices` querying `device_secret` or `bootstrap_hash` fail with column permission denied (42501). Queries through `user_visible_devices` cannot return those columns because they do not exist in the view definition.
   - *Conclusion*: Cryptographic bearer keys and bootstrap hashes are strictly shielded from all client-side queries.

3. **Prevention of Lock Starvation and Migration Failures (Finding 3)**:
   - *Premise*: Unbounded DDL operations queue indefinitely behind open transactions, exhausting connection poolers. Tables owned by different roles fail DDL execution.
   - *Observation*: `SET lock_timeout = '5s';` is declared at line 11 of `schema.sql` and line 12 of `schema_rollback.sql`. Automated ownership normalization to `postgres` runs at migration start.
   - *Inference*: If locks cannot be acquired within 5 seconds, the migration immediately aborts, preventing connection starvation. Running migrations under `postgres` guarantees ownership alignment.
   - *Conclusion*: Database migrations are resilient, fail-fast, and safe for production poolers.

4. **Security of Database Connection Pool TLS (Finding 4)**:
   - *Premise*: Setting `rejectUnauthorized: false` permits man-in-the-middle attacks on database connections. Setting `rejectUnauthorized: true` without custom CA support crashes when connecting to Supabase's private root CA.
   - *Observation*: `parseSslCa()` parses CA certificates; Supabase Root 2021 CA is bundled on disk and embedded in source; `getPool()` passes the CA and enforces `rejectUnauthorized: true`.
   - *Inference*: TLS certificate verification passes without error against Supabase poolers while strictly validating certificate chains.
   - *Conclusion*: Database connection pool operates under strict TLS verification without risk of MITM downgrade or connection crashes.

5. **Integrity Audit**:
   - *Premise*: Codebase must contain genuine logic, zero hardcoded test facades, zero shortcut bypasses, and genuine verifiable execution logs.
   - *Observation*: All tests (`runner.mjs`, `security_audit.mjs`, `backendApi.test.ts`, `verify_phase_c_security.mjs`) execute dynamic SQL queries and assertions against local code and the live Supabase database.
   - *Conclusion*: Zero integrity violations detected.

---

## 3. Caveats

1. **Physical Silicon eFuse Burning**:
   - Vector T1 (Flash Encryption) and T2 (Secure Boot V2) require burning one-time programmable (OTP) eFuses on the physical ESP32-C3 (`COM5`). In accordance with project safety guidelines, physical eFuse blowing is deferred to the final hardware release gate.
2. **Supabase DDL Execution Role**:
   - Because `nova_app` lacks superuser privileges on Supabase, production DDL migrations (`schema.sql`) must be applied via the Supabase Dashboard SQL Editor or Supabase CLI using the `postgres` superuser role so that `ENABLE/FORCE ROW LEVEL SECURITY` takes full effect on tables owned by `postgres`.

---

## 4. Conclusion & Final Verdict

All Phase C security remediation objectives have been rigorously implemented, stress-tested, and independently verified:
- `user_devices` `INSERT` permission is completely revoked from `authenticated`.
- Cryptographic hashes (`device_secret`, `bootstrap_hash`) are completely shielded from PostgREST queries.
- `SET lock_timeout = '5s';` and automated table ownership normalization are present in both `schema.sql` and `schema_rollback.sql`.
- Supabase Root 2021 CA is bundled, parsed, and embedded; TLS verification (`rejectUnauthorized: true`) is strictly enforced.
- 100% of automated tests pass cleanly across lint (47 files), build, E2E runner (105/105 tests), security audit (90/90 tests), and live database integration (58/58 tests).
- Zero integrity violations were detected.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce this verification:

1. **Verify Linter**:
   ```bash
   npm run lint
   ```
   *Expected*: `Found 0 warnings and 0 errors.`

2. **Verify Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc -b && vite build` succeeds with exit code 0.

3. **Verify E2E Test Suite**:
   ```bash
   node tests/e2e/runner.mjs
   ```
   *Expected*: 24 test files pass, 105 tests pass, exit code 0 (`VERDICT: TEST_READY`).

4. **Verify Live Empirical Security Checks**:
   ```bash
   node tests/verify_phase_c_security.mjs
   node tests/e2e/security_audit.mjs
   node tests/e2e/test_rollback_sql.mjs
   ```
   *Expected*: All assertions pass with exit code 0.

5. **Verify Live Database API Integration Suite**:
   ```bash
   npx vitest run src/__tests__/backendApi.test.ts
   ```
   *Expected*: 58/58 tests pass against live PostgreSQL.

*Invalidation Conditions*:
- Re-granting `INSERT` on `user_devices` or raw `SELECT` on `devices` to `authenticated`.
- Reverting `rejectUnauthorized` to `false` in production.
- Removing `lock_timeout` from migration scripts.
