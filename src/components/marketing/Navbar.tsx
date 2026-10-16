import React, { useState } from 'react';
import { Menu, X, Sparkles, Cpu, LogOut, User } from 'lucide-react';

export interface NavbarProps {
  currentPage?: 'home' | 'dashboard' | 'connect' | 'story';
  onNavigate?: (page: 'home' | 'dashboard' | 'connect' | 'story') => void;
  onOpenWaitlist: () => void;
  user?: { id: string; email: string; name?: string | null; avatar_url?: string | null } | null;
  onLoginWithGoogle?: () => void;
  onLogout?: () => void;
  onOpenPreorderModal?: () => void;
  onEnterDevLab?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage = 'home',
  onNavigate,
  onOpenWaitlist,
  user = null,
  onLoginWithGoogle,
  onLogout,
  onOpenPreorderModal,
  onEnterDevLab,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (page: 'home' | 'dashboard' | 'connect' | 'story', scrollSection?: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(page);
    }
    if (scrollSection && page === 'home') {
      setTimeout(() => {
        const el = document.getElementById(scrollSection);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleWaitlistClick = () => {
    if (onOpenWaitlist) onOpenWaitlist();
    else if (onOpenPreorderModal) onOpenPreorderModal();
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#000000',
        borderBottom: '2.5px solid #000000',
        color: '#FFFFFF',
      }}
    >
      <div
        className="marketing-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.5rem',
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => handleNav('home')}
            aria-label="NOVA home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#FFFFFF',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.85rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              super
              <span style={{ color: 'var(--bg-hero-pink)', marginLeft: '0.15rem' }}>nova</span>
            </span>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-cyan)',
                boxShadow: '0 0 10px #00F2FE',
                display: 'inline-block',
                marginLeft: '0.2rem',
              }}
            />
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.75rem',
          }}
          className="desktop-nav"
        >
          <button
            onClick={() => handleNav('home')}
            style={{
              color: currentPage === 'home' ? 'var(--bg-hero-pink)' : '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = currentPage === 'home' ? 'var(--bg-hero-pink)' : '#FFFFFF')}
          >
            Home
          </button>

          <button
            onClick={() => handleNav('story')}
            style={{
              color: currentPage === 'story' ? 'var(--bg-hero-pink)' : '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = currentPage === 'story' ? 'var(--bg-hero-pink)' : '#FFFFFF')}
          >
            The Story
          </button>

          <button
            onClick={() => handleNav('home', 'how-it-works')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          >
            How it works
          </button>

          <button
            onClick={() => handleNav('home', 'expressions')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          >
            Expressions
          </button>

          <button
            onClick={() => handleNav('home', 'specs')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          >
            Hardware Specs
          </button>

          <button
            onClick={() => handleNav('dashboard')}
            style={{
              color: currentPage === 'dashboard' ? 'var(--bg-hero-pink)' : '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Cpu size={14} color="#00F2FE" />
            <span>Companion Hub</span>
          </button>
        </nav>

        {/* Action Buttons (Right) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Google Sign-in / User Profile Pill */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleNav('dashboard')}
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#1E1E1E',
                  color: '#FFFFFF',
                  border: '1.5px solid #444',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                className="user-pill-desktop"
              >
                <User size={13} color="var(--accent-cyan)" />
                <span>{user.name || user.email.split('@')[0]}</span>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out of Google"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#AAA',
                    border: '1px solid #333',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={13} />
                </button>
              )}
            </div>
          ) : (
            onLoginWithGoogle && (
              <button
                onClick={onLoginWithGoogle}
                className="btn-brutal btn-brutal-white google-signin-btn-desktop"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1rem',
                  fontSize: '0.82rem',
                  border: '2px solid #000000',
                  boxShadow: '2.5px 2.5px 0px rgba(255,255,255,0.4)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in</span>
              </button>
            )
          )}

          {/* Connect / Pair Button */}
          <button
            onClick={() => handleNav('connect')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#1E1E1E',
              color: '#FFF',
              border: '2px solid #333',
              padding: '0.55rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-cyan)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#333')}
          >
            <Cpu size={14} color="#00F2FE" />
            <span>Connect NOVA</span>
          </button>

          {/* Join Waitlist Pill */}
          <button
            onClick={handleWaitlistClick}
            className="btn-brutal btn-brutal-white"
            style={{
              padding: '0.58rem 1.25rem',
              fontSize: '0.88rem',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px rgba(255,255,255,0.4)',
            }}
          >
            <Sparkles size={14} style={{ color: '#FF9F1C' }} />
            <span>Join Waitlist</span>
          </button>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1E1E1E',
              color: '#FFFFFF',
              border: '2px solid #333',
              borderRadius: 'var(--radius-sm)',
              width: '2.5rem',
              height: '2.5rem',
              cursor: 'pointer',
            }}
            className="mobile-hamburger"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: '#000000',
            borderTop: '2px solid #222',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <button
            onClick={() => handleNav('home')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            Home
          </button>
          <button
            onClick={() => handleNav('story')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            The NOVA Story
          </button>
          <button
            onClick={() => handleNav('home', 'how-it-works')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            How it works
          </button>
          <button
            onClick={() => handleNav('home', 'expressions')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            Expressions
          </button>
          <button
            onClick={() => handleNav('home', 'specs')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            Hardware Specs
          </button>
          <button
            onClick={() => handleNav('dashboard')}
            style={{
              color: 'var(--accent-cyan)',
              textAlign: 'left',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Cpu size={15} />
            <span>Companion Hub & Dashboard</span>
          </button>
          <button
            onClick={() => handleNav('connect')}
            style={{
              color: 'var(--bg-hero-pink)',
              textAlign: 'left',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Cpu size={15} />
            <span>Connect NOVA (Zero-Touch Wi-Fi)</span>
          </button>
          {onEnterDevLab && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onEnterDevLab();
              }}
              style={{
                color: '#AAA',
                textAlign: 'left',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '0.25rem 0',
              }}
            >
              Advanced Hardware Terminal
            </button>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .user-pill-desktop {
            display: inline-flex !important;
          }
          .google-signin-btn-desktop {
            display: inline-flex !important;
          }
          .mobile-hamburger {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
