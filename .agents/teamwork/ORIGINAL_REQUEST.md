# Original User Request

## 2026-10-16T00:47:29Z

# NOVA 1.0 — Autonomous Multi-Agent Product Engineering Mission

Requested team: Full multi-agent engineering team (8 specialist roles: Technical Lead/Architect, Industrial Design & OLED, Embedded Firmware, Frontend & UX, Backend & Cloud, Security/Red Team, QA & Regulatory, Independent Release Auditor)

Transform NOVA—a tiny, expressive keychain voice assistant (ESP32-C3 Super Mini 4MB on COM5, SSD1306 128×64 OLED, MAX4466 microphone on GPIO1, ESP-IDF 6.1, WakeNet wn9s_hiesp, Next.js/Supabase/Notion web stack)—into a coherent, production-quality, sellable product through autonomous multi-agent engineering, rigorous design debate, and verifiable implementation across firmware, cloud, frontend, and compliance.

Working directory: d:\Personal projects\nova (firmware: C:\NOVA-IDF\nova_wake_test)
Integrity mode: development
Hardware interaction: Compile and verify firmware builds locally; run non-destructive hardware checks on COM5 if available.

## Requirements

### R1. Real Baseline Discovery & Technical Ledger
Inspect physical environment, COM5 hardware, firmware codebase (`C:\NOVA-IDF\nova_wake_test`), website repo (`d:\Personal projects\nova`), and cloud services (Vercel, Supabase, Notion). Produce an evidence-backed KEEP / REFACTOR / REPLACE / REMOVE ledger with zero assumed health, dependency impact checks, and zero secret exposure.

### R2. Adversarial Multi-Agent Design Competition
Execute an 8-discipline design debate across two independent rounds (Round 1: Independent proposals; Round 2: Adversarial critique) scored on the weighted 8-factor rubric (Security 25%, Correctness 20%, Product/ID 15%, Hardware 15%, Architecture 10%, Accessibility 5%, Manufacturability 5%, Regulatory 5%). Establish an authoritative architectural specification and single authoritative state machine.

### R3. Industrial Design & 128×64 OLED Animation Engine
Design and implement an expressive, non-blocking monochrome OLED animation engine using reusable pixel-art primitives (idle expressions, blinks, winks, wake, listening, processing, success, offline, error) tailored strictly to available hardware (no speaker, vibration motor, or RGB LED). Document mechanical enclosure specifications separating verified dimensions from estimates.

### R4. Embedded Firmware Hardening (ESP32-C3 / ESP-IDF 6.1)
Implement a single authoritative state machine. Retain `wn9s_hiesp` ("Hi ESP") wake-word model. Harden audio sampling (MAX4466 GPIO1 at 16 kHz), non-blocking animation loop, Wi-Fi recovery, local provisioning, HTTPS/TLS communication, NVS device identity persistence, 5-minute inactivity timeouts, and watchdog servicing with zero heap thrashing. Compile and verify locally, and execute non-destructive checks on COM5 if available.

### R5. Customer Experience & Modern Web Platform
Rebuild the web frontend (`buynovastore.vercel.app`) with a distinct, premium NOVA brand identity (anti-slop, no generic AI gradients). Implement honest waitlist/order mechanics, device pairing flows, Wi-Fi configuration management, verified Notion synchronization, responsive layouts, accessibility, and production SEO.

### R6. Hardened Backend & Data Architecture
Audit and harden Supabase PostgreSQL schema, RLS policies, OAuth token security, and per-device authentication. Guarantee zero secret leakage to browsers/logs, idempotent device endpoints, safe migration rollback plans, and resilient Notion token lifecycle handling.

### R7. Security Threat Model & Red-Team Audit
Perform an end-to-end threat model (physical, Wi-Fi provisioning, API, OAuth, cloud, supply chain). Verify authorization barriers (IDOR prevention, device spoofing immunity), run regression tests against identified vulnerabilities, and verify dependency supply-chain integrity.

### R8. Regulatory Compliance & Commercial Readiness Matrix
Build a jurisdiction-specific compliance matrix (India WPC/ETA, BIS, DPDP 2023; EU CE/RED/RoHS; US FCC) citing authoritative standards. Distinguish completed verification from mandatory laboratory certifications and external approvals.

### R9. Dependency Pruning & Dead Code Elimination
Conduct graph-based import and runtime analysis across all firmware and web modules. Safely eliminate mocks, simulated behaviors, and dead dependencies with verified impact checks.

## Acceptance Criteria

### Firmware & Embedded Verification
- [ ] Reproducible clean build of firmware using ESP-IDF 6.1 (`idf.py build`) without compilation warnings or linker errors.
- [ ] Validated memory, partition, and heap budget (no stack overflow, no heap leak over stress test).
- [ ] Verified non-blocking OLED refresh: audio acquisition and WakeNet task never starve during animation rendering.
- [ ] 5-minute listening inactivity timeout cleanly transitions back to idle without state lockup.
- [ ] Graceful Wi-Fi disconnect and automated reconnection recovery without watchdog reboot.

### Web & Backend Verification
- [ ] Production build and strict TypeScript/lint check pass cleanly (`npm run build`, `npm run lint`).
- [ ] All API routes and Supabase RLS policies enforce per-user and per-device isolation (automated IDOR tests pass).
- [ ] Secrets (OAuth tokens, Wi-Fi credentials, private keys) are never exposed via browser network payloads, DOM, or logs.
- [ ] Authentic waitlist / checkout flow with verified database persistence.
- [ ] Notion OAuth connection, token refresh, and disconnection operate without corrupting device or user data.

### Compliance & Quality Verification
- [ ] Documented compliance roadmap with specific standard citations (WPC ETA, DPDP, BIS CRS status).
- [ ] Zero unverified capability claims (no fake battery levels, fake voice recognition, or simulated cloud sync).
- [ ] Independent release audit report with explicit verdict: NOT READY, INTERNAL TEST READY, or CANDIDATE FOR EXTERNAL CERTIFICATION AND LAUNCH.

## Detailed Multi-Disciplinary Mission Protocol & Execution Gates

### Specialist Roles:
A. Product architect and technical lead
B. Industrial design, visual identity, and OLED animation designer
C. Embedded firmware and hardware specialist
D. Frontend, accessibility, and conversion-focused UX specialist
E. Backend, database, and integration specialist
F. Security, privacy, and threat-modeling specialist
G. QA, reliability, test automation, and regulatory research specialist
H. Independent reviewer and release auditor

### Phased Execution:
Phase A: Repository and architecture audit.
Phase B: Product requirements and design system.
Phase C: Security and data-integrity foundations.
Phase D: Firmware reliability and animation system.
Phase E: Backend/API hardening.
Phase F: Frontend and setup experience.
Phase G: Integration, hardware tests, and accessibility.
Phase H: Performance, security regression, and regulatory evidence.
Phase I: Release candidate and production readiness review.

### Safety Boundaries:
- Preserve recoverable backups before significant changes.
- Never expose secrets. Never wipe NVS or device identity just to simplify testing.
- Never overwrite a user's unrelated changes.
- Never change production credentials, external account settings, billing, or live customer data without explicit approval.
