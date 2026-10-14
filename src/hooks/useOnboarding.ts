import { useReducer, useCallback, useEffect } from 'react';
import type { OnboardingStep, OnboardingStateContext, OnboardingAction } from '../domain/stateMachine';
import type { WifiCredentials, WifiNetwork } from '../domain/wifi';
import { apiClient } from '../api/client';
import { mockBackendStore } from '../api/mockApi';

const initialState: OnboardingStateContext = {
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

function onboardingReducer(state: OnboardingStateContext, action: OnboardingAction): OnboardingStateContext {
  switch (action.type) {
    case 'START_SETUP':
      return {
        ...state,
        step: 'SCAN_QR',
        isRecoveryFlow: false,
        errorMessage: null,
      };

    case 'SWITCH_TO_MANUAL_CLAIM':
      return {
        ...state,
        step: 'MANUAL_CLAIM',
        errorMessage: null,
      };

    case 'SWITCH_TO_QR_SCAN':
      return {
        ...state,
        step: 'SCAN_QR',
        errorMessage: null,
      };

    case 'SUBMIT_CLAIM':
      return {
        ...state,
        step: 'CLAIMING',
        claimToken: action.tokenOrCode,
        errorMessage: null,
      };

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
      return {
        ...state,
        provisioningMethod: action.method,
        step: 'WIFI_PROVISION',
        errorMessage: null,
      };

    case 'WIFI_CREDENTIALS_SENT':
      return {
        ...state,
        step: 'DEVICE_VERIFICATION',
        errorMessage: null,
      };

    case 'DEVICE_VERIFIED_ONLINE':
      if (state.isRecoveryFlow) {
        // In Wi-Fi recovery flow, jump directly to DASHBOARD since Notion and account remain linked!
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

    case 'PROCEED_TO_NOTION_AUTH':
      return {
        ...state,
        step: 'NOTION_AUTH_CONSENT',
        errorMessage: null,
      };

    case 'NOTION_AUTH_SUCCESS':
      return {
        ...state,
        step: 'SETUP_COMPLETE',
        notionInfo: action.notionInfo,
        errorMessage: null,
      };

    case 'FINISH_SETUP_GO_DASHBOARD':
      return {
        ...state,
        step: 'DASHBOARD',
        errorMessage: null,
      };

    case 'START_WIFI_RECOVERY':
      return {
        ...state,
        isRecoveryFlow: true,
        step: 'WIFI_RECOVERY',
        errorMessage: null,
      };

    case 'EXIT_WIFI_RECOVERY':
      return {
        ...state,
        isRecoveryFlow: false,
        step: 'DASHBOARD',
        errorMessage: null,
      };

    case 'UPDATE_TELEMETRY':
      return {
        ...state,
        deviceTelemetry: action.telemetry,
        wifiStatus: action.wifi ?? state.wifiStatus,
        notionInfo: action.notion ?? state.notionInfo,
      };

    case 'DISCONNECT_NOTION_SUCCESS':
      return {
        ...state,
        notionInfo: state.notionInfo
          ? {
              ...state.notionInfo,
              isConnected: false,
              workspaceName: null,
              targetDatabaseName: null,
              workspaceIcon: null,
            }
          : null,
      };

    case 'RESET_DEVICE_STATE':
      return {
        ...initialState,
        step: 'WELCOME',
      };

    case 'SET_ERROR':
      return {
        ...state,
        previousStep: state.step,
        step: 'ERROR',
        errorMessage: action.message,
        errorActionLabel: action.actionLabel,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        step: state.previousStep || 'WELCOME',
        errorMessage: null,
      };

    case 'NAVIGATE':
      return {
        ...state,
        step: action.step,
        errorMessage: null,
      };

    default:
      return state;
  }
}

export function useOnboarding() {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  // Periodically refresh device status if we are on dashboard or setup complete
  const refreshStatus = useCallback(async () => {
    if (!state.deviceId) return;
    const res = await apiClient.getDeviceStatus(state.deviceId);
    if (res.success && res.data) {
      dispatch({
        type: 'UPDATE_TELEMETRY',
        telemetry: res.data.device,
        wifi: res.data.wifi,
        notion: res.data.notion,
      });
    }
  }, [state.deviceId]);

  // Periodic poll for device heartbeat when on Dashboard
  useEffect(() => {
    if (state.step !== 'DASHBOARD' || !state.deviceId) return;
    const interval = setInterval(() => {
      refreshStatus();
    }, 8000);
    return () => clearInterval(interval);
  }, [state.step, state.deviceId, refreshStatus]);

  // Actions
  const startSetup = useCallback(() => {
    dispatch({ type: 'START_SETUP' });
  }, []);

  const switchToManualClaim = useCallback(() => {
    dispatch({ type: 'SWITCH_TO_MANUAL_CLAIM' });
  }, []);

  const switchToQrScan = useCallback(() => {
    dispatch({ type: 'SWITCH_TO_QR_SCAN' });
  }, []);

  const submitClaim = useCallback(async (tokenOrCode: string) => {
    dispatch({ type: 'SUBMIT_CLAIM', tokenOrCode });

    try {
      const res = await apiClient.claimDevice({
        claimToken: tokenOrCode.includes('clm_') ? tokenOrCode : undefined,
        shortCode: !tokenOrCode.includes('clm_') ? tokenOrCode : undefined,
      });

      if (!res.success || !res.data) {
        dispatch({
          type: 'SET_ERROR',
          message: res.error?.message || 'Unable to claim NOVA device. Verify the QR code and try again.',
          actionLabel: 'Try Claiming Again',
        });
        return;
      }

      // Fetch initial device status
      const statusRes = await apiClient.getDeviceStatus(res.data.deviceId);
      const telemetry = statusRes.success && statusRes.data ? statusRes.data.device : mockBackendStore.getTelemetry();

      dispatch({
        type: 'CLAIM_SUCCESS',
        pairingSessionId: res.data.pairingSessionId,
        deviceId: res.data.deviceId,
        telemetry,
      });
    } catch (err: unknown) {
      dispatch({
        type: 'SET_ERROR',
        message: err instanceof Error ? err.message : 'Claim request failed',
        actionLabel: 'Try Again',
      });
    }
  }, []);

  const selectProvisioningMethod = useCallback((method: 'web_ble' | 'soft_ap') => {
    dispatch({ type: 'SELECT_PROVISIONING_METHOD', method });
  }, []);

  const scanWifiNetworks = useCallback(async (): Promise<WifiNetwork[]> => {
    try {
      const res = await apiClient.scanWifi(state.deviceId || undefined);
      if (res.success && res.data) {
        return res.data.networks;
      }
      return [];
    } catch {
      return [];
    }
  }, [state.deviceId]);

  const provisionWifi = useCallback(
    async (credentials: WifiCredentials) => {
      if (!state.deviceId) {
        dispatch({
          type: 'SET_ERROR',
          message: 'No paired device found for Wi-Fi provisioning.',
          actionLabel: 'Restart Setup',
        });
        return false;
      }

      dispatch({ type: 'WIFI_CREDENTIALS_SENT' });

      try {
        const res = await apiClient.provisionWifi(state.deviceId, {
          pairingSessionId: state.pairingSessionId || undefined,
          ssid: credentials.ssid,
          password: credentials.password,
          hidden: credentials.hidden,
        });

        if (!res.success) {
          dispatch({
            type: 'SET_ERROR',
            message: res.error?.message || 'Failed to connect NOVA to the Wi-Fi network.',
            actionLabel: 'Retry Wi-Fi Setup',
          });
          return false;
        }

        // Simulate backend polling device heartbeat (ESP32 coming online)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const statusRes = await apiClient.getDeviceStatus(state.deviceId);
        if (statusRes.success && statusRes.data) {
          dispatch({
            type: 'DEVICE_VERIFIED_ONLINE',
            telemetry: statusRes.data.device,
            wifi: statusRes.data.wifi,
          });
          return true;
        } else {
          dispatch({
            type: 'SET_ERROR',
            message: 'Device connected to Wi-Fi but cloud heartbeat was not confirmed by backend.',
            actionLabel: 'Check Device & Retry',
          });
          return false;
        }
      } catch (err: unknown) {
        dispatch({
          type: 'SET_ERROR',
          message: err instanceof Error ? err.message : 'Wi-Fi configuration error',
          actionLabel: 'Try Again',
        });
        return false;
      }
    },
    [state.deviceId, state.pairingSessionId]
  );

  const proceedToNotionAuth = useCallback(() => {
    dispatch({ type: 'PROCEED_TO_NOTION_AUTH' });
  }, []);

  const completeNotionAuth = useCallback(
    async (code = 'notion_auth_code_mock', stateToken?: string) => {
      let targetDeviceId = state.deviceId;
      if (!targetDeviceId && stateToken && stateToken.startsWith('state_')) {
        const parts = stateToken.split('_');
        if (parts.length >= 2) {
          targetDeviceId = parts[1];
        }
      }
      if (!targetDeviceId) {
        targetDeviceId = localStorage.getItem('nova_device_id') || 'nova_c3_84f3eba1';
      }

      try {
        const res = await apiClient.callbackNotion({
          code,
          state: stateToken || 'state_mock',
          deviceId: targetDeviceId,
          redirectUri: window.location.origin + '/',
        });

        if (res.success && res.data) {
          dispatch({
            type: 'NOTION_AUTH_SUCCESS',
            notionInfo: res.data,
          });

          // Fetch full telemetry to hydrate dashboard
          const statusRes = await apiClient.getDeviceStatus(targetDeviceId);
          if (statusRes.success && statusRes.data) {
            dispatch({
              type: 'UPDATE_TELEMETRY',
              telemetry: statusRes.data.device,
              wifi: statusRes.data.wifi,
              notion: res.data,
            });
          }
        } else {
          dispatch({
            type: 'SET_ERROR',
            message: res.error?.message || 'Failed to complete Notion authorization.',
            actionLabel: 'Retry Notion Connection',
          });
        }
      } catch (err: unknown) {
        dispatch({
          type: 'SET_ERROR',
          message: err instanceof Error ? err.message : 'Notion OAuth error',
          actionLabel: 'Retry Notion Connection',
        });
      }
    },
    [state.deviceId]
  );

  const finishSetupGoDashboard = useCallback(() => {
    dispatch({ type: 'FINISH_SETUP_GO_DASHBOARD' });
  }, []);

  const startWifiRecovery = useCallback(() => {
    dispatch({ type: 'START_WIFI_RECOVERY' });
  }, []);

  const exitWifiRecovery = useCallback(() => {
    dispatch({ type: 'EXIT_WIFI_RECOVERY' });
  }, []);

  const disconnectNotion = useCallback(async () => {
    if (!state.deviceId) return false;
    const res = await apiClient.disconnectNotion(state.deviceId, {
      confirm: true,
      revokeToken: true,
    });
    if (res.success) {
      dispatch({ type: 'DISCONNECT_NOTION_SUCCESS' });
      return true;
    }
    return false;
  }, [state.deviceId]);

  const testSync = useCallback(async () => {
    if (!state.deviceId) return null;
    const res = await apiClient.testSync(state.deviceId);
    if (res.success && res.data) {
      refreshStatus();
      return res.data;
    }
    return null;
  }, [state.deviceId, refreshStatus]);

  const factoryReset = useCallback(
    async (serial: string) => {
      if (!state.deviceId) return false;
      const res = await apiClient.factoryReset(state.deviceId, serial);
      if (res.success) {
        dispatch({ type: 'RESET_DEVICE_STATE' });
        return true;
      }
      return false;
    },
    [state.deviceId]
  );

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const navigateTo = useCallback((step: OnboardingStep) => {
    dispatch({ type: 'NAVIGATE', step });
  }, []);

  return {
    state,
    startSetup,
    switchToManualClaim,
    switchToQrScan,
    submitClaim,
    selectProvisioningMethod,
    scanWifiNetworks,
    provisionWifi,
    proceedToNotionAuth,
    completeNotionAuth,
    finishSetupGoDashboard,
    startWifiRecovery,
    exitWifiRecovery,
    disconnectNotion,
    testSync,
    factoryReset,
    refreshStatus,
    clearError,
    navigateTo,
  };
}
