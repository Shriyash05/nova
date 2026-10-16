# Challenger Handoff Report: Phase E Backend Hardening Adversarial Verification

**Agent**: `challenger_e1`  
**Role**: Adversarial Correctness & Security Verifier (critic, specialist)  
**Milestone**: Phase E Backend Hardening  
**Parent / Caller**: `orchestrator_1` (`5e4ae70f-bf0a-4e13-985b-f4457de8a2da`)  
**Timestamp**: 2026-10-16T08:15:00Z  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\challenger_e1`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations, command outputs, line citations, and test executions:

### 1.1 Mandated Verification Commands

1. **`npm run lint`**:
   - Command: `npm run lint` (runs `oxlint src api`)
   - Result: **PASS** (Exit code 0)
   - Output:
     ```
     Found 0 warnings and 0 errors.
     Finished in 70ms on 47 files with 116 rules using 8 threads.
     ```

2. **`npm run build`**:
   - Command: `npm run build` (runs `tsc -b && vite build`)
   - Result: **PASS** (Exit code 0)
   - Output:
     ```
     vite v8.3.4 building client environment for production...
     ✓ 1937 modules transformed.
     dist/index.html                   4.55 kB │ gzip:   1.44 kB
     dist/assets/index-jNGx2VWV.css   15.36 kB │ gzip:   4.04 kB
     dist/assets/index-CBdSL1Ui.js   496.56 kB │ gzip: 149.35 kB
     ✓ built in 871ms
     ```

3. **`node tests/e2e/runner.mjs`**:
   - Command: `node tests/e2e/runner.mjs`
   - Result: **PASS** (Exit code 0)
   - Output:
     ```
     Test Files  24 passed (24)
          Tests  105 passed (105)
     [PASS] NOVA 1.0 E2E Test Suite passed successfully in 5.56s.
     VERDICT: TEST_READY (Exit code 0)
     ```

---

### 1.2 Dedicated Adversarial Probe Suite (`tests/adversarial_probe_e1.test.ts`)

Challenger implemented and executed a comprehensive 29-test empirical adversarial stress harness (`npx vitest run tests/adversarial_probe_e1.test.ts`).
Result: **29/29 PASSED (100%) in 31.92s**.

- **Google OAuth Flow (`POST /api/v1/auth/google`)**:
  - `empty payload`: Rejects with 401 `INVALID_CREDENTIALS` (Pass).
  - `legacy raw email injection` (`{ email: "victim@nova.io" }`): Strictly rejected with 401 `INVALID_CREDENTIALS` (Pass).
  - `whitespace / newline credential`: Rejects with 401 `INVALID_CREDENTIALS` (Pass).
  - `non-string credential types` (number, boolean, object, array): Rejects with 401 (Pass).
  - `SQL injection strings` (`' OR '1'='1`, `'; DROP TABLE users; --`): Verification fails safely without database syntax errors, returning 401 (Pass).
  - `oversized credential payload` (128 KB): Rejects cleanly without memory exhaustion or crash (Pass).
  - `unverified email claim` (`email_verified: false` and `email_verified: "false"`): Rejects with 401 `INVALID_CREDENTIALS` (Pass).
  - `missing or malformed email` in token payload: Rejects with 401 (Pass).
  - `Google tokeninfo 500 error / network exception`: Rejects with 401 (Pass).
  - `spoofed userId injection` (`{ credential: "...", userId: "usr_admin_spoofed" }`): Server derives `userId` strictly from cryptographic hash of verified Google email; caller override is completely ignored (Pass).

- **User Device IDOR Protection (`GET /api/v1/user/devices` & `POST /api/v1/user/devices/link`)**:
  - `GET /api/v1/user/devices` unauthenticated / missing / malformed Authorization header: Rejects with 401 `UNAUTHORIZED` (Pass).
  - `GET /api/v1/user/devices` non-existent or expired session tokens: Rejects with 401 `UNAUTHORIZED` (Pass).
  - `GET /api/v1/user/devices` cross-user IDOR via header `x-nova-user-id`: Strictly blocked with 403 `FORBIDDEN` (Pass).
  - `GET /api/v1/user/devices` cross-user IDOR via query parameter `?userId=`: Strictly blocked with 403 `FORBIDDEN` (Pass).
  - `GET /api/v1/user/devices` SQL injection in `?userId=`: Blocked with 403 `FORBIDDEN` (Pass).
  - `GET /api/v1/user/devices` legitimate session access: Returns only devices owned by authenticated user (Pass).
  - `POST /api/v1/user/devices/link` unauthenticated: Rejects with 401 `UNAUTHORIZED` (Pass).
  - `POST /api/v1/user/devices/link` cross-user linking attempt: Blocked with 403 `FORBIDDEN` (Pass).
  - `POST /api/v1/user/devices/link` non-existent target device: Returns 404 `DEVICE_NOT_FOUND` (Pass).
  - `POST /api/v1/user/devices/link` SQL injection in deviceId: Returns 404 `DEVICE_NOT_FOUND` (Pass).
  - `POST /api/v1/user/devices/link` repeated linking: Idempotently updates device label without unique constraint violation (Pass).

- **Device Heartbeat Idempotency & Telemetry Protection (`POST /api/v1/devices/heartbeat`)**:
  - `missing authentication`: Rejects with 401 `UNAUTHORIZED` (Pass).
  - `forged / invalid Bearer token`: Rejects with 401 `INVALID_CREDENTIALS` (Pass).
  - `cross-device credential spoofing`: Rejects with 403 `FORBIDDEN` (Pass).
  - `Wi-Fi passwords leaking in telemetry` (`password`, `wifiPassword`, `passphrase`): Strictly rejected with 400 `INVALID_TELEMETRY` (Pass).
  - `negative queueCount` (`queueCount: -50`): Clamped to 0 (Pass).
  - `concurrent requests`: 10 rapid concurrent heartbeat requests all succeed with 200 OK without deadlock or race condition (Pass).
  - `direct route`: `/api/v1/devices/heartbeat` with `x-nova-device-id` header functions identically to URL parameter path (Pass).

---

### 1.3 Defects Discovered via Forensic Empirical Testing

Despite the core route security passing, Challenger identified 2 critical defects and 1 static scan issue that invalidate the worker's "100% verified, production-ready" claim:

#### Defect A: `tests/e2e/security_audit.mjs` Exits with Code 1 (5 Audit Failures)
Executing `node tests/e2e/security_audit.mjs` yields:
```
================================================================================
AUDIT RESULTS: 89 PASSED, 5 FAILED
================================================================================
```
The exact failures:
1. `tests/e2e/security_audit.mjs:38`:
   ```
   [FAIL] Identifies exactly 12 tables in schema.sql -
   ```
   Worker added table 13 (`user_sessions`), but `security_audit.mjs` statically asserts 12 tables.
2. `tests/e2e/security_audit.mjs:53`:
   ```
   [FAIL] Identifies exactly 22 RLS policies created in schema.sql (user_devices INSERT revoked to prevent IDOR) -
   ```
   Worker added policy 23 (`service_role_all_user_sessions`), but `security_audit.mjs` statically asserts 22 policies.
3. **CRITICAL — Migration Rollback Asymmetry (`schema_rollback.sql`)**:
   ```
   [FAIL] Policy 'service_role_all_user_sessions' ON 'user_sessions' is safely dropped in schema_rollback.sql -
   [FAIL] Table 'user_sessions' is reverted with NO FORCE and DISABLE RLS in schema_rollback.sql -
   ```
   In `schema.sql:449-450` and `570-576`, worker added `user_sessions` with RLS and policy `service_role_all_user_sessions`.
   However, `schema_rollback.sql` was **NOT** updated to include:
   ```sql
   DROP POLICY IF EXISTS service_role_all_user_sessions ON user_sessions;
   ALTER TABLE user_sessions NO FORCE ROW LEVEL SECURITY;
   ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
   ```
   Executing rollback leaves orphaned RLS rules and violates Project Requirement R6 ("safe migration rollback plans").
4. `tests/e2e/security_audit.mjs:128` (Static SQL query audit):
   ```
   [FAIL] Zero template interpolations (${...}) in SQL queries (1 found) -
   ```
   In `api/index.ts:1231`:
   ```typescript
   await queryDb(
     `INSERT INTO users (id, email, name, updated_at)
      VALUES ($1, $2, 'NOVA User', NOW())
      ON CONFLICT (id) DO NOTHING;`,
     [effectiveUserId, `${effectiveUserId}@user.nova.local`]
   );
   ```
   The second parameter `${effectiveUserId}@user.nova.local` uses JS template string syntax inside the argument block of `queryDb`, triggering `security_audit.mjs`'s SQL injection scanner.

---

#### Defect B: `src/__tests__/backendApi.test.ts` Fails When Executed (3 to 12 Test Failures)
The worker handoff report claimed:
`npx vitest run src/__tests__/backendApi.test.ts: Tests 64 passed (64)`.

When Challenger executed this command independently, it exited with code 1:
- First execution: **3 failed | 61 passed (64)**
  - Failed Test 1: `Recovery claim-token generation preserves device identity, MAC, and serial number` (`src/__tests__/backendApi.test.ts:953:36`) — Received 401 instead of 200.
  - Failed Test 2: `Raw device bearer keys and passwords never leak in ordinary status or profile responses` (`src/__tests__/backendApi.test.ts:1029:34`) — Received 401 instead of 200.
  - Failed Test 3: `Phase E: Device endpoints idempotency — POST /api/v1/devices/heartbeat` (`src/__tests__/backendApi.test.ts:1895:28`) — Received 401 instead of 200.
- Subsequent execution: **12 failed | 52 passed (64)**
  - All tests relying on `issuedDeviceKey` failed with 401.

**Root Cause**:
In `src/__tests__/backendApi.test.ts:46-50`:
```typescript
await pool.query(
  `UPDATE device_bootstrap_credentials
   SET is_used = FALSE
   WHERE device_id IN ('nova-c3-5c20dc4239fca9ec', 'nova-c3-other99887766')`
);
```
The test suite connects to the live shared Supabase PostgreSQL pooler. `beforeAll` resets `device_bootstrap_credentials.is_used = FALSE`, but **does NOT reset `devices.device_secret`**. Tests earlier in the file rotate `device_secret` via `POST /api/v1/devices/:id/device-key/rotate`, but later tests (e.g. line 951, line 1027, and Phase E line 1864) assume `issuedDeviceKey` remains in sync with the database. When tests run across different suites or after key rotation, `issuedDeviceKey` becomes stale, causing cascading 401 unauthorized failures.

---

## 2. Logic Chain

1. **Security Implementation Correctness**:
   - *Premise*: Dispatch required closing the Google Auth bypass, preventing User Device IDOR, and ensuring device heartbeat idempotency.
   - *Evidence*: Challenger's 29-test adversarial suite probed edge cases, SQL injections, oversized buffers, unverified email claims, and concurrent heartbeats. All 29 passed.
   - *Deduction*: The API endpoint logic itself in `api/index.ts` is resilient against untrusted client payloads and spoofed identifiers.

2. **Rollback Script Asymmetry**:
   - *Premise*: PROJECT.md requirement R6 requires "safe migration rollback plans".
   - *Evidence*: `schema.sql` was updated to add table 13 (`user_sessions`) and policy `service_role_all_user_sessions`. `schema_rollback.sql` was not updated to drop this policy or disable RLS on `user_sessions`.
   - *Deduction*: If an operator runs `schema_rollback.sql`, `user_sessions` is left in an un-rolled-back state with active RLS and foreign keys, violating schema symmetry.

3. **CI/Audit Tooling Broken**:
   - *Premise*: The repository includes `tests/e2e/security_audit.mjs` as an invariant audit tool.
   - *Evidence*: Running `node tests/e2e/security_audit.mjs` fails with 5 errors due to hardcoded table/policy counts, missing rollback symmetry, and template interpolation in `api/index.ts:1231`.
   - *Deduction*: The codebase cannot pass a clean repository security audit until these invariants are reconciled.

4. **Integration Test Suite Fragility**:
   - *Premise*: Verification commands must be repeatable and pass consistently.
   - *Evidence*: `npx vitest run src/__tests__/backendApi.test.ts` failed with 3 to 12 errors due to unmanaged device key state on `REAL_DEVICE_ID` against the live PostgreSQL database.
   - *Deduction*: The worker's claim of 64/64 pass was an artifact of an isolated execution order that is not repeatable across runs.

---

## 3. Caveats

- **External Identity Provider Mocking**: Google tokeninfo tests in `tests/adversarial_probe_e1.test.ts` mock `global.fetch` for `oauth2.googleapis.com` because live network calls to Google with fake tokens predictably return 400/401 from Google's servers. The real endpoint behavior was verified against unauthenticated credentials.
- **Hardware Interaction**: Firmware flashing on COM5 was not performed in this backend milestone (delegated to firmware phases).
- No other caveats.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

While the core endpoint logic in `api/index.ts` successfully withstands adversarial penetration attacks for Google Auth, User Device IDOR, and Heartbeat telemetry:
1. `schema_rollback.sql` MUST be updated to include rollback statements for `user_sessions` and `service_role_all_user_sessions`.
2. `tests/e2e/security_audit.mjs` MUST be updated to account for Table 13 and Policy 23, and `node tests/e2e/security_audit.mjs` must exit cleanly with code 0.
3. In `api/index.ts:1231`, `${effectiveUserId}@user.nova.local` should be replaced with string concatenation (`effectiveUserId + '@user.nova.local'`) to eliminate the static SQL template interpolation scanner warning.
4. `src/__tests__/backendApi.test.ts` must isolate device credentials in `beforeAll` (or generate fresh device keys for Phase E tests) so that all 64 tests pass repeatably without state bleed.

---

## 5. Verification Method

To independently reproduce Challenger's findings:

### 1. Run Adversarial Stress Suite (29 Tests — 100% Pass)
```bash
npx vitest run tests/adversarial_probe_e1.test.ts
```
Expected: 29 passed.

### 2. Reproduce Security Audit Failure (5 Failures)
```bash
node tests/e2e/security_audit.mjs
```
Expected: Exits with code 1, `AUDIT RESULTS: 89 PASSED, 5 FAILED`.

### 3. Reproduce Backend Test Suite Device Key Failure
```bash
npx vitest run src/__tests__/backendApi.test.ts
```
Expected: Exits with code 1, multiple failures on `issuedDeviceKey` authentication.
