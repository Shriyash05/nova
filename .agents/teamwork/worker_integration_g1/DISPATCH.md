# Task Assignment: Phase G End-to-End System Integration & Hardware Validation

**Assigned Agent**: worker_integration_g1
**Role**: System Integration, Embedded Hardware & QA Specialist / Worker
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Firmware Codebase**: `C:\NOVA-IDF\nova_wake_test`
**Web & API Codebase**: `d:\Personal projects\nova`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Integration Scope & Tasks
1. **Device-to-Cloud Integration Verification**:
   - Verify that firmware HTTPS client contracts (`PROJECT.md § 5.1`) align 1:1 with backend API endpoints in `api/index.ts`:
     - `POST /api/v1/devices/bootstrap`
     - `POST /api/v1/devices/heartbeat`
     - `POST /api/v1/devices/claim`
     - `POST /api/v1/devices/actions/sync`
     - `GET /api/v1/devices/:id/status`
     - `GET /api/v1/devices/:id/wifi-profiles`
   - Verify that power telemetry in heartbeat is strictly `"usb_5v"` or `"usb-c_5v"` (truth-in-hardware).
2. **Firmware & COM5 Hardware Validation**:
   - In `C:\NOVA-IDF\nova_wake_test`:
     - Run `python test/test_nova_fsm.py` to verify the 9-state FreeRTOS state machine (must pass 9/9).
     - Check firmware build readiness: inspect `CMakeLists.txt`, `main/main.c`, `main/nova_fsm.c`, `main/nova_net.c`.
     - Test COM5 port availability and serial communication.
3. **End-to-End Test Suite Execution**:
   - In `d:\Personal projects\nova`:
     - Run `node tests/e2e/runner.mjs` (must pass 105/105 tests across Tiers 1-4).
     - Run `node tests/e2e/security_audit.mjs` (must pass 94/94 checks).
     - Run `npm run lint` (0 errors) and `npm run build` (clean Vite 8 build).
4. **Comprehensive Integration Report**:
   - Deliver `d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md` with:
     - End-to-end device-to-cloud data flow trace.
     - COM5 serial telemetry & firmware FSM verification results.
     - Web setup pairing console integration verification.
     - Final WCAG 2.1 AA accessibility audit verification.
5. Send completion message via `send_message` to parent orchestrator.

## 2026-10-16T09:37:50Z
You are worker_integration_g1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1
Your mission is to execute Phase G (End-to-End System Integration & Hardware Validation) for the NOVA 1.0 Autonomous Multi-Agent Product Engineering Mission.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Your dispatch: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\DISPATCH.md
4. Firmware codebase: C:\NOVA-IDF\nova_wake_test

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. In C:\NOVA-IDF\nova_wake_test:
   - Run `python test/test_nova_fsm.py` (verify 9/9 FSM unit tests pass).
   - Check firmware build configuration, partitions.csv (dual OTA), and COM5 communication.
3. In d:\Personal projects\nova:
   - Verify device-to-cloud HTTPS contracts in api/index.ts.
   - Run `node tests/e2e/runner.mjs` (must pass 105/105 tests across Tiers 1-4).
   - Run `node tests/e2e/security_audit.mjs` (must pass 94/94 checks).
   - Run `npm run lint` and `npm run build`.
4. Compile a comprehensive integration report covering device-to-cloud sync, COM5 validation, and WCAG accessibility.
5. Deliver your report to:
   d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
6. Send completion message via send_message to your orchestrator.
