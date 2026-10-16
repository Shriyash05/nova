# Review Handoff Report: Phase E Backend & API Hardening

**Reviewer**: `reviewer_e1`  
**Role**: High-Reliability Code Reviewer & Adversarial Critic  
**Date**: 2026-10-16T08:15:00Z  
**Target Milestone**: Phase E (Backend & API Hardening)  
**Parent / Caller**: `orchestrator_1` (`5e4ae70f-bf0a-4e13-985b-f4457de8a2da`)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Automated Verification Command Traces

1. **Linting Check (`npm run lint`)**:
   ```
   npm notice run nova@0.0.0 lint
   npm notice run oxlint src api
   Found 0 warnings and 0 errors.
   Finished in 116ms on 47 files with 116 rules using 8 threads.
   ```
   *Result*: **PASS**.

2. **Client & TypeScript Build (`npm run build`)**:
   ```
   npm notice run nova@0.0.0 build
   npm notice run tsc -b && vite build
   vite v8.3.4 building client environment for production...
   transforming...
   ✓ 1937 modules transformed.
   rendering chunks...
   computing gzip size...
   dist/index.html                   4.55 kB │ gzip:   1.44 kB
   dist/assets/index-jNGx2VWV.css   15.36 kB │ gzip:   4.04 kB
   dist/assets/index-CBdSL1Ui.js   496.56 kB │ gzip: 149.35 kB
   ✓ built in 1.54s
   ```
   *Result*: **PASS**.

3. **Complete 4-Tier E2E Regression Suite (`node tests/e2e/runner.mjs`)**:
   ```
   Test Files  24 passed (24)
        Tests  105 passed (105)
     Duration  1.63s
   --------------------------------------------------------------------------------
   [PASS] NOVA 1.0 E2E Test Suite passed successfully in 3.42s.
   VERDICT: TEST_READY (Exit code 0)
   ```
   *Result*: **PASS**.

4. **Phase E Isolated Tests (`npx vitest run src/__tests__/backendApi.test.ts -t "Phase E"`)**:
   ```
   ✓ src/__tests__/backendApi.test.ts (64 tests | 58 skipped) 22919ms
     ✓ Phase E: Google Auth strictly rejects unauthenticated raw email injection (401 INVALID_CREDENTIALS) 1518ms
     ✓ Phase E: Google Auth accepts cryptographically verified token and creates durable session 4239ms
     ✓ Phase E: User Device IDOR — GET /api/v1/user/devices strictly isolates device access 4149ms
     ✓ Phase E: User Device IDOR — POST /api/v1/user/devices/link enforces caller authorization 4637ms
     ✓ Phase E: api/health.ts sets strict defensive HTTP security headers 1648ms
     ✓ Phase E: Device endpoints idempotency — POST /api/v1/devices/heartbeat 2840ms
   Test Files  1 passed (1)
        Tests  6 passed | 58 skipped (64)
   ```
   *Result*: **PASS** in isolation.

5. **Full Backend Integration & Security Suite (`npx vitest run src/__tests__/backendApi.test.ts --no-file-parallelism`)**:
   ```
   FAIL src/__tests__/backendApi.test.ts > GET /api/v1/devices/:id/status marks device offline when heartbeat >90s stale
   AssertionError: expected 401 to be 200 (line 928)

   FAIL src/__tests__/backendApi.test.ts > Recovery claim-token generation preserves device identity, MAC, and serial number
   AssertionError: expected 401 to be 200 (line 953)

   FAIL src/__tests__/backendApi.test.ts > Raw device bearer keys and passwords never leak in ordinary status or profile responses
   AssertionError: expected 401 to be 200 (line 1029)

   FAIL src/__tests__/backendApi.test.ts > Phase E: Device endpoints idempotency — POST /api/v1/devices/heartbeat
   AssertionError: expected 401 to be 200 (line 1895)

   Test Files  1 failed (1)
        Tests  4 failed | 60 passed (64)
     Duration  132.84s
   ```
   *Result*: **FAIL (4 failures)**. Discrepancy noted against worker handoff claim of 64/64 passing.

---

### 1.2 Code Inspection Observations

1. **`api/index.ts:959–1085` (Google Authentication)**:
   - Raw `req.body.email` bypass was removed.
   - Enforces `fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential.trim()))`.
   - Requires `email_verified !== false` and valid email format.
   - Generates random session token `usess_<hex>` and inserts into `user_sessions`.
   - *Observation*: Google tokeninfo response field `aud` (audience / Google Client ID) is **not validated** against any server-configured client ID (`process.env.GOOGLE_CLIENT_ID` or `process.env.VITE_GOOGLE_CLIENT_ID`).

2. **`api/index.ts:1088–1248` (User Device Isolation & IDOR Defense)**:
   - `GET /api/v1/user/devices`: Requires `Bearer <sessionToken>`, resolves authenticated user ID via `getUserIdFromSession(token)`. Rejects non-matching custom user ID header (`x-nova-user-id`) or query param (`userId`) with `403 FORBIDDEN`. Hardens query to `WHERE ud.user_id = $1`.
   - `POST /api/v1/user/devices/link`: Validates session authentication or service role. Rejects attempts to associate devices to another user account with `403 FORBIDDEN`. Verifies target device existence prior to linking.

3. **`api/index.ts:15–124` & `api/health.ts:12–114` (TLS Pool Configuration & Defensive Headers)**:
   - `parseSslCa`: Handles raw PEM, unescapes `\n`, base64 decodes, and reads cert file paths.
   - Bundles `SUPABASE_ROOT_CA_2021` fallback for remote Supabase connection verification.
   - `api/health.ts` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

4. **`schema.sql:300–315, 449–453, 570–576, 884` (Database Schema & Permissions)**:
   - Table 13: `user_sessions (id VARCHAR(128) PRIMARY KEY, user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`.
   - `ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;`.
   - Explicit `service_role_all_user_sessions` policy granting full administrative permissions to `service_role`.
   - `REVOKE ALL ON user_sessions FROM authenticated;` and full public schema revocations from `anon`.

5. **`src/__tests__/backendApi.test.ts:1863–1879` (Phase E Heartbeat Test Fixture Coupling)**:
   - Lines 1864–1879:
     ```typescript
     let activeKey = issuedDeviceKey;
     if (!activeKey) {
       const bootRes = await simulateRequest({
         method: 'POST',
         url: '/api/v1/devices/bootstrap',
         body: {
           deviceId: REAL_DEVICE_ID,
           macAddress: REAL_MAC,
           bootstrapCredential: REAL_BOOTSTRAP_SECRET,
           recovery: true,
         },
       });
       if (bootRes.statusCode === 200) {
         activeKey = bootRes.body.data.deviceKey;
       }
     }
     ```
   - When the test file runs sequentially, `issuedDeviceKey` was initialized earlier in test 16/20, but intervening tests rotated or updated `devices.device_secret` in the shared database. Because `issuedDeviceKey` is a non-empty string, `if (!activeKey)` evaluates to `false`, causing the test to use the invalid stale key, returning 401 instead of 200.

---

## 2. Logic Chain

1. **Integrity Review**:
   - Direct inspection confirms NO hardcoded test results, facade bypasses, or mock flags in `api/index.ts` or `api/health.ts`. Database queries are parameterized and real.
   - However, the worker handoff report claimed all 64 tests in `src/__tests__/backendApi.test.ts` passed (`Tests 64 passed (64)`). Empirical re-execution revealed 4 test failures (60 passed, 4 failed).

2. **Security Vulnerability (OAuth Token Audience Confusion)**:
   - *Premise*: Google ID tokens are cryptographically signed by Google for a specific client application identifier (`aud`).
   - *Observation*: `api/index.ts` line 990 calls Google's tokeninfo endpoint, verifying that Google signed the token and that `email_verified === true`. It never checks `gData.aud`.
   - *Inference*: Any user who authenticates to ANY third-party application on the internet that uses Google Sign-In generates an ID token validly signed by Google with their email. If an attacker obtains this token or operates another Google OAuth app, they can present that foreign ID token to NOVA's `/api/v1/auth/google`. Because NOVA's backend does not check that `aud === process.env.GOOGLE_CLIENT_ID`, the backend will issue an authentic NOVA session token for the victim's email.
   - *Conclusion*: Missing audience validation represents a high-severity OAuth security gap.

3. **Test Reliability & Regression Failure**:
   - *Premise*: Phase E requires reliable automated verification gates without cascading state failures.
   - *Observation*: Test 64 (`Phase E: Device endpoints idempotency — POST /api/v1/devices/heartbeat`) and 3 earlier tests (lines 928, 953, 1029) fail with 401 when run in sequence because `issuedDeviceKey` becomes invalid during test execution, while the test assumes `issuedDeviceKey` remains valid or empty.
   - *Conclusion*: The test suite is not hermetic and fails execution against the live test database.

---

## 3. Caveats

- Outbound HTTPS connectivity to Google's OAuth endpoints (`oauth2.googleapis.com`) is required for live Google token verification in integration tests; the integration test suite successfully mocks `global.fetch` within `backendApi.test.ts:1666–1682`.
- Database tests run against the remote Supabase pooler on `aws-0-us-east-1.pooler.supabase.com`.

---

## 4. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

### Required Action Items:

1. **[Major Security] Enforce Audience (`aud`) Validation on Google OAuth ID Tokens**:
   - In `api/index.ts:989–1032`: Extract `gData.aud` from the tokeninfo response.
   - If `process.env.GOOGLE_CLIENT_ID` or `process.env.VITE_GOOGLE_CLIENT_ID` is configured, verify that `gData.aud` matches the expected client ID; reject mismatches with 401 `INVALID_CREDENTIALS`.
2. **[Major Reliability] Resolve Test State Coupling in `src/__tests__/backendApi.test.ts`**:
   - Fix the test fixture state leakage so that all 64 tests pass cleanly in sequence (`npx vitest run src/__tests__/backendApi.test.ts`).
   - In the Phase E heartbeat test (lines 1864–1879), do not rely on potentially stale `issuedDeviceKey`; obtain an active key via recovery bootstrap or refresh `activeKey` directly.
   - Fix lines 920, 951, and 1027 to ensure `issuedDeviceKey` remains synchronized with `devices.device_secret` throughout the test suite.
3. **[Minor Hygiene] Add Opportunistic Session Cleanup**:
   - Provide periodic pruning of expired `user_sessions` records (similar to `pruneExpiredRateLimits`) so expired sessions do not accumulate indefinitely.

---

## 5. Verification Method

To verify these findings:
```bash
# 1. Run lint and build (both pass)
npm run lint
npm run build

# 2. Run independent E2E runner (passes 105/105)
node tests/e2e/runner.mjs

# 3. Reproduce backend integration test failures (4 tests fail out of 64)
npx vitest run src/__tests__/backendApi.test.ts --no-file-parallelism
```

Invalidation Condition:
If `npx vitest run src/__tests__/backendApi.test.ts` passes with 64/64 tests passing on a clean run AND `aud` validation is enforced in `api/index.ts`, this verdict may be upgraded to **APPROVE**.
