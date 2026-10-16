import { describe, it, expect } from 'vitest';
import { OledDisplayBuffer, MockFirmwareDevice, OledPrimitive } from '../fixtures/mockFirmwareDevice';

describe('Tier 1: Feature Coverage — R3 Industrial Design & 128×64 OLED Animation Engine', () => {
  it('T1-R3-01: Verifies monochrome SSD1306 framebuffer geometry and memory budget', () => {
    const oled = new OledDisplayBuffer();
    expect(OledDisplayBuffer.WIDTH).toBe(128);
    expect(OledDisplayBuffer.HEIGHT).toBe(64);
    expect(OledDisplayBuffer.BUFFER_SIZE).toBe(1024);

    const raw = oled.getRawBuffer();
    expect(raw.byteLength).toBe(1024);
  });

  it('T1-R3-02: Verifies all nine required facial expression primitives render successfully', () => {
    const oled = new OledDisplayBuffer();
    const primitives: OledPrimitive[] = [
      'idle',
      'blink',
      'wink',
      'wake',
      'listening',
      'processing',
      'success',
      'offline',
      'error',
    ];

    for (const prim of primitives) {
      const render = oled.renderExpression(prim);
      expect(render.success).toBe(true);
      expect(oled.currentPrimitive).toBe(prim);

      // Verify that at least some pixels are active (non-empty screen)
      const buffer = oled.getRawBuffer();
      const hasActivePixels = buffer.some(byte => byte !== 0);
      expect(hasActivePixels).toBe(true);
    }
  });

  it('T1-R3-03: Verifies non-blocking animation frame rendering executes within time budget', () => {
    const oled = new OledDisplayBuffer();
    const render = oled.renderExpression('listening');
    expect(render.success).toBe(true);
    // Non-blocking requirement: render frame time must not starve audio acquisition (budget <= 50ms)
    expect(render.durationMs).toBeLessThanOrEqual(50);
  });

  it('T1-R3-04: Verifies pairing QR code renders with valid finder patterns inside 64x64 zone', () => {
    const oled = new OledDisplayBuffer();
    oled.renderExpression('pairing_qr');

    // Check finder pattern top-left at (32, 0)
    expect(oled.getPixel(32, 0)).toBe(1);
    expect(oled.getPixel(32 + 3, 0 + 3)).toBe(1); // center dot

    // Pixels outside 128x64 must not be accessed
    expect(oled.getPixel(128, 64)).toBe(0);
  });

  it('T1-R3-05: Verifies hardware constraint: non-existent audio/haptic peripherals throw on access', () => {
    const dev = new MockFirmwareDevice();

    expect(() => dev.invokeSpeakerTone()).toThrow('HARDWARE_VIOLATION');
    expect(dev.attemptedSpeakerAccess).toBe(true);

    expect(() => dev.invokeRgbLed()).toThrow('HARDWARE_VIOLATION');
    expect(dev.attemptedRgbLedAccess).toBe(true);

    expect(() => dev.invokeHapticVibration()).toThrow('HARDWARE_VIOLATION');
    expect(dev.attemptedVibrationMotorAccess).toBe(true);
  });
});
