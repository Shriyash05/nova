import React, { useState, useEffect } from 'react';
import './styles/global.css';
import './styles/components.css';

import { useOnboarding } from './hooks/useOnboarding';
import { apiClient } from './api/client';
import { mockBackendStore } from './api/mockApi';

// Marketing Redesign Components
import { Navbar } from './components/marketing/Navbar';
import { HeroSection } from './components/marketing/HeroSection';
import { ProductExperience } from './components/marketing/ProductExperience';
import { HardwareSection } from './components/marketing/HardwareSection';
import { HowItWorksSection } from './components/marketing/HowItWorksSection';
import { PrivacyNotionSection } from './components/marketing/PrivacyNotionSection';
import { FaqSection } from './components/marketing/FaqSection';
import { LaunchSignupSection } from './components/marketing/LaunchSignupSection';
import { Footer } from './components/marketing/Footer';
import { LockedActionModal } from './components/marketing/LockedActionModal';

// Existing Device Lab & Flow Screens (Preserved for authenticated bench testing)
import { WelcomeScreen } from './components/flows/WelcomeScreen';
import { QrScannerScreen } from './components/flows/QrScannerScreen';
import { WifiProvisionScreen } from './components/flows/WifiProvisionScreen';
import { DeviceVerificationScreen } from './components/flows/DeviceVerificationScreen';
import { NotionAuthScreen } from './components/flows/NotionAuthScreen';
import { SetupCompleteScreen } from './components/flows/SetupCompleteScreen';
import { DeviceDashboardScreen } from './components/flows/DeviceDashboardScreen';
import { WifiRecoveryModal } from './components/flows/WifiRecoveryModal';
import { DevModeDrawer } from './components/dev/DevModeDrawer';
import { NovaDeviceMockup } from './components/hardware/NovaDeviceMockup';
import { Header } from './components/common/Header';
import { Card } from './components/common/Card';
import { Button } from './components/common/Button';

import { ArrowLeft, Loader2, AlertTriangle, RotateCcw, Cpu } from 'lucide-react';

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

  // Mode: 'marketing' (default public site) | 'device_lab' (bench testing & token pairing)
  const [viewMode, setViewMode] = useState<'marketing' | 'device_lab'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('code') || p.get('token') || p.get('claim_token') || p.get('short_code') || p.get('notion_auth')) {
        return 'device_lab';
      }
    }
    return 'marketing';
  });
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedActionType, setLockedActionType] = useState<'buy' | 'setup'>('buy');
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);

  // Check URL parameters for direct hardware tokens or Notion OAuth callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get('code');
    const oauthState = params.get('state');
    const token = params.get('claim_token') || params.get('token');
    const shortCode = params.get('short_code');
    const notionCallback = params.get('notion_auth');

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

  const handleOpenLockedModal = (actionType: 'buy' | 'setup') => {
    setLockedActionType(actionType);
    setLockedModalOpen(true);
  };

  const scrollToSignup = () => {
    const element = document.getElementById('launch-signup');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ===========================================================================
  // 1. PUBLIC MARKETING WEBSITE (Default Production View)
  // ===========================================================================
  if (viewMode === 'marketing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Accessible Keyboard Skip Link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Global Navigation */}
        <Navbar
          onOpenLockedModal={handleOpenLockedModal}
          onEnterDevLab={() => setViewMode('device_lab')}
        />

        {/* Main Content Landmark */}
        <main id="main-content">
          {/* Section B: Hero */}
          <HeroSection
            onOpenLockedModal={handleOpenLockedModal}
            onExploreClick={() => {
              const el = document.getElementById('product');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onHowItWorksClick={() => {
              const el = document.getElementById('how-it-works');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onSignupClick={scrollToSignup}
          />

          {/* Section C: Product Experience & OLED Simulator */}
          <ProductExperience />

          {/* Section D: Verified Hardware Architecture */}
          <HardwareSection />

          {/* Section E: How It Works & Edge-to-Cloud Flow */}
          <HowItWorksSection />

          {/* Section F: Notion Integration & Privacy Model */}
          <PrivacyNotionSection />

          {/* Section G: Genuine FAQ */}
          <FaqSection />

          {/* Section H: Launch Conversion Signup (Live API) */}
          <LaunchSignupSection />
        </main>

        {/* Section I: Footer */}
        <Footer
          onOpenLockedModal={handleOpenLockedModal}
          onEnterDevLab={() => setViewMode('device_lab')}
        />

        {/* Transparent Locked Actions Dialog */}
        <LockedActionModal
          isOpen={lockedModalOpen}
          onClose={() => setLockedModalOpen(false)}
          actionType={lockedActionType}
          onEnterDevMode={() => setViewMode('device_lab')}
          onJumpToSignup={scrollToSignup}
        />
      </div>
    );
  }

  // ===========================================================================
  // 2. BENCH DEVELOPER LAB & ONBOARDING (Preserved for real hardware testing)
  // ===========================================================================
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner to exit back to marketing site */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-strong)',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => setViewMode('marketing')}
          style={{
            background: 'none',
            color: 'var(--accent-cyan)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          <span>Exit to NOVA Website</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <Cpu size={14} style={{ color: 'var(--status-warning)' }} />
          <span>Bench Developer Lab Mode Active</span>
        </div>
      </div>

      <div className="app-container">
        {/* App Header */}
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
                  <Loader2 size={28} className="spinner" style={{ color: 'var(--accent-cyan)' }} />
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
              deviceId={state.deviceId || undefined}
              authToken={state.pairingSessionId || apiClient.getSessionToken() || undefined}
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

        {/* Developer Sandbox Drawer */}
        <DevModeDrawer
          isOpen={isDevDrawerOpen}
          onClose={() => setIsDevDrawerOpen(false)}
          onStateChanged={refreshStatus}
        />
      </div>
    </div>
  );
};

export default App;
