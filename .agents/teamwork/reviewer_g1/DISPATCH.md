# Task Assignment: Phase G Reviewer 1 (System Integration & Hardware Code Review)

**Assigned Agent**: reviewer_g1
**Role**: Phase G Reviewer 1 (System Integration, Firmware FSM & Telemetry Review)
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\reviewer_g1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Worker Handoff Report**: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
**Firmware Codebase**: `C:\NOVA-IDF\nova_wake_test`
**Web Codebase**: `d:\Personal projects\nova`

## Review Scope & Instructions
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Review the Phase G deliverables:
   - Device-to-cloud HTTPS contracts in `api/index.ts` and `tests/e2e/fixtures/mockBackendServer.ts`.
   - Firmware FreeRTOS 9-state machine in `C:\NOVA-IDF\nova_wake_test\test\test_nova_fsm.py` (9/9 tests pass).
   - Partition scheme in `C:\NOVA-IDF\nova_wake_test\partitions.csv` (Dual OTA scheme: ota_0, ota_1, otadata).
   - COM5 serial communication readiness.
   - Truth-in-hardware telemetry validation (strictly `usb_5v`, no battery percentage).
   - Integration test suite `tests/phase_g_integration.test.ts`.
3. Execute independent verification commands:
   - `python test/test_nova_fsm.py` (or Python equivalent on Windows) in `C:\NOVA-IDF\nova_wake_test`
   - `npm run lint` in `d:\Personal projects\nova`
   - `npm run build` in `d:\Personal projects\nova`
   - `npx vitest run tests/phase_g_integration.test.ts`
   - `node tests/e2e/runner.mjs` (must pass 105/105 tests across Tiers 1-4)
4. Document your findings and write your review handoff report to:
   `d:\Personal projects\nova\.agents\teamwork\reviewer_g1\handoff.md`
   Explicitly state your verdict: **APPROVE** or **REQUEST_CHANGES**.
5. Send your verdict and summary via `send_message` to your parent orchestrator.

## 2026-10-16T09:53:56Z
You are reviewer_g1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\reviewer_g1
Your mission is to perform an independent code and architecture review of Phase G (System Integration & Hardware Validation).

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\reviewer_g1\DISPATCH.md
5. Firmware codebase: C:\NOVA-IDF\nova_wake_test

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Review the Phase G deliverables: firmware FSM (C:\NOVA-IDF\nova_wake_test\test\test_nova_fsm.py), dual OTA partitions in partitions.csv, COM5 communication parameters, device-to-cloud HTTPS contracts in api/index.ts, and truth-in-hardware power telemetry validation.
3. Run independent verification commands:
   - python test/test_nova_fsm.py (or Python 3 on Windows) in C:\NOVA-IDF\nova_wake_test
   - npm run lint in d:\Personal projects\nova
   - npm run build in d:\Personal projects\nova
   - npx vitest run tests/phase_g_integration.test.ts
   - node tests/e2e/runner.mjs
4. Write your review handoff report to:
   d:\Personal projects\nova\.agents\teamwork\reviewer_g1\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your parent orchestrator.
