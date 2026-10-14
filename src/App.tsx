import React, { useState, useEffect } from 'react';
import './styles/global.css';
import './styles/components.css';

import { useOnboarding } from './hooks/useOnboarding';
import { Header } from './components/common/Header';
import { Card } from './components/common/Card';
import { Button } from './components/common/Button';
import { NovaDeviceMockup } from './components/hardware/NovaDeviceMockup';
import { apiClient } from './api/client';
import { mockBackendStore } from './api/mockApi';

// Flow Screens
import { WelcomeScreen } from './components/flows/WelcomeScreen';
import { QrScannerScreen } from './components/flows/QrScannerScreen';
import { WifiProvisionScreen } from './components/flows/WifiProvisionScreen';
import { DeviceVerificationScreen } from './components/flows/DeviceVerificationScreen';
import { NotionAuthScreen } from './components/flows/NotionAuthScreen';
import { SetupCompleteScreen } from './components/flows/SetupCompleteScreen';
import { DeviceDashboardScreen } from './components/flows/DeviceDashboardScreen';
import { WifiRecoveryModal } from './components/flows/WifiRecoveryModal';
import { DevModeDrawer } from './components/dev/DevModeDrawer';

import { AlertTriangle, RotateCcw, ArrowLeft, Loader2, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const {
    state,
    startSetup,
    submitClaim,
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
  } = useOnboarding();

  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);

  // Check URL query parameters on initial mount (QR code scan or Notion OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get('code');
    const oauthState = params.get('state');
    const token = params.get('claim_token') || params.get('token');
    const shortCode = params.get('short_code');
    const notionCallback = params.get('notion_auth');

    // 1. Notion OAuth callback redirect (?code=...&state=...)
    if (oauthCode && oauthState) {
      completeNotionAuth(oauthCode, oauthState);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (notionCallback === 'success') {
      completeNotionAuth('oauth_success_redirect');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token || shortCode) {
      submitClaim(token || shortCode || '');
    }
  }, [submitClaim, completeNotionAuth]);

  return (
    <div className="app-container">
      <div className="ambient-glow" />

      {/* Persistent App Header */}
      <Header
        telemetry={state.deviceTelemetry}
        isMockMode={apiClient.isMockMode()}
        onOpenDevDrawer={() => setIsDevDrawerOpen(true)}
      />

      {/* Screen Router */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {state.step === 'WELCOME' && (
          <WelcomeScreen
            onStartSetup={startSetup}
            onStartRecovery={startWifiRecovery}
          />
        )}

        {(state.step === 'SCAN_QR' || state.step === 'MANUAL_CLAIM') && (
          <QrScannerScreen
            onScanSuccess={submitClaim}
            onBack={() => navigateTo('WELCOME')}
          />
        )}

        {state.step === 'CLAIMING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', paddingTop: '2rem' }}>
            <NovaDeviceMockup oledState="pairing_qr" caption="OLED: Validating Claim Token with Backend" />
            <Card glow>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', padding: '1rem 0' }}>
                <Loader2 size={28} className="spinner" style={{ animation: 'rotate-spinner 1s linear infinite', color: 'var(--accent-cyan)' }} />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Securing Pairing Session</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    Authenticating single-use token and binding hardware identity...
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {state.step === 'WIFI_METHOD_SELECT' && (
          <WifiProvisionScreen
            deviceId={state.deviceId || undefined}
            pairingSessionId={state.pairingSessionId || undefined}
            onProvision={provisionWifi}
            onScanNetworks={scanWifiNetworks}
          />
        )}

        {state.step === 'WIFI_PROVISION' && (
          <WifiProvisionScreen
            deviceId={state.deviceId || undefined}
            pairingSessionId={state.pairingSessionId || undefined}
            onProvision={provisionWifi}
            onScanNetworks={scanWifiNetworks}
          />
        )}

        {state.step === 'DEVICE_VERIFICATION' && (
          <DeviceVerificationScreen
            telemetry={state.deviceTelemetry}
            wifi={state.wifiStatus}
            onProceed={proceedToNotionAuth}
          />
        )}

        {state.step === 'NOTION_AUTH_EXPLAIN' && (
          <NotionAuthScreen
            deviceId={state.deviceId || ''}
            onCompleteAuth={completeNotionAuth}
            isMockMode={apiClient.isMockMode()}
          />
        )}

        {state.step === 'NOTION_AUTH_CONSENT' && (
          <NotionAuthScreen
            deviceId={state.deviceId || ''}
            onCompleteAuth={completeNotionAuth}
            isMockMode={apiClient.isMockMode()}
          />
        )}

        {state.step === 'SETUP_COMPLETE' && (
          <SetupCompleteScreen
            wifi={state.wifiStatus}
            notion={state.notionInfo}
            onGoToDashboard={finishSetupGoDashboard}
          />
        )}

        {state.step === 'DASHBOARD' && (
          <DeviceDashboardScreen
            telemetry={state.deviceTelemetry || mockBackendStore.getTelemetry()}
            wifi={state.wifiStatus || mockBackendStore.getWifi()}
            notion={state.notionInfo || mockBackendStore.getNotion()}
            onStartWifiRecovery={startWifiRecovery}
            onRefreshStatus={refreshStatus}
            onTestSync={testSync}
            onDisconnectNotion={disconnectNotion}
            onReconnectNotion={proceedToNotionAuth}
            onFactoryReset={factoryReset}
          />
        )}

        {state.step === 'WIFI_RECOVERY' && (
          <WifiRecoveryModal
            onCancel={exitWifiRecovery}
            onProvision={provisionWifi}
            onScanNetworks={scanWifiNetworks}
          />
        )}

        {state.step === 'ERROR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center', paddingTop: '1rem' }}>
            <NovaDeviceMockup oledState="offline" caption="OLED: Router Disconnected • Action Required" />
            
            <Card style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--status-error-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Unable to Complete Action
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '0.35rem', lineHeight: 1.45 }}>
                    {state.errorMessage || 'An unexpected communication error occurred with the device or backend.'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', marginTop: '0.5rem' }}>
                  <Button
                    variant="primary"
                    onClick={clearError}
                    leftIcon={<RotateCcw size={16} />}
                  >
                    {state.errorActionLabel || 'Retry'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigateTo('WELCOME')}
                    leftIcon={<ArrowLeft size={16} />}
                  >
                    Return to Welcome Screen
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Floating Dev Mode Trigger Button */}
      <button
        className="dev-drawer-toggle"
        onClick={() => setIsDevDrawerOpen(true)}
        aria-label="Open developer sandbox drawer"
      >
        <Cpu size={14} />
        <span>Hardware Sandbox</span>
      </button>

      {/* Developer Sandbox Drawer */}
      <DevModeDrawer
        isOpen={isDevDrawerOpen}
        onClose={() => setIsDevDrawerOpen(false)}
        onStateChanged={refreshStatus}
      />
    </div>
  );
};

export default App;
