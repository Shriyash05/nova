# Task Assignment: Phase C Security Remediation (Iteration 2)

**Assigned Agent**: worker_security_c2
**Role**: Security, Database & Infrastructure Specialist / Worker
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\worker_security_c2
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Gate Feedback Reference**:
- `d:\Personal projects\nova\.agents\teamwork\orchestrator_1\GATE_STATUS.md`
- `d:\Personal projects\nova\.agents\teamwork\reviewer_c2\handoff.md`
- `d:\Personal projects\nova\.agents\teamwork\challenger_c1\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Remediation Objectives (Phase C Iteration 2)
1. **Fix `user_devices` IDOR Vulnerability**:
   - In `schema.sql`, REVOKE `INSERT` on `user_devices` from `authenticated`.
   - Remove the unsafe `user_devices_insert_policy` that permitted authenticated users to insert arbitrary `device_id`s. Device linking MUST exclusively occur via server-side endpoints (`service_role` via `/api/v1/devices/claim`).
2. **Shield Cryptographic Hashes on `devices`**:
   - In `schema.sql`, revoke direct table SELECT on `devices` from `authenticated` role, OR create a safe view `user_visible_devices` (`id`, `device_id`, `device_name`, `device_status`, `wifi_ssid`, `last_seen_at`) that completely omits `device_secret`, `bootstrap_hash`, and internal secrets.
3. **Table Ownership Normalization & Migration Safety**:
   - In `schema.sql` and `schema_rollback.sql`, add `SET lock_timeout = '5s';` before schema alterations.
   - Add explicit instructions / commands to normalize table ownership to `postgres` (or active connection role).
4. **Production DB Pool TLS & CA Support in `api/index.ts`**:
   - Ensure `getPool()` in `api/index.ts` cleanly verifies TLS certificates, loads `DATABASE_SSL_CA` when provided (support multiline PEM or base64), and provides clear configuration in `.env.example`.
5. **Update `schema_rollback.sql` and `milestone_c/THREAT_MODEL_STRIDE.md`**:
   - Keep rollback script and threat model 100% synchronized with all policy changes.
6. **Execute Verification**:
   - Run `npm run lint`, `npm run build`, and `node tests/e2e/runner.mjs`. Verify 100% pass across all tiers.
   - Deliver handoff report to `d:\Personal projects\nova\.agents\teamwork\worker_security_c2\handoff.md`.

## 2026-10-16T01:50:04Z
You are worker_security_c2, a Security, Database & Infrastructure Specialist / Worker.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\worker_security_c2
You MUST read the authoritative original request file first:
d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture index at:
d:\Personal projects\nova\PROJECT.md
Also read your task assignment and gate feedback at:
d:\Personal projects\nova\.agents\teamwork\worker_security_c2\DISPATCH.md
d:\Personal projects\nova\.agents\teamwork\orchestrator_1\GATE_STATUS.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Remediate the 4 security findings identified in Phase C Gate check:
1. In schema.sql: Revoke INSERT on user_devices from authenticated role. Remove user_devices_insert_policy so arbitrary device linking via PostgREST is blocked. Linking is strictly service_role server-side.
2. In schema.sql: Shield cryptographic hashes on devices. Prevent direct PostgREST access to device_secret / bootstrap_hash.
3. In schema.sql & schema_rollback.sql: Add SET lock_timeout = '5s' and table ownership normalization.
4. In api/index.ts & .env.example: Support DATABASE_SSL_CA and ensure TLS verification is robust.
5. Update schema_rollback.sql and THREAT_MODEL_STRIDE.md.
6. Run npm run lint, npm run build, and node tests/e2e/runner.mjs.
7. Deliver handoff report to d:\Personal projects\nova\.agents\teamwork\worker_security_c2\handoff.md.
8. Send a message to your orchestrator (conversation ID: e451ddc2-d7f0-4749-bf7f-ed93de42ccc6) when complete.
