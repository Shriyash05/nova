# Task Assignment: Phase F Dead Code & Dependency Pruning Challenge (Challenger 1)

**Assigned Agent**: challenger_f1
**Role**: Adversarial Dependency & Dead Code Challenger
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\challenger_f1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Worker Handoff Report**: `d:\Personal projects\nova\.agents\teamwork\worker_frontend_f1\handoff.md`

## Mission
Empirically challenge Phase F dead code elimination and dependency pruning:
1. Verify that deleted paths (`components/flows`, `components/common`, `components/hardware`, `useWebBle`, `stateMachine.ts`) have zero residual references in `src/`.
2. Verify that `@supabase/supabase-js` is truly removed from `package.json` and 0 imports exist in `src/` or `api/`.
3. Verify capability honesty: confirm zero residual occurrences of simulated battery percentages (`batteryPercent`) in `SetupExperience.tsx` and `mockApi.ts`.
4. Run verification commands:
   - `npm run lint`
   - `npm run build`
   - `node tests/e2e/runner.mjs`
   - `npx vitest run tests/e2e/tier1_features/r9_dependency_pruning.test.ts`
   - `npx vitest run tests/e2e/tier2_boundaries/r9_boundary.test.ts`
5. Deliver report to:
   `d:\Personal projects\nova\.agents\teamwork\challenger_f1\handoff.md`
   Clearly specify your verdict: **APPROVE** or **REQUEST_CHANGES**.
6. Send your verdict via `send_message` to parent orchestrator.

## 2026-10-16T09:28:41Z
You are challenger_f1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\challenger_f1
Your mission is to empirically challenge Phase F dead code elimination and dependency pruning.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Worker handoff report: d:\Personal projects\nova\.agents\teamwork\worker_frontend_f1\handoff.md
4. Your dispatch: d:\Personal projects\nova\.agents\teamwork\challenger_f1\DISPATCH.md

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Empirically verify that 21 orphaned files are deleted, @supabase/supabase-js is pruned, and zero fake battery gauges remain.
3. Run verification commands:
   - npm run lint
   - npm run build
   - node tests/e2e/runner.mjs
   - npx vitest run tests/e2e/tier1_features/r9_dependency_pruning.test.ts
   - npx vitest run tests/e2e/tier2_boundaries/r9_boundary.test.ts
4. Write your report to:
   d:\Personal projects\nova\.agents\teamwork\challenger_f1\handoff.md
   State your verdict clearly: APPROVE or REQUEST_CHANGES.
5. Send your verdict via send_message to your orchestrator.

