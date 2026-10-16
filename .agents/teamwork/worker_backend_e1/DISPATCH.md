# Task Assignment: Phase E Backend & API Hardening Implementation

**Assigned Agent**: worker_backend_e1
**Role**: Backend, Cloud & Database Security Specialist / Worker
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\worker_backend_e1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Baseline Reports**:
- `d:\Personal projects\nova\.agents\teamwork\explorer_web_1\report.md`
- `d:\Personal projects\nova\.agents\teamwork\reviewer_c1\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Implementation Scope
1. **Patch Google Auth Bypass (`api/index.ts:814-870`)**:
   - Eliminate unauthenticated `req.body.email` fallback when `credential` is absent. Reject unauthenticated/unverified requests with HTTP 401 `INVALID_CREDENTIALS`.
2. **Patch User Device IDORs (`api/index.ts:883-897` & `api/index.ts:938-957`)**:
   - In `GET /api/v1/user/devices`: Reject unauthenticated `x-nova-user-id` or query param overrides. Enforce that the target user ID matches the authenticated caller's session token.
   - In `POST /api/v1/user/devices/link`: Require caller authorization matching `userId` or service role.
3. **Harden `api/health.ts`**:
   - Ensure database connection pool in `api/health.ts` uses the same secure TLS options and `parseSslCa()` / bundled CA certificate as `api/index.ts`.
4. **Idempotent Endpoints & Notion Resilience**:
   - Verify that `POST /api/v1/devices/heartbeat`, `POST /api/v1/devices/claim`, and `POST /api/v1/devices/bootstrap` are strictly idempotent.
5. **Execute Test Verification**:
   - `npm run lint` (0 errors)
   - `npm run build` (0 errors)
   - `node tests/e2e/runner.mjs` (all 105 tests pass)
   - `npx vitest run src/__tests__/backendApi.test.ts` (all tests pass)
   - Deliver `d:\Personal projects\nova\.agents\teamwork\worker_backend_e1\handoff.md`.


## 2026-10-16T02:38:04Z
[Message from parent e451ddc2-d7f0-4749-bf7f-ed93de42ccc6]:
Implement Phase E (Backend & API Hardening):
1. In api/index.ts (lines 814-870): Patch Google auth bypass. Remove the unauthenticated fallback where req.body.email is trusted when credential is absent. Require valid Google credential payload or return HTTP 401.
2. In api/index.ts (lines 883-897 & 938-957): Patch user device IDORs. Enforce that the target user ID matches the authenticated caller's session.
3. In api/health.ts: Harden DB connection pool options to match api/index.ts (parseSslCa, strict TLS verification).
4. Verify idempotency of device endpoints (/api/v1/devices/heartbeat, /api/v1/devices/claim, /api/v1/devices/bootstrap).
5. Run lint, build, and tests:
   - npm run lint
   - npm run build
   - node tests/e2e/runner.mjs
   - npx vitest run src/__tests__/backendApi.test.ts
6. Deliver handoff report to d:\Personal projects\nova\.agents\teamwork\worker_backend_e1\handoff.md.
7. Send a message to your orchestrator (conversation ID: e451ddc2-d7f0-4749-bf7f-ed93de42ccc6) when complete.
