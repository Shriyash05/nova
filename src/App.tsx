import React, { useState } from 'react';
import './styles/global.css';
import './styles/components.css';

// Retro-Pop Neo-Brutalist Components
import { Navbar } from './components/marketing/Navbar';
import { HeroSection } from './components/marketing/HeroSection';
import { FutureSection } from './components/marketing/FutureSection';
import { HowItWorksSection } from './components/marketing/HowItWorksSection';
import { OledSimulatorSection } from './components/marketing/OledSimulatorSection';
import { HardwareSpecsSection } from './components/marketing/HardwareSpecsSection';
import { NotionSyncSection } from './components/marketing/NotionSyncSection';
import { PricingSection } from './components/marketing/PricingSection';
import { FaqSection } from './components/marketing/FaqSection';
import { Footer } from './components/marketing/Footer';
import { PreorderModal } from './components/marketing/PreorderModal';

// Authentic Hardware Setup & Console
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

  const [preorderModalOpen, setPreorderModalOpen] = useState(false);
  const [preorderTier, setPreorderTier] = useState<'maker' | 'keychain' | 'twin'>('keychain');

  const handleOpenPreorder = (tier: 'maker' | 'keychain' | 'twin' = 'keychain') => {
    setPreorderTier(tier);
    setPreorderModalOpen(true);
  };

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ===========================================================================
  // 1. PUBLIC MARKETING WEBSITE (Default Production View)
  // ===========================================================================
  if (viewMode === 'marketing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-body-yellow)' }}>
        {/* Accessible Keyboard Skip Link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Pitch-Black Top Navigation Bar */}
        <Navbar
          onOpenPreorderModal={() => handleOpenPreorder('keychain')}
          onEnterDevLab={() => setViewMode('device_lab')}
        />

        {/* Main Content Landmark */}
        <main id="main-content">
          {/* Bubblegum Pink Hero with Giant Display Typography & Isometric Robot */}
          <HeroSection
            onOpenPreorderModal={() => handleOpenPreorder('keychain')}
            onExploreClick={scrollToHowItWorks}
          />

          {/* Scalloped Wavy Divider into Warm Sunflower Yellow Future Section */}
          <FutureSection />

          {/* 3 Neo-Brutalist Cards ("Wake", "Speak", "Express & Sync") & Marquee Ticker */}
          <HowItWorksSection />

          {/* Interactive Live 128×64 OLED Face Simulator & Voice Cycle Trigger */}
          <OledSimulatorSection />

          {/* Hardware Blueprint & Verified Component Specifications */}
          <HardwareSpecsSection />

          {/* Notion Database Real-time Voice Memo Synchronization */}
          <NotionSyncSection />

          {/* 3-Tier Pre-order Pricing Cards */}
          <PricingSection onSelectTier={(tier) => handleOpenPreorder(tier)} />

          {/* Frequently Asked Questions Neo-Brutalist Accordion */}
          <FaqSection />
        </main>

        {/* Wavy Divider into Pitch-Black Footer */}
        <Footer
          onOpenPreorderModal={() => handleOpenPreorder('keychain')}
          onEnterDevLab={() => setViewMode('device_lab')}
        />

        {/* Interactive Pre-order Checkout Modal */}
        <PreorderModal
          isOpen={preorderModalOpen}
          onClose={() => setPreorderModalOpen(false)}
          initialTier={preorderTier}
        />
      </div>
    );
  }

  // ===========================================================================
  // 2. HARDWARE SETUP & BENCH CONSOLE (Authentic hardware pairing & Wi-Fi vault)
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
