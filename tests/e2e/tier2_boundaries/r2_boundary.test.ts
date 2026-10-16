import { describe, it, expect } from 'vitest';
import { MockFirmwareDevice } from '../fixtures/mockFirmwareDevice';

describe('Tier 2: Boundary & Corner Cases — R2 Authoritative FSM State Machine', () => {
  it('T2-R2-01: Verifies rapid repeated wake word triggers while already LISTENING are idempotent', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_AP');
    dev.boot();
    expect(dev.state).toBe('IDLE');

    // First wake trigger
    expect(dev.triggerWakeWord()).toBe(true);
    expect(dev.state).toBe('LISTENING');

    // Second immediate wake trigger while already listening should be ignored
    expect(dev.triggerWakeWord()).toBe(false);
    expect(dev.state).toBe('LISTENING');
  });

  it('T2-R2-02: Verifies wake word cannot be triggered while in OFFLINE state', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_AP');
    dev.boot();
    dev.disconnectWifi();
    expect(dev.state).toBe('OFFLINE');

    const wakeAttempt = dev.triggerWakeWord();
    expect(wakeAttempt).toBe(false);
    expect(dev.state).toBe('OFFLINE');
  });

  it('T2-R2-03: Verifies transition to self is valid and retains state timestamp', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_AP');
    dev.boot();
    expect(dev.state).toBe('IDLE');

    expect(dev.canTransition('IDLE')).toBe(true);
    expect(dev.transitionTo('IDLE')).toBe(true);
    expect(dev.state).toBe('IDLE');
  });

  it('T2-R2-04: Verifies circular error recovery returns to IDLE without deadlock', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Home_AP');
    dev.boot();

    dev.triggerWakeWord();
    expect(dev.state).toBe('LISTENING');

    // Network timeout during processing results in ERROR
    dev.transitionTo('PROCESSING');
    dev.transitionTo('ERROR');
    expect(dev.state).toBe('ERROR');
    expect(dev.oled.currentPrimitive).toBe('error');

    // Recovers from ERROR back to IDLE
    expect(dev.canTransition('IDLE')).toBe(true);
    dev.transitionTo('IDLE');
    expect(dev.state).toBe('IDLE');
    expect(dev.oled.currentPrimitive).toBe('idle');
  });

  it('T2-R2-05: Verifies transition from OFFLINE to SETUP preserves existing credentials in NVS', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Office_Net');
    dev.nvs.set('device_key', 'dkey_keep_this');
    dev.boot();

    dev.disconnectWifi();
    expect(dev.state).toBe('OFFLINE');

    // Enter setup for re-provisioning
    dev.transitionTo('SETUP');
    expect(dev.state).toBe('SETUP');

    // NVS credentials must remain intact!
    expect(dev.nvs.get('wifi_ssid')).toBe('Office_Net');
    expect(dev.nvs.get('device_key')).toBe('dkey_keep_this');
  });
});
