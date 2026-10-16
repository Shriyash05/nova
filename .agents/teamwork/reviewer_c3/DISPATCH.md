# Task Assignment: Phase C Security Remediation Review (Reviewer 3)

**Assigned Agent**: reviewer_c3
**Role**: Security Code Reviewer
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\reviewer_c3
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Target Under Review**:
- `d:\Personal projects\nova\schema.sql` (Check user_devices INSERT revocation, hash shielding, lock timeout)
- `d:\Personal projects\nova\schema_rollback.sql` (Check user_visible_devices drop, clean rollback)
- `d:\Personal projects\nova\api\index.ts` (Check parseSslCa, bundled cert fallback, TLS verification)
- `d:\Personal projects\nova\.env.example`
- `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`

## Review Mission
1. Confirm that `user_devices` `INSERT` permission is completely revoked from `authenticated` role and arbitrary device claiming via PostgREST is impossible.
2. Confirm that `devices` table raw `SELECT` is revoked from `authenticated` and `user_visible_devices` view strictly shields `device_secret` and `bootstrap_hash`.
3. Confirm that `schema.sql` and `schema_rollback.sql` contain `SET lock_timeout = '5s';` and automated ownership normalization.
4. Confirm `api/index.ts` DB SSL configuration cleanly handles Supabase root CAs without compromising TLS verification.
5. Run lint, build, and E2E tests (`npm run lint`, `npm run build`, `node tests/e2e/runner.mjs`).
6. Deliver verdict: `APPROVE` or `REQUEST_CHANGES` in `d:\Personal projects\nova\.agents\teamwork\reviewer_c3\handoff.md`.


## 2026-10-16T02:11:02Z
You are reviewer_c3, a Security Code Reviewer.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\reviewer_c3
You MUST read the authoritative original request file first:
d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
Also read your task assignment at:
d:\Personal projects\nova\.agents\teamwork\reviewer_c3\DISPATCH.md

Your mission:
Review the Phase C remediation changes in schema.sql, schema_rollback.sql, api/index.ts, and .env.example.
Verify that user_devices INSERT is revoked from authenticated, cryptographic hashes are shielded, ownership is normalized, and TLS CA verification is secure.
Run lint, build, and tests (npm run lint, npm run build, node tests/e2e/runner.mjs).
Deliver an explicit verdict (APPROVE or REQUEST_CHANGES) in d:\Personal projects\nova\.agents\teamwork\reviewer_c3\handoff.md.
Send a message to your orchestrator (conversation ID: e451ddc2-d7f0-4749-bf7f-ed93de42ccc6) when complete.
