# Handoff Report — Phase C Adversarial Security Stress Verification

**Agent ID**: `challenger_c1`  
**Role**: Adversarial Security Verifier / Challenger (Specialist / Critic)  
**Date**: October 16, 2026  
**Status**: COMPLETE (Hard Handoff)  
**Verdict**: **`REQUEST_CHANGES`**  
**Assigned Milestone**: Phase C (Security & Data-Integrity Foundations)  
**Parent / Orchestrator**: `orchestrator_1` (`e451ddc2-d7f0-4749-bf7f-ed93de42ccc6`)  

---

## 1. Observation

1. **Live Supabase Database Lacks Any Active RLS Policies (`pg_policies`)**:
   - Querying `pg_policies` on the live database via `tests/verify_phase_c_security.mjs`:
     ```sql
     SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';
     ```
     Returned: `0 rows` (`[]`).
   - Querying `pg_tables` for row security status:
     - 11 of 12 tables (`devices`, `wifi_profiles`, `claim_tokens`, `pairing_sessions`, `notion_authorizations`, `device_actions`, `device_bootstrap_credentials`, `oauth_states`, `launch_subscribers`, `users`, `user_devices`) have `rowsecurity: false` and `relforcerowsecurity: false`.
     - Only `rate_limits` had `rowsecurity: true`, but has 0 policies in `pg_policies`.
   - *Observation*: The RLS policies in `schema.sql` (lines 220–485) were never applied to the live PostgreSQL database.

2. **Split Table Ownership Blocks `schema.sql` and `schema_rollback.sql` via `DATABASE_URL`**:
   - Querying `pg_tables.tableowner` revealed a split ownership model:
     - `postgres` owns 7 tables: `devices`, `wifi_profiles`, `claim_tokens`, `pairing_sessions`, `notion_authorizations`, `device_actions`, `device_bootstrap_credentials`.
     - `nova_app` owns 5 tables: `users`, `user_devices`, `launch_subscribers`, `oauth_states`, `rate_limits`.
   - The connection string `DATABASE_URL` connects as role `nova_app` (`current_user: 'nova_app'`, non-superuser, `rolcreaterole: false`).
   - Executing `schema.sql` via `DATABASE_URL` failed with verbatim PostgreSQL error:
     ```
     error: must be owner of table wifi_profiles (code: 42501)
     ```
   - Executing `schema_rollback.sql` via `DATABASE_URL` failed with verbatim PostgreSQL error:
     ```
     error: must be owner of table devices (code: 42501)
     ```

3. **Insecure RLS Policy on `user_devices` in `schema.sql` Allows Direct IDOR Device Hijacking**:
   - In `schema.sql` line 471:
     ```sql
     GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated;
     ```
   - In `schema.sql` lines 356–362:
     ```sql
     DROP POLICY IF EXISTS authenticated_insert_own_user_devices ON user_devices;
     CREATE POLICY authenticated_insert_own_user_devices ON user_devices 
         FOR INSERT TO authenticated 
         WITH CHECK (
             user_id = auth.uid()::text 
             OR user_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email'))
         );
     ```
   - *Observation*: The check solely constrains `user_id`. It imposes zero validation on `device_id`. Any authenticated user can insert `(user_id: attacker, device_id: victim_device)`.
   - Downstream policies in `schema.sql` (lines 384–447) on `devices`, `wifi_profiles`, `notion_authorizations`, and `device_actions` grant full access to any device present in `user_devices` for `auth.uid()`.

4. **Production DB Pool TLS Crash Hazard on Supabase Pooler (`api/index.ts`)**:
   - In `api/index.ts` lines 21–24:
     ```typescript
     const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== undefined
       ? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
       : Boolean(ca || (isProduction && !isTestEnv));
     ```
   - When running under production (`VERCEL=1` or `NODE_ENV=production`) without `DATABASE_SSL_CA`, `rejectUnauthorized` is `true`.
   - Supabase poolers (`aws-0-*.pooler.supabase.com:6543`) present certificates signed by Supabase's private Root CA (`prod-ca-2021.crt`), not included in Node's default Mozilla trust store.
   - Connecting to the database with `rejectUnauthorized: true` without custom CA throws verbatim:
     ```
     error: self-signed certificate in certificate chain (code: SELF_SIGNED_CERT_IN_CHAIN)
     ```
   - `DATABASE_SSL_CA` is not present or documented in `.env.example`.

5. **Existing Automated Test Suite Baseline**:
   - `npm run lint` (`oxlint src api`): 0 warnings, 0 errors across 47 files.
   - `npm run build` (`tsc -b && vite build`): Succeeded in 516ms without warnings.
   - `node tests/e2e/runner.mjs --tier=1`: 45/45 passed (100%).
   - `node tests/e2e/runner.mjs --tier=2`: 45/45 passed (100%).
   - `npx vitest run src/__tests__/backendApi.test.ts`: 58/58 passed (100%) in 116.88s against the live database.
   - *Observation on Test Scope*: Tier 1 and Tier 2 E2E suites test an in-memory class `MockBackendServer`, not live PostgreSQL RLS. Live tests in `backendApi.test.ts` connect as `nova_app`, which bypasses RLS because `relforcerowsecurity: false`.

---

## 2. Logic Chain

1. **Live Deployment Security Gap**:
   - *Observation 1*: `pg_policies` has 0 rows and 11 tables have `rowsecurity: false`.
   - *Observation 2*: `schema.sql` cannot be executed by `nova_app` because `wifi_profiles` is owned by `postgres`.
   - *Inference*: The security hardening changes made to `schema.sql` exist exclusively as unapplied text on disk. The live database currently relies solely on table-level role grants rather than PostgreSQL Row Level Security.

2. **IDOR Blast Radius from `user_devices` RLS Design**:
   - *Observation 3*: `GRANT INSERT ON user_devices TO authenticated` combined with policy `authenticated_insert_own_user_devices` checks only `user_id = auth.uid()`.
   - *Inference*: If a user connects to Supabase PostgREST with an authenticated JWT, they can execute:
     `INSERT INTO user_devices (user_id, device_id) VALUES (auth.uid(), 'victim_device_id');`
   - *Inference*: Because policies `authenticated_select_user_devices`, `authenticated_select_user_wifi`, `authenticated_select_user_notion`, and `authenticated_insert_user_actions` evaluate `EXISTS (SELECT 1 FROM user_devices WHERE user_devices.device_id = ... AND user_devices.user_id = auth.uid())`, this single unauthorized insert grants the attacker:
     - Read access to victim device metadata and telemetry.
     - Read access to victim Wi-Fi profiles (SSIDs and encrypted passwords).
     - Read access to victim Notion workspace metadata.
     - Write access to queue arbitrary actions (`reboot`, `config_update`) on the victim device.
   - *Conclusion*: Direct INSERT permissions on `user_devices` must be revoked from `authenticated`. Device linking must be restricted strictly to `service_role` through the cryptographic claim-token redemption endpoint (`/api/v1/devices/claim`).

3. **Production Outage Risk from Database TLS Pool**:
   - *Observation 4*: `api/index.ts` enables `rejectUnauthorized: true` in production (`VERCEL=1`), which crashes with `SELF_SIGNED_CERT_IN_CHAIN` against Supabase poolers without `DATABASE_SSL_CA`.
   - *Observation 4*: `.env.example` does not declare `DATABASE_SSL_CA`.
   - *Inference*: Deploying the application to Vercel without pre-bundling the Supabase Root CA or configuring `DATABASE_SSL_CA` in Vercel environment variables will cause immediate 500 errors across all persistent database endpoints on cold start.

---

## 3. Adversarial Review & Challenges

### Overall Risk Assessment: **HIGH**

### Challenge 1 (Critical): Split Table Ownership Prevents Application of Security DDL
- **Assumption challenged**: `schema.sql` and `schema_rollback.sql` are valid migration scripts that can be executed against the target environment.
- **Attack / Failure scenario**: Running migrations under the standard application connection fails with `ERROR: must be owner of table wifi_profiles`. Operations/DevOps cannot apply or rollback RLS without administrative intervention.
- **Blast radius**: System remains without RLS in production; automated deployment pipelines fail.
- **Mitigation**:
  1. Unify table ownership under a single administrative role (e.g. `postgres` or `nova_app`) via `REASSIGN OWNED BY ... TO ...` or `ALTER TABLE <t> OWNER TO postgres;`.
  2. Document that DDL migrations must execute with the administrative `postgres` connection or Supabase Migration CLI, while runtime application traffic connects as `nova_app` or `service_role`.

### Challenge 2 (High): IDOR Device Takeover via PostgREST `user_devices` Direct Insert
- **Assumption challenged**: Authenticated users cannot claim or access devices belonging to other users.
- **Attack / Failure scenario**: An attacker authenticates via Google OAuth, obtains an authenticated JWT, and issues `POST https://<supabase>/rest/v1/user_devices` with `{ "user_id": "<attacker_id>", "device_id": "<target_device_id>" }`. The insert succeeds because `user_id == auth.uid()`. The attacker immediately gains access to victim Wi-Fi vault, Notion auth, and action queue.
- **Blast radius**: Complete compromise of device privacy, Wi-Fi credentials, and control across all users.
- **Mitigation**:
  1. Revoke `INSERT, UPDATE, DELETE` on `user_devices` from `authenticated`:
     ```sql
     REVOKE INSERT, UPDATE, DELETE ON user_devices FROM authenticated;
     GRANT SELECT ON user_devices TO authenticated;
     ```
  2. Enforce that device pairing occurs exclusively through `service_role` via `/api/v1/devices/claim` after verifying the 15-minute ephemeral claim token.

### Challenge 3 (High): Production Vercel Cold Start Crash (`SELF_SIGNED_CERT_IN_CHAIN`)
- **Assumption challenged**: `api/index.ts` DB pool works out-of-the-box in production with TLS verification.
- **Attack / Failure scenario**: Deploying to Vercel triggers `isProduction = true` and `rejectUnauthorized = true`. The Supabase pooler certificate chain fails verification, causing database pool connection timeouts and 500 crashes.
- **Blast radius**: Complete API backend unavailability in production.
- **Mitigation**:
  1. Add `DATABASE_SSL_CA` to `.env.example` with clear instructions on obtaining Supabase's Root CA.
  2. Bundle the Supabase Root CA (`prod-ca-2021.crt`) directly into the project repository (e.g. `api/certs/supabase-ca.pem`) and load it as a fallback in `getPool()`.

---

## 4. Stress Test Results

| Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Live RLS Active Check | `pg_policies` has >0 policies | 0 policies active in `pg_policies` | **FAIL** |
| `schema.sql` Apply via `DATABASE_URL` | Applied cleanly | Failed: `must be owner of table wifi_profiles` | **FAIL** |
| `schema_rollback.sql` Apply via `DATABASE_URL` | Applied cleanly | Failed: `must be owner of table devices` | **FAIL** |
| Production DB TLS Strict Verification | Connects or rejects invalid CA | Rejects Supabase pooler with `SELF_SIGNED_CERT_IN_CHAIN` | **PASS (Proof)** |
| `user_devices` RLS Policy Inspection | Disallows arbitrary device ID | Allows arbitrary `device_id` with `user_id = auth.uid()` | **FAIL (Defect)** |
| E2E Test Suite (Tier 1 & Tier 2) | 90/90 pass cleanly | 90/90 passed (100%) | **PASS** |
| Backend Integration Suite (`backendApi.test.ts`) | 58/58 pass cleanly | 58/58 passed (100%) in 116.88s | **PASS** |
| Oxlint Lint Check | 0 warnings, 0 errors | 0 warnings, 0 errors | **PASS** |
| Vite Production Build | Exit code 0 | Succeeded in 516ms | **PASS** |

---

## 5. Caveats

1. **Live Database DDL Modification**:
   - In accordance with safety rules ("Review-only — do NOT modify implementation code" and "Never change production credentials or live customer data"), table ownership and live schema mutations were tested within rolling transactions (`BEGIN ... ROLLBACK`) rather than permanently modifying the live Supabase database.
2. **Physical Hardware OTP eFuses**:
   - One-time programmable eFuses on the physical hardware (`COM5`) were not burned, in accordance with the established milestone plan.

---

## 6. Conclusion

**Verdict: `REQUEST_CHANGES`**

While the project passes all existing unit and integration test suites (`oxlint`, `vite build`, 90/90 E2E tests, 58/58 live API tests), adversarial empirical investigation reveals four blockers that must be resolved before Phase C can be approved:

1. **Unapplied RLS on Live Database**: `pg_policies` is empty on the live Supabase instance; RLS is not active.
2. **Table Ownership Inconsistency**: `postgres` owns 7 tables while `nova_app` owns 5 tables. `schema.sql` and `schema_rollback.sql` cannot be run with the project's configured database user. Table ownership must be normalized.
3. **RLS IDOR Defect in `user_devices`**: Direct INSERT permissions on `user_devices` must be removed from `authenticated`, restricting device linking strictly to `service_role` through verified claim tokens.
4. **Supabase Pooler Root CA Bundling**: `api/index.ts` must bundle the Supabase private root certificate or document `DATABASE_SSL_CA` in `.env.example` to prevent `SELF_SIGNED_CERT_IN_CHAIN` production cold-start outages.

---

## 7. Verification Method

To independently reproduce and verify all observations and conclusions, execute the following commands in `d:\Personal projects\nova`:

1. **Execute Empirical Security Verification Harness**:
   ```bash
   node tests/verify_phase_c_security.mjs
   ```
   *Expected Output*:
   - Demonstrates 0 active policies in `pg_policies`.
   - Demonstrates `schema.sql` failure: `must be owner of table wifi_profiles`.
   - Demonstrates `schema_rollback.sql` failure: `must be owner of table devices`.
   - Demonstrates `rejectUnauthorized: true` failure: `SELF_SIGNED_CERT_IN_CHAIN`.
   - Demonstrates `user_devices` permissive INSERT policy vulnerability.

2. **Run Existing Test Suites**:
   ```bash
   npm run lint
   npm run build
   node tests/e2e/runner.mjs --tier=1
   node tests/e2e/runner.mjs --tier=2
   npx vitest run src/__tests__/backendApi.test.ts
   ```

*Invalidation Conditions*:
- Normalizing table ownership so `schema.sql` applies cleanly without permission errors.
- Applying RLS policies to live database so `pg_policies` shows all 12 tables protected.
- Restricting `user_devices` INSERT to `service_role` to prevent IDOR device hijacking.
- Bundling Supabase Root CA for production pooler connections.
