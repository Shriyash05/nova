# Task Assignment: Phase C Security & Data-Integrity Foundations Implementation

**Assigned Agent**: worker_security_c1
**Role**: Security, Database & Infrastructure Specialist / Worker
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\worker_security_c1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Baseline Reports**:
- `d:\Personal projects\nova\.agents\teamwork\explorer_security_compliance_1\report.md`
- `d:\Personal projects\nova\.agents\teamwork\explorer_web_1\report.md`
- `d:\Personal projects\nova\.agents\teamwork\milestone_b\DESIGN_DEBATE.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Phase C (Security & Data-Integrity Foundations):
1. Harden `d:\Personal projects\nova\schema.sql` by applying Row Level Security (RLS) across all 12 tables and revoking `anon` role privileges.
2. Provide a verified, idempotent rollback plan in `d:\Personal projects\nova\schema_rollback.sql`.
3. Harden database connection pool in `d:\Personal projects\nova\api/index.ts` to enforce TLS certificate verification.
4. Deliver comprehensive STRIDE/DREAD Threat Model documentation in `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`.
5. Run tests, linter (`npm run lint`), build (`npm run build`), and verify E2E security tests pass (`node tests/e2e/runner.mjs --tier=1`, `node tests/e2e/runner.mjs --tier=2`).

## Write Ownership
- `d:\Personal projects\nova\schema.sql`
- `d:\Personal projects\nova\schema_rollback.sql`
- `d:\Personal projects\nova\api/index.ts` (specifically line 17 DB SSL pool config and security headers)
- `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`

## Deliverables
- Fully hardened `schema.sql` with RLS policies and `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;`
- Tested `schema_rollback.sql`
- Updated `api/index.ts`
- `d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md`
- `d:\Personal projects\nova\.agents\teamwork\worker_security_c1\handoff.md` with build/test outputs.


## 2026-10-16T01:15:49Z
[Message] timestamp=2026-10-16T01:15:49Z sender=e451ddc2-d7f0-4749-bf7f-ed93de42ccc6 priority=MESSAGE_PRIORITY_HIGH
Content:
You are worker_security_c1, a Security, Database & Infrastructure Specialist / Worker.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\worker_security_c1
You MUST read the authoritative original request file first:
d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture index at:
d:\Personal projects\nova\PROJECT.md
Also read your task assignment at:
d:\Personal projects\nova\.agents\teamwork\worker_security_c1\DISPATCH.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Phase C (Security & Data-Integrity Foundations):
1. Harden d:\Personal projects\nova\schema.sql:
   - Add ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY; for all 12 tables.
   - Define explicit, secure RLS policies for authenticated service roles, device tokens, and users.
   - Add REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon; to close PostgREST bypass.
2. Provide a verified, idempotent rollback plan in d:\Personal projects\nova\schema_rollback.sql.
3. Harden DB connection pool in d:\Personal projects\nova\api\index.ts (SSL certificate verification).
4. Create the comprehensive STRIDE / DREAD threat model document in d:\Personal projects\nova\.agents\teamwork\milestone_c\THREAT_MODEL_STRIDE.md.
5. Run build and tests (e.g. `npm run lint`, `npm run build`, `node tests/e2e/runner.mjs --tier=1`) and document all execution results in your handoff.
6. Write your handoff to d:\Personal projects\nova\.agents\teamwork\worker_security_c1\handoff.md.
7. Send a message to your orchestrator (conversation ID: e451ddc2-d7f0-4749-bf7f-ed93de42ccc6) when complete.
