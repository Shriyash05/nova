import { describe, it, expect } from 'vitest';
import { MockFirmwareDevice } from '../fixtures/mockFirmwareDevice';

describe('Tier 4: Scenario 4 — 5-Minute Inactivity & Power Conservation Lifecycle Journey', () => {
  it('Executes wake word trigger, user abandonment, exact 5-minute inactivity countdown, and clean transition to idle sleep', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_AP');
    dev.boot();
    expect(dev.state).toBe('IDLE');
    expect(dev.oled.currentPrimitive).toBe('idle');

    // 1. Wake word triggers listening state
    const wakeOk = dev.triggerWakeWord();
    expect(wakeOk).toBe(true);
    expect(dev.state).toBe('LISTENING');
    expect(dev.oled.currentPrimitive).toBe('listening');

    const wakeTime = dev.lastActivityTimeMs;

    // 2. User walks away: 1 minute passes (60,000 ms)
    let timedOut = dev.checkInactivityTimeout(wakeTime + 60000);
    expect(timedOut).toBe(false);
    expect(dev.state).toBe('LISTENING');

    // 3. 3 minutes pass (180,000 ms)
    timedOut = dev.checkInactivityTimeout(wakeTime + 180000);
    expect(timedOut).toBe(false);
    expect(dev.state).toBe('LISTENING');

    // 4. 4 minutes and 59 seconds pass (299,000 ms)
    timedOut = dev.checkInactivityTimeout(wakeTime + 299000);
    expect(timedOut).toBe(false);
    expect(dev.state).toBe('LISTENING');

    // 5. Exact 5 minutes (300,000 ms) elapses without audio activity
    timedOut = dev.checkInactivityTimeout(wakeTime + 300000);
    expect(timedOut).toBe(true);

    // 6. State cleanly drops to IDLE without deadlock or watchdog reboot
    expect(dev.state).toBe('IDLE');
    expect(dev.oled.currentPrimitive).toBe('idle');

    // 7. Memory budget validation: Framebuffer remains exactly 1024 bytes with zero heap thrashing
    const buffer = dev.oled.getRawBuffer();
    expect(buffer.byteLength).toBe(1024);

    // 8. Device is immediately ready for next wake word
    const nextWake = dev.triggerWakeWord();
    expect(nextWake).toBe(true);
    expect(dev.state).toBe('LISTENING');
  });
});
