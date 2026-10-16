# Task Assignment: Phase F Frontend & Setup Experience Implementation

**Assigned Agent**: worker_frontend_f1
**Role**: Frontend, UX & Anti-Slop Specialist / Worker
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\worker_frontend_f1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Explorer Report**: `d:\Personal projects\nova\.agents\teamwork\explorer_frontend_f1\handoff.md`
**Domain Skill**: `d:\Personal projects\nova\.agents\skills\design-taste-frontend\SKILL.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You own and have exclusive write permission on:
- `src/components/flows/` (deletion of 9 files)
- `src/components/common/` (deletion of 5 files)
- `src/components/hardware/` (deletion of 3 files)
- `src/hooks/useWebBle.ts`, `src/hooks/useOnboarding.ts` (deletion)
- `src/domain/stateMachine.ts`, `src/components/dev/DevModeDrawer.tsx`, `src/__tests__/stateMachine.test.ts` (deletion)
- `package.json` (prune `@supabase/supabase-js`)
- `src/components/setup/SetupExperience.tsx`
- `src/api/mockApi.ts`
- `src/domain/device.ts`
- `src/components/marketing/HeroSection.tsx`
- `src/components/marketing/HowItWorksSection.tsx`
- `src/App.tsx`

## Implementation Tasks

### 1. Dead Code Elimination (R9-PRUNE)
Delete the 21 verified orphaned files:
- `src/components/flows/DeviceDashboardScreen.tsx`
- `src/components/flows/DeviceVerificationScreen.tsx`
- `src/components/flows/NotionAuthScreen.tsx`
- `src/components/flows/QrScannerScreen.tsx`
- `src/components/flows/SetupCompleteScreen.tsx`
- `src/components/flows/WelcomeScreen.tsx`
- `src/components/flows/WifiProfilesVault.tsx`
- `src/components/flows/WifiProvisionScreen.tsx`
- `src/components/flows/WifiRecoveryModal.tsx`
- `src/components/common/Badge.tsx`
- `src/components/common/Button.tsx`
- `src/components/common/Card.tsx`
- `src/components/common/Header.tsx`
- `src/components/common/Modal.tsx`
- `src/components/hardware/NovaDeviceMockup.tsx`
- `src/components/hardware/OledDisplayGuide.tsx`
- `src/components/hardware/SignalStrength.tsx`
- `src/hooks/useWebBle.ts`
- `src/hooks/useOnboarding.ts`
- `src/domain/stateMachine.ts`
- `src/components/dev/DevModeDrawer.tsx`
- `src/__tests__/stateMachine.test.ts`
Prune `"@supabase/supabase-js"` from `package.json`.

### 2. Capability Honesty (R8-HONESTY)
- In `src/components/setup/SetupExperience.tsx`:
  - Update `deviceData` state: replace `batteryPercent` with `powerSource: string`.
  - In `fetchDeviceStatus`: set `powerSource: 'USB-C 5V Bus'`.
  - In telemetry card (around line 1035): replace the Battery card with:
    ```tsx
    <div>
      <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Power Source</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#00e5ff', marginTop: '0.15rem' }}>
        USB-C 5V Bus
      </div>
    </div>
    ```
- In `src/api/mockApi.ts:43`: replace `batteryPercent` with `powerSource: 'USB-C 5V Bus'`.
- In `src/domain/device.ts:23`: update device interface to include `powerSource: 'USB-C 5V Bus' | 'usb_5v'`.

### 3. Anti-Slop Brand Identity & Styling (R5-BRAND)
- In `src/components/marketing/HeroSection.tsx`: remove the eyebrow pill badge above `<h1>`.
- In `src/components/marketing/HowItWorksSection.tsx`: remove numbered step prefixes ("Layer 01 •", "Layer 02 •").

### 4. Accessibility Compliance (WCAG 2.1 AA)
- In `src/App.tsx:64`: change `<a href="#main-content" className="sr-only">` to `className="skip-link"`.
- In `src/components/setup/SetupExperience.tsx`: add `aria-label="Wi-Fi Network Name (SSID)"` and `aria-label="Wi-Fi Password"` to the Wi-Fi vault inputs.

## Verification Commands
Execute and confirm:
1. `npm run lint` (0 warnings, 0 errors)
2. `npm run build` (clean Vite build)
3. `node tests/e2e/runner.mjs` (105/105 pass)
4. `npx vitest run tests/e2e/tier1_features/r5_web_platform.test.ts`
5. `npx vitest run tests/e2e/tier1_features/r9_dependency_pruning.test.ts`
6. `npx vitest run tests/e2e/tier2_boundaries/r9_boundary.test.ts`

Deliver your report to:
`d:\Personal projects\nova\.agents\teamwork\worker_frontend_f1\handoff.md`
Send completion message via `send_message` to parent orchestrator.


## 2026-10-16T09:15:56Z
[Message] timestamp=2026-10-16T09:15:56Z sender=5e4ae70f-bf0a-4e13-985b-f4457de8a2da priority=MESSAGE_PRIORITY_HIGH
You are worker_frontend_f1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\worker_frontend_f1
Your mission is to implement Phase F Frontend & Setup Experience for the NOVA 1.0 Autonomous Multi-Agent Product Engineering Mission.
Scope & Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Delete the 21 verified orphaned files across src/components/flows/, src/components/common/, src/components/hardware/, src/hooks/, src/domain/stateMachine.ts, DevModeDrawer.tsx, and stateMachine.test.ts.
3. Prune "@supabase/supabase-js" from package.json.
4. In src/components/setup/SetupExperience.tsx, src/api/mockApi.ts, and src/domain/device.ts: replace simulated battery percentages with honest "Power Source: USB-C 5V Bus" telemetry.
5. In src/components/marketing/HeroSection.tsx and HowItWorksSection.tsx: remove eyebrow pill badge above h1 and remove index prefixes ("Layer 01 •") to eliminate AI template tells.
6. In src/App.tsx and SetupExperience.tsx: fix skip link focus styling (use className="skip-link") and add aria-labels to Wi-Fi inputs for WCAG 2.1 AA accessibility.
7. Run all verification commands:
   - npm run lint
   - npm run build
   - node tests/e2e/runner.mjs
   - npx vitest run tests/e2e/tier1_features/r5_web_platform.test.ts
   - npx vitest run tests/e2e/tier1_features/r9_dependency_pruning.test.ts
   - npx vitest run tests/e2e/tier2_boundaries/r9_boundary.test.ts
8. Deliver your handoff report to:
   d:\Personal projects\nova\.agents\teamwork\worker_frontend_f1\handoff.md
9. Send completion message via send_message to your orchestrator.
