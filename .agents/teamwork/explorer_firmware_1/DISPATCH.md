# Task Assignment: Firmware & Hardware Baseline Discovery

**Assigned Agent**: explorer_firmware_1
**Role**: Embedded Firmware and Hardware Specialist / Explorer
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\explorer_firmware_1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md

## Objective
Audit the entire firmware codebase located at `C:\NOVA-IDF\nova_wake_test`, hardware configuration on COM5 (ESP32-C3 Super Mini 4MB, SSD1306 128x64 OLED, MAX4466 microphone on GPIO1), ESP-IDF 6.1 build environment, WakeNet wn9s_hiesp model, audio acquisition pipeline, display driver, and task architecture.

## Scope of Investigation
1. Explore `C:\NOVA-IDF\nova_wake_test`: directory structure, `main/`, `components/`, `CMakeLists.txt`, `partitions.csv`, `sdkconfig*`.
2. Inspect hardware pin mappings and peripherals:
   - I2C pins for SSD1306 (SDA/SCL)
   - ADC / I2S / GPIO configuration for MAX4466 microphone on GPIO1 (16 kHz sampling)
   - Flash & RAM memory budget and partition scheme
   - WakeNet wake-word model `wn9s_hiesp` integration and memory requirements
3. Inspect current state machine, FreeRTOS tasks, priority assignments, stack sizes, and potential starvation/watchdog risks.
4. Evaluate build reproducibility with ESP-IDF 6.1 and test if COM5 is accessible / serial monitor capabilities.
5. Identify dead code, hardcoded credentials, mock routines, blocking delays, and heap thrashing risks.
6. Generate a clear KEEP / REFACTOR / REPLACE / REMOVE technical ledger for all firmware components.

## Output Deliverables
- `d:\Personal projects\nova\.agents\teamwork\explorer_firmware_1\report.md`: Detailed baseline discovery report with code references, exact file paths, pin maps, and architecture diagrams.
- `d:\Personal projects\nova\.agents\teamwork\explorer_firmware_1\handoff.md`: Self-contained handoff following Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).


## 2026-10-16T00:50:08Z
[Message from parent e451ddc2-d7f0-4749-bf7f-ed93de42ccc6]
Audit the entire firmware codebase at C:\NOVA-IDF\nova_wake_test, hardware configuration on COM5 (ESP32-C3 Super Mini 4MB, SSD1306 128x64 OLED, MAX4466 microphone on GPIO1), ESP-IDF 6.1 configuration, WakeNet wn9s_hiesp wake-word model, ADC/I2S audio sampling, display driver, FreeRTOS tasks, memory budgets, and current build integrity.
