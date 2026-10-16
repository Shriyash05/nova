import { describe, it, expect } from 'vitest';
import { OledDisplayBuffer } from '../fixtures/mockFirmwareDevice';

describe('Tier 2: Boundary & Corner Cases — R3 128×64 OLED Animation Engine', () => {
  it('T2-R3-01: Verifies extreme pixel coordinates: corners (0,0), (127,63), and off-screen rejection', () => {
    const oled = new OledDisplayBuffer();

    // Top-left corner
    expect(oled.setPixel(0, 0, 1)).toBe(true);
    expect(oled.getPixel(0, 0)).toBe(1);

    // Bottom-right corner
    expect(oled.setPixel(127, 63, 1)).toBe(true);
    expect(oled.getPixel(127, 63)).toBe(1);

    // Negative coordinates (must be rejected cleanly)
    expect(oled.setPixel(-1, 0, 1)).toBe(false);
    expect(oled.setPixel(0, -1, 1)).toBe(false);

    // Out-of-bounds coordinates (must be rejected cleanly)
    expect(oled.setPixel(128, 64, 1)).toBe(false);
    expect(oled.setPixel(200, 100, 1)).toBe(false);
  });

  it('T2-R3-02: Verifies drawing lines that clip outside display boundaries does not crash or corrupt memory', () => {
    const oled = new OledDisplayBuffer();

    // Line starting at (-10, -10) to (200, 100)
    expect(() => oled.drawLine(-10, -10, 200, 100)).not.toThrow();

    // Memory buffer size must remain exactly 1024 bytes
    expect(oled.getRawBuffer().byteLength).toBe(1024);
  });

  it('T2-R3-03: Verifies rapid rendering loop under stress (100 frame cycles) maintains stable timing', () => {
    const oled = new OledDisplayBuffer();
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      oled.renderExpression(i % 2 === 0 ? 'listening' : 'idle');
    }

    const elapsed = Date.now() - startTime;
    // 100 frames rendered in memory should execute in under 1000ms
    expect(elapsed).toBeLessThan(1000);
    expect(oled.renderCount).toBe(100);
  });

  it('T2-R3-04: Verifies clearing framebuffer resets all 1024 bytes to zero', () => {
    const oled = new OledDisplayBuffer();
    oled.renderExpression('wake'); // Draw active pixels

    // Verify non-zero bytes exist
    let raw = oled.getRawBuffer();
    expect(raw.some(b => b !== 0)).toBe(true);

    oled.clear();
    raw = oled.getRawBuffer();
    expect(raw.every(b => b === 0)).toBe(true);
  });

  it('T2-R3-05: Verifies QR finder patterns maintain strict 7x7 structural dimensions', () => {
    const oled = new OledDisplayBuffer();
    oled.renderExpression('pairing_qr');

    // Check top-left finder pattern bounds: X: 32..38, Y: 0..6
    // Top border of finder
    for (let x = 32; x <= 38; x++) {
      expect(oled.getPixel(x, 0)).toBe(1);
    }
    // Bottom border of finder
    for (let x = 32; x <= 38; x++) {
      expect(oled.getPixel(x, 6)).toBe(1);
    }
  });
});
