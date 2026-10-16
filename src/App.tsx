import React, { useState, useEffect } from 'react';
import './styles/global.css';
import './styles/components.css';
import { supabase } from './lib/supabase';
import { apiClient } from './api/client';

// Navigation & Marketing Sections
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

// Modals
import { WaitlistModal } from './components/marketing/WaitlistModal';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';

// Dedicated Platform Pages
import { StoryPage } from './components/story/StoryPage';
import { CompanionDashboard } from './components/dashboard/CompanionDashboard';
import { AutoConnectExperience } from './components/connect/AutoConnectExperience';

// Hardware Setup & Diagnostic Console (for hardware claims and token setups)
import { SetupExperience } from './components/setup/SetupExperience';

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
}

export const App: React.FC = () => {
  // Page routing: 'home' | 'dashboard' | 'connect' | 'story'
  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard' | 'connect' | 'story'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('notion_auth')) {
        return 'dashboard';
      }
      const pageParam = p.get('page');
      if (pageParam === 'dashboard' || pageParam === 'connect' || pageParam === 'story') {
        return pageParam;
      }
    }
    return 'home';
  });

  // Diagnostic mode if pairing token / direct hardware setup query params are provided
  const [viewMode, setViewMode] = useState<'app' | 'device_lab'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (
        p.get('token') ||
        p.get('claim_token') ||
        p.get('short_code') ||
        p.get('setup') === 'true'
      ) {
        return 'device_lab';
      }
    }
    return 'app';
  });

  // Google User Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nova_user_profile');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Supabase Auth Session Synchronization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
          avatar_url: session.user.user_metadata?.avatar_url || null,
        };
        setUser(u);
        localStorage.setItem('nova_user_profile', JSON.stringify(u));
        localStorage.setItem('nova_user_id', u.id);
        if (session.access_token) {
          apiClient.setSessionToken(session.access_token);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
          avatar_url: session.user.user_metadata?.avatar_url || null,
        };
        setUser(u);
        localStorage.setItem('nova_user_profile', JSON.stringify(u));
        localStorage.setItem('nova_user_id', u.id);
        if (session.access_token) {
          apiClient.setSessionToken(session.access_token);
        }
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [googleAuthOpen, setGoogleAuthOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistTier, setWaitlistTier] = useState<'maker' | 'keychain' | 'twin'>('keychain');

  // Sync current page to URL query params for easy bookmarking
  const handleNavigate = (page: 'home' | 'dashboard' | 'connect' | 'story') => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      if (page === 'home') {
        url.searchParams.delete('page');
      } else {
        url.searchParams.set('page', page);
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleOpenWaitlist = (tier: 'maker' | 'keychain' | 'twin' = 'keychain') => {
    setWaitlistTier(tier);
    setWaitlistModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.removeItem('nova_user_profile');
    localStorage.removeItem('nova_user_id');
    localStorage.removeItem('nova_session_token');
    apiClient.setSessionToken(null);
    setUser(null);
  };

  const handleDisconnectDevice = async () => {
    const activeDeviceId = (typeof window !== 'undefined' && localStorage.getItem('nova_active_device_id')) || 'nova-c3-5c20dc4239fca9ec';
    if (user?.id) {
      await apiClient.unlinkUserDevice(activeDeviceId).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nova_active_device_id');
    }
    handleNavigate('connect');
  };

  const scrollToSection = (id: string) => {
    if (currentPage !== 'home') {
      handleNavigate('home');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ===========================================================================
  // 1. ADVANCED HARDWARE CONSOLE (Activated by ?setup=1 or URL claim tokens)
  // ===========================================================================
  if (viewMode === 'device_lab') {
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const tokenFromUrl = searchParams.get('token') || searchParams.get('claim_token') || searchParams.get('short_code') || undefined;
    const dParam = searchParams.get('d');
    const rawDeviceId = searchParams.get('deviceId') || (dParam ? (dParam.startsWith('nova-c3-') ? dParam : `nova-c3-${dParam}`) : undefined);

    return (
      <SetupExperience
        onBackToWebsite={() => setViewMode('app')}
        initialToken={tokenFromUrl}
        initialDeviceId={rawDeviceId}
      />
    );
  }

  // ===========================================================================
  // 2. PRODUCTION MULTI-PAGE PLATFORM
  // ===========================================================================
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-body-yellow)' }}>
      {/* Keyboard Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Retro-Pop Top Navigation Bar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenWaitlist={() => handleOpenWaitlist('keychain')}
        user={user}
        onLoginWithGoogle={() => setGoogleAuthOpen(true)}
        onLogout={handleLogout}
        onEnterDevLab={() => setViewMode('device_lab')}
      />

      {/* Main Content Viewport */}
      <main id="main-content" style={{ flexGrow: 1 }}>
        {currentPage === 'home' && (
          <>
            {/* Bubblegum Pink Hero Section */}
            <HeroSection
              onOpenPreorderModal={() => handleOpenWaitlist('keychain')}
              onExploreClick={() => scrollToSection('how-it-works')}
            />

            {/* Sunflower Yellow Future Section */}
            <FutureSection />

            {/* How It Works (Wake, Speak, Express & Sync) */}
            <HowItWorksSection />

            {/* Live 128×64 Monochrome OLED Simulator with 10 Expressions */}
            <OledSimulatorSection />

            {/* Verified Hardware Component Blueprint */}
            <HardwareSpecsSection />

            {/* Notion Real-time Voice Memo Synchronization */}
            <NotionSyncSection />

            {/* Early Access Waitlist Editions */}
            <PricingSection onSelectTier={(tier) => handleOpenWaitlist(tier)} />

            {/* Frequently Asked Questions Neo-Brutalist Accordion */}
            <FaqSection />
          </>
        )}

        {currentPage === 'story' && (
          <StoryPage
            onGoHome={() => handleNavigate('home')}
            onOpenWaitlist={() => handleOpenWaitlist('keychain')}
          />
        )}

        {currentPage === 'connect' && (
          <AutoConnectExperience
            onGoToDashboard={() => handleNavigate('dashboard')}
            user={user}
            onLoginWithGoogle={() => setGoogleAuthOpen(true)}
          />
        )}

        {currentPage === 'dashboard' && (
          <CompanionDashboard
            user={user}
            onDisconnectDevice={handleDisconnectDevice}
            onGoToConnect={() => handleNavigate('connect')}
          />
        )}
      </main>

      {/* Footer with Multi-Page Navigation Links */}
      <Footer
        onOpenWaitlist={() => handleOpenWaitlist('keychain')}
        onEnterDevLab={() => setViewMode('device_lab')}
        onNavigate={handleNavigate}
      />

      {/* Priority Waitlist Modal */}
      <WaitlistModal
        isOpen={waitlistModalOpen}
        onClose={() => setWaitlistModalOpen(false)}
        initialTier={waitlistTier}
      />

      {/* Google Authentication Dialog */}
      <GoogleAuthModal
        isOpen={googleAuthOpen}
        onClose={() => setGoogleAuthOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />
    </div>
  );
};

export default App;
