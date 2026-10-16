# Adversarial Security & Architecture Review Report: Phase E Backend & API Hardening

**Agent**: `reviewer_e2`  
**Role**: Adversarial Security Reviewer & Critic  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\reviewer_e2`  
**Authoritative Reference**: `PROJECT.md` & `ORIGINAL_REQUEST.md`  
**Worker Under Review**: `worker_backend_e3` (`worker_backend_e3/handoff.md`)  
**Verdict**: **REQUEST_CHANGES**  
**Timestamp**: 2026-10-16T08:10:00Z  

---

## 1. Observation

Direct code inspections, line numbers, and verification command executions:

### 1.1 `api/index.ts`
1. **Unauthenticated Device Claiming Bypass (`lines 1852–1872`)**:
   In `POST /api/v1/devices/claim`:
   ```typescript
   1809: const findSql = `
   1810:   SELECT ct.*, d.serial_number, d.hardware_model
   1811:   FROM claim_tokens ct
   1812:   JOIN devices d ON d.id = ct.device_id
   1813:   WHERE ct.token = $1 OR ct.short_code = $1;
   1814: `;
   1815: const tokens = await queryDb<ClaimTokenRecord & { serial_number: string; hardware_model: string }>(findSql, [cleanInput]);
   ...
   1852: } else {
   1853:   const possibleDevId = cleanInput.startsWith('nova-c3-') ? cleanInput : `nova-c3-${cleanInput}`;
   1854:   const devRows = await queryDb<DeviceRecord>(
   1855:     'SELECT id, serial_number, hardware_model FROM devices WHERE id = $1 OR id = $2',
   1856:     [cleanInput, possibleDevId]
   1857:   );
   1858:   if (devRows.length > 0) {
   1859:     resolvedDeviceId = devRows[0].id;
   1860:     resolvedSerial = devRows[0].serial_number;
   1861:     resolvedModel = devRows[0].hardware_model;
   ...
   1875: const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
   1878: `INSERT INTO pairing_sessions (id, device_id, claim_token, expires_at)
   1879:  VALUES ($1, $2, $3, $4);`,
   ...
   1884: const requestUserId = (req.body?.userId as string) || getHeader(req, 'x-nova-user-id');
   1885: if (requestUserId) {
   1888:   `INSERT INTO user_devices (user_id, device_id, label, is_primary)
   1889:    VALUES ($1, $2, 'My NOVA Keychain', TRUE)
   1890:    ON CONFLICT (user_id, device_id) DO UPDATE SET is_primary = TRUE;`,
   ```
   If a caller passes a raw `deviceId` (e.g. `nova-c3-5c20dc4239fca9ec`) instead of an unredeemed claim token or short code, the server resolves the device and issues a valid 30-day `pairing_session` (`sess_<hex>`) and links the device to whatever `userId` is passed in the request.

2. **Session Privilege Escalation (`lines 281–316`)**:
   In `getUserIdFromSession(token)`:
   ```typescript
   296: // 2. Fallback to pairing_sessions (if pairing session was bound to a device owned by user)
   297: try {
   298:   const pairSessRows = await queryDb<{ device_id: string }>(
   299:     'SELECT device_id FROM pairing_sessions WHERE id = $1 AND expires_at > NOW()',
   300:     [token]
   301:   );
   302:   if (pairSessRows.length > 0) {
   303:     const uDev = await queryDb<{ user_id: string }>(
   304:       'SELECT user_id FROM user_devices WHERE device_id = $1 LIMIT 1',
   305:       [pairSessRows[0].device_id]
   306:     );
   307:     if (uDev.length > 0) {
   308:       return uDev[0].user_id;
   309:     }
   310:   }
   ```
   A device-level `pairing_session` (which can be obtained by any attacker knowing a `deviceId` per observation 1.1.1) is accepted as an authenticated user session token for the user associated with that device in `user_devices`.

3. **Google ID Token Missing Audience (`aud`) Verification (`lines 989–1042`)**:
   In `POST /api/v1/auth/google`:
   ```typescript
   990: const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`);
   ...
   1002: const gData = await gRes.json() as {
   1003:   email?: string;
   1004:   email_verified?: string | boolean;
   1005:   name?: string;
   1006:   picture?: string;
   1007:   sub?: string;
   1008: };
   ```
   The tokeninfo endpoint is invoked and `email_verified` is checked, but the token's audience (`aud` or `azp` claim) is never verified against an expected `GOOGLE_CLIENT_ID`.

4. **Plaintext Session Token Storage (`lines 1068–1075`)**:
   ```typescript
   1068: const sessionToken = `usess_${crypto.randomBytes(24).toString('hex')}`;
   ...
   1071: `INSERT INTO user_sessions (id, user_id, expires_at)
   1072:  VALUES ($1, $2, $3)`
   ```
   The session token is stored directly in plaintext as the primary key of `user_sessions`, rather than storing a SHA-256 hash `hashToken(sessionToken)`.

5. **TLS CA Hardcoding for Non-Supabase Databases (`lines 89–105`)**:
   ```typescript
   93: if (!ca && (process.env.DATABASE_URL.includes('supabase.co') || isProduction)) {
   ...
   103:   ca = SUPABASE_ROOT_CA_2021;
   ```
   In any production environment where `isProduction === true` but `DATABASE_URL` is hosted on a non-Supabase provider (e.g. AWS RDS, GCP Cloud SQL, Azure), `SUPABASE_ROOT_CA_2021` is unconditionally injected as the only trusted CA, breaking TLS handshakes.

### 1.2 `schema.sql`
- Table 13 `user_sessions` is properly defined with `id VARCHAR(128) PRIMARY KEY`, `user_id` foreign key with `ON DELETE CASCADE`, and index on `user_id`.
- RLS is explicitly enabled and forced (`ENABLE ROW LEVEL SECURITY; FORCE ROW LEVEL SECURITY;`).
- All table permissions for `user_sessions` are revoked from `anon` and `authenticated`, allowing access only to `service_role`.
- Column-level SELECT on `devices` for the `authenticated` role excludes `device_secret` and `bootstrap_hash`.

### 1.3 `api/health.ts`
- HTTP defensive headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`) are verified.
- Database pool TLS handling mirrors `api/index.ts`.

### 1.4 Independent Command Execution Traces
- **Command 1: `npm run lint`**:
  ```
  Found 0 warnings and 0 errors.
  Finished in 71ms on 47 files with 116 rules using 8 threads.
  Exit code: 0
  ```
- **Command 2: `npm run build`**:
  ```
  ✓ 1937 modules transformed.
  dist/index.html                   4.55 kB │ gzip:   1.44 kB
  dist/assets/index-jNGx2VWV.css   15.36 kB │ gzip:   4.04 kB
  dist/assets/index-CBdSL1Ui.js   496.56 kB │ gzip: 149.35 kB
  ✓ built in 762ms
  Exit code: 0
  ```
- **Command 3: `node tests/e2e/runner.mjs`**:
  ```
  Test Files  24 passed (24)
       Tests  105 passed (105)
  [PASS] NOVA 1.0 E2E Test Suite passed successfully in 3.41s.
  VERDICT: TEST_READY (Exit code 0)
  ```
- **Command 4: `npx vitest run src/__tests__/backendApi.test.ts`**:
  ```
  Test Files  1 failed (1)
       Tests  30 failed | 34 passed (64)
    Duration  63.18s

  FAIL: POST /api/v1/devices/bootstrap registers real hardware with unique credential hash
  AssertionError: expected 409 to be 200 (BOOTSTRAP_ALREADY_USED)
  -> Cascaded into 401 UNAUTHORIZED across 25 dependent tests due to unset issuedDeviceKey & generatedClaimToken.
  FAIL: POST /api/v1/launch-signup validates email, enforces consent, and persists subscribers
  AssertionError: expected 429 to be 400 (RATE_LIMIT_EXCEEDED)
  FAIL: Priority 3: Notion OAuth rejects session mismatch (403 SESSION_MISMATCH)
  AssertionError: expected 500 to be 403
  ```
  *Refutation of claim*: Worker claimed 64/64 tests passed in `worker_backend_e3/handoff.md:152`. In independent execution, 30 tests failed due to non-repeatable fixture state and cross-test rate-limit contamination in PostgreSQL.

---

## 2. Logic Chain

1. **Attack Chain (Physical Pairing Bypass → Device Hijack → Account Impersonation)**:
   - *Observation 1.1.1*: `POST /api/v1/devices/claim` allows callers to submit a raw `deviceId` instead of a 15-minute OLED claim token.
   - *Observation 1.1.2*: `getUserIdFromSession(token)` accepts device `pairing_sessions` as user sessions and looks up `user_devices.user_id`.
   - *Logic*:
     1. Any remote attacker knowing a target device's ID (which is predictable, printed on hardware labels, or discoverable via MAC address) can call `/api/v1/devices/claim` with `{ claimToken: "nova-c3-5c20dc4239fca9ec" }`.
     2. The server generates a 30-day `pairing_session` (`sess_<hex>`) without physical possession of the device.
     3. If the victim user already has the device linked in `user_devices`, the attacker can present this `pairing_session` as a Bearer token to `GET /api/v1/user/devices`.
     4. `getUserIdFromSession` resolves the pairing session to the victim's `user_id`.
     5. The attacker successfully reads all devices and integration data belonging to the victim user, completely bypassing the IDOR safeguards built into `GET /api/v1/user/devices`.
     6. Alternatively, the attacker passes `{ claimToken: "nova-c3-5c20dc4239fca9ec", userId: "usr_attacker" }` to overwrite or co-link the device to their account (`ON CONFLICT DO UPDATE SET is_primary = TRUE`), hijacking the device association.

2. **Cross-Client Token Injection (OAuth Confused Deputy)**:
   - *Observation 1.1.3*: `POST /api/v1/auth/google` validates Google ID tokens against `tokeninfo`, but does not inspect `gData.aud`.
   - *Logic*:
     Google issues ID tokens for thousands of applications. If an attacker operates their own benign Google-authenticated app or website, they can induce a victim to log in. The attacker obtains the victim's Google ID token (with `email: victim@gmail.com` and `email_verified: true`, but `aud: attacker-app.apps.googleusercontent.com`). The attacker can forward this token to NOVA's `/api/v1/auth/google`. Because NOVA does not verify `aud === GOOGLE_CLIENT_ID`, it accepts the token and logs the attacker in as the victim.

3. **Test Suite Fragility & State Pollution**:
   - *Observation 1.4 Command 4*: In independent test execution, 30 of 64 tests failed.
   - *Logic*:
     `beforeAll` in `src/__tests__/backendApi.test.ts` resets `device_bootstrap_credentials.is_used = FALSE`, but does not clear `devices.device_secret` or device records that were populated in previous runs. When `POST /api/v1/devices/bootstrap` runs, line 1337 checks `existingDev[0].device_secret !== null` and aborts with `409 BOOTSTRAP_ALREADY_USED`. Because this test fails, `issuedDeviceKey` and `generatedClaimToken` remain unassigned, cascading into 25 subsequent 401/400 test failures. Additionally, rate-limit keys are not completely isolated for the launch-signup test, causing a 429 collision. The backend test suite is therefore brittle and non-repeatable.

4. **Integrity Assessment**:
   - The worker did not fabricate fake logic or mock facades for the tested paths; genuine crypto and database operations are implemented.
   - However, the implementation left a backdoor fallback in `devices/claim` and an unsafe privilege escalation in `getUserIdFromSession`.
   - Furthermore, the worker's attestation that all tests pass cleanly is invalidated by empirical verification.

---

## 3. Caveats

- Out-of-band physical attacks against the ESP32-C3 hardware or flash memory (JTAG/UART dump) were not evaluated, as this review is scoped to cloud backend API and database architecture.
- Outbound network access to `oauth2.googleapis.com` is required for live Google verification; unit tests mock `fetch` appropriately.
- No other caveats.

---

## 4. Conclusion

Verdict: **REQUEST_CHANGES**.

While `worker_backend_e3` successfully implemented Google ID token signature verification, strict RLS on `user_sessions`, and defensive HTTP headers, critical vulnerabilities and test failures remain:
1. **Critical Vulnerability**: Unauthenticated device claim bypass (`api/index.ts:1852-1872`) allows generating pairing sessions and account takeover via `getUserIdFromSession`.
2. **Major Vulnerability**: Privilege escalation in `getUserIdFromSession` converts device-scoped pairing sessions into user-scoped authentication sessions.
3. **Major Vulnerability**: Google OAuth token verification omits audience (`aud`) verification, enabling cross-client token injection.
4. **Major Quality / Reliability Finding**: `src/__tests__/backendApi.test.ts` has 30 failing tests in independent execution due to test fixture pollution and rate-limit spillover.

These issues must be resolved before Phase E can be approved.

---

## 5. Detailed Findings & Actionable Remediations

### Finding 1: [Critical — Security / IDOR Bypass] Physical Pairing Token Bypass in `POST /api/v1/devices/claim`
- **Location**: `api/index.ts:1852–1872`
- **Issue**: If `claim_tokens` lookup fails, the code falls back to querying `devices` table by `id = cleanInput`. This bypasses the 15-minute OLED claim token requirement and allows any remote actor knowing a `deviceId` to generate a 30-day `pairing_session` and associate the device with any user account.
- **Remediation**:
  Remove the `else` fallback completely. If `tokens.length === 0`, return `400 INVALID_CLAIM_CODE`. Requiring an unredeemed, unexpired `claim_tokens` record is non-negotiable for physical pairing security.

### Finding 2: [Major — Security / Privilege Escalation] Device Pairing Sessions Treated as User Identity in `getUserIdFromSession`
- **Location**: `api/index.ts:296–313`
- **Issue**: `getUserIdFromSession` falls back to querying `pairing_sessions` and joining to `user_devices`. A device-level pairing session should only authorize device operations (e.g. Wi-Fi vault management), NOT web user identity or account-level endpoints (`/api/v1/user/devices`).
- **Remediation**:
  Remove fallback #2 from `getUserIdFromSession`. User endpoints must strictly require a valid token from `user_sessions`.

### Finding 3: [Major — Security / Confused Deputy] Google OAuth Token Missing Audience (`aud`) Verification
- **Location**: `api/index.ts:989–1033`
- **Issue**: Google tokeninfo verifies that the token was signed by Google, but does not verify that it was intended for NOVA (`aud === process.env.GOOGLE_CLIENT_ID`).
- **Remediation**:
  When `process.env.GOOGLE_CLIENT_ID` is configured, verify that `gData.aud === process.env.GOOGLE_CLIENT_ID`. If mismatched, reject with `401 INVALID_CREDENTIALS: Token audience mismatch`.

### Finding 4: [Major — Test Reliability] Fixture Pollution & 30 Failing Tests in `src/__tests__/backendApi.test.ts`
- **Location**: `src/__tests__/backendApi.test.ts:28–63`
- **Issue**: Running `npx vitest run src/__tests__/backendApi.test.ts` produces 30 failures because `beforeAll` does not reset `devices.device_secret` and device state for test fixtures, causing `POST /devices/bootstrap` to return 409 `BOOTSTRAP_ALREADY_USED` and leaving dependent tokens unassigned. Additionally, rate-limit state in PostgreSQL causes 429 on signup tests.
- **Remediation**:
  Update `beforeAll` in `src/__tests__/backendApi.test.ts` to fully reset device secrets (`UPDATE devices SET device_secret = NULL, status = 'unprovisioned' WHERE id IN (...)`), clear rate limits, or use recovery bootstrap (`recovery: true`) so tests run repeatably and cleanly regardless of previous execution state.

### Finding 5: [Minor — Defense-in-Depth] Plaintext Storage of Session Tokens in `user_sessions`
- **Location**: `api/index.ts:1068–1075`
- **Issue**: `sessionToken` is stored in plaintext in `user_sessions.id`.
- **Remediation**:
  Store `hashToken(sessionToken)` in the database, and verify incoming session tokens via `hashToken(token)`.

### Finding 6: [Minor — Reliability] Inappropriate Supabase Root CA Forcing in Production
- **Location**: `api/index.ts:93–105` and `api/health.ts:88–100`
- **Issue**: Sets `ca = SUPABASE_ROOT_CA_2021` whenever `isProduction === true`, even if the database is hosted on AWS RDS or other standard Postgres providers.
- **Remediation**:
  Only set the fallback CA if `process.env.DATABASE_URL.includes('supabase.co')` or `process.env.DATABASE_URL.includes('pooler.supabase.com')`.

---

## 6. Verification Method

To verify these findings and confirm remediation:
1. **Reproduce Finding 1 (Claim Token Bypass)**:
   ```bash
   # Send claim request with raw device ID instead of claim token:
   curl -X POST http://localhost:3000/api/v1/devices/claim \
     -H "Content-Type: application/json" \
     -d '{"claimToken": "nova-c3-5c20dc4239fca9ec"}'
   # Vulnerable result: Returns 200 OK with pairingSessionId
   # Remediated result: Must return 400 INVALID_CLAIM_CODE
   ```
2. **Reproduce Finding 2 (User Account Impersonation via Pairing Session)**:
   ```bash
   # Send user devices request using pairing session from step 1:
   curl -X GET http://localhost:3000/api/v1/user/devices \
     -H "Authorization: Bearer sess_<from_step_1>"
   # Vulnerable result: Returns 200 OK with victim's user ID and devices
   # Remediated result: Must return 401 UNAUTHORIZED
   ```
3. **Verify Build & Tests After Remediation**:
   ```bash
   npm run lint
   npm run build
   npx vitest run src/__tests__/backendApi.test.ts
   node tests/e2e/runner.mjs
   ```
