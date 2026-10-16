# Task Assignment: Phase C Security & RLS Code Review (Reviewer 1)

**Assigned Agent**: reviewer_c1
**Role**: Security & Code Quality Reviewer
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\reviewer_c1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Target Under Review**:
- `d:\Personal projects\nova\schema.sql` (Row Level Security on all 12 tables, permissions)
- `d:\Personal projects\nova\schema_rollback.sql` (Rollback safety and idempotency)
- `d:\Personal projects\nova\api\index.ts` (DB connection pool SSL validation and security headers)
- `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`

## Review Scope
1. Examine `schema.sql` for complete RLS coverage across all 12 tables. Verify that `FORCE ROW LEVEL SECURITY` is applied, policies correctly isolate tenant data, and `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` completely closes the PostgREST anonymous API bypass.
2. Verify `schema_rollback.sql` can safely and idempotently undo all changes without data corruption.
3. Examine `api/index.ts` to verify `rejectUnauthorized: true` on PostgreSQL connection pool and verify security headers.
4. Run builds and tests (`npm run lint`, `npm run build`, `node tests/e2e/runner.mjs --tier=1`, `node tests/e2e/runner.mjs --tier=2`).
5. Deliver verdict: `APPROVE` or `REQUEST_CHANGES` in `d:\Personal projects\nova\.agents\teamwork\reviewer_c1\handoff.md`.


## 2026-10-16T01:31:53Z
You are reviewer_c1, a Security & Code Quality Reviewer.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\reviewer_c1
You MUST read the authoritative original request file first:
d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
Also read your task assignment at:
d:\Personal projects\nova\.agents\teamwork\reviewer_c1\DISPATCH.md

Your mission:
Review the Phase C security implementations in schema.sql, schema_rollback.sql, api/index.ts, and THREAT_MODEL_STRIDE.md.
Run lint, build, and tests (e.g. npm run lint, npm run build, node tests/e2e/runner.mjs).
Deliver an explicit verdict (APPROVE or REQUEST_CHANGES) in d:\Personal projects\nova\.agents\teamwork\reviewer_c1\handoff.md.
Send a message to your orchestrator (conversation ID: e451ddc2-d7f0-4749-bf7f-ed93de42ccc6) when complete.
