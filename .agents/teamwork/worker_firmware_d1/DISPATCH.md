# Task Assignment: Phase D Embedded Firmware Hardening Implementation

**Assigned Agent**: worker_firmware_d1
**Role**: Embedded Firmware and Hardware Specialist / Worker
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\worker_firmware_d1
**Firmware Codebase**: C:\NOVA-IDF\nova_wake_test
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Architecture & Specifications**:
- `d:\Personal projects\nova\PROJECT.md`
- `d:\Personal projects\nova\.agents\teamwork\milestone_b\AUTHORITATIVE_FSM.md`
- `d:\Personal projects\nova\.agents\teamwork\milestone_b\OLED_ANIMATION_ENGINE.md`
- `d:\Personal projects\nova\.agents\teamwork\explorer_firmware_1\report.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Implementation Scope
1. **Starvation-Free Task Architecture in `main/main.c`**:
   - Decouple audio DMA sampling and WakeNet inference from `app_main` into a dedicated FreeRTOS task `audio_wakenet_task` running at **Priority 5** (Stack: 8,192 bytes).
   - Expand continuous ADC DMA ring buffer to 16,384 bytes.
   - Run `oled_task` at Priority 4 (non-blocking procedural frame rendering with dirty-page flushing).
   - Run `net_sync_task` at Priority 3.
2. **Honest Telemetry**:
   - In `main/main.c:663`, eliminate the hardcoded 4150mV battery claim. Report line power status (`POWER_LINE_USB_5V` or bus power).
3. **Voice Audio Ingestion**:
   - In `main/nova_voice.c`, replace the `return NOVA_VOICE_UNAVAILABLE;` stub with authentic audio sample buffering and state trigger transitioning to `PROCESSING` and triggering backend sync.
4. **Partition Table Modernization**:
   - In `partitions.csv`, modernize the layout to include dual OTA slots (`ota_0`, `ota_1`, `otadata`) and shrink model partition to fit the 123KB `wn9s_hiesp` model.
5. **Dead Code Elimination**:
   - Safely remove unused `main/nova_app.c` and `main/main_wake_backup.c`.
6. **Compile & Verification**:
   - Execute clean build under ESP-IDF 6.1 (`idf.py build`).
   - Run Python FSM regression test suite (`test/test_nova_fsm.py`).
   - Run non-destructive interrogation on COM5 if available.
   - Document all outputs in `d:\Personal projects\nova\.agents\teamwork\worker_firmware_d1\handoff.md`.

## 2026-10-16T02:20:44Z
You are worker_firmware_d1, an Embedded Firmware and Hardware Specialist / Worker.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\worker_firmware_d1
Firmware codebase: C:\NOVA-IDF\nova_wake_test

You MUST read the authoritative original request file first:
d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture index at:
d:\Personal projects\nova\PROJECT.md
Also read your task assignment at:
d:\Personal projects\nova\.agents\teamwork\worker_firmware_d1\DISPATCH.md
Also review specifications:
d:\Personal projects\nova\.agents\teamwork\milestone_b\AUTHORITATIVE_FSM.md
d:\Personal projects\nova\.agents\teamwork\milestone_b\OLED_ANIMATION_ENGINE.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Phase D (Embedded Firmware Hardening):
1. Task Priority Architecture in main/main.c:
   - Move audio DMA sampling and WakeNet inference into a dedicated FreeRTOS task at Priority 5 (Stack: 8,192 bytes).
   - Expand continuous ADC DMA ring buffer to 16,384 bytes.
   - Run oled_task at Priority 4 (non-blocking procedural frame rendering with dirty-page flushing).
   - Run net_sync_task at Priority 3.
2. Remove hardcoded 4150mV battery telemetry in main/main.c:663 and report bus line power status (POWER_LINE_USB_5V).
3. Replace mock stub in main/nova_voice.c with authentic audio buffering and speech completion trigger.
4. Update partitions.csv with dual OTA partitions (ota_0, ota_1, otadata) and sized model partition.
5. Prune dead code: delete main/nova_app.c and main/main_wake_backup.c.
6. Verify clean build with ESP-IDF 6.1 (idf.py build).
7. Run python test/test_nova_fsm.py.
8. Execute non-destructive serial check on COM5 if available.
9. Deliver handoff report to d:\Personal projects\nova\.agents\teamwork\worker_firmware_d1\handoff.md.
10. Send a message to your orchestrator (conversation ID: e451ddc2-d7f0-4749-bf7f-ed93de42ccc6) when complete.
