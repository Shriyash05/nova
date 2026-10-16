# Task Assignment: Phase G Challenger 1 (Hardware Telemetry & FSM Adversarial Prober)

**Assigned Agent**: challenger_g1
**Role**: Phase G Challenger 1 (Adversarial Hardware & FSM Concurrency Prober)
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\challenger_g1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Worker Handoff Report**: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
**Firmware Codebase**: `C:\NOVA-IDF\nova_wake_test`
**Web Codebase**: `d:\Personal projects\nova`

## Mission & Instructions
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Adversarially probe and stress-test:
   - Firmware FSM transitions under rapid events, repeated wake triggers, and error recovery (`C:\NOVA-IDF\nova_wake_test\test\test_nova_fsm.py`).
   - Hardware telemetry rejection: verify that fake battery percentages or non-USB power values sent to `/api/v1/devices/heartbeat` are strictly rejected with 400.
   - Dual OTA partition bounds and memory layout in `partitions.csv`.
3. Execute independent verification commands:
   - `python test/test_nova_fsm.py` in `C:\NOVA-IDF\nova_wake_test`
   - `npx vitest run tests/phase_g_integration.test.ts`
   - `node tests/e2e/runner.mjs` (105/105 tests across Tiers 1-4)
4. Write your adversarial challenge report to:
   `d:\Personal projects\nova\.agents\teamwork\challenger_g1\handoff.md`
   State your verdict clearly: **APPROVE** or **REQUEST_CHANGES**.
5. Send your verdict via `send_message` to your parent orchestrator.


## 2026-10-16T09:53:57Z
You are challenger_g1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\challenger_g1
Your mission is to empirically test and adversarially challenge Phase G hardware telemetry, FSM transitions, and partition boundaries.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\challenger_g1\DISPATCH.md
5. Firmware codebase: C:\NOVA-IDF\nova_wake_test

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Probe and stress-test:
   - Run python test/test_nova_fsm.py in C:\NOVA-IDF\nova_wake_test (verify 9/9 tests pass).
   - Test power telemetry boundary conditions: verify that invalid power sources or fake battery numbers are rejected with 400 INVALID_POWER_TELEMETRY.
   - Verify dual OTA flash partition sizing in partitions.csv.
3. Run verification commands:
   - npx vitest run tests/phase_g_integration.test.ts
   - node tests/e2e/runner.mjs
4. Write your challenge report to:
   d:\Personal projects\nova\.agents\teamwork\challenger_g1\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your parent orchestrator.
