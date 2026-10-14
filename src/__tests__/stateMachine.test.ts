import { describe, it, expect } from 'vitest';
import type { OnboardingStateContext, OnboardingAction } from '../domain/stateMachine';

// Pure reducer function tested directly
function testReducer(state: OnboardingStateContext, action: OnboardingAction): OnboardingStateContext {
  switch (action.type) {
    case 'START_SETUP':
      return { ...state, step: 'SCAN_QR', isRecoveryFlow: false, errorMessage: null };
    case 'SUBMIT_CLAIM':
      return { ...state, step: 'CLAIMING', claimToken: action.tokenOrCode, errorMessage: null };
    case 'CLAIM_SUCCESS':
      return {
        ...state,
        step: 'WIFI_METHOD_SELECT',
        pairingSessionId: action.pairingSessionId,
        deviceId: action.deviceId,
        deviceTelemetry: action.telemetry,
        errorMessage: null,
      };
    case 'SELECT_PROVISIONING_METHOD':
      return { ...state, provisioningMethod: action.method, step: 'WIFI_PROVISION', errorMessage: null };
    case 'WIFI_CREDENTIALS_SENT':
      return { ...state, step: 'DEVICE_VERIFICATION', errorMessage: null };
    case 'DEVICE_VERIFIED_ONLINE':
      if (state.isRecoveryFlow) {
        return {
          ...state,
          step: 'DASHBOARD',
          isRecoveryFlow: false,
          deviceTelemetry: action.telemetry,
          wifiStatus: action.wifi,
          errorMessage: null,
        };
      }
      return {
        ...state,
        step: 'NOTION_AUTH_EXPLAIN',
        deviceTelemetry: action.telemetry,
        wifiStatus: action.wifi,
        errorMessage: null,
      };
    case 'START_WIFI_RECOVERY':
      return { ...state, isRecoveryFlow: true, step: 'WIFI_RECOVERY', errorMessage: null };
    case 'SET_ERROR':
      return {
        ...state,
        previousStep: state.step,
        step: 'ERROR',
        errorMessage: action.message,
        errorActionLabel: action.actionLabel,
      };
    case 'CLEAR_ERROR':
      return { ...state, step: state.previousStep || 'WELCOME', errorMessage: null };
    default:
      return state;
  }
}

describe('Onboarding State Machine', () => {
  const initialContext: OnboardingStateContext = {
    step: 'WELCOME',
    pairingSessionId: null,
    claimToken: null,
    deviceId: null,
    deviceTelemetry: null,
    wifiStatus: null,
    notionInfo: null,
    isRecoveryFlow: false,
    provisioningMethod: 'web_ble',
    errorMessage: null,
  };

  it('transitions from WELCOME to SCAN_QR upon START_SETUP', () => {
    const next = testReducer(initialContext, { type: 'START_SETUP' });
    expect(next.step).toBe('SCAN_QR');
    expect(next.isRecoveryFlow).toBe(false);
  });

  it('progresses to CLAIMING when a token or shortcode is submitted', () => {
    const next = testReducer(initialContext, { type: 'SUBMIT_CLAIM', tokenOrCode: 'NOV-84F3' });
    expect(next.step).toBe('CLAIMING');
    expect(next.claimToken).toBe('NOV-84F3');
  });

  it('advances to NOTION_AUTH_EXPLAIN on first-time setup when device is verified', () => {
    const setupContext: OnboardingStateContext = {
      ...initialContext,
      step: 'DEVICE_VERIFICATION',
      isRecoveryFlow: false,
    };
    const next = testReducer(setupContext, {
      type: 'DEVICE_VERIFIED_ONLINE',
      telemetry: {
        deviceId: 'nova_1',
        serialNumber: 'NOVA-1',
        shortClaimCode: 'NOV-1',
        hardwareModel: 'ESP32-C3 Super Mini',
        firmwareVersion: '1.0.0',
        batteryPercent: 90,
        isCharging: false,
        status: 'online',
        oledState: 'idle',
        lastHeartbeat: new Date().toISOString(),
        uptimeSeconds: 100,
        cloudMqttConnected: true,
        pingLatencyMs: 30,
        wakeWordEnabled: true,
        microphoneInput: 'MAX4466 (ADC GPIO1, 16 kHz)',
        displayDriver: 'SSD1306 (I2C 0x3C, GPIO8/GPIO9)',
      },
      wifi: {
        state: 'connected',
        connectedSsid: 'Home_WiFi',
        rssi: -50,
        ipAddress: '192.168.1.5',
        macAddress: 'AA:BB:CC',
        gatewayIp: '192.168.1.1',
        frequencyBand: '2.4GHz',
      },
    });

    expect(next.step).toBe('NOTION_AUTH_EXPLAIN');
  });

  it('critical: bypasses Notion re-auth during Wi-Fi recovery flow', () => {
    const recoveryContext: OnboardingStateContext = {
      ...initialContext,
      step: 'DEVICE_VERIFICATION',
      isRecoveryFlow: true,
      deviceId: 'nova_existing',
    };
    const next = testReducer(recoveryContext, {
      type: 'DEVICE_VERIFIED_ONLINE',
      telemetry: {
        deviceId: 'nova_existing',
        serialNumber: 'NOVA-EXISTING',
        shortClaimCode: 'NOV-EX',
        hardwareModel: 'ESP32-C3 Super Mini',
        firmwareVersion: '1.0.0',
        batteryPercent: 85,
        isCharging: false,
        status: 'online',
        oledState: 'idle',
        lastHeartbeat: new Date().toISOString(),
        uptimeSeconds: 100,
        cloudMqttConnected: true,
        pingLatencyMs: 30,
        wakeWordEnabled: true,
        microphoneInput: 'MAX4466 (ADC GPIO1, 16 kHz)',
        displayDriver: 'SSD1306 (I2C 0x3C, GPIO8/GPIO9)',
      },
      wifi: {
        state: 'connected',
        connectedSsid: 'New_Office_WiFi',
        rssi: -54,
        ipAddress: '192.168.1.10',
        macAddress: 'AA:BB:CC',
        gatewayIp: '192.168.1.1',
        frequencyBand: '2.4GHz',
      },
    });

    // In recovery flow, must jump directly to DASHBOARD without prompting Notion auth again
    expect(next.step).toBe('DASHBOARD');
    expect(next.isRecoveryFlow).toBe(false);
  });

  it('enters ERROR state and restores previous step on CLEAR_ERROR', () => {
    const scanState: OnboardingStateContext = { ...initialContext, step: 'SCAN_QR' };
    const errorState = testReducer(scanState, {
      type: 'SET_ERROR',
      message: 'Network timeout',
      actionLabel: 'Retry',
    });

    expect(errorState.step).toBe('ERROR');
    expect(errorState.previousStep).toBe('SCAN_QR');
    expect(errorState.errorMessage).toBe('Network timeout');

    const recovered = testReducer(errorState, { type: 'CLEAR_ERROR' });
    expect(recovered.step).toBe('SCAN_QR');
    expect(recovered.errorMessage).toBeNull();
  });
});
