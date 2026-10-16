import { describe, it, expect } from 'vitest';
import { MockFirmwareDevice } from '../fixtures/mockFirmwareDevice';

describe('Tier 1: Feature Coverage — R2 Multi-Agent Design & Authoritative State Machine', () => {
  it('T1-R2-01: Verifies initial boot sequence and deterministic setup transition', () => {
    const dev = new MockFirmwareDevice();
    dev.boot();
    // Default unconfigured device boots into SETUP with SoftAP active
    expect(dev.state).toBe('SETUP');
    expect(dev.isSoftApActive).toBe(true);
    expect(dev.oled.currentPrimitive).toBe('pairing_qr');
  });

  it('T1-R2-02: Verifies complete voice interaction lifecycle (IDLE -> WAKE -> LISTENING -> PROCESSING -> SUCCESS -> IDLE)', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_Net');
    dev.boot();
    expect(dev.state).toBe('IDLE');

    // Trigger wake word
    const wakeOk = dev.triggerWakeWord();
    expect(wakeOk).toBe(true);
    expect(dev.state).toBe('LISTENING');
    expect(dev.oled.currentPrimitive).toBe('listening');

    // Speech detected, transitioning to processing
    const procOk = dev.transitionTo('PROCESSING');
    expect(procOk).toBe(true);
    expect(dev.state).toBe('PROCESSING');
    expect(dev.oled.currentPrimitive).toBe('processing');

    // Cloud response received, transitioning to success
    const succOk = dev.transitionTo('SUCCESS');
    expect(succOk).toBe(true);
    expect(dev.state).toBe('SUCCESS');
    expect(dev.oled.currentPrimitive).toBe('success');

    // Returns to idle
    const idleOk = dev.transitionTo('IDLE');
    expect(idleOk).toBe(true);
    expect(dev.state).toBe('IDLE');
  });

  it('T1-R2-03: Verifies network disconnection triggers clean transition to OFFLINE', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_Net');
    dev.boot();
    expect(dev.state).toBe('IDLE');

    dev.disconnectWifi();
    expect(dev.state).toBe('OFFLINE');
    expect(dev.isWifiConnected).toBe(false);
    expect(dev.oled.currentPrimitive).toBe('offline');
  });

  it('T1-R2-04: Verifies setup completion transitions device from SETUP to IDLE', () => {
    const dev = new MockFirmwareDevice();
    dev.boot();
    expect(dev.state).toBe('SETUP');

    const setupOk = dev.transitionTo('IDLE');
    expect(setupOk).toBe(true);
    expect(dev.state).toBe('IDLE');
  });

  it('T1-R2-05: Verifies illegal state transitions are strictly rejected by the FSM guard', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_Net');
    dev.boot();
    expect(dev.state).toBe('IDLE');

    // Illegal: IDLE directly to SUCCESS without WAKE/LISTENING/PROCESSING
    expect(dev.canTransition('SUCCESS')).toBe(false);
    expect(dev.transitionTo('SUCCESS')).toBe(false);
    expect(dev.state).toBe('IDLE');

    // Illegal: IDLE directly to PROCESSING
    expect(dev.canTransition('PROCESSING')).toBe(false);
    expect(dev.transitionTo('PROCESSING')).toBe(false);
    expect(dev.state).toBe('IDLE');
  });
});
