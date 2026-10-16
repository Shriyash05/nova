# Task Assignment: Phase F Frontend & Setup Experience Exploration

**Assigned Agent**: explorer_frontend_f1
**Role**: Frontend Architecture & Accessibility Explorer
**Working Directory**: d:\Personal projects\nova\.agents\teamwork\explorer_frontend_f1
**Authoritative Reference**: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Index**: d:\Personal projects\nova\PROJECT.md
**Skill Reference**: `d:\Personal projects\nova\.agents\skills\design-taste-frontend\SKILL.md`

## Mission & Scope
Map and analyze all requirements for Phase F (Frontend & Setup Experience):
1. **Dead Code & Orphaned Files (R9-PRUNE)**:
   - Identify all orphaned legacy files listed in `PROJECT.md § 3.2` (`src/components/flows/`, `src/components/common/`, `src/components/hardware/`, `src/hooks/useWebBle.ts`, `src/domain/stateMachine.ts`).
   - Check if any active components import them.
   - Check `@supabase/supabase-js` in `package.json` (confirm 0 imports across codebase).
2. **Capability Honesty (R8-HONESTY)**:
   - Locate simulated battery gauges (e.g. `deviceData?.batteryPercent`, battery icons, percentage displays) in `src/components/setup/SetupExperience.tsx`, `src/lib/mockApi.ts`, and other UI components.
   - Specify replacement with honest `"Power: USB-C 5V Bus"`.
3. **Anti-Slop Brand Identity & Styling (R5-BRAND)**:
   - Evaluate `src/styles/variables.css`, `HeroSection.tsx`, `LockedActionModal.tsx`, and landing page components against `design-taste-frontend` principles (dark graphite `#090b10`, OLED cyan `#00f2fe`, tactile borders, deliberate typography).
4. **Device Pairing Flow & Setup Experience (R5-ONBOARD)**:
   - Analyze pairing wizard flow in `SetupExperience.tsx`: how claim token / short code is entered, connection to `POST /api/v1/devices/claim` and `GET /api/v1/user/devices`.
5. **WCAG 2.1 AA Accessibility**:
   - Audit color contrast, keyboard focus states, form labels, ARIA landmarks, and screen reader announcements.
6. **Verification Baseline**:
   - Confirm `npm run lint` and `npm run build` behavior.

Deliver your exploration report to:
`d:\Personal projects\nova\.agents\teamwork\explorer_frontend_f1\handoff.md`
Report completion via `send_message` to parent orchestrator.


## 2026-10-16T09:04:45Z
Sender: 5e4ae70f-bf0a-4e13-985b-f4457de8a2da
Message:
You are explorer_frontend_f1.
Your working directory is: d:\Personal projects\nova\.agents\teamwork\explorer_frontend_f1
Your mission is to map and analyze all requirements for Phase F (Frontend & Setup Experience) for the NOVA 1.0 Autonomous Multi-Agent Product Engineering Mission.

Read the following files carefully:
1. ORIGINAL_REQUEST.md: d:\Personal projects\nova\.agents\teamwork\ORIGINAL_REQUEST.md
2. Authoritative specification: d:\Personal projects\nova\PROJECT.md
3. Your dispatch: d:\Personal projects\nova\.agents\teamwork\explorer_frontend_f1\DISPATCH.md
4. Skill reference: d:\Personal projects\nova\.agents\skills\design-taste-frontend\SKILL.md

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Investigate dead code & orphaned files (src/components/flows/, src/components/common/, src/components/hardware/, src/hooks/useWebBle.ts, src/domain/stateMachine.ts) and verify zero active imports.
3. Investigate fake battery percentages and UI telemetry in SetupExperience.tsx, mockApi.ts, etc.
4. Review brand design, dark graphite aesthetic, and anti-slop guidelines per design-taste-frontend.
5. Review device pairing flow integration with backend endpoints.
6. Review WCAG 2.1 AA accessibility (contrast, focus, labels).
7. Deliver your report to:
   d:\Personal projects\nova\.agents\teamwork\explorer_frontend_f1\handoff.md
8. Send completion message via send_message to your orchestrator.
