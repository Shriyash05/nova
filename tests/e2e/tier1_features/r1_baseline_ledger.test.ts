import { describe, it, expect } from 'vitest';
import { AUTHORITATIVE_HARDWARE_SPEC, AUTHORITATIVE_TECHNICAL_LEDGER } from '../fixtures/testLedgers';
import { MockBackendServer } from '../fixtures/mockBackendServer';
import fs from 'fs';
import path from 'path';

describe('Tier 1: Feature Coverage — R1 Baseline Discovery & Technical Ledger', () => {
  it('T1-R1-01: Verifies target hardware baseline matches authoritative specifications', () => {
    expect(AUTHORITATIVE_HARDWARE_SPEC.microcontroller).toBe('ESP32-C3 Super Mini');
    expect(AUTHORITATIVE_HARDWARE_SPEC.flashSizeMB).toBe(4);
    expect(AUTHORITATIVE_HARDWARE_SPEC.oledResolution).toEqual({ width: 128, height: 64 });
    expect(AUTHORITATIVE_HARDWARE_SPEC.oledI2CAddress).toBe('0x3C');
    expect(AUTHORITATIVE_HARDWARE_SPEC.oledPins).toEqual({ sda: 8, scl: 9 });
    expect(AUTHORITATIVE_HARDWARE_SPEC.micPin).toBe(1);
    expect(AUTHORITATIVE_HARDWARE_SPEC.audioSampleRateHz).toBe(16000);
    expect(AUTHORITATIVE_HARDWARE_SPEC.wakeWordModel).toBe('wn9s_hiesp');
  });

  it('T1-R1-02: Verifies non-existent hardware peripherals are strictly documented as absent', () => {
    // NOVA 1.0 has no speaker, no vibration motor, no RGB LED, and no PTT button
    expect(AUTHORITATIVE_HARDWARE_SPEC.hasSpeaker).toBe(false);
    expect(AUTHORITATIVE_HARDWARE_SPEC.hasVibrationMotor).toBe(false);
    expect(AUTHORITATIVE_HARDWARE_SPEC.hasRgbLed).toBe(false);
    expect(AUTHORITATIVE_HARDWARE_SPEC.hasPttButton).toBe(false);
  });

  it('T1-R1-03: Verifies technical ledger provides explicit decisions across all subsystems', () => {
    expect(AUTHORITATIVE_TECHNICAL_LEDGER.length).toBeGreaterThanOrEqual(5);

    const subsystems = new Set(AUTHORITATIVE_TECHNICAL_LEDGER.map(item => item.subsystem));
    expect(subsystems.has('firmware')).toBe(true);
    expect(subsystems.has('web')).toBe(true);
    expect(subsystems.has('cloud')).toBe(true);

    for (const item of AUTHORITATIVE_TECHNICAL_LEDGER) {
      expect(['KEEP', 'REFACTOR', 'REPLACE', 'REMOVE']).toContain(item.status);
      expect(item.justification.length).toBeGreaterThan(10);
    }
  });

  it('T1-R1-04: Verifies zero cleartext secrets in .env.example template', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const content = fs.readFileSync(envExamplePath, 'utf8');

    // Ensure template contains placeholders, not live production keys
    expect(content).toContain('your_notion_oauth_client_id');
    expect(content).toContain('your_notion_oauth_client_secret');
    expect(content).not.toMatch(/secret_[0-9a-zA-Z]{32,}/);
    expect(content).not.toMatch(/sbp_[0-9a-zA-Z]{32,}/);
  });

  it('T1-R1-05: Verifies /api/health endpoint reports live status and hardware target parameters', async () => {
    const server = new MockBackendServer();
    const res = await server.handleRequest({ method: 'GET', path: '/api/health' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
    expect(res.body.database.connected).toBe(true);
    expect(res.body.hardware.target).toBe('ESP32-C3 Super Mini');
    expect(res.body.hardware.oled).toBe('SSD1306 128x64');
  });
});
