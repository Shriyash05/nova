import type { DeviceTelemetry } from './device';
import type { WifiStatus } from './wifi';
import type { NotionConnectionInfo } from './notion';

export type OnboardingStep =
  | 'WELCOME'
  | 'SCAN_QR'
  | 'MANUAL_CLAIM'
  | 'CLAIMING'
  | 'WIFI_METHOD_SELECT'
  | 'WIFI_PROVISION'
  | 'DEVICE_VERIFICATION'
  | 'NOTION_AUTH_EXPLAIN'
  | 'NOTION_AUTH_CONSENT'
  | 'SETUP_COMPLETE'
  | 'DASHBOARD'
  | 'WIFI_RECOVERY'
  | 'ERROR';

export interface OnboardingStateContext {
  step: OnboardingStep;
  previousStep?: OnboardingStep;
  pairingSessionId: string | null;
  claimToken: string | null;
  deviceId: string | null;
  deviceTelemetry: DeviceTelemetry | null;
  wifiStatus: WifiStatus | null;
  notionInfo: NotionConnectionInfo | null;
  isRecoveryFlow: boolean;
  provisioningMethod: 'web_ble' | 'soft_ap';
  errorMessage: string | null;
  errorActionLabel?: string;
  onRetryAction?: () => void;
}

export type OnboardingAction =
  | { type: 'START_SETUP' }
  | { type: 'SWITCH_TO_MANUAL_CLAIM' }
  | { type: 'SWITCH_TO_QR_SCAN' }
  | { type: 'SUBMIT_CLAIM'; tokenOrCode: string }
  | { type: 'CLAIM_SUCCESS'; pairingSessionId: string; deviceId: string; telemetry: DeviceTelemetry }
  | { type: 'SELECT_PROVISIONING_METHOD'; method: 'web_ble' | 'soft_ap' }
  | { type: 'WIFI_CREDENTIALS_SENT' }
  | { type: 'DEVICE_VERIFIED_ONLINE'; telemetry: DeviceTelemetry; wifi: WifiStatus }
  | { type: 'PROCEED_TO_NOTION_AUTH' }
  | { type: 'NOTION_AUTH_SUCCESS'; notionInfo: NotionConnectionInfo }
  | { type: 'FINISH_SETUP_GO_DASHBOARD' }
  | { type: 'START_WIFI_RECOVERY' }
  | { type: 'EXIT_WIFI_RECOVERY' }
  | { type: 'UPDATE_TELEMETRY'; telemetry: DeviceTelemetry; wifi?: WifiStatus; notion?: NotionConnectionInfo }
  | { type: 'DISCONNECT_NOTION_SUCCESS' }
  | { type: 'RESET_DEVICE_STATE' }
  | { type: 'SET_ERROR'; message: string; retryStep?: OnboardingStep; actionLabel?: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'NAVIGATE'; step: OnboardingStep };
