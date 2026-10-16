# NOVA 1.0 — Test Infrastructure & E2E Validation Architecture (`TEST_INFRA.md`)

## 1. Executive Summary & Test Philosophy

This document defines the authoritative, opaque-box, requirement-driven End-to-End (E2E) test infrastructure for **NOVA 1.0** (Keychain Ambient Voice Assistant). 

The test harness is designed according to three non-negotiable principles:
1. **Opaque-Box Requirement Verification**: Test assertions are derived strictly from `ORIGINAL_REQUEST.md`, `API_CONTRACT.md`, and regulatory/hardware constraints. Tests verify observable external interfaces, data structures, protocol transitions, and exit codes rather than private internal implementation details.
2. **Deterministic Independence & Isolation**: Each test case provisions its own isolated fixtures, resets state, and cleans up after itself. Tests never rely on execution ordering or fragile shared state.
3. **4-Tier Depth & Rigor**: Validation is organized into four progressive tiers providing 100% coverage across Requirements R1 through R9.

---

## 2. The 4-Tier Test Architecture

```
+-----------------------------------------------------------------------------------+
|                        NOVA 1.0 E2E TEST ARCHITECTURE                             |
+-----------------------------------------------------------------------------------+
|  TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 Complex Full-Lifecycle Journeys)   |
|  - Out-of-Box Experience (OOBE)  - Voice Capture to Cloud Sync Loop                |
|  - Network Disruption & Recovery  - 5-Minute Inactivity & Power Cycle              |
|  - Adversarial Tamper & Penetration Defense Journey                               |
+-----------------------------------------------------------------------------------+
|  TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS (10 Interaction Matrices)            |
|  - WakeNet + OLED FSM            - Wi-Fi Reconnect + Notion OAuth Recovery        |
|  - Pairing Wizard + Credential    - SoftAP Guard + IDOR Authorization Barrier     |
|  - Inactivity Timeout + Sleep     - Device Key Rotation + Hardware Persistence    |
|  - Profile Compact + Voice Slots - Production Build + Zero Secret Leakage         |
|  - Threat Rate Limit + Backend   - Regulatory RF Bounds + Hardware Ledger         |
+-----------------------------------------------------------------------------------+
|  TIER 2: BOUNDARY & CORNER CASES (>=5 per feature R1-R9; 45 Stress Cases)         |
|  - R1: Config corruption, symlinks, missing sections, sensitive string patterns   |
|  - R2: Illegal state transitions, concurrent event race, unknown event codes      |
|  - R3: 0x0 / 127x63 pixel clipping, frame overrun, empty buffers, QR limits      |
|  - R4: 300,000ms edge, 16001Hz drift, 0-byte audio, -95dBm RSSI, flash partition |
|  - R5: SSID 32B limit, 63B password, voice slot 5 overflow, special chars         |
|  - R6: Clock skew, AES-GCM tag mismatch, 0-byte payload, pool exhaustion         |
|  - R7: Header SQLi, path traversal in deviceId, claim race, rotated key replay    |
|  - R8: 2483.5MHz band-edge, DPDP erasure boundary, BIS limits, RoHS threshold     |
|  - R9: Empty export tree-shake, circular imports, mock leakage in production      |
+-----------------------------------------------------------------------------------+
|  TIER 1: FEATURE COVERAGE (>=5 per feature R1-R9; 45 Functional Core Cases)       |
|  - R1: Baseline Discovery & Technical Ledger (5 tests)                            |
|  - R2: Multi-Agent Design Debate & FSM State Machine (5 tests)                    |
|  - R3: 128x64 OLED Animation Engine & Primitives (5 tests)                        |
|  - R4: Embedded Firmware Hardening (ESP32-C3 / ESP-IDF 6.1) (5 tests)             |
|  - R5: Web Platform & Customer Experience (5 tests)                               |
|  - R6: Hardened Backend & Data Architecture (5 tests)                             |
|  - R7: Security Threat Model & Red-Team Audit (5 tests)                           |
|  - R8: Regulatory Compliance & Commercial Readiness (5 tests)                     |
|  - R9: Dependency Pruning & Dead Code Elimination (5 tests)                       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Requirement Inventory & Traceability Matrix

| Req | Domain & Description | Tier 1 Tests | Tier 2 Tests | Tier 3 Pairs | Tier 4 Scenarios | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **R1** | Real Baseline Discovery & Technical Ledger | 5 | 5 | 2 | 2 | 14 |
| **R2** | Adversarial Multi-Agent Design Competition & FSM | 5 | 5 | 2 | 2 | 14 |
| **R3** | Industrial Design & 128×64 OLED Animation Engine | 5 | 5 | 2 | 3 | 15 |
| **R4** | Embedded Firmware Hardening (ESP32-C3 / ESP-IDF 6.1) | 5 | 5 | 5 | 4 | 19 |
| **R5** | Customer Experience & Modern Web Platform | 5 | 5 | 3 | 3 | 16 |
| **R6** | Hardened Backend & Data Architecture | 5 | 5 | 4 | 4 | 18 |
| **R7** | Security Threat Model & Red-Team Audit | 5 | 5 | 3 | 3 | 16 |
| **R8** | Regulatory Compliance & Commercial Readiness Matrix | 5 | 5 | 2 | 1 | 13 |
| **R9** | Dependency Pruning & Dead Code Elimination | 5 | 5 | 2 | 1 | 13 |
| **Total** | **Comprehensive Full-System Coverage** | **45** | **45** | **10** | **5** | **105** |

---

## 4. Test Suite Structure & Layout

The E2E test suite is located in `tests/e2e/`:

```
tests/e2e/
├── runner.mjs                         # Standalone zero-dependency executable test runner
├── run_tests.ps1                      # Windows PowerShell automated execution wrapper
├── fixtures/
│   ├── mockBackendServer.ts           # In-memory hermetic HTTP server for offline testing
│   ├── testLedgers.ts                 # Authoritative hardware/subsystem ledger specifications
│   └── mockFirmwareDevice.ts          # Virtual ESP32-C3 hardware emulator for protocol tests
├── tier1_features/
│   ├── r1_baseline_ledger.test.ts     # 5 tests: Discovery, hardware ledger, zero secret checks
│   ├── r2_fsm_state_machine.test.ts   # 5 tests: FSM state definitions, valid transitions
│   ├── r3_oled_animation.test.ts      # 5 tests: Framebuffer bounds, primitives, non-blocking
│   ├── r4_firmware_hardening.test.ts  # 5 tests: WakeNet config, 5m timeout, NVS, Wi-Fi
│   ├── r5_web_platform.test.ts        # 5 tests: Claim flow, Wi-Fi vault UI, anti-slop rules
│   ├── r6_backend_data.test.ts        # 5 tests: Envelope encryption, zero secret leak, isolation
│   ├── r7_security_redteam.test.ts    # 5 tests: IDOR prevention, spoofing, cloud guard
│   ├── r8_regulatory_matrix.test.ts   # 5 tests: WPC/BIS/DPDP citations, lab status, RF limits
│   └── r9_dependency_pruning.test.ts  # 5 tests: Production mock ban, dead code, clean build
├── tier2_boundaries/
│   ├── r1_boundary.test.ts            # 5 tests: Corrupt ledgers, sensitive string leaks
│   ├── r2_boundary.test.ts            # 5 tests: Illegal transitions, event race, loop guards
│   ├── r3_boundary.test.ts            # 5 tests: 0x0/127x63 clipping, frame budget, QR density
│   ├── r4_boundary.test.ts            # 5 tests: Exact 300,000ms edge, 0-byte audio, -95dBm RSSI
│   ├── r5_boundary.test.ts            # 5 tests: 32B SSID, 63B password, voice slot 5 overflow
│   ├── r6_boundary.test.ts            # 5 tests: Clock skew, AES corrupted tag, pool exhaustion
│   ├── r7_boundary.test.ts            # 5 tests: SQLi headers, path traversal, key replay
│   ├── r8_boundary.test.ts            # 5 tests: 2483.5MHz band edge, DPDP erasure, RoHS limits
│   └── r9_boundary.test.ts            # 5 tests: Tree-shake empty exports, prototype pollution
├── tier3_combinations/
│   └── cross_feature_pairwise.test.ts # 10 tests: Multi-feature pairwise interaction matrix
└── tier4_scenarios/
    ├── s1_out_of_box_journey.test.ts  # Scenario 1: Unboxing to first cloud heartbeat
    ├── s2_voice_capture_sync.test.ts  # Scenario 2: "Hi ESP" to verified Notion sync
    ├── s3_wifi_recovery_resilience.test.ts # Scenario 3: Router drop & reconnect loop
    ├── s4_inactivity_power_cycle.test.ts   # Scenario 4: 5-minute inactivity & sleep
    └── s5_adversarial_penetration.test.ts  # Scenario 5: Full red-team attack interception
```

---

## 5. Execution Instructions & Automation

### 5.1 Automated Standalone Runner (Recommended)
The standalone runner executes all 105 tests across all four tiers with zero external database dependencies, generating structured console output and a strict exit code (0 on 100% pass, non-zero on any failure):

```bash
# Run all tiers via Node.js
node tests/e2e/runner.mjs

# Run a specific tier
node tests/e2e/runner.mjs --tier=1
node tests/e2e/runner.mjs --tier=2
node tests/e2e/runner.mjs --tier=3
node tests/e2e/runner.mjs --tier=4

# Run on Windows via PowerShell wrapper
powershell -ExecutionPolicy Bypass -File tests/e2e/run_tests.ps1
```

### 5.2 Vitest Test Runner
The test suites are fully compatible with Vitest:

```bash
# Run all E2E tests
npx vitest run tests/e2e/

# Run individual test tiers
npx vitest run tests/e2e/tier1_features/
npx vitest run tests/e2e/tier2_boundaries/
npx vitest run tests/e2e/tier3_combinations/
npx vitest run tests/e2e/tier4_scenarios/
```

---

## 6. Exit Code Semantics & Acceptance Gates

| Exit Code | Meaning | Action / Consequence |
| :---: | :--- | :--- |
| `0` | **ALL 105 tests passed cleanly** | Test gate PASS. System eligible for release candidate audit. |
| `1` | **One or more test assertions failed** | Test gate FAIL. Escalate implementation defect to responsible agent. |
| `2` | **Harness or environment error** | Test setup invalid. Harness configuration requires review. |

---

## 7. Defect Escalation & QA Protocol

When a test failure occurs:
1. **Determine Failure Root Cause**: Verify whether the failure is an assertion mismatch against `ORIGINAL_REQUEST.md` (Implementation Defect) or an invalid test expectation (Test Defect).
2. **Implementation Defect**: As a Test Writer, do NOT modify production code. Document the exact HTTP route, state machine event, or hardware parameter, include the reproduction payload, and report to the responsible specialist (Firmware, Backend, Frontend, or Security).
3. **Re-Verification**: Once the fix is delivered, re-run `node tests/e2e/runner.mjs` to confirm regression-free resolution.
