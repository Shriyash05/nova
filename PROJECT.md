# Project: NOVA 1.0 — Keychain Ambient Voice Assistant

**Status**: Living Architecture & Orchestration Specification  
**Orchestrator**: `orchestrator_1` (`e451ddc2-d7f0-4749-bf7f-ed93de42ccc6`)  
**Firmware Codebase**: `C:\NOVA-IDF\nova_wake_test` (ESP-IDF 6.1 on COM5)  
**Web & Cloud Codebase**: `d:\Personal projects\nova` (Vite 8, React 19, Vercel Serverless, Supabase Postgres, Notion OAuth)  
**E2E Test Suite**: `tests/e2e/` (105 tests across Tiers 1–4, 100% pass rate, `TEST_READY.md`)

---

## 1. System Architecture

```
+---------------------------------------------------------------------------------------------------------+
|                                        NOVA 1.0 ECOSYSTEM ARCHITECTURE                                  |
+---------------------------------------------------------------------------------------------------------+
| [HARDWARE ON COM5]                                                                                      |
|  - ESP32-C3 Super Mini 4MB (Single-core RISC-V @ 160MHz)                                                |
|  - MAX4466 Analog Electret Mic on GPIO1 (Continuous ADC DMA @ 16kHz, 16-bit)                            |
|  - SSD1306 128x64 Monochrome OLED on GPIO8 (SDA) / GPIO9 (SCL) via I2C Fast-Mode (400kHz)              |
|  - USB-C 5V Bus Line Powered (No battery fuel gauge IC; truth-in-hardware power telemetry)              |
+---------------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ FreeRTOS Multi-Tasking Architecture (ESP-IDF 6.1)
                                                  ▼
+---------------------------------------------------------------------------------------------------------+
| [EMBEDDED FIRMWARE LAYER - C:\NOVA-IDF\nova_wake_test]                                                  |
|  - Task Priority 5 (Stack: 8KB):  Audio DMA Acquisition & WakeNet wn9s_hiesp Wake-Word Inference        |
|  - Task Priority 4 (Stack: 4KB):  OLED Animation Engine (Non-blocking procedural pixel-art expressions) |
|  - Task Priority 3 (Stack: 12KB): Network Sync Task (mbedtls TLS 1.3, HTTPS REST, Heartbeat)           |
|  - Task Priority 2 (Stack: 4KB):  Wi-Fi Provisioning Server / Auto-Reconnect Manager                    |
|  - Centralized FSM (nova_fsm.c):  9-state authoritative state machine with mutex isolation              |
|  - Flash Partition Scheme: Dual OTA (ota_0, ota_1), otadata, nvs, phy_init, model (128KB)              |
+---------------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ HTTPS / TLS 1.3 (Signed Bearer Token Authentication)
                                                  ▼
+---------------------------------------------------------------------------------------------------------+
| [CLOUD API & BACKEND LAYER - Vercel Serverless / api/index.ts]                                          |
|  - Serverless Endpoints: /api/v1/devices, /api/v1/devices/claim, /api/v1/devices/heartbeat, /api/health|
|  - Notion OAuth Integration: HMAC-SHA256 state validation, AES-256-GCM envelope encryption for tokens   |
|  - Per-Device Isolation & IDOR Protection: Token hash matching against devices.device_secret           |
|  - Direct PostgreSQL Pooler Connection via pg.Pool (aws-0-ap-south-1.pooler.supabase.com)             |
+---------------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ Strict Row Level Security (RLS) & Role Isolation
                                                  ▼
+---------------------------------------------------------------------------------------------------------+
| [DATA LAYER - Supabase PostgreSQL (schema.sql)]                                                         |
|  - Tables: devices, device_bootstrap_credentials, wifi_profiles, claim_tokens, pairing_sessions,        |
|            notion_authorizations, device_actions, rate_limits, oauth_states, launch_subscribers,       |
|            users, user_devices                                                                          |
|  - Security: ENABLE ROW LEVEL SECURITY on all 12 tables; anon role access strictly revoked             |
+---------------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ Modern Web Client (Vite 8 + React 19)
                                                  ▼
+---------------------------------------------------------------------------------------------------------+
| [FRONTEND & USER EXPERIENCE - buynovastore.vercel.app]                                                  |
|  - Anti-Slop Tactile Brand Identity: Dark graphite theme (#090b10), OLED cyan accents (#00f2fe)        |
|  - Authentic Customer Journeys: Pre-order / waitlist with DB persistence, live device pairing wizard    |
|  - Truth-in-Hardware UI: Honest USB power status (no fake battery percentage), WCAG 2.1 AA accessible  |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Feature Inventory & Traceability Matrix

Every requirement from `ORIGINAL_REQUEST.md` (R1 through R9) is inventoried, mapped, and assigned to a milestone.

| # | Feature Code | Feature Description | Assigned Milestone | Verification Source |
|---|---|---|---|---|
| 1 | **R1-LEDGER** | Real Baseline Discovery & KEEP/REFACTOR/REPLACE/REMOVE Technical Ledger | Phase A (Completed) | Explorers 1, 2, 3 reports |
| 2 | **R2-DEBATE** | 8-Discipline Adversarial Multi-Agent Design Debate (Rubric Scored) | Milestone B | Phase B Design Debate Matrix |
| 3 | **R2-FSM** | Authoritative 9-State Centralized State Machine & Event Transitions | Milestone B | `nova_fsm.c` / `test_nova_fsm.py` |
| 4 | **R3-OLED** | Expressive Non-Blocking 128×64 OLED Procedural Animation Engine | Milestone B & D | SSD1306 driver, non-blocking I2C |
| 5 | **R3-ENCLOSURE** | Mechanical Enclosure Specifications (Verified vs Estimated Dimensions) | Milestone B | ID mechanical specification |
| 6 | **R4-AUDIO** | Starvation-Free Audio DMA Acquisition & WakeNet Task Priority Hardening | Milestone D | FreeRTOS priority 5, DMA buffer |
| 7 | **R4-WIFI** | Wi-Fi Provisioning Hardening & Automated Reconnect State Recovery | Milestone D | SoftAP auth, reconnect backoff |
| 8 | **R4-TIMEOUT** | 5-Minute Inactivity Timeout & Clean Power Down / Sleep Recovery | Milestone D | `nova_fsm.c` 300,000ms timer |
| 9 | **R4-OTA** | Modern Dual-Slot OTA Flash Partitioning & Inactivity Watchdog | Milestone D | `partitions.csv`, `idf.py build` |
| 10 | **R5-BRAND** | Anti-Slop Tactile Frontend Brand Identity & Production SEO | Milestone F | Vite/React, `variables.css` |
| 11 | **R5-ONBOARD** | Authentic Customer Waitlist, Device Pairing Flow & Wi-Fi Vault UI | Milestone F | Pairing wizard, setup console |
| 12 | **R6-RLS** | Supabase PostgreSQL Row Level Security (RLS) & Anon Role Lockdown | Milestone C & E | `schema.sql` migration, RLS tests |
| 13 | **R6-AUTH** | Patch Google Auth Bypass, User Device IDORs & DB SSL Verification | Milestone E | `api/index.ts` auth refactor |
| 14 | **R6-NOTION** | Resilient Notion OAuth Token Lifecycle & AES-256-GCM Envelope Encryption | Milestone E | `api/index.ts` Notion handlers |
| 15 | **R7-THREAT** | Full STRIDE/DREAD Threat Model & Red-Team Adversarial Penetration Tests | Milestone C & H | Threat model, Tier 3/4/5 tests |
| 16 | **R8-REGULATORY**| Jurisdiction Regulatory Compliance Matrix (WPC, BIS, DPDP, CE, FCC) | Milestone H | Compliance matrix & lab roadmap |
| 17 | **R8-HONESTY** | Capability Honesty Audit (Zero Fake Battery / Zero Fake Voice Claims) | Milestone D, F, H | Power telemetry, voice pipeline |
| 18 | **R9-PRUNE** | Dead Code Elimination (20 Orphaned Files) & Dependency Pruning | Milestone E & F | Ripgrep analysis, build clean |
| 19 | **E2E-TEST** | 100% Pass of 105 E2E Tests (Tiers 1–4) & Tier 5 Adversarial Hardening | Milestone I (Final) | `TEST_READY.md`, runner.mjs |
| 20 | **AUDIT-PASS** | Independent Forensic Release Audit with Final Deployment Verdict | Milestone I (Final) | `teamwork_preview_auditor` |

---

## 3. Technical Ledger: KEEP / REFACTOR / REPLACE / REMOVE

Based on empirical evidence collected by Explorers 1, 2, and 3:

### 3.1 Firmware & Hardware (`C:\NOVA-IDF\nova_wake_test`)
- **KEEP**:
  - WakeNet `wn9s_hiesp` ("Hi ESP") neural network wake-word model and calibration.
  - Centralized 9-state FSM core in `main/nova_fsm.c` (validated by 9/9 unit tests).
  - SSD1306 I2C 128x64 display driver and procedural geometric face drawing primitives.
  - mbedtls HTTPS / TLS 1.3 client connection pipeline with hardcoded Digicert root CA.
- **REFACTOR**:
  - **Task Priority Architecture**: Move audio DMA sampling and WakeNet inference from `app_main` (Priority 1) to a dedicated task at FreeRTOS **Priority 5** (Stack: 8KB), preventing DMA buffer overflow (starvation) during TLS handshakes.
  - **Telemetry Honesty**: Remove hardcoded 4150mV battery telemetry in `main/main.c:663`; report line-powered bus status (`POWER_LINE_USB_5V`).
  - **Partition Layout**: Shrink oversized 1MB model partition (which only uses 123KB) and create a dual OTA partition layout (`ota_0`, `ota_1`, `otadata`).
- **REPLACE**:
  - Replace unauthenticated, cleartext HTTP SoftAP provisioning (`nova_net.c:343` `WIFI_AUTH_OPEN`) with secure WPA2-PSK provisioning or encrypted challenge-response exchange.
  - Replace mock voice stub in `nova_voice.c:9` (`return NOVA_VOICE_UNAVAILABLE`) with an operational streaming audio chunker / cloud speech ingestion endpoint.
- **REMOVE**:
  - Prune dead source files: `main/nova_app.c` (12,432 bytes) and `main/main_wake_backup.c` (5,693 bytes).
  - Prune legacy backup directories in firmware root.

### 3.2 Web Platform & Frontend (`d:\Personal projects\nova`)
- **KEEP**:
  - High-taste, anti-slop dark graphite aesthetic with OLED cyan accents (`src/styles/variables.css`).
  - Authentic pre-order / waitlist transparency copy in `HeroSection.tsx` and `LockedActionModal.tsx`.
  - Vite 8 + React 19 fast build pipeline.
- **REFACTOR**:
  - **Hardware Truth in UI**: Replace simulated battery gauge (`{deviceData?.batteryPercent ?? 100}%`) in `SetupExperience.tsx:1038` and `mockApi.ts:43` with `"Power: USB-C 5V Bus"`.
  - **Typecheck Integration**: Update `tsconfig.json` or create dedicated `tsconfig.api.json` so that `api/` serverless functions are included in project-wide TypeScript typechecking.
- **REPLACE**:
  - Replace legacy multistep flow components with unified, clean pairing console.
- **REMOVE**:
  - Delete 20 orphaned legacy files (~3,200 LOC in `src/components/flows/`, `src/components/common/`, `src/components/hardware/`, `src/hooks/useWebBle.ts`, `src/domain/stateMachine.ts`).
  - Prune unused `@supabase/supabase-js` from `package.json` (0 imports across entire codebase).

### 3.3 Backend, Database & Cloud Security
- **KEEP**:
  - HMAC-SHA256 signed OAuth state generation (`api/index.ts:401-434`).
  - Single-use state verification with replay protection in `oauth_states` table.
  - AES-256-GCM envelope encryption for stored Notion access tokens (`api/index.ts:175-219`).
  - Per-device token validation against hashed secrets in `authenticateDeviceRequest`.
- **REFACTOR**:
  - **PostgreSQL Connection Pool**: Fix `api/index.ts:17` from `ssl: { rejectUnauthorized: false }` to proper TLS certificate verification (`ssl: { rejectUnauthorized: true }`).
  - **Rate-Limit Test Isolation**: Decouple client mock IP addresses in `src/__tests__/backendApi.test.ts` to prevent rate-limit spillover across test runs.
- **REPLACE**:
  - **Patch Google Auth Bypass**: Remove the insecure unauthenticated `req.body.email` fallback in `api/index.ts:814-870`. Require cryptographic Google ID token verification.
  - **Fix User Device IDORs**: In `api/index.ts:883-897` and `api/index.ts:938-957`, reject arbitrary `x-nova-user-id` headers and validate caller session tokens.
  - **Enforce Supabase RLS**: Apply `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and explicit role policies across all 12 tables in `schema.sql`. Revoke all table privileges from `anon` role.
- **REMOVE**:
  - Remove all development mock bypass flags from production API execution paths.

### 3.4 Regulatory & Certification Strategy
- **KEEP**:
  - Open source compliance and license disclosures.
- **REFACTOR**:
  - Update commercial documentation to distinguish verified laboratory testing from self-declaration boundaries.
- **REPLACE**:
  - Formulate hardware migration roadmap from the unshielded ESP32-C3 Super Mini clone board to certified **ESP32-C3-MINI-1** module (FCC ID: 2AC7Z-ESPC3MINI1, WPC ETA, CE RED DoC).

---

## 4. Phased Milestones & Execution Plan

```
Phase A: Baseline Discovery & Technical Ledger  [DONE]
Phase B: Product Requirements & Design System   [DONE]
Phase C: Security & Data-Integrity Foundations  [DONE]
Phase D: Firmware Reliability & Animation System [DONE]
Phase E: Backend & API Hardening                [DONE]
Phase F: Frontend & Setup Experience            [DONE]
Phase G: Integration, Hardware Tests, A11y      [DONE]
Phase H: Performance, Pen-Test & Regulatory     [DONE]
Phase I: Release Candidate & Forensic Audit     [DONE]
```

### Milestone Overview Table

| Milestone | Phase | Description | Prerequisite | Deliverable / Output | Status |
|---|---|---|---|---|---|
| **M-A** | Phase A | Baseline Discovery, Hardware COM5 Audit, E2E Test Suite | None | Explorers reports, `TEST_INFRA.md`, `TEST_READY.md`, `PROJECT.md` | **DONE** |
| **M-B** | Phase B | 8-Discipline Design Debate, State Machine, OLED Engine Spec | M-A | Design Debate Report, Authoritative FSM Spec, OLED Animation Blueprint | **DONE** |
| **M-C** | Phase C | Security Foundations: Threat Model, Supabase RLS, Secret Shield | M-B | Hardened `schema.sql`, RLS policies, STRIDE threat matrix | **DONE** |
| **M-D** | Phase D | Firmware Hardening: Priority 5 Audio Task, Dual OTA, Non-Blocking OLED | M-B, M-C | Clean ESP-IDF 6.1 build, COM5 verified, zero audio starvation | **DONE** |
| **M-E** | Phase E | Backend Hardening: Auth Bypass Patch, IDOR Fixes, Notion Resilience | M-C | Hardened `api/index.ts`, passing `backendApi.test.ts`, clean DB SSL | **DONE** |
| **M-F** | Phase F | Frontend Hardening: Anti-Slop Brand, Device Setup, USB Power Truth | M-B, M-E | Production build (`npm run build`), pairing UI, dead code removed | **DONE** |
| **M-G** | Phase G | End-to-End System Integration, Hardware Telemetry, WCAG A11y | M-D, M-E, M-F| Live device-to-cloud sync test, COM5 telemetry, WCAG AA report | **DONE** |
| **M-H** | Phase H | Stress Testing, Red-Team Pen Test, Regulatory Compliance Matrix | M-G | Watchdog stress report, pen-test report, WPC/BIS/DPDP/CE/FCC matrix | **DONE** |
| **M-I** | Phase I | Final Release Gate: 100% E2E Pass (Tiers 1-4), Tier 5 Hardening, Forensic Audit | M-H | 100% pass on >398 tests, Tier 5 gap audit, CLEAN release verdict | **DONE** |

---

## 5. Interface Contracts

### 5.1 Device Firmware ↔ Cloud Backend (HTTPS REST)
- **Base URL**: `https://buynovastore.vercel.app/api/v1`
- **TLS Configuration**: TLS 1.3 / mbedtls with verified Root CA certificate.
- **Headers**:
  - `x-nova-device-id`: Device identifier string (e.g. `nova-c3-5c20dc4239fca9ec`).
  - `x-nova-timestamp`: POSIX epoch timestamp (anti-replay check within ±300s).
  - `Authorization`: `Bearer <device_secret>` or `Bearer <claim_token>`.
- **Endpoints**:
  - `POST /devices/bootstrap`: Exchange initial hardware identity for fresh secret.
  - `POST /devices/heartbeat`: Send telemetry (`power_source: "usb_5v"`, `uptime_seconds`, `wifi_rssi`). Returns pending actions.
  - `POST /devices/actions/sync`: Upload captured voice metadata / Notion action request.
  - `GET /devices/claim/qr`: Retrieve pairing claim URL for OLED rendering.

### 5.2 Backend API ↔ Supabase PostgreSQL (schema.sql)
- **Role Isolation**: Direct connection pool (`pg.Pool`) operates under authenticated service role.
- **Row Level Security (RLS)**:
  - `devices`: Readable only by authenticated device owner or server service role.
  - `wifi_profiles`: Encrypted pre-shared keys; decrypted only during provisioning session.
  - `notion_authorizations`: Token encrypted via AES-256-GCM; key never stored in database.
  - `anon` role: ZERO direct SELECT, INSERT, UPDATE, DELETE permissions.

### 5.3 Web Frontend ↔ Backend API
- **Session Authentication**: JWT / HTTP-only secure cookie for web user sessions.
- **Endpoints**:
  - `POST /api/v1/auth/google`: Requires valid Google ID token payload (no raw email injection).
  - `GET /api/v1/user/devices`: Returns devices owned by the authenticated caller.
  - `POST /api/v1/devices/claim`: Claims unclaimed device using active claim token.
  - `POST /api/v1/launch-signup`: Validates email and persists waitlist subscriber.

---

## 6. Code Layout & File Boundaries

```
d:\Personal projects\nova\
├── api/                               # Vercel Serverless Functions
│   ├── index.ts                       # Main API router, auth, device endpoints, Notion handlers
│   └── health.ts                      # Micro health check endpoint
├── schema.sql                         # Supabase PostgreSQL database schema & RLS definitions
├── src/                               # Frontend SPA (Vite 8 + React 19)
│   ├── App.tsx                        # Main application router and state
│   ├── components/
│   │   ├── landing/                   # Public store, hero, blueprint, specs, waitlist
│   │   ├── setup/                     # Device pairing wizard, Wi-Fi vault, status console
│   │   └── ui/                        # Reusable high-taste UI primitives (buttons, modals)
│   ├── styles/                        # CSS styling and theme tokens (variables.css)
│   └── lib/                           # Frontend utility libraries and API clients
├── tests/
│   └── e2e/                           # 4-Tier Independent E2E Test Suite (105 tests)
│       ├── runner.mjs                 # Standalone test runner
│       ├── run_tests.ps1              # Windows PowerShell wrapper
│       ├── tier1_features/            # 45 Feature coverage tests (R1-R9)
│       ├── tier2_boundaries/          # 45 Boundary & corner case tests (R1-R9)
│       ├── tier3_combinations/        # 10 Cross-feature pairwise tests
│       └── tier4_scenarios/           # 5 Real-world application scenarios
├── TEST_INFRA.md                      # Test infrastructure architecture specification
├── TEST_READY.md                      # Formal E2E test suite readiness declaration
└── PROJECT.md                         # Authoritative project engineering index (this file)

C:\NOVA-IDF\nova_wake_test\            # ESP32-C3 Embedded Firmware
├── CMakeLists.txt                     # ESP-IDF top-level build configuration
├── partitions.csv                     # Partition table (NVS, OTA slots, model)
├── sdkconfig                          # ESP-IDF 6.1 configuration flags
├── main/
│   ├── CMakeLists.txt                 # Component build specification
│   ├── main.c                         # FreeRTOS task startup and lifecycle dispatch
│   ├── nova_fsm.c / nova_fsm.h        # 9-state authoritative FSM
│   ├── nova_net.c / nova_net.h        # Wi-Fi manager, HTTPS client, SoftAP provisioning
│   ├── nova_state.c / nova_state.h    # NVS persistence, cryptographic key storage
│   └── nova_voice.c / nova_voice.h    # Audio streaming and voice ingestion
└── test/
    └── test_nova_fsm.py               # FSM regression test suite (9/9 pass)
```
