import { describe, it, expect } from 'vitest';
import { MockBackendServer } from './e2e/fixtures/mockBackendServer';
import fs from 'fs';
import path from 'path';

describe('Challenger F2: Adversarial Stress-Tests on Routing, Pairing & A11y', () => {
  // ===========================================================================
  // SUITE 1: URL Parameter Routing & State Extraction (App.tsx)
  // ===========================================================================
  describe('Suite 1: URL Parameter Routing (App.tsx)', () => {
    function evaluateAppRouting(searchString: string) {
      const p = new URLSearchParams(searchString);

      // App.tsx lines 22-38
      const viewMode = (
        p.get('code') ||
        p.get('token') ||
        p.get('claim_token') ||
        p.get('short_code') ||
        p.get('notion_auth') ||
        p.get('setup') ||
        p.get('d') ||
        p.get('deviceId')
      ) ? 'device_lab' : 'marketing';

      // App.tsx lines 130-134
      const searchParams = new URLSearchParams(searchString);
      const tokenFromUrl = searchParams.get('token') || searchParams.get('claim_token') || searchParams.get('short_code') || undefined;
      const dParam = searchParams.get('d');
      const rawDeviceId = searchParams.get('deviceId') || (dParam ? (dParam.startsWith('nova-c3-') ? dParam : `nova-c3-${dParam}`) : undefined);
      const deviceIdFromUrl = rawDeviceId || undefined;

      return { viewMode, tokenFromUrl, deviceIdFromUrl };
    }

    it('routes correctly across standard query parameters', () => {
      // Default
      expect(evaluateAppRouting('').viewMode).toBe('marketing');

      // ?token=
      const r1 = evaluateAppRouting('?token=clm_live_a1b2c3d4');
      expect(r1.viewMode).toBe('device_lab');
      expect(r1.tokenFromUrl).toBe('clm_live_a1b2c3d4');
      expect(r1.deviceIdFromUrl).toBeUndefined();

      // ?claim_token=
      const r2 = evaluateAppRouting('?claim_token=clm_live_998877');
      expect(r2.viewMode).toBe('device_lab');
      expect(r2.tokenFromUrl).toBe('clm_live_998877');

      // ?short_code=
      const r3 = evaluateAppRouting('?short_code=NOV-FA12');
      expect(r3.viewMode).toBe('device_lab');
      expect(r3.tokenFromUrl).toBe('NOV-FA12');

      // ?d= hex expansion
      const r4 = evaluateAppRouting('?d=5c20dc4239fca9ec');
      expect(r4.viewMode).toBe('device_lab');
      expect(r4.deviceIdFromUrl).toBe('nova-c3-5c20dc4239fca9ec');

      // ?d= already prefixed
      const r5 = evaluateAppRouting('?d=nova-c3-5c20dc4239fca9ec');
      expect(r5.viewMode).toBe('device_lab');
      expect(r5.deviceIdFromUrl).toBe('nova-c3-5c20dc4239fca9ec');

      // ?deviceId=
      const r6 = evaluateAppRouting('?deviceId=nova-c3-custom123');
      expect(r6.viewMode).toBe('device_lab');
      expect(r6.deviceIdFromUrl).toBe('nova-c3-custom123');

      // ?setup=1
      const r7 = evaluateAppRouting('?setup=1');
      expect(r7.viewMode).toBe('device_lab');
      expect(r7.tokenFromUrl).toBeUndefined();

      // ?setup=true
      const r8 = evaluateAppRouting('?setup=true');
      expect(r8.viewMode).toBe('device_lab');

      // ?notion_auth=1
      const r9 = evaluateAppRouting('?notion_auth=1');
      expect(r9.viewMode).toBe('device_lab');

      // Combined ?d= and ?token=
      const r10 = evaluateAppRouting('?d=5c20dc4239fca9ec&token=clm_live_776655');
      expect(r10.viewMode).toBe('device_lab');
      expect(r10.tokenFromUrl).toBe('clm_live_776655');
      expect(r10.deviceIdFromUrl).toBe('nova-c3-5c20dc4239fca9ec');
    });

    it('exposes edge cases in routing parameters', () => {
      // Valueless ?setup
      // p.get('setup') is '' which is falsy -> remains in 'marketing'
      const valuelessSetup = evaluateAppRouting('?setup');
      expect(valuelessSetup.viewMode).toBe('marketing');

      // Valueless ?token=
      const emptyToken = evaluateAppRouting('?token=');
      expect(emptyToken.viewMode).toBe('marketing');
      expect(emptyToken.tokenFromUrl).toBeUndefined();

      // ?code= parameter switches to device_lab but leaves tokenFromUrl undefined
      const codeParam = evaluateAppRouting('?code=NOV-1234');
      expect(codeParam.viewMode).toBe('device_lab');
      expect(codeParam.tokenFromUrl).toBeUndefined();

      // Path traversal or special chars in ?d=
      const pathTraversal = evaluateAppRouting('?d=../../etc/passwd');
      expect(pathTraversal.deviceIdFromUrl).toBe('nova-c3-../../etc/passwd');
    });
  });

  // ===========================================================================
  // SUITE 2: Pairing Wizard Input Validation & API Responses
  // ===========================================================================
  describe('Suite 2: Pairing Wizard Claim Validation', () => {
    it('validates claim token rejections and lifecycle', async () => {
      const server = new MockBackendServer();

      // Bootstrap device
      const bootRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/bootstrap',
        body: {
          deviceId: 'nova-c3-5c20dc4239fca9ec',
          macAddress: '48:F6:EE:17:34:D8',
          bootstrapSecret: 'factory_bootstrap_secret_12345',
        },
      });
      expect(bootRes.status).toBe(200);
      const claimToken = bootRes.body.data.claimToken;
      const shortCode = bootRes.body.data.shortCode;

      // Empty token
      const emptyRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: '' },
      });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.error.code).toBe('MISSING_CLAIM_TOKEN');

      // Whitespace token
      const wsRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: '   \t  ' },
      });
      expect(wsRes.status).toBe(400);
      expect(wsRes.body.error.code).toBe('INVALID_CLAIM_TOKEN');

      // Unknown token
      const unknownRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: 'clm_live_invalid_12345' },
      });
      expect(unknownRes.status).toBe(400);
      expect(unknownRes.body.error.code).toBe('INVALID_CLAIM_TOKEN');

      // Raw deviceId instead of token
      const rawDevRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken: 'nova-c3-5c20dc4239fca9ec' },
      });
      expect(rawDevRes.status).toBe(400);
      expect(rawDevRes.body.error.code).toBe('INVALID_CLAIM_TOKEN');

      // Valid claim token redemption
      const claimRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken },
      });
      expect(claimRes.status).toBe(200);
      expect(claimRes.body.success).toBe(true);
      expect(claimRes.body.data.pairingSessionId).toMatch(/^sess_/);

      // Re-claim attempt (already used)
      const reuseRes = await server.handleRequest({
        method: 'POST',
        path: '/api/v1/devices/claim',
        body: { claimToken },
      });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.code).toBe('CLAIM_TOKEN_ALREADY_USED');
    });

    it('probes QR URL parser behaviors in QrCameraScannerModal.tsx', () => {
      function parseScannedQrData(data: string): string {
        try {
          if (data.startsWith('http://') || data.startsWith('https://')) {
            const url = new URL(data);
            const tokenParam = url.searchParams.get('token');
            if (tokenParam) return tokenParam;

            const dParam = url.searchParams.get('d');
            if (dParam) {
              return dParam.startsWith('nova-c3-') ? dParam : `nova-c3-${dParam}`;
            }

            const deviceIdParam = url.searchParams.get('deviceId');
            if (deviceIdParam) return deviceIdParam;
          }
        } catch {
          // not a valid URL
        }
        return data.trim();
      }

      // Valid OLED QR portalUrl
      expect(parseScannedQrData('https://buynovastore.vercel.app/?token=clm_live_1234abcd')).toBe('clm_live_1234abcd');

      // Raw string token
      expect(parseScannedQrData('  clm_live_raw_test  ')).toBe('clm_live_raw_test');

      // QR with ?d=
      expect(parseScannedQrData('https://buynovastore.vercel.app/?d=5c20dc4239fca9ec')).toBe('nova-c3-5c20dc4239fca9ec');

      // Note: QR with ?claim_token= or ?short_code= is NOT parsed by parseScannedQrData
      const unhandledUrl = parseScannedQrData('https://buynovastore.vercel.app/?claim_token=clm_live_xyz');
      expect(unhandledUrl).toBe('https://buynovastore.vercel.app/?claim_token=clm_live_xyz');
    });
  });

  // ===========================================================================
  // SUITE 3: WCAG 2.1 AA Accessibility & Keyboard Navigation Static Audit
  // ===========================================================================
  describe('Suite 3: WCAG 2.1 AA Accessibility Audit', () => {
    const rootDir = process.cwd();
    const appTsx = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');
    const navbarTsx = fs.readFileSync(path.join(rootDir, 'src/components/marketing/Navbar.tsx'), 'utf8');
    const setupTsx = fs.readFileSync(path.join(rootDir, 'src/components/setup/SetupExperience.tsx'), 'utf8');
    const modalTsx = fs.readFileSync(path.join(rootDir, 'src/components/marketing/LockedActionModal.tsx'), 'utf8');
    const globalCss = fs.readFileSync(path.join(rootDir, 'src/styles/global.css'), 'utf8');

    it('verifies Skip Link accessibility implementation', () => {
      // 1. Skip link class and href
      expect(appTsx).toContain('className="skip-link"');
      expect(appTsx).toContain('href="#main-content"');

      // 2. Main landmark
      expect(appTsx).toContain('<main id="main-content">');

      // 3. Skip link focus styling in CSS
      expect(globalCss).toContain('.skip-link:focus');
      expect(globalCss).toContain('outline: 2px solid #ffffff');
    });

    it('verifies focus indicator rules (:focus-visible)', () => {
      expect(globalCss).toContain(':focus-visible');
      expect(globalCss).toContain('outline: 2px solid var(--accent-cyan)');
    });

    it('verifies ARIA landmarks and accessible names', () => {
      // Navbar landmarks & labels
      expect(navbarTsx).toContain('aria-label="NOVA home"');
      expect(navbarTsx).toContain('aria-label="Main Navigation"');
      expect(navbarTsx).toContain('aria-label="Toggle navigation menu"');
      expect(navbarTsx).toContain('aria-expanded=');

      // Modal dialog accessibility
      expect(modalTsx).toContain('role="dialog"');
      expect(modalTsx).toContain('aria-modal="true"');
      expect(modalTsx).toContain('aria-labelledby=');
      expect(modalTsx).toContain('aria-label="Close dialog"');
      expect(modalTsx).toContain("e.key === 'Escape'");

      // Setup form inputs
      expect(setupTsx).toContain('htmlFor="claim-token"');
      expect(setupTsx).toContain('id="claim-token"');
      expect(setupTsx).toContain('aria-label="Wi-Fi Network Name (SSID)"');
      expect(setupTsx).toContain('aria-label="Wi-Fi Password"');
    });

    it('identifies accessibility observations and edge cases', () => {
      // Observation: SetupExperience claim-token input has inline outline: 'none'
      const hasInlineOutlineNone = setupTsx.includes("outline: 'none'");
      expect(hasInlineOutlineNone).toBe(true);

      // Observation: SetupExperience claim error container does not yet have role="alert"
      const hasRoleAlert = setupTsx.includes('role="alert"') || setupTsx.includes('aria-live=');
      expect(hasRoleAlert).toBe(false);
    });
  });
});
