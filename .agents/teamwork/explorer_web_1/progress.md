# Progress — explorer_web_1

Last visited: 2026-10-16T01:07:00Z
Status: COMPLETED

## Milestones & Activities
- [x] Initialized DISPATCH.md and progress tracking.
- [x] Initialized BRIEFING.md working memory.
- [x] Step 1: Scan repository tree, package.json, configuration files (tsconfig, vite.config.ts, vercel.json).
  - Stack reality: Vite 8.3.0 + React 19.2.8 SPA + Vercel Serverless Functions (`api/index.ts`, `api/health.ts`). NOT Next.js.
  - `@supabase/supabase-js` is a dead dependency in `package.json` (0 imports). Database uses direct `pg` pooler.
  - `api/` is omitted from `tsconfig.app.json` and `tsconfig.node.json`.
- [x] Step 2: Audit UI/Brand aesthetics and components against anti-slop guidelines.
  - Brutalist graphite foundation (`#090b10`) with OLED cyan accents (`#00f2fe`) and Archivo variable typography.
  - Authentic transparent prototype renders and CAD orthographic blueprint (`public/images/`).
  - Truthful marketing disclosures: pre-hardware prototype badges, locked pre-orders modal, honest waitlist.
  - Slop/Unverified violations: Fake battery gauge rendered in `SetupExperience.tsx:1038`; fake MQTT claims in `domain/device.ts` and `README.md`.
- [x] Step 3: Audit Supabase database tables, schema migrations, RLS policies, client vs server keys.
  - 12 tables in `schema.sql`, but ZERO RLS policies (`ENABLE ROW LEVEL SECURITY` missing from schema).
- [x] Step 4: Audit Notion OAuth integration (token lifecycle, refresh, revocation, persistence).
  - HMAC signed anti-CSRF state tokens, single-use database validation, AES-256-GCM envelope encryption at rest.
  - Notion access tokens are long-lived (no refresh tokens in Notion API). Disconnect scrubs encrypted token.
- [x] Step 5: Audit API endpoints, store/waitlist mechanics, device provisioning, pairing flows.
  - Rate limiting via PostgreSQL `rate_limits` table with fail-closed security.
  - Discovered 3 major security vulnerabilities in `api/index.ts`:
    1. Unauthenticated Google auth bypass via raw email (`api/index.ts:814-870`).
    2. IDOR in `GET /api/v1/user/devices` via `x-nova-user-id` header (`api/index.ts:883-897`).
    3. IDOR in `POST /api/v1/user/devices/link` without caller verification (`api/index.ts:938-957`).
- [x] Step 6: Identify secret leakage risks, dead code, broken dependencies, unverified claims.
  - 20 dead orphaned files identified (~3,200 LOC in `src/components/flows/*`, `src/components/common/*`, `src/components/hardware/*`, `src/components/dev/*`, `src/hooks/useWebBle.ts`, `src/hooks/useOnboarding.ts`, `src/domain/stateMachine.ts`).
  - Vitest test suite analysis: 28 test failures in `backendApi.test.ts` caused by rate-limit bleed on `127.0.0.1` and state cascading against live remote DB.
- [x] Step 7: Formulate KEEP / REFACTOR / REPLACE / REMOVE technical ledger.
- [x] Step 8: Write comprehensive report.md (`d:\Personal projects\nova\.agents\teamwork\explorer_web_1\report.md`).
- [x] Step 9: Write self-contained handoff.md (`d:\Personal projects\nova\.agents\teamwork\explorer_web_1\handoff.md`).
- [x] Step 10: Notify orchestrator.
