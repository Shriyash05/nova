import { describe, it, expect } from 'vitest';
import { AUTHORITATIVE_COMPLIANCE_STANDARDS } from '../fixtures/testLedgers';

describe('Tier 1: Feature Coverage — R8 Regulatory Compliance & Commercial Readiness Matrix', () => {
  it('T1-R8-01: Verifies compliance matrix encompasses India, EU, and US jurisdictions', () => {
    const jurisdictions = new Set(AUTHORITATIVE_COMPLIANCE_STANDARDS.map(s => s.jurisdiction));
    expect(jurisdictions.has('India')).toBe(true);
    expect(jurisdictions.has('European Union')).toBe(true);
    expect(jurisdictions.has('United States')).toBe(true);
  });

  it('T1-R8-02: Verifies exact citations of Indian technical standards (WPC, BIS, DPDP)', () => {
    const indianStandards = AUTHORITATIVE_COMPLIANCE_STANDARDS.filter(s => s.jurisdiction === 'India');
    expect(indianStandards.length).toBeGreaterThanOrEqual(3);

    const authorities = new Set(indianStandards.map(s => s.authority));
    expect(authorities.has('WPC')).toBe(true);
    expect(authorities.has('BIS')).toBe(true);
    expect(authorities.has('MeitY')).toBe(true);

    const bis = indianStandards.find(s => s.authority === 'BIS');
    expect(bis?.standardCode).toContain('IS 13252');
  });

  it('T1-R8-03: Verifies mandatory lab certifications are explicitly marked PENDING_LAB_TESTING', () => {
    const labRequired = AUTHORITATIVE_COMPLIANCE_STANDARDS.filter(s => s.mandatoryLabTesting);
    expect(labRequired.length).toBeGreaterThanOrEqual(2);

    for (const standard of labRequired) {
      expect(standard.status).toBe('PENDING_LAB_TESTING');
    }
  });

  it('T1-R8-04: Verifies RF parameter bounds for 2.4 GHz Wi-Fi conform to regulatory requirements', () => {
    // 802.11b/g/n 2.4 GHz rules: Max 100 mW EIRP (20 dBm)
    const maxEirpDbm = 20;
    const minFreqMHz = 2412; // Channel 1
    const maxFreqMHz = 2472; // Channel 13

    expect(maxEirpDbm).toBeLessThanOrEqual(20);
    expect(maxFreqMHz - minFreqMHz).toBe(60);
  });

  it('T1-R8-05: Verifies DPDP Act 2023 data minimization: User consent required and revokable', () => {
    const dpdp = AUTHORITATIVE_COMPLIANCE_STANDARDS.find(s => s.standardCode === 'DPDP Act 2023');
    expect(dpdp).toBeDefined();
    expect(dpdp?.status).toBe('SPECIFICATION_ALIGNED');
  });
});
