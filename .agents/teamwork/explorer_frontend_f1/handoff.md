# Exploration Handoff Report: Phase F — Frontend & Setup Experience

**Explorer**: `explorer_frontend_f1` (Frontend Architecture & Accessibility Explorer)  
**Date**: 2026-10-16  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\explorer_frontend_f1`  
**Milestone**: Phase F Frontend & Setup Experience Exploration  
**Authoritative Specification**: `PROJECT.md § 3.2, § 5.3` & `ORIGINAL_REQUEST.md § R5, R8, R9`  
**Skill Reference**: `design-taste-frontend` (`SKILL.md`)  

---

## 1. Observation

### 1.1 Dead Code & Orphaned Files (R9-PRUNE)
An exhaustive graph-based static analysis was conducted across `src/`, `api/`, `tests/`, and `package.json`:

1. **`src/components/flows/` (9 files, 102,272 bytes, ~2,100 LOC)**:
   - `DeviceDashboardScreen.tsx` (19,932 B)
   - `DeviceVerificationScreen.tsx` (4,336 B)
   - `NotionAuthScreen.tsx` (8,638 B)
   - `QrScannerScreen.tsx` (7,668 B)
   - `SetupCompleteScreen.tsx` (5,501 B)
   - `WelcomeScreen.tsx` (4,651 B)
   - `WifiProfilesVault.tsx` (32,746 B)
   - `WifiProvisionScreen.tsx` (12,106 B)
   - `WifiRecoveryModal.tsx` (6,694 B)
   *Grep Result*: Zero imports across active application code (`App.tsx`, `SetupExperience.tsx`, `src/components/marketing/*`). They only import each other and `components/common/` / `components/hardware/`.

2. **`src/components/common/` (5 files, 6,969 bytes, ~320 LOC)**:
   - `Badge.tsx` (529 B)
   - `Button.tsx` (1,038 B)
   - `Card.tsx` (577 B)
   - `Header.tsx` (2,556 B)
   - `Modal.tsx` (2,269 B)
   *Grep Result*: Imported only by orphaned flow components and `DevModeDrawer.tsx`. Zero imports from active production components.

3. **`src/components/hardware/` (3 files, 12,838 bytes, ~380 LOC)**:
   - `NovaDeviceMockup.tsx` (6,759 B)
   - `OledDisplayGuide.tsx` (4,884 B)
   - `SignalStrength.tsx` (1,195 B)
   *Grep Result*: Imported only by orphaned flow components (`SetupCompleteScreen.tsx`, `WifiRecoveryModal.tsx`, `WifiProvisionScreen.tsx`, `WelcomeScreen.tsx`, `DeviceVerificationScreen.tsx`, `DeviceDashboardScreen.tsx`). Zero active imports.

4. **`src/hooks/useWebBle.ts` (2,458 bytes, 87 LOC)**:
   *Grep Result*: Zero imports across the entire repository. Web BLE was superseded by local SoftAP provisioning and single-use QR pairing tokens.

5. **`src/domain/stateMachine.ts` (1,966 bytes, 78 LOC) & `src/hooks/useOnboarding.ts` (13,061 bytes, 481 LOC)**:
   *Grep Result*: `stateMachine.ts` is imported only by `useOnboarding.ts` and `src/__tests__/stateMachine.test.ts`. `useOnboarding.ts` is imported by zero files. Neither is used by `App.tsx` or `SetupExperience.tsx`.

6. **`src/components/dev/DevModeDrawer.tsx` (14,400 bytes, 420 LOC)**:
   *Grep Result*: Zero imports across `App.tsx` or any active component.

7. **`@supabase/supabase-js` in `package.json:14`**:
   - Declared as `"@supabase/supabase-js": "^2.117.3"`.
   *Grep Result*: 0 imports across all `.ts`, `.tsx`, `.js`, `.mjs` in the codebase. Backend connects via `pg.Pool` directly to PostgreSQL; web client uses REST endpoints.

### 1.2 Capability Honesty & UI Telemetry (R8-HONESTY)
1. **`src/components/setup/SetupExperience.tsx`**:
   - Line 56: `batteryPercent: number;` in state definition.
   - Line 111: `batteryPercent: res.data.device.batteryPercent || 100,`
   - Lines 1035–1040 verbatim:
     ```tsx
     <div>
       <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Battery</div>
       <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f2f4f8', marginTop: '0.15rem' }}>
         {deviceData?.batteryPercent ?? 100}%
       </div>
     </div>
     ```
2. **`src/api/mockApi.ts:43-44`**:
   ```ts
   batteryPercent: 94,
   isCharging: false,
   ```
3. **`src/domain/device.ts:23-24`**:
   ```ts
   batteryPercent: number;
   isCharging: boolean;
   ```
4. **`src/components/marketing/ProductExperience.tsx:370`**:
   ```tsx
   <span>BATTERY: 5V USB</span>
   ```
   (Accurately indicates 5V USB, but would be even cleaner as `POWER: USB-C 5V BUS`).

### 1.3 Anti-Slop Brand Identity & Styling (R5-BRAND / design-taste-frontend)
1. **Design Tokens (`src/styles/variables.css`)**:
   - Solid graphite ground `--bg-app: #090b10` with deliberate surface stepping: `--bg-surface: #121620`, `--bg-surface-elevated: #181e2b`.
   - OLED cyan accent `--accent-cyan: #00f2fe`.
   - Structural borders `--border-subtle: #202737`, `--border-strong: #2e384e`.
   - Strict adherence: zero generic purple AI gradients, solid card backgrounds (`.solid-card`), zero blurry drop-shadows on rested elements.
2. **Anti-Slop Deviations / "Tells" Observed**:
   - `HeroSection.tsx:28-45`: Eyebrow pill badge (`Industrial Design Concept • Pre-Hardware Prototype`) directly above `<h1>`. Violates `design-taste-frontend` House Rule 3 ("No eyebrows... Put the information in the heading or first sentence, or drop it").
   - `LaunchSignupSection.tsx:89-100`: Uppercase letter-spaced eyebrow `Hardware Availability` above `<h2>`.
   - `HowItWorksSection.tsx:87, 136, 184, 233`: Index numbering labels ("Layer 01 •", "Layer 02 •", etc.) violate House Rule 298 ("No index numbering. No 01 / 02 / 03").
   - `src/styles/components.css`: Contains legacy styles referencing undefined `--gradient-cyan` (lines 34, 73, 607) and card shadows for old flows. Active marketing and setup components do not use these classes.

### 1.4 Device Pairing Flow Integration (R5-ONBOARD)
1. **Routing & Entry**:
   - `App.tsx:22-39` monitors URL params: `code`, `token`, `claim_token`, `short_code`, `notion_auth`, `setup`, `d`, `deviceId`. If present, transitions immediately to `device_lab` mode (`SetupExperience.tsx`).
2. **Claiming**:
   - `SetupExperience.tsx:193-231` supports manual token entry, short code entry (`NOV-A9EC`), or camera QR scanning via `QrCameraScannerModal.tsx` (`jsqr` inverted QR parsing).
   - Dispatches `POST /api/v1/devices/claim`.
   - Sets session token `apiClient.setSessionToken(pairingSessionId)` and saves to `localStorage.setItem('nova_paired_device_id', pairedId)`.
3. **Telemetry & Configuration**:
   - Calls `GET /api/v1/devices/:id/status` (fetches firmware version, RSSI, status).
   - Calls `GET /api/v1/devices/:id/wifi-profiles` (manages 5 persistent voice-indexed network profiles).
   - Notion integration triggers `apiClient.authorizeNotion()`, tests live synchronization via `POST /api/v1/devices/:id/sync/test`, and revokes tokens via `POST /api/v1/devices/:id/notion/disconnect`.

### 1.5 Accessibility Audit (WCAG 2.1 AA)
1. **Color Contrast**:
   - `#f0f4f8` on `#090b10`: 16.7:1 (Passes AAA).
   - `#94a3b8` on `#090b10`: 7.3:1 (Passes AAA).
   - `#8b9bb4` on `#090b10`: 6.5:1 (Passes AA).
   - `#00f2fe` on `#090b10`: 14.8:1 (Passes AAA).
   - Button text `#05080f` on `#00f2fe`: 14.3:1 (Passes AAA).
   - Error color `#ef4444` on `#121620`: 4.2:1 (Slightly below 4.5:1 threshold for normal text; recommended: `#f87171` at 6.3:1).
2. **Keyboard Focus & Skip Link Defect**:
   - `App.tsx:64`: `<a href="#main-content" className="sr-only">Skip to main content</a>`.
   - Defect: `.sr-only` clips the link permanently to 1px with no `:focus` rule. `src/styles/global.css:42-60` defines `.skip-link` with `top: 1rem; outline: 2px solid #ffffff;`. The skip link in `App.tsx` failed to use `className="skip-link"`, rendering it permanently invisible to keyboard navigators.
3. **Form Labels**:
   - `LaunchSignupSection.tsx`: Complete `<label htmlFor="...">`, `aria-required`, `aria-invalid`, `aria-describedby`, and `role="alert"`.
   - `SetupExperience.tsx:1207-1235`: Wi-Fi SSID and Password inputs lack `<label>` or `aria-label`, relying solely on `placeholder`. Violates WCAG 3.3.2 and 1.3.1.
4. **Modal Semantics**:
   - `LockedActionModal.tsx` and `QrCameraScannerModal.tsx` include `role="dialog"`, `aria-modal="true"`, `Escape` key listeners, and body scroll lock.

### 1.6 Verification Baseline Execution
- `npm run lint`:
  ```
  Found 0 warnings and 0 errors.
  Finished in 117ms on 47 files with 116 rules using 8 threads.
  ```
- `npm run build`:
  ```
  ✓ 1937 modules transformed.
  dist/index.html                   4.55 kB
  dist/assets/index-jNGx2VWV.css   15.36 kB
  dist/assets/index-CBdSL1Ui.js   496.56 kB
  ✓ built in 657ms
  ```
- `npm test`:
  - 29 of 30 test files passed (229 passed tests across Tiers 1–4).
  - 1 failure: `src/__tests__/backendApi.test.ts` (32 tests failed due to Phase E in-progress backend auth & IDOR refactoring).

---

## 2. Logic Chain

1. **Dead Code Verification**:
   - *Observation 1.1* shows 21 files across `src/components/flows/`, `src/components/common/`, `src/components/hardware/`, `src/hooks/`, and `src/components/dev/` have zero incoming import references from `App.tsx`, `SetupExperience.tsx`, or `components/marketing/`.
   - *Observation 1.1* shows `@supabase/supabase-js` is not imported anywhere in the project.
   - *Deduction*: Deleting these 21 files (~3,600 LOC) and pruning `@supabase/supabase-js` from `package.json` will eliminate ~140KB of dead code without breaking `npm run build` or any Tier 1–4 E2E test.
   - *Deduction regarding `stateMachine.test.ts`*: `src/__tests__/stateMachine.test.ts` tests the legacy React onboarding reducer in `src/domain/stateMachine.ts`. Firmware state machine verification has been completely migrated to `test_nova_fsm.py` (9/9 pass). Removing `src/domain/stateMachine.ts` requires removing `src/__tests__/stateMachine.test.ts` to keep the test suite green.

2. **Hardware Telemetry Honesty**:
   - *Observation 1.2* shows `SetupExperience.tsx:1038` displays `{deviceData?.batteryPercent ?? 100}%` and `mockApi.ts:43` returns `batteryPercent: 94`.
   - Hardware truth (*PROJECT.md § 1 & § 3.2*): Hardware on COM5 is powered directly via USB-C 5V bus and has no battery fuel gauge IC.
   - *Deduction*: Displaying a percentage simulates a nonexistent hardware battery gauge. Replacing this with `"Power Source: USB-C 5V Bus"` achieves 100% capability honesty.

3. **Anti-Slop Brand Refinement**:
   - *Observation 1.3* shows the dark graphite theme, Archivo typography, and transparent hardware renders establish a strong, bespoke visual identity.
   - However, eyebrow pill labels (`Industrial Design Concept • Pre-Hardware Prototype` above `<h1>` and `Hardware Availability` above `<h2>`) and numbered step prefixes ("Layer 01 •") introduce recognizable generative template tells.
   - *Deduction*: Removing the eyebrow above `<h1>` allows the headline to lead cleanly. The hardware disclosure remains thoroughly covered by the dedicated disclosure callout. Dropping index numbering aligns with anti-slop guidelines.

4. **Accessibility Compliance**:
   - *Observation 1.5* proves the skip link in `App.tsx:64` is unstyled on focus due to using `className="sr-only"` rather than `className="skip-link"`.
   - *Observation 1.5* proves the Wi-Fi vault input fields lack programmatic labels.
   - *Deduction*: Applying `className="skip-link"` restores keyboard skip navigation. Adding `aria-label` or `<label>` elements to Wi-Fi inputs brings the forms into full WCAG 2.1 AA compliance.

---

## 3. Caveats

1. **Backend Integration Boundary**: The test failure in `src/__tests__/backendApi.test.ts` is scoped entirely to Milestone E (Backend & API Hardening) where Google Auth bypass and IDOR header handling are undergoing refactoring. Frontend unit and build checks are completely isolated from this backend failure.
2. **Camera Permissions in Web Context**: `QrCameraScannerModal.tsx` requires browser camera permissions (`navigator.mediaDevices.getUserMedia`). On insecure HTTP origins or devices without cameras, the modal gracefully falls back to manual token entry without blocking setup.
3. **No Caveats on Dead Code**: All 21 orphaned files were verified with full recursive grep searches across the repository; none are referenced dynamically or through barrel files.

---

## 4. Conclusion

Phase F frontend requirements are fully mapped, verified, and ready for clean implementation.

### 4.1 Concrete Action Plan for Implementation:

#### A. Dead Code Deletions (R9-PRUNE)
Delete the following 21 files and 1 orphaned test:
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
- Remove `"@supabase/supabase-js": "^2.117.3"` from `package.json`.

#### B. Capability Honesty Refactor (R8-HONESTY)
1. **`src/components/setup/SetupExperience.tsx`**:
   - In `deviceData` state: Replace `batteryPercent: number;` with `powerSource?: string;`.
   - In `fetchDeviceStatus`: Replace `batteryPercent: res.data.device.batteryPercent || 100,` with `powerSource: 'USB-C 5V Bus',`.
   - In lines 1035–1040:
     ```tsx
     // Before:
     <div>
       <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Battery</div>
       <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f2f4f8', marginTop: '0.15rem' }}>
         {deviceData?.batteryPercent ?? 100}%
       </div>
     </div>

     // After:
     <div>
       <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Power Source</div>
       <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#00e5ff', marginTop: '0.15rem' }}>
         USB-C 5V Bus
       </div>
     </div>
     ```
2. **`src/api/mockApi.ts:43`**:
   - Replace `batteryPercent: 94, isCharging: false,` with `powerSource: 'USB-C 5V Bus',`.
3. **`src/domain/device.ts:23`**:
   - Replace `batteryPercent: number; isCharging: boolean;` with `powerSource: 'USB-C 5V Bus' | 'usb_5v';`.

#### C. Brand Identity & Anti-Slop (R5-BRAND)
1. **`src/components/marketing/HeroSection.tsx:28-45`**:
   - Remove the eyebrow pill `<div style={{ display: 'inline-flex', ... }}>Industrial Design Concept • Pre-Hardware Prototype</div>`.
2. **`src/components/marketing/HowItWorksSection.tsx`**:
   - Remove index prefixes ("Layer 01 •", "Layer 02 •") from section sub-headers.

#### D. Accessibility Fixes (WCAG 2.1 AA)
1. **`src/App.tsx:64`**:
   - Change `className="sr-only"` to `className="skip-link"`.
2. **`src/components/setup/SetupExperience.tsx:1207-1235`**:
   - Add `aria-label="Wi-Fi Network Name (SSID)"` to the SSID input.
   - Add `aria-label="Wi-Fi Password"` to the password input.

---

## 5. Verification Method

To independently verify the frontend state and any subsequent implementation:

1. **Dead Code & Dependency Pruning Verification**:
   ```pwsh
   # Confirm no active code imports deleted paths:
   rg "components/flows" src/
   rg "components/common" src/
   rg "components/hardware" src/
   rg "useWebBle" src/
   rg "@supabase/supabase-js" src/ api/
   ```
   *Expected*: Zero matches outside git history.

2. **TypeScript & Production Build Verification**:
   ```pwsh
   npm run lint
   npm run build
   ```
   *Expected*: `oxlint` returns 0 warnings, 0 errors. Vite builds `dist/` cleanly under 1 second.

3. **E2E Feature & Boundary Tests**:
   ```pwsh
   npx vitest run tests/e2e/tier1_features/r5_web_platform.test.ts
   npx vitest run tests/e2e/tier1_features/r9_dependency_pruning.test.ts
   npx vitest run tests/e2e/tier2_boundaries/r9_boundary.test.ts
   ```
   *Expected*: 100% pass rate.

4. **Hardware Telemetry Check**:
   ```pwsh
   rg "batteryPercent" src/components/setup/SetupExperience.tsx
   ```
   *Expected*: Zero occurrences. Telemetry card renders `"Power Source"` and `"USB-C 5V Bus"`.

5. **Accessibility Verification**:
   - Inspect `#main-content` skip link in browser; press Tab on page load and confirm skip link slides into view at `top: 1rem` with visible white outline.
   - Inspect Wi-Fi SSID and Password inputs in `SetupExperience.tsx`; verify accessible names via Chrome DevTools Accessibility pane or `aria-label`.
