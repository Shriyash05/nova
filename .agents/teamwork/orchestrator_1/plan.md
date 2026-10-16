# Engineering Execution Plan: NOVA 1.0 Autonomous Multi-Agent Mission

## Objective
Deliver production-grade, sellable NOVA 1.0 keychain voice assistant across firmware (ESP32-C3 / ESP-IDF 6.1 on COM5), web platform (Next.js / Supabase / Notion), hardware validation, industrial design & OLED engine, security & privacy hardening, compliance (WPC, BIS, DPDP, CE, FCC), and independent release readiness.

## Execution Tracks
1. **Implementation Track**: Specialist multi-agent execution across Phases A through I.
2. **E2E Testing Track**: Autonomous, opaque-box, requirement-driven test infrastructure verifying R1–R9 across all 4 tiers (+ Tier 5 adversarial hardening).

## Phased Execution Roadmap

### Phase A: Repository and Architecture Audit (Current)
- Survey 1: Embedded Firmware & Hardware Baseline (`C:\NOVA-IDF\nova_wake_test`, COM5, ESP-IDF 6.1, WakeNet, OLED, MAX4466)
- Survey 2: Web Platform & Cloud Baseline (`d:\Personal projects\nova`, Next.js, Supabase, Notion OAuth, Vercel)
- Survey 3: Security, Threat Model & Regulatory Baseline (Hardware barriers, secrets, compliance standards WPC/BIS/DPDP/FCC/CE)
- Synthesis: Authoritative KEEP / REFACTOR / REPLACE / REMOVE Technical Ledger in `PROJECT.md`.

### Phase B: Product Requirements & Design System
- 8-discipline design debate & rubric evaluation.
- Define authoritative state machine & event transitions.
- Pixel-art monochrome animation engine architecture (128x64 OLED, SSD1306, non-blocking I2C).
- Mechanical enclosure specs & BOM verification.

### Phase C: Security & Data-Integrity Foundations
- Threat model (STRIDE / DREAD across device, Wi-Fi, API, cloud).
- Supabase schema hardening, RLS enforcement, per-device tokens, IDOR prevention.
- Notion OAuth token lifecycle, encryption at rest, zero client-side secret exposure.

### Phase D: Firmware Reliability & Animation System
- Implement single authoritative state machine in ESP-IDF 6.1.
- Harden audio acquisition (16kHz MAX4466 on GPIO1) and WakeNet `wn9s_hiesp` task priority (zero starving).
- Non-blocking OLED animation frame renderer.
- Wi-Fi provisioning, auto-reconnect, 5-minute inactivity timeout, watchdog servicing, zero heap leaks.
- Compile check (`idf.py build`) and non-destructive COM5 hardware verification.

### Phase E: Backend & API Hardening
- Supabase migrations, RLS policies, automated IDOR test coverage.
- Next.js server actions / API routes validation, rate limiting, idempotent device endpoints.
- Notion bidirectional sync reliability and error recovery.

### Phase F: Frontend & Customer Setup Experience
- Anti-slop, premium brand identity web platform (`buynovastore.vercel.app`).
- Realistic waitlist / checkout flow with DB persistence.
- Device pairing wizard, Wi-Fi configuration flow, interactive OLED preview.
- Accessibility (WCAG 2.1 AA), responsive layouts, SEO.

### Phase G: Integration, Hardware Tests, and Accessibility
- End-to-end integration: Device wake -> state transition -> animation -> cloud trigger -> Notion action.
- Physical / COM5 serial telemetry and health verification.
- Cross-platform UX accessibility audits.

### Phase H: Performance, Security Regression & Regulatory Evidence
- Stress testing, memory leak analysis, watchdog resilience under load.
- Red-team penetration tests against API, auth, and physical flash extraction risks.
- Jurisdiction compliance matrix (India WPC/ETA, BIS CRS, DPDP; EU CE/RoHS; US FCC) with standard citations.

### Phase I: Release Candidate & Production Readiness Review
- Full test pass across Tiers 1-4 (E2E Test Suite) and Tier 5 (Adversarial Coverage Hardening).
- Forensic audit by Independent Release Auditor (`teamwork_preview_auditor`).
- Explicit release verdict: NOT READY, INTERNAL TEST READY, or CANDIDATE FOR EXTERNAL CERTIFICATION AND LAUNCH.
- Final completion claim sent to Sentinel.
