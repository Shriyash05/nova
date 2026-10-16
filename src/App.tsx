import React, { useState } from 'react';
import './styles/global.css';
import './styles/components.css';

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

// Redesigned Bespoke Hardware Setup & Console
import { SetupExperience } from './components/setup/SetupExperience';

export const App: React.FC = () => {
  // Mode: 'marketing' (default public site) | 'device_lab' (hardware setup & token pairing)
  const [viewMode, setViewMode] = useState<'marketing' | 'device_lab'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (
        p.get('code') ||
        p.get('token') ||
        p.get('claim_token') ||
        p.get('short_code') ||
        p.get('notion_auth') ||
        p.get('setup') ||
        p.get('d') ||
        p.get('deviceId')
      ) {
        return 'device_lab';
      }
    }
    return 'marketing';
  });

  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedActionType, setLockedActionType] = useState<'buy' | 'setup'>('buy');


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
        <a href="#main-content" className="sr-only">
          Skip to main content
        </a>

        {/* Section A: Global Navigation */}
        <Navbar
          onOpenLockedModal={handleOpenLockedModal}
          onSignupClick={scrollToSignup}
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
  // 2. HARDWARE SETUP & BENCH CONSOLE (Authentic, anti-slop hardware pairing)
  // ===========================================================================
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const tokenFromUrl = searchParams.get('token') || searchParams.get('claim_token') || searchParams.get('short_code') || undefined;
  const dParam = searchParams.get('d');
  const rawDeviceId = searchParams.get('deviceId') || (dParam ? (dParam.startsWith('nova-c3-') ? dParam : `nova-c3-${dParam}`) : undefined);
  const deviceIdFromUrl = rawDeviceId || undefined;

  return (
    <SetupExperience
      onBackToWebsite={() => setViewMode('marketing')}
      initialToken={tokenFromUrl}
      initialDeviceId={deviceIdFromUrl}
    />
  );
};

export default App;
