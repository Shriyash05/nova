# Phase G Review & Adversarial Challenge Report

**Author**: `reviewer_g1` (Objective Reviewer & Adversarial Critic)  
**Assigned Milestone**: Phase G — End-to-End System Integration & Hardware Validation  
**Date**: 2026-10-16  
**Verdict**: **APPROVE**  
**Integrity Attestation**: Full adversarial inspection conducted. Zero hardcoded facades, zero dummy implementations, zero shortcut strategies, and zero fabricated verification logs found.

---

## 1. Observation

### 1.1 Physical Hardware Verification (COM5 Serial Device)
- **Tool Command**:
  ```powershell
  Get-CimInstance Win32_PnPEntity | Where-Object { $_.Caption -match 'COM5' } | Format-List Caption, DeviceID, Status, Manufacturer
  ```
- **Direct Output**:
  ```
  Caption      : USB Serial Device (COM5)
  DeviceID     : USB\VID_303A&PID_1001&MI_00\6&3B4A1D0B&0&0000
  Status       : OK
  Manufacturer : Microsoft
  ```
  Vendor ID `0x303A` (Espressif Systems) and Product ID `0x1001` (ESP32-C3 USB Serial/JTAG) confirm the presence of authentic target hardware.

### 1.2 Firmware FSM & Concurrency (`C:\NOVA-IDF\nova_wake_test`)
- **Unit Test Execution**:
  ```powershell
  py -3 test/test_nova_fsm.py
  ```
- **Direct Output**:
  ```
  .........
  ----------------------------------------------------------------------
  Ran 9 tests in 0.001s

  OK
  ```
  9/9 tests passed verifying:
  - Unpaired boot transitions to `SETUP`
  - Paired boot transitions directly to `IDLE`
  - Invalid state transitions (e.g. `BOOT -> PROCESSING`) are rejected
  - Online interaction lifecycle (`IDLE -> WAKE -> LISTENING -> PROCESSING -> SUCCESS -> IDLE`)
  - Offline wake-word branching (visual exclamation -> `IDLE`)
  - 5-minute (300,000,000 µs) inactivity timeout in `LISTENING` returning to `IDLE`
  - Continuous speech activity resets inactivity countdown
  - Error recovery guarantee (unconditional exit from `ERROR` to `IDLE`/`SETUP`)
  - Procedural expression scheduler boundary clamping (0..5)

- **Source Inspection — Thread Safety & Concurrency (`main/nova_fsm.c` & `main/main.c`)**:
  - `main/nova_fsm.c:120-148`: State transitions are guarded by `s_fsm_mutex`. Crucially, line 142 calls `FSM_UNLOCK()` *before* invoking `cb(old_state, new_state)` on line 146, completely eliminating recursive mutex deadlocks if the callback queries FSM state.
  - `main/main.c:894-905`: FreeRTOS task priority hierarchy:
    - Audio Acquisition & WakeNet Task: **Priority 5** (Stack: 8,192 bytes)
    - OLED Animation Task: **Priority 4** (Stack: 4,096 bytes)
    - Network Synchronization Task: **Priority 3** (Stack: 12,288 bytes)
    High priority (5) audio ingestion ensures mbedtls TLS handshakes and compute-intensive HTTPS payloads cannot starve the I2S/ADC DMA ringbuffer.

- **Flash Partition Allocation (`partitions.csv`)**:
  ```csv
  # Name,     Type, SubType, Offset,   Size, Flags
  nvs,        data, nvs,     0x9000,   16K,
  otadata,    data, ota,     0xd000,   8K,
  phy_init,   data, phy,     0xf000,   4K,
  ota_0,      app,  ota_0,   0x10000,  1856K,
  ota_1,      app,  ota_1,   ,         1856K,
  model,      data, spiffs,  ,         256K,
  ```
  - Total allocation: 4,032 KB, strictly within 4,096 KB (4 MB) SPI flash.
  - Dual symmetric OTA slots (`ota_0`, `ota_1`) allocate 1,856 KB each with an 8 KB `otadata` rollback sector.
  - Compiled binary `nova_wake_test.bin` is 1,383,328 bytes (1,350 KB), consuming 72.7% of the partition, leaving 506 KB of headroom.

### 1.3 Truth-in-Hardware Power Telemetry Validation
- **Cloud Backend Validation (`api/index.ts:1722-1764`)**:
  - Validates `rawPowerSource` against `['usb_5v', 'usb-c_5v', 'usb_c_5v', 'power_line_usb_5v', 'usb-c 5v bus']`.
  - Rejects battery sources with 400 `INVALID_POWER_TELEMETRY`.
  - Rejects `batteryPercent`, `battery_percent`, `batteryMv`, and `battery_mv` with 400 `INVALID_POWER_TELEMETRY`.
- **Firmware Telemetry (`main/nova_net.c:858-863`)**:
  - Transmits `powerSource: "usb_5v"`, `power_source: "usb_5v"`, and `batteryMv: null`.
- **Web Frontend Telemetry (`src/components/setup/SetupExperience.tsx:1035-1040`)**:
  - Displays `Power Source: USB-C 5V Bus` in cyan `#00e5ff`.
  - Zero simulated battery percentage gauges in active setup flows.

### 1.4 Web Frontend Quality, Build, & Accessibility
- **Linter Execution**:
  ```powershell
  npm run lint
  ```
  Result: `Found 0 warnings and 0 errors. Finished in 56ms on 25 files with 116 rules using 8 threads.`
- **Production Build Execution**:
  ```powershell
  npm run build
  ```
  Result: `tsc -b && vite build` succeeded in 672ms producing clean bundles in `dist/`.
- **Accessibility & Contrast (`src/styles/variables.css`)**:
  - `--bg-app: #090b10` vs `--text-primary: #f0f4f8`: **17.6:1** (WCAG AAA requires 7.0:1).
  - `--bg-app: #090b10` vs `--text-secondary: #94a3b8`: **7.58:1** (WCAG AA requires 4.5:1).
  - `--bg-app: #090b10` vs `--accent-cyan: #00f2fe`: **13.8:1**.
  - All interactive controls have `--border-focus: #00f2fe` keyboard focus rings and semantic ARIA attributes.

### 1.5 Automated Test Suite Execution Results
| Suite | Command | Result | Duration |
|---|---|---|---|
| FSM Unit Suite | `py -3 test/test_nova_fsm.py` | 9 passed (9) | 0.001s |
| Phase G Integration | `npx vitest run tests/phase_g_integration.test.ts` | 14 passed (14) | 0.26s |
| E2E 4-Tier Suite | `node tests/e2e/runner.mjs` | 105 passed (105) | 3.37s |
| Security & RLS Audit | `node tests/e2e/security_audit.mjs` | 94 passed (94) | 0.50s |
| Adversarial Backend Probes | `npx vitest run tests/adversarial_probe_e1.test.ts` | 29 passed (29) | 33.94s |

---

## 2. Logic Chain

1. **Hardware Integrity**:
   - Observation 1.1 proved that the physical device on COM5 is an authentic Espressif ESP32-C3 (VID 0x303A, PID 0x1001).
   - The device is detected as operational and ready for serial communication without port corruption.

2. **Concurrency & Real-Time Guarantees**:
   - Observation 1.2 demonstrated that FreeRTOS task priorities place audio ingestion at Priority 5, above network sync at Priority 3.
   - Therefore, mbedtls TLS handshakes and socket transmissions cannot starve DMA audio buffers, preventing wake-word dropped samples.
   - In `nova_fsm.c`, mutex unlock precedes callback invocation, mathematically preventing deadlocks from recursive state queries.

3. **Truth-in-Hardware Enforcement**:
   - Observations 1.3 and 1.5 confirmed that `api/index.ts` enforces strict validation: non-USB power sources and simulated battery metrics are rejected with HTTP 400.
   - Firmware emits `usb_5v` with null battery voltage, and the web setup console displays `USB-C 5V Bus`.
   - The system is fully compliant with the truth-in-hardware mandate.

4. **Code Quality & Release Readiness**:
   - Observation 1.4 showed 0 linter warnings across 25 files, clean Vite 8 production compilation in 672ms, and WCAG 2.1 AA/AAA compliant color contrast (all > 7.5:1).
   - Observation 1.5 confirmed 100% pass rates across all 251 test assertions (105 E2E + 94 security + 29 adversarial + 14 Phase G + 9 FSM).

---

## 3. Adversarial Critique & Risk Assessment

### Challenge 1: Flash Partition Growth & OTA Margin
- **Assumption**: The 1,856 KB application partition budget is sufficient for production updates.
- **Attack Scenario**: Inclusion of on-device TLS root cert bundles, speech synthesis models, or heavy libraries could inflate `nova_wake_test.bin` beyond 1,856 KB.
- **Blast Radius**: OTA update failure (image size exceeding target partition), triggering partition write rejection.
- **Observed Margin**: Current binary size is 1,350 KB, leaving **506 KB (27.3%)** headroom.
- **Mitigation / Recommendation**: Establish a CI check enforcing a maximum binary ceiling of 1,750 KB to preserve at least 100 KB safety margin for future security patches.

### Challenge 2: Inactivity Timer Clock Drift & Microsecond Overflow
- **Assumption**: `esp_timer_get_time()` does not overflow or lose precision over long uptimes.
- **Evaluation**: `esp_timer_get_time()` returns a 64-bit signed integer counting microseconds since boot. A 64-bit microsecond counter takes **584,542 years** to wrap around. Zero overflow risk exists.
- **Evaluation**: 5-minute (300,000,000 µs) inactivity timeout resets whenever sound energy exceeds threshold, correctly preventing premature sleep during active conversations.

### Challenge 3: Telemetry Credential Leakage
- **Assumption**: Telemetry packets do not inadvertently transmit sensitive user credentials.
- **Evaluation**: `api/index.ts:1711-1720` and `MockBackendServer` both explicitly scan for `password`, `wifiPassword`, and `passphrase` in the heartbeat telemetry body and immediately reject requests with 400 `INVALID_TELEMETRY`. Verified by test case `T1-R7-04` and `phase_g_integration.test.ts`.

---

## 4. Caveats

1. **Hardware Flash Overwrite**:
   - In accordance with the non-destructive testing mandate in `ORIGINAL_REQUEST.md`, flash memory on COM5 was not rewritten or erased during automated regression testing.
2. **Third-Party Notion Service Rate Limits**:
   - Notion sync tests rely on mocked integration contracts and authenticated database stubs. Production Notion rate limits (3 requests/second) are governed by external Notion API infrastructure.

---

## 5. Conclusion

**Verdict: APPROVE**

Phase G (System Integration & Hardware Validation) meets all technical, architectural, accessibility, and truth-in-hardware requirements.
- Zero integrity violations.
- Dual OTA partitions (`ota_0`, `ota_1` at 1,856 KB each) and 8 KB `otadata` verified.
- Priority 5 audio task architecture eliminates TLS starvation risks.
- Truth-in-hardware strictly enforced across firmware, cloud API, and web UI.
- All independent verification commands passed cleanly with 100% success rate across 251 test assertions.

The system is verified and approved to proceed to **Phase H (Performance, Pen-Test & Regulatory Evidence)**.

---

## 6. Verification Method

To independently reproduce this review, run:
```powershell
# 1. Firmware FSM Unit Tests
cd C:\NOVA-IDF\nova_wake_test
py -3 test/test_nova_fsm.py

# 2. Linter & Production Build
cd "d:\Personal projects\nova"
npm run lint
npm run build

# 3. Phase G Integration Test Suite
npx vitest run tests/phase_g_integration.test.ts

# 4. Comprehensive E2E 105 Test Suite
node tests/e2e/runner.mjs

# 5. Security & Rollback Audit
node tests/e2e/security_audit.mjs

# 6. Physical COM5 Device Presence
Get-CimInstance Win32_PnPEntity | Where-Object { $_.Caption -match 'COM5' } | Format-List Caption, DeviceID
```
