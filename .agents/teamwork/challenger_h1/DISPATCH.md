# Dispatch: challenger_h1

**Milestone**: Phase H Gate — Performance, Security Regression & Multi-Jurisdiction Regulatory Matrix  
**Assigned Agent**: `challenger_h1`  
**Role**: Adversarial Red-Team & Penetration Challenger  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\challenger_h1`  
**Date**: 2026-10-16  

---

## Mandatory Reading
1. `ORIGINAL_REQUEST.md`: `d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Authoritative Specification: `d:\Personal projects\nova\PROJECT.md`
3. Worker Handoff: `d:\Personal projects\nova\.agents\teamwork\worker_compliance_h1\handoff.md`
4. Regulatory Matrix: `d:\Personal projects\nova\docs\REGULATORY_COMPLIANCE_MATRIX.md`

---

## Scope & Tasks
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Probe and stress-test the Phase H hardened codebase:
   - Power telemetry empty string: verify `{ power_source: "" }` returns HTTP 400 `INVALID_POWER_TELEMETRY` (cannot bypass validation).
   - Non-USB power sources (`battery`, `solar`, `lipo`) and fake battery metrics (0%, 85%, 100%, 4150mV) must return 400.
   - Forged Bearer tokens and missing device IDs on action sync.
   - SQL injection fuzzing in claim tokens and Wi-Fi credentials.
   - Run adversarial probe suites: `tests/adversarial_phase_g_probe.test.ts` and `tests/phase_h_performance_security.test.ts`.
3. Execute independent verification commands:
   - `npm run lint`
   - `npm run build`
   - `npx vitest run tests/phase_h_performance_security.test.ts`
   - `npx vitest run tests/adversarial_phase_g_probe.test.ts`
   - `node tests/e2e/runner.mjs`
4. Write your challenge report to:
   `d:\Personal projects\nova\.agents\teamwork\challenger_h1\handoff.md`
   State your verdict clearly: **APPROVE** or **REQUEST_CHANGES**.
5. Send your verdict via `send_message` to your parent orchestrator.


## 2026-10-16T12:40:31Z
sender: 5e4ae70f-bf0a-4e13-985b-f4457de8a2da
priority: MESSAGE_PRIORITY_HIGH

You are challenger_h1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\challenger_h1
Your mission is to empirically test and adversarially challenge Phase H power telemetry boundary rejection, Red-Team penetration vectors, and concurrency stress.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_compliance_h1\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\challenger_h1\DISPATCH.md

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Probe and stress-test:
   - Power telemetry empty string: verify that { power_source: "" } returns HTTP 400 INVALID_POWER_TELEMETRY (cannot bypass validation).
   - Non-USB power sources (battery, solar, lipo) and fake battery metrics (0, 85, 100, 4150mV) must return 400.
   - Forged Bearer tokens and missing device IDs on action sync.
   - SQL injection fuzzing in claim tokens and Wi-Fi credentials.
   - High-concurrency request floods.
3. Run verification commands:
   - npm run lint
   - npm run build
   - npx vitest run tests/phase_h_performance_security.test.ts
   - npx vitest run tests/adversarial_phase_g_probe.test.ts
   - node tests/e2e/runner.mjs
4. Write your challenge report to:
   d:\Personal projects\nova\.agents\teamwork\challenger_h1\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your parent orchestrator.
