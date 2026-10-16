# Adversarial Security Review & Audit Handoff Report: Phase E Remediations

**Reviewer**: `reviewer_e4`  
**Role**: Reviewer & Adversarial Critic (Phase E Backend Hardening & API Verification)  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\reviewer_e4`  
**Parent / Caller**: `orchestrator_1` (`5e4ae70f-bf0a-4e13-985b-f4457de8a2da`)  
**Date**: 2026-10-16T08:56:00Z  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct code observations, citations, line numbers, and empirical test execution results:

### 1.1 Remediation Code Inspections (Security Logic Hardening)

1. **Closure of Finding 1 (Device Claim Bypass — `api/index.ts` lines 1803–1826)**:
   - In `POST /api/v1/devices/claim`:
     Input is extracted: `const claimToken = (req.body?.claimToken as string) || (req.body?.shortCode as string);`.
     Input validation rejects empty or missing tokens with HTTP 400 `INVALID_CLAIM_CODE`.
     Token lookup searches `claim_tokens`:
     ```typescript
     const findSql = `
       SELECT ct.*, d.serial_number, d.hardware_model
       FROM claim_tokens ct
       JOIN devices d ON d.id = ct.device_id
       WHERE ct.token = $1 OR ct.short_code = $1;
     `;
     const tokens = await queryDb<ClaimTokenRecord & { serial_number: string; hardware_model: string }>(findSql, [cleanInput]);
     ```
     If `tokens.length === 0`, it strictly rejects:
     ```typescript
     if (tokens.length === 0) {
       sendJson(res, 400, {
         success: false,
         error: {
           code: 'INVALID_CLAIM_CODE',
           message: 'No claim record matches this claim code.',
         },
       });
       return;
     }
     ```
     The previous insecure fallback (which queried `devices` by raw `deviceId` to mint a pairing session) was completely deleted.
     Redemption state is strictly verified (`claim.is_redeemed` -> 400 `CLAIM_TOKEN_ALREADY_REDEEMED`).
     Lifespan is strictly enforced (`new Date(claim.expires_at) < new Date()` -> 410 `CLAIM_TOKEN_EXPIRED`).
     **Assessment**: The physical claim boundary is cryptographically and logically sealed.

2. **Closure of Finding 2 (Session Elevation — `api/index.ts` lines 281–297)**:
   - In `getUserIdFromSession(token)`:
     ```typescript
     export async function getUserIdFromSession(token: string): Promise<string | null> {
       if (!token) return null;
       try {
         const userSessRows = await queryDb<{ user_id: string }>(
           'SELECT user_id FROM user_sessions WHERE id = $1 AND expires_at > NOW()',
           [token]
         );
         if (userSessRows.length > 0 && userSessRows[0].user_id) {
           return userSessRows[0].user_id;
         }
       } catch {
         // If table doesn't exist yet, return null
       }
       return null;
     }
     ```
     The previous fallback #2 (which queried `pairing_sessions` and joined with `user_devices` to return a `user_id`) has been completely removed.
     Endpoints requiring user identity (`GET /api/v1/user/devices` lines 1087–1155, and `POST /api/v1/user/devices/link` lines 1163–1243) call `getUserIdFromSession(token)` and reject device pairing session tokens with HTTP 401 `UNAUTHORIZED`.
     **Assessment**: Pairing sessions can no longer elevate into user account authentication.

3. **Closure of Finding 3 (Google OAuth Confused Deputy — `api/index.ts` lines 992–1002)**:
   - In `POST /api/v1/auth/google`:
     Audience verification strictly compares token audience against configured Google Client IDs:
     ```typescript
     const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
     if (expectedClientId && gData.aud !== expectedClientId) {
       sendJson(res, 401, {
         success: false,
         error: {
           code: 'INVALID_CREDENTIALS',
           message: 'Token audience mismatch: Google credential was not issued for this application.',
         },
       });
       return;
     }
     ```
     Email verification is enforced:
     ```typescript
     if (gData.email_verified === false || gData.email_verified === 'false') {
       sendJson(res, 401, {
         success: false,
         error: {
           code: 'INVALID_CREDENTIALS',
           message: 'Google account email is not verified.',
         },
       });
       return;
     }
     ```
     Unauthenticated raw email injection is rejected at line 954 (`credential` required).
     **Assessment**: Google OAuth token authentication strictly defends against confused deputy attacks and unverified email claims.

4. **Static SQL Template Interpolation Scanner Warning (`api/index.ts` line 1221)**:
   - In `POST /api/v1/user/devices/link`, the synthetic email string was extracted outside the database query argument:
     ```typescript
     const syntheticEmail = `${effectiveUserId}@user.nova.local`;
     await queryDb(
       `INSERT INTO users (id, email, name, updated_at)
        VALUES ($1, $2, 'NOVA User', NOW())
        ON CONFLICT (id) DO NOTHING;`,
       [effectiveUserId, syntheticEmail]
     );
     ```
     `tests/e2e/security_audit.mjs` Section 2 scan confirms 0 template interpolations and 0 unparameterized string concatenations across all 91 SQL call sites.

5. **Scoped Supabase Root CA Injection (`api/index.ts` line 93 & `api/health.ts` line 88)**:
   - CA injection condition was restricted strictly to Supabase endpoints:
     ```typescript
     if (!ca && (process.env.DATABASE_URL.includes('supabase.co') || process.env.DATABASE_URL.includes('pooler.supabase.com')))
     ```
     External non-Supabase PostgreSQL hosts will not receive the Supabase Root CA.

6. **Rollback DDL Symmetry (`schema_rollback.sql`)**:
   - `user_sessions` was added to table ownership normalization (`line 32`).
   - `DROP POLICY IF EXISTS service_role_all_user_sessions ON user_sessions;` was added (`line 101`).
   - Idempotent `NO FORCE ROW LEVEL SECURITY` and `DISABLE ROW LEVEL SECURITY` blocks were added (`lines 216–224`).
   - Ephemeral teardown `DROP TABLE IF EXISTS user_sessions CASCADE;` was added (`line 229`).
   - `security_audit.mjs` Section 1 passes 100% of symmetry checks.

---

### 1.2 Verification Command Results

1. **`npm run lint`**:
   - Exit code: 0
   - Output: `Found 0 warnings and 0 errors. Finished in 73ms on 47 files with 116 rules.`
2. **`npm run build`**:
   - Exit code: 0
   - Output: `tsc -b && vite build` built cleanly in 667ms (`dist/assets/index-CBdSL1Ui.js` 496.56 kB).
3. **`node tests/e2e/security_audit.mjs`**:
   - Exit code: 0
   - Output: `AUDIT RESULTS: 94 PASSED, 0 FAILED`
4. **`node tests/e2e/runner.mjs`**:
   - Exit code: 0
   - Output: `Test Files 24 passed (24), Tests 105 passed (105), Duration 1.80s. VERDICT: TEST_READY`.
5. **`npx vitest run tests/adversarial_phase_e_challenge.test.ts`**:
   - Exit code: 0
   - Output: `Test Files 1 passed (1), Tests 35 passed (35)`.
6. **`npx vitest run src/__tests__/backendApi.test.ts` (Empirical Execution Trace)**:
   - **Task 142**: **FAILED (Exit code 1)**: `9 failed | 55 passed (64 tests)`
   - Verbatim failure instances:
     - `DELETE /api/v1/devices/:id/wifi-profiles/:profileId deletes and recompacts voice slots`:
       `AssertionError: expected +0 to be 4` (`expect(checkRes.body.data.profiles.length).toBe(4)`)
     - `POST /api/v1/devices/:id/wifi-profile-result reports firmware connection outcome`:
       `AssertionError: expected 401 to be 200`
     - `GET /api/v1/devices/:id/wifi-profiles/boot rejects cross-device credential with 403`:
       `AssertionError: expected 401 to be 403`
     - `GET /api/v1/devices/:id/wifi-profiles/boot returns ONLY default profile with decrypted password for hardware`:
       `AssertionError: expected 404 to be 200`
     - `Deleting default profile recompacts slots and leaves vault without default`:
       `AssertionError: expected 404 to be 200`
     - `GET /api/v1/devices/:id/status marks device offline when heartbeat >90s stale`:
       `AssertionError: expected 401 to be 200`
     - `Recovery claim-token generation preserves device identity, MAC, and serial number`:
       `AssertionError: expected 401 to be 200`
     - `Raw device bearer keys and passwords never leak in ordinary status or profile responses`:
       `AssertionError: expected 401 to be 200`
     - `Phase E: Device endpoints idempotency — POST /api/v1/devices/heartbeat`:
       `AssertionError: expected 401 to be 200`

---

### 1.3 Root Cause Analysis of Test Suite Fragility

1. **Hardcoded Static Test Fixtures in Shared PostgreSQL Instance**:
   - In `src/__tests__/backendApi.test.ts` line 146:
     `const REAL_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';`
   - In `tests/adversarial_probe_e1.test.ts` line 96:
     `const TEST_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec';`
   - Multiple test files hardcode the identical device ID on the shared remote database.
2. **Global Database Fixture Mutex Collision**:
   - In `src/__tests__/backendApi.test.ts` lines 46–58 (`beforeAll`):
     ```typescript
     await pool.query(
       `UPDATE devices
        SET device_secret = NULL, status = 'unprovisioned'
        WHERE id IN ('nova-c3-5c20dc4239fca9ec', 'nova-c3-other99887766', 'nova-c3-test-device-01')`
     );
     await pool.query('UPDATE device_bootstrap_credentials SET is_used = FALSE');
     await pool.query('DELETE FROM wifi_profiles WHERE device_id IN (...)');
     await pool.query('DELETE FROM rate_limits');
     ```
   - When test runners run in multi-agent environments or when parallel Vitest suites execute, one runner's `beforeAll` zeroes out `device_secret` or wipes `wifi_profiles` while another runner is midway through asserting on those rows.
3. **In-Memory Stale Key Assumption in Test 64**:
   - Line 1866: `let activeKey = issuedDeviceKey; if (!activeKey) { ... }`
   - Because `issuedDeviceKey` is cached in Node process memory from early tests, if the remote database row was overwritten or desynchronized, `issuedDeviceKey` fails with HTTP 401 on `POST /devices/heartbeat`.
4. **Shared IP Rate Limiting Pollution**:
   - All tests use IP `127.0.0.1` unless overridden. Tests making rapid calls exhaust the 20-30 req/min bucket in PostgreSQL, resulting in cascading HTTP 429 failures.

---

## 2. Logic Chain

1. **Security Vulnerability Remediations Are Robust (Observation 1.1)**:
   - *Premise*: Source code in `api/index.ts` must close device claim bypass, session elevation, and OAuth confused deputy.
   - *Evidence*:
     - `POST /api/v1/devices/claim`: `tokens.length === 0` strictly returns 400. Raw `deviceId` fallback is eliminated.
     - `getUserIdFromSession`: only queries `user_sessions`. Pairing sessions cannot authenticate user routes.
     - `POST /api/v1/auth/google`: validates `gData.aud === expectedClientId` and verifies email claims.
   - *Deduction*: The production API implementation in `api/index.ts` is cryptographically sound and secure.

2. **Database Rollback DDL is Fully Symmetrical (Observation 1.1.6, 1.2.3)**:
   - *Premise*: Rollback scripts must be safe, non-destructive, and symmetrical.
   - *Evidence*: `security_audit.mjs` verifies 13 tables, 23 created policies, 24 dropped policies, and zero destructive baseline drops. All 94 checks pass.
   - *Deduction*: Schema rollback plan is approved.

3. **Backend Test Suite Hermeticity Failure (Observations 1.2.6, 1.3)**:
   - *Premise*: Production readiness requires deterministic, isolated, repeatable test execution without state pollution.
   - *Evidence*:
     - Running `src/__tests__/backendApi.test.ts` in task-142 failed with 9 test failures (exit code 1).
     - Concurrent or interleaved test runs fail with 401 (invalidated credentials), 404 (wiped profiles), and 429 (polluted rate limits).
     - Worker handoff's Invalidation Condition states: "If any of the 7 verification commands exit with non-zero status or fail an assertion, this handoff is invalidated."
   - *Deduction*: The test suite does not meet the deterministic repeatability criterion. Changes are required to isolate test fixtures.

---

## 3. Caveats

- **API Code Security**: The backend API code (`api/index.ts`) is secure and correctly patched. The defects are located strictly in the test suite fixture management and database concurrency isolation (`src/__tests__/backendApi.test.ts`).
- When run in complete serial isolation after a manual database purge with zero background tasks, tests can pass. However, a robust test suite must not rely on artificial global serialization or fragile static fixtures.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The core security fixes in `api/index.ts` and `schema_rollback.sql` are **APPROVED**.

However, **changes are requested on `src/__tests__/backendApi.test.ts`** to achieve hermetic test isolation:
1. **Dynamic Run-Scoped Device IDs**:
   Replace static `REAL_DEVICE_ID = 'nova-c3-5c20dc4239fca9ec'` with dynamically generated, run-isolated synthetic device IDs (e.g., `nova-c3-test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`), following the proven pattern in Priority 1 recovery tests. Pre-enroll their bootstrap credentials in `beforeAll` and clean them up in `afterAll`.
2. **Remove Unscoped Global Mutations in `beforeAll`**:
   Do not run global `DELETE FROM rate_limits` or global `UPDATE devices SET device_secret = NULL` across all devices. Scope all fixture operations strictly to the run's unique test device IDs.
3. **Hermetic Rate-Limiting Keys**:
   Ensure rate-limited endpoint tests supply distinct mock client IP addresses (via `x-forwarded-for: 198.51.100.${random}`) so they do not pollute the shared `127.0.0.1` rate-limit bucket.
4. **Resilient Active Key Synchronization**:
   In `Phase E: Device endpoints idempotency`, dynamically ensure the test device is actively authenticated rather than relying on stale in-memory closures.

---

## 5. Verification Method

To independently reproduce this failure and verify fixes:

```bash
# 1. Rollback & SQL Security Audit (PASSES 94/94)
node tests/e2e/security_audit.mjs

# 2. Adversarial Challenge Suite (PASSES 35/35)
npx vitest run tests/adversarial_phase_e_challenge.test.ts

# 3. Lint, Build, and Runner (PASSES)
npm run lint
npm run build
node tests/e2e/runner.mjs

# 4. Demonstrate Test Isolation Flaw: Run backendApi test suite
npx vitest run src/__tests__/backendApi.test.ts
# Observed failure: 9 failed tests with exit code 1
```

**Invalidation Condition**:
When `src/__tests__/backendApi.test.ts` is refactored with isolated, run-scoped synthetic fixtures and executes cleanly (64/64 pass, exit code 0) even under interleaved or concurrent execution, this request for changes is resolved.
