# Task Assignment: Phase G Reviewer 2 (Accessibility & End-to-End Contract Conformance)

**Assigned Agent**: reviewer_g2
**Role**: Phase G Reviewer 2 (Accessibility, Web Setup & Contract Conformance Review)
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\reviewer_g2
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Worker Handoff Report**: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
**Web Codebase**: `d:\Personal projects\nova`

## Review Scope & Instructions
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Review the Phase G web setup, pairing console, and accessibility conformance:
   - WCAG 2.1 AA accessibility in `SetupExperience.tsx`, `App.tsx`, and `index.html`.
   - Keyboard navigation, visible skip-link focus styling, and form input accessible labels (`aria-label`).
   - Color contrast conformance in dark graphite aesthetic (`variables.css`).
   - Truth-in-hardware power telemetry display ("Power Source: USB-C 5V Bus") in setup UI.
   - Verification of `tests/phase_g_integration.test.ts` and `tests/e2e/runner.mjs`.
3. Execute independent verification commands:
   - `npm run lint` in `d:\Personal projects\nova`
   - `npm run build` in `d:\Personal projects\nova`
   - `npx vitest run tests/phase_g_integration.test.ts`
   - `node tests/e2e/runner.mjs` (must pass 105/105 tests across Tiers 1-4)
4. Document your findings and write your review handoff report to:
   `d:\Personal projects\nova\.agents\teamwork\reviewer_g2\handoff.md`
   Explicitly state your verdict: **APPROVE** or **REQUEST_CHANGES**.
5. Send your verdict and summary via `send_message` to your parent orchestrator.

## 2026-10-16T09:53:56Z
You are reviewer_g2.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\reviewer_g2
Your mission is to perform an independent accessibility and cloud contract review of Phase G (System Integration & Hardware Validation).

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_integration_g1\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\reviewer_g2\DISPATCH.md

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Review WCAG 2.1 AA accessibility (color contrast, keyboard focus styling, ARIA attributes in SetupExperience.tsx, App.tsx, index.html) and web pairing console integration with backend endpoints.
3. Run independent verification commands:
   - npm run lint
   - npm run build
   - npx vitest run tests/phase_g_integration.test.ts
   - node tests/e2e/runner.mjs
4. Write your review handoff report to:
   d:\Personal projects\nova\.agents\teamwork\reviewer_g2\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your parent orchestrator.
