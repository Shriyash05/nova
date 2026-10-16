# Task Assignment: Phase G Challenger 2 (Device-to-Cloud Integration & A11y Adversarial Prober)

**Assigned Agent**: challenger_g2
**Role**: Phase G Challenger 2 (Cloud Contract & Accessibility Stress Tester)
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\challenger_g2
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Worker Handoff Report**: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
**Web Codebase**: `d:\Personal projects\nova`

## Mission & Instructions
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Adversarially probe and stress-test:
   - Device action synchronization: test unauthenticated sync, Notion unlinked status (`NOTION_NOT_CONNECTED`), and payload boundaries.
   - Setup console accessibility and responsive layout at extreme viewport sizes (mobile 320px to ultrawide 4K).
   - Form input fuzzing on Wi-Fi profile credentials and claim token formats.
3. Execute independent verification commands:
   - `npm run lint`
   - `npm run build`
   - `npx vitest run tests/phase_g_integration.test.ts`
   - `node tests/e2e/runner.mjs` (105/105 tests across Tiers 1-4)
4. Write your challenge report to:
   `d:\Personal projects\nova\.agents\teamwork\challenger_g2\handoff.md`
   State your verdict clearly: **APPROVE** or **REQUEST_CHANGES**.
5. Send your verdict via `send_message` to your parent orchestrator.


## 2026-10-16T09:53:57Z
[Message] timestamp=2026-10-16T09:53:57Z sender=5e4ae70f-bf0a-4e13-985b-f4457de8a2da priority=MESSAGE_PRIORITY_HIGH content=You are challenger_g2.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\challenger_g2
Your mission is to empirically test and stress-test Phase G cloud action synchronization, pairing session security, and accessibility.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\challenger_g2\DISPATCH.md

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Probe and stress-test:
   - Cloud action sync endpoints: test POST /api/v1/devices/actions/sync with unauthenticated tokens, missing device IDs, and disconnected Notion workspace (verify 400 NOTION_NOT_CONNECTED).
   - Web setup console UX and accessibility across viewport sizes.
3. Run verification commands:
   - npm run lint
   - npm run build
   - npx vitest run tests/phase_g_integration.test.ts
   - node tests/e2e/runner.mjs
4. Write your challenge report to:
   d:\Personal projects\nova\.agents\teamwork\challenger_g2\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your parent orchestrator.
## 2026-10-16T12:10:45Z
[Message] timestamp=2026-10-16T12:10:45Z sender=5e4ae70f-bf0a-4e13-985b-f4457de8a2da priority=MESSAGE_PRIORITY_HIGH content=You are challenger_g2.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\challenger_g2
Your mission is to empirically test and stress-test Phase G cloud action synchronization, pairing session security, and accessibility.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\challenger_g2\DISPATCH.md

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Probe and stress-test:
   - Cloud action sync endpoints: test POST /api/v1/devices/actions/sync with unauthenticated tokens, missing device IDs, and disconnected Notion workspace (verify 400 NOTION_NOT_CONNECTED).
   - Web setup console UX and accessibility across viewport sizes.
3. Run verification commands:
   - npm run lint
   - npm run build
   - npx vitest run tests/phase_g_integration.test.ts
   - node tests/e2e/runner.mjs
4. Write your challenge report to:
   d:\Personal projects\nova\.agents\teamwork\challenger_g2\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your parent orchestrator.
