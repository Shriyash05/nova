# Dispatch: worker_compliance_h1

**Milestone**: Phase H — Performance, Security Regression & Multi-Jurisdiction Regulatory Matrix  
**Assigned Agent**: `worker_compliance_h1`  
**Role**: Performance, Security & Regulatory Compliance Specialist  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\worker_compliance_h1`  
**Date**: 2026-10-16  

---

## Mandatory Reading
1. `ORIGINAL_REQUEST.md`: `d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Authoritative Specification: `d:\Personal projects\nova\PROJECT.md`
3. Phase G Gate Status: `d:\Personal projects\nova\.agents\teamwork\orchestrator_gen2\GATE_STATUS.md`
4. Reviewer G2 Handoff: `d:\Personal projects\nova\.agents\teamwork\reviewer_g2\handoff.md`
5. Challenger G2 Handoff: `d:\Personal projects\nova\.agents\teamwork\challenger_g2\handoff.md`
6. Compliance Standards Fixture: `d:\Personal projects\nova\tests\e2e\fixtures\testLedgers.ts`

---

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

---

## Scope & Concrete Objectives

### 1. Multi-Jurisdiction Regulatory Compliance Matrix & Commercial Roadmap
Create a comprehensive, production-grade regulatory documentation artifact in `docs/REGULATORY_COMPLIANCE_MATRIX.md` (and ensure full traceability with `PROJECT.md` and `tests/e2e/fixtures/testLedgers.ts`):
- **India**:
  - **WPC ETA-SDOC**: Equipment Type Approval via Self-Declaration of Conformity for 2.4 GHz Wi-Fi & Bluetooth LE per GSR 45(E) / GSR 1048(E) (max 100 mW / 20 dBm EIRP, 2400–2483.5 MHz). Status: `SPECIFICATION_ALIGNED`.
  - **BIS CRS**: Compulsory Registration Scheme per IS 13252 (Part 1):2010 (IT Equipment Safety) & IS 16333 (Part 3) (Language support). Status: `PENDING_LAB_TESTING`. Mandatory testing parameters (electric strength, temperature rise, flammability, touch current).
  - **MeitY DPDP Act 2023**: Digital Personal Data Protection Act compliance. Detailed notice, explicit revocable consent before audio streaming, purpose limitation for voice-to-action synthesis, data principal rights (erasure, correction, grievance redressal). Status: `SPECIFICATION_ALIGNED`.
- **European Union**:
  - **CE RED (2014/53/EU)**: Radio Equipment Directive. Standards: ETSI EN 300 328 (2.4 GHz wideband transmission), ETSI EN 301 489-1/-17 (EMC for radio equipment), EN IEC 62368-1:2020+A11:2020 (Audio/video, information and communication technology equipment safety), EN 62479 (Human exposure to electromagnetic fields). Status: `PENDING_LAB_TESTING`.
  - **RoHS (2011/65/EU) & (EU) 2015/863**: Restriction of Hazardous Substances (Lead, Mercury, Cadmium, Hexavalent chromium, PBB, PBDE, DEHP, BBP, DBP, DIBP). Status: `PENDING_LAB_TESTING`.
- **United States**:
  - **FCC Title 47 Part 15 Subpart B**: Unintentional Radiators (Class B digital device conducted and radiated emissions, 30 MHz–1 GHz). Status: `PENDING_LAB_TESTING`.
  - **FCC Title 47 Part 15 Subpart C (§15.247)**: Intentional Radiators (Operation within the band 2400–2483.5 MHz, DTS 6dB bandwidth ≥ 500 kHz, peak conducted output power ≤ 1 W, power spectral density ≤ 8 dBm/3kHz). Status: `PENDING_LAB_TESTING`.
- **Commercial Hardware Migration Roadmap**:
  - Detailed technical migration from unshielded development clone (ESP32-C3 Super Mini) to modular pre-certified Espressif **ESP32-C3-MINI-1** (FCC ID: `2AC7Z-ESPC3MINI1`, CE RED DoC, WPC ETA).
  - Document cost reduction, reduced scope of accredited lab testing (radiating spur emissions only vs full intentional transmitter tests), and timeline to commercial mass production.

### 2. Implementation Polish & Security Hardening (Closing Phase G Findings)
- **Power Telemetry Boundary Hardening (`api/index.ts:1723`)**:
  - Update `rawPowerSource` assignment to use nullish coalescing `??` instead of `||`:
    `const rawPowerSource = telemetry.power_source ?? telemetry.powerSource ?? telemetry.powerStatus;`
    This ensures that empty string `""` is evaluated as a string and correctly rejected with HTTP 400 `INVALID_POWER_TELEMETRY` (instead of falling through to undefined).
- **Accessibility & Modal Polish (`src/components/setup/QrCameraScannerModal.tsx`)**:
  - Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="qr-scanner-modal-title"` to the modal container.
  - Add `aria-label="Close camera scanner dialog"` to the close 'X' button.
  - Add a `useEffect` keyboard listener for `e.key === 'Escape'` that invokes `stopCamera()` and `onClose()`.
- **Web Setup UX & Contrast Polish (`src/components/setup/SetupExperience.tsx`)**:
  - Replace `#6b7280` text with `--text-secondary: #94a3b8` in lines 489, 689 (achieving >7:1 contrast ratio across all informational dropdown text).
  - Adjust container padding and grid track on narrow screens: replace `repeat(auto-fit, minmax(360px, 1fr))` with `repeat(auto-fit, minmax(min(100%, 320px), 1fr))` and add responsive mobile padding to eliminate the 88px horizontal scroll on 320px viewports.
- **In-Memory Mock Parity (`src/api/mockBackendServer.ts`)**:
  - Update line 437 to use `??` for `rawPowerSource` to match `api/index.ts`.
  - Update line 621 to allow optional `name` and optional `password` for open networks to mirror `api/index.ts`.

### 3. Red-Team Adversarial Penetration Probes & Stress Test Suite
Create a comprehensive automated test suite `tests/phase_h_performance_security.test.ts` that stress-tests:
- Red-Team Security Probes:
  - Token forgery and unsigned bearer token rejection.
  - Cross-device action sync spoofing and resource isolation.
  - SQL injection fuzzing in claim tokens and Wi-Fi credentials.
  - Notion disconnect handling (400 `NOTION_NOT_CONNECTED`).
  - Strict power telemetry rejection (empty string `""`, fake battery percentages, non-USB power sources).
- Performance & Concurrency:
  - High-concurrency simulated device heartbeats and claim token redemptions.
  - Inactivity timeout boundary checks (300,000,000 $\mu\text{s}$).
  - DPDP user consent revocation and audit logging.

### 4. Verification Commands to Execute
- `npm run lint` (must be 0 errors, 0 warnings)
- `npm run build` (clean Vite 8 production build)
- `npx vitest run tests/phase_h_performance_security.test.ts` (all tests pass)
- `npx vitest run tests/adversarial_phase_g_probe.test.ts` (all 38 tests pass)
- `npx vitest run tests/challenger_g2_adversarial.test.ts` (all 24 tests pass)
- `node tests/e2e/runner.mjs` (105/105 tests pass across Tiers 1-4)
- `node tests/e2e/security_audit.mjs` (94/94 checks pass)
- `& "C:\Users\shriy\AppData\Local\Python\bin\python.exe" C:\NOVA-IDF\nova_wake_test\test\test_nova_fsm.py` (9/9 pass)

---

## Output Requirements
Deliver a comprehensive, self-contained handoff report to:
`d:\Personal projects\nova\.agents\teamwork\worker_compliance_h1\handoff.md`
following the standard Handoff format (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
Notify the orchestrator via `send_message` upon completion.
