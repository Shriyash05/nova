# Handoff Report: Web Platform, Cloud Architecture & Security Baseline

**Agent**: `explorer_web_1`  
**Role**: Frontend, Backend & Cloud Architecture Specialist / Explorer  
**Task**: Baseline Discovery (R1) across Web Stack, Cloud APIs, Database, and Brand Identity  
**Handoff Type**: Hard Handoff (Investigation Complete)  
**Target Recipient**: Orchestrator (`e451ddc2-d7f0-4749-bf7f-ed93de42ccc6`) & Engineering Team  
**Comprehensive Report**: `d:\Personal projects\nova\.agents\teamwork\explorer_web_1\report.md`

---

## 1. Observation

### O1. Stack Reality & Build Configuration
- `package.json:1-33`: Uses Vite 8.3.0, React 19.2.8, TypeScript 6.0.2, and Vercel serverless functions (`@vercel/node: ^24.0.0`). The project is **NOT Next.js**.
- `vite.config.ts:8-22`: Implements `apiDevPlugin` middleware to route `/api/*` requests in local development directly to `./api/index.ts`.
- `vercel.json:3-16`: Configures rewrites for production deployment on Vercel:
  ```json
  "rewrites": [
    { "source": "/api/health", "destination": "/api/health.ts" },
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
  ```
- `tsconfig.app.json:25`: `"include": ["src"]`. `tsconfig.node.json:22`: `"include": ["vite.config.ts"]`. Neither configuration includes `api/`.
- `package.json:14`: Contains `"@supabase/supabase-js": "^2.117.3"`. Ripgrep search across `src/` and `api/` for `@supabase/supabase-js` returns **zero matches**.

### O2. Database & Row Level Security (RLS)
- `schema.sql:1-178`: Defines 12 tables (`devices`, `device_bootstrap_credentials`, `wifi_profiles`, `claim_tokens`, `pairing_sessions`, `notion_authorizations`, `device_actions`, `rate_limits`, `oauth_states`, `launch_subscribers`, `users`, `user_devices`).
- `schema.sql`: Contains **0 occurrences** of `ROW LEVEL SECURITY` or `POLICY`.
- `api/index.ts:14-23`: Connects to PostgreSQL directly using `pg.Pool` with connection string from `process.env.DATABASE_URL` (`aws-0-ap-south-1.pooler.supabase.com:6543`).

### O3. Critical Security Vulnerabilities
- `api/index.ts:814-870` (`POST /api/v1/auth/google`):
  ```ts
  let email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const credential = req.body?.credential;
  if (typeof credential === 'string' && credential.trim()) { ... }
  // When credential is absent, skips verification and inserts/authenticates with req.body.email!
  ```
- `api/index.ts:883-897` (`GET /api/v1/user/devices`):
  ```ts
  const customUserId = getHeader(req, 'x-nova-user-id') || (req.query?.userId as string);
  let targetUserId = customUserId;
  // If customUserId exists, queries devices for that userId WITHOUT checking Bearer token!
  ```
- `api/index.ts:938-957` (`POST /api/v1/user/devices/link`): Accepts `userId` and `deviceId` to create a permanent ownership link in `user_devices` without checking caller session ownership.

### O4. Notion OAuth & Token Security
- `api/index.ts:401-434`: Generates signed state tokens `state_<deviceId>_<timestamp>_<nonce>_<sig>` using HMAC-SHA256 (`SESSION_SECRET`). Validated upon callback.
- `api/index.ts:2489-2494`: Persists state in `oauth_states` table. Callback sets `is_used = TRUE` before contacting Notion (`2628`). Replay returns HTTP 400 `STATE_ALREADY_USED`.
- `api/index.ts:175-219`: Encrypts Notion access tokens with AES-256-GCM (`iv:tag:ciphertext`). Sourced from `process.env.NOTION_ENCRYPTION_KEY`. Throws if missing in production.

### O5. Brand Aesthetic, Anti-Slop & Unverified Capability Claims
- `variables.css:1-65`: Solid graphite foundation (`#090b10`, `#121620`, `#181e2b`, `#222938`) with OLED cyan accents (`#00f2fe`). Archivo display font with condensed variable width.
- `public/images/`: 3 real image assets (`nova-blueprint-master.jpg`, `nova-transparent-hero.jpg`, `nova-front-expression.jpg`).
- `HeroSection.tsx:43`: Displays `"Industrial Design Concept • Pre-Hardware Prototype"`.
- `LockedActionModal.tsx:126`: Discloses pre-orders are locked until physical validation.
- `SetupExperience.tsx:1038`: Renders `{deviceData?.batteryPercent ?? 100}%` under a `"Battery"` label, and `mockApi.ts:43` defines `batteryPercent: 94`. The ESP32-C3 Super Mini development board is USB-bus powered and lacks a battery fuel gauge or charging IC.

### O6. Dead Code & Orphaned Legacy Islands
- 20 files in `src/` are completely orphaned from `App.tsx`:
  - `src/components/flows/*` (9 files)
  - `src/components/common/*` (5 files)
  - `src/components/hardware/*` (3 files)
  - `src/components/dev/DevModeDrawer.tsx` (1 file)
  - `src/hooks/useWebBle.ts` (1 file, containing simulated `setTimeout` mock)
  - `src/hooks/useOnboarding.ts` (1 file)
  - `src/domain/stateMachine.ts` (1 file)

### O7. Test Suite Execution & Diagnostics
- `npm test` (`vitest run`): 43 passed, 28 failed (71 total).
- Verbatim failure 1: `AssertionError: expected 400 to be 200` on `POST /api/v1/devices/claim`.
- Verbatim failure 27: `AssertionError: expected 429 to be 400` on `POST /api/v1/launch-signup`.
- Isolated test command: `npx vitest run src/__tests__/backendApi.test.ts -t "POST /api/v1/devices"` executed with 18 passed, proving routes function correctly when rate-limit buckets from `127.0.0.1` are not exhausted.

---

## 2. Logic Chain

1. **Stack & Tooling Alignment**: From [O1], the app is a Vite SPA with Vercel serverless functions, not Next.js. Because `tsconfig.app.json` only includes `src/` and `tsconfig.node.json` only includes `vite.config.ts`, `api/` is omitted from `tsc -b`. Adding `api/` to TypeScript configuration ensures full backend compilation safety.
2. **Database Security Risk**: From [O2], the backend uses direct `pg.Pool` connection strings, but `schema.sql` does not enable RLS on any of the 12 tables. If Supabase PostgREST endpoints are exposed with the project `anon` key, any external client can read or modify tables directly without passing through `api/index.ts`. Enforcing RLS and revoking `anon` grants is mandatory.
3. **Authentication Vulnerabilities**: From [O3], `POST /api/v1/auth/google` accepts unverified raw emails when `credential` is omitted, allowing trivial account takeover. Furthermore, `GET /api/v1/user/devices` and `POST /api/v1/user/devices/link` honor `x-nova-user-id` without validating caller session tokens, creating IDOR vulnerabilities.
4. **Notion OAuth Integrity**: From [O4], Notion integration has robust anti-CSRF HMAC state tokens, single-use database protection, and AES-256-GCM encryption at rest. Notion access tokens are long-lived; disconnect cleanly scrubs the token.
5. **Anti-Slop & Truth-in-Hardware Compliance**: From [O5], the marketing interface is high-taste and honest, but the setup console displays a fabricated battery percentage. Because the hardware BOM has no battery monitor, this metric violates the "Zero unverified capability claims" directive.
6. **Codebase Pruning**: From [O1] and [O6], `@supabase/supabase-js` and 20 legacy files (~3,200 LOC) in `src/` have 0 active runtime connections. Removing them eliminates dead maintenance overhead.
7. **Test Suite Stabilization**: From [O7], `backendApi.test.ts` fails in full runs due to distributed rate-limit bleed on `127.0.0.1` against the live remote Supabase pooler. Randomizing client mock IPs and resetting rate-limits between test suites will restore green test passes.

---

## 3. Caveats

1. **Remote Supabase Pooler Dependency**: The test suite currently tests against the live remote Supabase database (`aws-0-ap-south-1.pooler.supabase.com:6543`). If network connectivity to AWS Mumbai is degraded, integration test durations increase and connection timeouts can occur.
2. **Physical Hardware Verification**: Hardware testing on COM5 and firmware verification in `C:\NOVA-IDF\nova_wake_test` are assigned to `explorer_firmware_1`. This web report evaluates web contracts against documented hardware specs (ESP32-C3 Super Mini, SSD1306, MAX4466).
3. **No Unrelated Code Modifications**: In strict compliance with read-only Explorer constraints, no source code files outside `.agents/teamwork/explorer_web_1/` were modified.

---

## 4. Conclusion

The NOVA web and cloud stack has a solid, high-performance foundation (Vite 8 SPA, React 19, Vercel Serverless Functions, AES-256-GCM envelope encryption, and honest marketing disclosures), but suffers from four critical issues requiring immediate engineering action in subsequent phases:
1. **Critical Security Holes**: Patch Google auth bypass (`api/index.ts:814`) and IDORs (`api/index.ts:884, 938`).
2. **Missing Supabase RLS**: Apply `ENABLE ROW LEVEL SECURITY` across all 12 tables and revoke `anon` role permissions in `schema.sql`.
3. **Dead Code Elimination**: Prune `@supabase/supabase-js` and delete 20 orphaned legacy files (~3,200 lines).
4. **Hardware Truth Correction**: Replace the fabricated battery gauge in `SetupExperience.tsx:1038` with `"Power: USB-C 5V Bus"`.

---

## 5. Verification Method

To independently verify all observations and conclusions:

1. **Verify Build & Typecheck**:
   ```pwsh
   npm run build
   # Observed: tsc -b && vite build succeeds in ~500ms
   ```
2. **Verify Linter**:
   ```pwsh
   npm run lint
   # Observed: oxlint src api checks 47 files with 0 warnings and 0 errors
   ```
3. **Verify Dead Code Isolation**:
   ```pwsh
   # Search for imports of legacy flow screens
   npx ripgrep "components/flows" src/
   # Observed: 0 matches outside dead files
   ```
4. **Verify Google Auth Bypass Code**:
   Inspect `d:\Personal projects\nova\api\index.ts` lines 814 to 870 to confirm unauthenticated `req.body.email` fallback.
5. **Verify Missing RLS in Schema**:
   ```pwsh
   npx ripgrep "ROW LEVEL SECURITY" schema.sql
   # Observed: 0 matches
   ```
6. **Verify Rate-Limit Integration Test Behavior**:
   ```pwsh
   # Run isolated devices sub-suite (proves logic passes when not rate-limited)
   npx vitest run src/__tests__/backendApi.test.ts -t "POST /api/v1/devices"
   ```
