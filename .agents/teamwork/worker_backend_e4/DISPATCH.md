# Task Assignment: Phase E Remediation & Hardening Completion

**Assigned Agent**: worker_backend_e4
**Role**: Backend & Cloud Security Remediation Specialist / Worker
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\worker_backend_e4
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Verifier Reports**:
- `d:\Personal projects\nova\.agents\teamwork\reviewer_e1\handoff.md`
- `d:\Personal projects\nova\.agents\teamwork\reviewer_e2\handoff.md`
- `d:\Personal projects\nova\.agents\teamwork\challenger_e1\handoff.md`
- `d:\Personal projects\nova\.agents\teamwork\challenger_e2\handoff.md`
- `d:\Personal projects\nova\.agents\teamwork\auditor_e1\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Remediation Tasks
You must implement fixes for all 6 verified findings:

1. **Remove Unauthenticated Device Claim Fallback (`api/index.ts`)**:
   - In `POST /api/v1/devices/claim` (`api/index.ts:1852–1872`):
     Remove the `else` fallback that allowed raw `deviceId` lookup when claim token lookup fails.
     If `tokens.length === 0`, strictly return `400 INVALID_CLAIM_CODE`. Requiring an unredeemed OLED claim token/short code is mandatory for physical pairing security.
2. **Remove Pairing Session Elevation (`api/index.ts`)**:
   - In `getUserIdFromSession(token)` (`api/index.ts:296–313`):
     Remove fallback #2 that elevated device-level `pairing_sessions` to user identity.
     Web user session endpoints (`GET /api/v1/user/devices`, `POST /api/v1/user/devices/link`) must strictly require authenticated session tokens from `user_sessions`.
3. **Google OAuth Token Audience (`aud`) Validation (`api/index.ts`)**:
   - In `POST /api/v1/auth/google` (`api/index.ts:989–1040`):
     Validate `gData.aud` against `process.env.GOOGLE_CLIENT_ID`. If `process.env.GOOGLE_CLIENT_ID` is set and does not match `gData.aud`, return `401 INVALID_CREDENTIALS` (token audience mismatch).
4. **Update `schema_rollback.sql` and `tests/e2e/security_audit.mjs`**:
   - In `schema_rollback.sql`: Add rollback DDL for Table 13 `user_sessions`:
     ```sql
     DROP TABLE IF EXISTS user_sessions CASCADE;
     ```
   - In `tests/e2e/security_audit.mjs`:
     Update expected table count check to 13 tables (to match Table 13 `user_sessions`).
5. **Fix Static SQL Template String Scanner Warning (`api/index.ts`)**:
   - In `api/index.ts:1231` (inside `POST /api/v1/user/devices/link`), replace the string-interpolated query parameter `${effectiveUserId}@user.nova.local` with parameterized placeholder `$2` passed in the `queryDb` parameters array.
6. **Isolate Test Fixtures in `src/__tests__/backendApi.test.ts`**:
   - In `beforeAll` (and if needed `afterAll` / before test runs):
     Reset test devices: `UPDATE devices SET device_secret = NULL, status = 'unprovisioned' WHERE id IN ('nova-c3-5c20dc4239fca9ec', 'nova-c3-test-device-01');`
     Reset `device_bootstrap_credentials`: `UPDATE device_bootstrap_credentials SET is_used = FALSE;`
     Clear rate limits: `DELETE FROM rate_limits WHERE client_identifier LIKE '%127.0.0.1%' OR client_identifier LIKE '%test%';`
     Ensure test fixtures run deterministically and repeatably on EVERY run.
7. **Restrict Fallback CA in `api/index.ts` and `api/health.ts`**:
   - Only apply `SUPABASE_ROOT_CA_2021` if `DATABASE_URL` contains `supabase.co` or `pooler.supabase.com`.

## Verification Commands
Execute and confirm 100% pass:
1. `npm run lint` (0 warnings, 0 errors)
2. `npm run build` (0 errors)
3. `node tests/e2e/security_audit.mjs` (all checks pass)
4. `node tests/e2e/runner.mjs` (105/105 pass)
5. `npx vitest run src/__tests__/backendApi.test.ts` (all 64 tests pass repeatably)

Deliver your report to:
`d:\Personal projects\nova\.agents\teamwork\worker_backend_e4\handoff.md`
Send completion message via `send_message` to parent orchestrator.


## 2026-10-16T08:19:52Z
[Message from parent 5e4ae70f-bf0a-4e13-985b-f4457de8a2da]
You are worker_backend_e4.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\worker_backend_e4
Your mission is to execute the Phase E Remediation Iteration for the NOVA 1.0 Autonomous Multi-Agent Product Engineering Mission.
Scope & Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. In api/index.ts:
   - Remove unauthenticated raw deviceId fallback in POST /api/v1/devices/claim (lines 1852-1872).
   - Remove pairing session elevation fallback in getUserIdFromSession (lines 296-313).
   - Add Google OAuth aud verification against GOOGLE_CLIENT_ID in POST /api/v1/auth/google.
   - Replace template literal in queryDb arg with parameterized $2 in POST /api/v1/user/devices/link (line 1231).
   - Restrict Supabase root CA injection to Supabase database URLs.
3. In api/health.ts:
   - Restrict Supabase root CA injection to Supabase database URLs.
4. In schema_rollback.sql:
   - Add DROP TABLE IF EXISTS user_sessions CASCADE;
5. In tests/e2e/security_audit.mjs:
   - Update expected table count to 13 tables (to match Table 13 user_sessions).
6. In src/__tests__/backendApi.test.ts:
   - Harden beforeAll test fixture reset so all 64 backend tests pass repeatably on every run.
7. Run all verification commands:
   - npm run lint
   - npm run build
   - node tests/e2e/security_audit.mjs
   - node tests/e2e/runner.mjs
   - npx vitest run src/__tests__/backendApi.test.ts
8. Deliver handoff report to:
   d:\Personal projects\nova\.agents\teamwork\worker_backend_e4\handoff.md
9. Send completion message via send_message to your orchestrator.
