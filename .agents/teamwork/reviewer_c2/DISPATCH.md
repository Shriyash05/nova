# Task Assignment: Phase C Security & RLS Code Review (Reviewer 2)

**Assigned Agent**: reviewer_c2
**Role**: Adversarial Security Reviewer
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\reviewer_c2
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Target Under Review**:
- `d:\Personal projects\nova\schema.sql` (Row Level Security on all 12 tables, permissions)
- `d:\Personal projects\nova\schema_rollback.sql` (Rollback safety and idempotency)
- `d:\Personal projects\nova\api\index.ts` (DB connection pool SSL validation and security headers)
- `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`

## Review Scope
1. Perform adversarial review: Look for edge cases, missing table policies, subtle bypasses in RLS policies (e.g. using `auth.uid()` vs `current_setting('request.jwt.claims', true)`), and unintended locks.
2. Verify that `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` applies to tables, sequences, and routines.
3. Verify that `api/index.ts` DB SSL settings do not break test execution or local dev while enforcing production security.
4. Run builds and tests (`npm run lint`, `npm run build`, `node tests/e2e/runner.mjs`).
5. Deliver verdict: `APPROVE` or `REQUEST_CHANGES` in `d:\Personal projects\nova\.agents\teamwork\reviewer_c2\handoff.md`.


## 2026-10-16T01:31:53Z
You are reviewer_c2, an Adversarial Security Reviewer.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\reviewer_c2
You MUST read the authoritative original request file first:
d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
Also read your task assignment at:
d:\Personal projects\nova\.agents\teamwork\reviewer_c2\DISPATCH.md

Your mission:
Adversarially review Phase C security implementations for bypasses, edge cases, privilege escalations, and rollback safety.
Run lint, build, and tests.
Deliver an explicit verdict (APPROVE or REQUEST_CHANGES) in d:\Personal projects\nova\.agents\teamwork\reviewer_c2\handoff.md.
Send a message to your orchestrator (conversation ID: e451ddc2-d7f0-4749-bf7f-ed93de42ccc6) when complete.
