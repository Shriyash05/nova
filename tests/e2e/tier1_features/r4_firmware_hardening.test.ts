import { describe, it, expect } from 'vitest';
import { MockFirmwareDevice } from '../fixtures/mockFirmwareDevice';
import { AUTHORITATIVE_HARDWARE_SPEC } from '../fixtures/testLedgers';

describe('Tier 1: Feature Coverage — R4 Embedded Firmware Hardening (ESP32-C3 / ESP-IDF 6.1)', () => {
  it('T1-R4-01: Verifies WakeNet model configuration and 16 kHz audio acquisition parameters', () => {
    const dev = new MockFirmwareDevice();
    expect(dev.audioSampleRate).toBe(16000);
    expect(AUTHORITATIVE_HARDWARE_SPEC.audioSampleRateHz).toBe(16000);
    expect(AUTHORITATIVE_HARDWARE_SPEC.micPin).toBe(1);
    expect(AUTHORITATIVE_HARDWARE_SPEC.wakeWordModel).toBe('wn9s_hiesp');
  });

  it('T1-R4-02: Verifies 5-minute (300,000 ms) inactivity timeout returns LISTENING state back to IDLE', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Office_Net');
    dev.boot();
    expect(dev.state).toBe('IDLE');

    dev.triggerWakeWord();
    expect(dev.state).toBe('LISTENING');

    // Simulate 4 minutes (240,000 ms) elapsed: should still be listening
    const fourMinLater = dev.lastActivityTimeMs + 240000;
    const timedOutEarly = dev.checkInactivityTimeout(fourMinLater);
    expect(timedOutEarly).toBe(false);
    expect(dev.state).toBe('LISTENING');

    // Simulate 5 minutes (300,000 ms) elapsed: should timeout cleanly to IDLE
    const fiveMinLater = dev.lastActivityTimeMs + 300000;
    const timedOut = dev.checkInactivityTimeout(fiveMinLater);
    expect(timedOut).toBe(true);
    expect(dev.state).toBe('IDLE');
    expect(dev.oled.currentPrimitive).toBe('idle');
  });

  it('T1-R4-03: Verifies NVS device identity persists across simulated reboot', () => {
    const dev = new MockFirmwareDevice('nova-c3-persisted-device');
    dev.nvs.set('device_key', 'dkey_sample_key_123');
    dev.nvs.set('wifi_ssid', 'MyHomeWiFi');

    // Reboot device
    dev.boot();

    expect(dev.nvs.get('device_id')).toBe('nova-c3-persisted-device');
    expect(dev.nvs.get('device_key')).toBe('dkey_sample_key_123');
    expect(dev.nvs.get('wifi_ssid')).toBe('MyHomeWiFi');
    expect(dev.state).toBe('IDLE');
    expect(dev.isWifiConnected).toBe(true);
  });

  it('T1-R4-04: Verifies NVS-backed durable outbox queue enqueue, peek, and acknowledge semantics', () => {
    const dev = new MockFirmwareDevice();
    expect(dev.nvs.getQueueCount()).toBe(0);

    const itemId = dev.nvs.enqueue('voice_memo', '{"transcript": "order paper towels"}');
    expect(dev.nvs.getQueueCount()).toBe(1);

    const peeked = dev.nvs.peekQueue();
    expect(peeked).not.toBeNull();
    expect(peeked?.id).toBe(itemId);
    expect(peeked?.type).toBe('voice_memo');

    const acked = dev.nvs.ackQueue(itemId);
    expect(acked).toBe(true);
    expect(dev.nvs.getQueueCount()).toBe(0);
  });

  it('T1-R4-05: Verifies Wi-Fi state recovery transitions from OFFLINE back to IDLE upon reconnect', () => {
    const dev = new MockFirmwareDevice();
    dev.nvs.set('wifi_ssid', 'Studio_Net');
    dev.boot();
    expect(dev.state).toBe('IDLE');

    dev.disconnectWifi();
    expect(dev.state).toBe('OFFLINE');

    const reconnected = dev.reconnectWifi('Studio_Net', -58);
    expect(reconnected).toBe(true);
    expect(dev.state).toBe('IDLE');
    expect(dev.isWifiConnected).toBe(true);
    expect(dev.currentRssi).toBe(-58);
  });
});
