# Task Assignment: Phase E Adversarial Verification (Challenger 1)

**Assigned Agent**: challenger_e1
**Role**: Adversarial Correctness & Security Verifier
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\challenger_e1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Worker Handoff Report**: `d:\Personal projects\nova\.agents\teamwork\worker_backend_e3\handoff.md`

## Mission
Empirically stress-test and challenge the Phase E Backend hardening:
1. Google OAuth flow: probe with malformed tokens, expired tokens, unverified email claims, empty payloads, SQL injection in credentials, oversized inputs.
2. User Device IDOR protection: probe `GET /api/v1/user/devices` and `POST /api/v1/user/devices/link` with spoofed `x-nova-user-id`, cross-user session tokens, invalid session tokens, URL-encoded parameter pollution.
3. Heartbeat endpoint: probe `/api/v1/devices/heartbeat` for idempotency under concurrent/repeated calls.
4. Run commands to verify:
   - `npm run lint`
   - `npm run build`
   - `node tests/e2e/runner.mjs`
5. Deliver handoff report to:
   `d:\Personal projects\nova\.agents\teamwork\challenger_e1\handoff.md`
   with your empirical verdict: **APPROVE** (robust) or **REQUEST_CHANGES** (vulnerabilities found).
6. Send your verdict via `send_message` to parent orchestrator.


## 2026-10-16T07:58:09Z
You are challenger_e1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\challenger_e1
Your mission is to empirically test and challenge the Phase E Backend Hardening implementation.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_backend_e3\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\challenger_e1\DISPATCH.md

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Probe and stress-test the Google Auth flow, User Device IDOR protection, and device heartbeat idempotency with adversarial inputs, edge cases, and invalid payloads.
3. Run verification commands:
   - npm run lint
   - npm run build
   - node tests/e2e/runner.mjs
4. Write your report to:
   d:\Personal projects\nova\.agents\teamwork\challenger_e1\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your orchestrator.
