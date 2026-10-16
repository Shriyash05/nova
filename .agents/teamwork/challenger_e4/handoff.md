# Challenger 4 Empirical Handoff Report: Database Rollback Symmetry & Test Isolation

**Agent**: `challenger_e4`  
**Role**: Adversarial Database & Test Isolation Challenger (critic, specialist)  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\challenger_e4`  
**Milestone**: Phase E Backend & API Hardening  
**Parent / Orchestrator**: `orchestrator_1` (`5e4ae70f-bf0a-4e13-985b-f4457de8a2da`)  
**Timestamp**: 2026-10-16T08:52:00Z  
**Verdict**: **REQUEST_CHANGES**

---

## Challenge Summary

**Overall Risk Assessment**: **HIGH** (Backend Test Isolation & Repeatability Fragility) / **LOW** (Schema Rollback Symmetry & Static DDL)

While the database rollback script (`schema_rollback.sql`) achieves full mathematical and dialect symmetry with `schema.sql` (94/94 checks passing), the backend integration test suite (`src/__tests__/backendApi.test.ts`) suffers from severe test isolation and fixture contamination vulnerabilities under multi-agent / concurrent execution against PostgreSQL.

---

## 1. Observation

Direct observations, file citations, line numbers, verbatim error traces, and tool outputs:

### 1.1 Database Rollback Symmetry Audit
- **Script**: `node tests/e2e/security_audit.mjs`
- **Output**:
  ```
  ================================================================================
               EMPIRICAL SECURITY & SCHEMA ROLLBACK AUDIT HARNESS                 
  ================================================================================
  --- Section 1: Schema & Rollback Script SQL Dialect & Symmetry Audit ---
  Identified tables in schema.sql (13): [ ... ]
  [PASS] Identifies exactly 13 tables in schema.sql
  [PASS] Table 'user_sessions' has both ENABLE and FORCE ROW LEVEL SECURITY in schema.sql
  Identified created policies in schema.sql (23)
  [PASS] Identifies exactly 23 RLS policies created in schema.sql (user_devices INSERT revoked to prevent IDOR)
  Identified dropped policies in schema_rollback.sql (24)
  [PASS] Identifies exactly 24 RLS policies dropped in schema_rollback.sql
  [PASS] Policy 'service_role_all_user_sessions' ON 'user_sessions' is safely dropped in schema_rollback.sql
  [PASS] Table 'user_sessions' is reverted with NO FORCE and DISABLE RLS in schema_rollback.sql
  [PASS] schema_rollback.sql contains ZERO destructive DROP TABLE commands on persistent baseline tables
  [PASS] Rollback script restores anon privileges to pre-hardening state
  [PASS] Rollback script restores authenticated privileges to pre-hardening state
  --- Section 2: Backend Source Code SQL Injection Vulnerability Scan ---
  Total analyzed SQL execution call sites: 91
  [PASS] Zero template interpolations (${...}) in SQL queries (0 found)
  [PASS] Zero JavaScript string concatenations (+ var) in SQL queries (0 found)
  ...
  ================================================================================
  AUDIT RESULTS: 94 PASSED, 0 FAILED
  ================================================================================
  ```
- **Exit Code**: `0`

### 1.2 TLS CA Normalization & Defensive Header Probes
- **Command**: `npx vitest run tests/adversarial_phase_e_challenge.test.ts`
- **Output**:
  ```
  ✓ tests/adversarial_phase_e_challenge.test.ts (35 tests) 26ms
  Test Files  1 passed (1)
       Tests  35 passed (35)
    Duration  288ms
  ```
- **Exit Code**: `0`

### 1.3 Lint, Build, and E2E Regression Runner
- **`npm run lint`**:
  ```
  Found 0 warnings and 0 errors.
  Finished in 65ms on 47 files with 116 rules using 8 threads. (Exit code 0)
  ```
- **`npm run build`**:
  ```
  ✓ 1937 modules transformed.
  dist/index.html 4.55 kB
  dist/assets/index-jNGx2VWV.css 15.36 kB
  dist/assets/index-CBdSL1Ui.js 496.56 kB
  ✓ built in 638ms (Exit code 0)
  ```
- **`node tests/e2e/runner.mjs`**:
  ```
  Test Files  24 passed (24)
       Tests  105 passed (105)
    Duration  1.63s
  [PASS] NOVA 1.0 E2E Test Suite passed successfully in 3.44s.
  VERDICT: TEST_READY (Exit code 0)
  ```

### 1.4 Backend Test Suite Repeatability & Isolation Failure (Empirical Evidence)
Contrary to the worker's claim of "64/64 tests passed repeatably on live PostgreSQL database", empirical execution revealed severe test failure modes:

#### Empirical Run 1 (`task-22`):
- **Command**: `npx vitest run src/__tests__/backendApi.test.ts`
- **Result**: `1 failed | 63 passed (64)` (Exit code 1)
- **Verbatim Error Trace**:
  ```
  FAIL  src/__tests__/backendApi.test.ts > NOVA Real ESP32-C3 Firmware Integration & Security Suite > Phase E: Device endpoints idempotency — POST /api/v1/devices/heartbeat
  AssertionError: expected 401 to be 200 // Object.is equality

  - Expected
  + Received

  - 200
  + 401

   ❯ src/__tests__/backendApi.test.ts:1898:28
      1896|       },
      1897|     });
      1898|     expect(hb1.statusCode).toBe(200);
         |                            ^
      1899|     expect(hb1.body.success).toBe(true);
      1900|     expect(hb1.body.data.status).toBe('online');
  ```

#### Empirical Run 2 (`task-174`):
- **Command**: `npx vitest run src/__tests__/backendApi.test.ts`
- **Result**: `32 failed | 32 passed (64)` (Exit code 1)
- **Verbatim Errors**:
  - `POST /api/v1/devices/:id/sync/test enforces Bearer auth: expected 401 to be 400`
  - `POST /api/v1/devices/:id/notion/disconnect: expected 401 to be 200`
  - `GET /api/v1/devices/:id/wifi-profiles/boot: expected 401 to be 403`
  - `GET /api/v1/devices/:id/status marks device offline: expected 401 to be 200`
  - `Recovery claim-token generation preserves device identity: expected 401 to be 200`
  - `Raw device bearer keys never leak: expected 401 to be 200`
  - `POST /api/v1/launch-signup: expected 429 to be 400` (`RATE_LIMIT_EXCEEDED`)
  - `Phase E: Device endpoints idempotency: expected 401 to be 200`

### 1.5 Code Inspection of Root Cause
1. **Shared Static Device IDs Across Test Suites**:
   - In `src/__tests__/backendApi.test.ts` (line 141):
     `const REAL_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';`
   - In `tests/adversarial_probe_e1.test.ts` (line 96):
     `const TEST_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';`
   - In `tests/challenger_e3_probe.test.ts` (line 107):
     `const TEST_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';`
2. **Destructive Global State Reset in `beforeAll`**:
   - In `src/__tests__/backendApi.test.ts` (lines 47–60):
     ```typescript
     await pool.query(
       `UPDATE devices
        SET device_secret = NULL, status = 'unprovisioned'
        WHERE id IN ('nova-c3-5c20dc4239fca9ec', 'nova-c3-other99887766', 'nova-c3-test-device-01')`
     );
     await pool.query('UPDATE device_bootstrap_credentials SET is_used = FALSE');
     await pool.query('DELETE FROM rate_limits');
     await pool.query('DELETE FROM oauth_states');
     ```
   - When multiple test suites or subagent processes run in parallel (or even when vitest runs multiple test files), one process's `beforeAll` zeroes out `device_secret` and resets bootstrap credentials while another test process is executing midway through its 64 assertions!
3. **In-Memory Closure Stale Credential Assumption in Test 64**:
   - In `src/__tests__/backendApi.test.ts` (lines 1865–1882):
     ```typescript
     let activeKey = issuedDeviceKey;
     if (!activeKey) {
       // Only bootstraps if activeKey was falsy in memory!
     }
     ```
   - Because `issuedDeviceKey` was populated in memory from earlier tests, `if (!activeKey)` is bypassed. If the remote database row was overwritten or cleared by another runner, `activeKey` is invalid at rest, causing `authenticateDeviceRequest` to return HTTP 401 UNAUTHORIZED on `hb1`.
4. **Rate Limit Pollution**:
   - Tests execute against IP `127.0.0.1`. Concurrent test runs fill the `rate_limits` table bucket for `127.0.0.1`, causing non-rate-limit tests (like `/launch-signup`) to fail with HTTP 429 `RATE_LIMIT_EXCEEDED`.

---

## 2. Logic Chain

1. **Rollback Symmetry Verification (Observations 1.1)**:
   - *Premise*: Schema migrations and rollback scripts must preserve dialect symmetry, guarantee zero data loss on persistent tables, and restore privileges idempotently.
   - *Reasoning*: `schema_rollback.sql` mirrors all 13 tables created in `schema.sql`. It wraps all RLS modifications (`NO FORCE`, `DISABLE`) in conditional `DO $$` blocks with `IF EXISTS` guards, drops all 23 active policies plus the legacy 24th policy safely, drops only the ephemeral Phase E table `user_sessions`, and restores privileges to `anon`, `authenticated`, and `service_role`.
   - *Deduction*: Section 1 requirement for schema rollback symmetry is 100% satisfied.

2. **Test Isolation Failure (Observations 1.4, 1.5)**:
   - *Premise*: A production test suite must be hermetic and repeatable without cross-test or cross-suite fixture contamination.
   - *Reasoning*:
     - Multiple test suites (`backendApi.test.ts`, `adversarial_probe_e1.test.ts`, `challenger_e3_probe.test.ts`) share the exact same hardware ID `'nova-c3-5c20dc4239fca9ec'`.
     - In `beforeAll`, `backendApi.test.ts` modifies shared persistent rows (`devices.device_secret = NULL`) and un-scoped tables (`DELETE FROM rate_limits`).
     - Under concurrent test execution (observed via active system processes during multi-agent dispatch), tests actively corrupt each other's credentials and rate limits.
     - In Run 1, this caused test 64 to fail with 401. In Run 2, this caused 32 cascading failures (401 and 429).
   - *Deduction*: `src/__tests__/backendApi.test.ts` fails the repeatability and isolation criterion. The worker's claim of deterministic repeatability does not hold in real-world multi-agent or CI environments.

---

## 3. Caveats

- When run in absolute isolation with zero concurrent processes and after a manual database cleanup, the individual test assertions can pass.
- However, tests cannot rely on artificial global serialization; test fixtures must be properly isolated by design.
- No other caveats.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The database schema and rollback script (`schema.sql` and `schema_rollback.sql`) are **APPROVED** for symmetry, security, and idempotency.

However, **remediation is required for `src/__tests__/backendApi.test.ts`** before Phase E can be approved:
1. **Isolated Test Fixtures**:
   Replace shared static device IDs (`REAL_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec'`) with isolated, run-scoped synthetic device IDs (e.g., `nova-c3-test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`), pre-enrolling their bootstrap hashes in `device_bootstrap_credentials` and cleaning them up in an `afterAll` hook, identical to the proven design in `Priority 1: Complete hardware recovery sequence using synthetic test device`.
2. **Remove Un-scoped Table Deletions in `beforeAll`**:
   Do not run global `DELETE FROM rate_limits` or global `UPDATE devices SET device_secret = NULL` on production baseline rows. Scope rate-limit tests to unique random keys (e.g. `test_key_${Date.now()}`) and distinct mock client IPs (`x-forwarded-for`).
3. **Resilient Key Synchronization in Test 64**:
   In `Phase E: Device endpoints idempotency — POST /api/v1/devices/heartbeat`, do not blindly assume the in-memory closure `issuedDeviceKey` matches the database row. Verify or re-authenticate the device key to guarantee hermetic test execution.

---

## 5. Verification Method

To verify these empirical findings:

```bash
# 1. Rollback & SQL Security Audit (PASSES 94/94)
node tests/e2e/security_audit.mjs

# 2. Adversarial Challenge Suite (PASSES 35/35)
npx vitest run tests/adversarial_phase_e_challenge.test.ts

# 3. Lint, Build, and Runner (PASSES)
npm run lint
npm run build
node tests/e2e/runner.mjs

# 4. Demonstrate Test Isolation Flaw: Run backendApi and probe concurrently
# Terminal 1:
npx vitest run src/__tests__/backendApi.test.ts
# Terminal 2 (simultaneously):
npx vitest run tests/adversarial_probe_e1.test.ts
# Result: One or both test runs fail with 401 UNAUTHORIZED or 429 RATE_LIMIT_EXCEEDED
```

**Invalidation Condition**:
If `src/__tests__/backendApi.test.ts` is refactored to use run-isolated synthetic device IDs and unique rate-limiting keys, and subsequently passes 64/64 cleanly even when executed concurrently with other test suites, this request for changes is resolved.
