import React, { useState } from 'react';
import { Menu, X, Sparkles, Terminal } from 'lucide-react';

export interface NavbarProps {
  onOpenPreorderModal: () => void;
  onEnterDevLab?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPreorderModal, onEnterDevLab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
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
          <a
            href="/"
            aria-label="NOVA home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#FFFFFF',
              textDecoration: 'none',
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
          </a>

          {/* Micro status badge */}
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#1E1E1E',
              border: '1.5px solid #333333',
              borderRadius: '9999px',
              padding: '0.2rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#55EFC4',
              letterSpacing: '0.04em',
            }}
            className="status-badge-desktop"
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#55EFC4' }} />
            <span>FIRMWARE 1.0</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '2rem',
          }}
          className="desktop-nav"
        >
          <button
            onClick={() => scrollTo('features')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          >
            Benefits
          </button>

          <button
            onClick={() => scrollTo('how-it-works')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.95rem',
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
            onClick={() => scrollTo('expressions')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.95rem',
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
            onClick={() => scrollTo('specs')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          >
            Hardware
          </button>

          <button
            onClick={() => scrollTo('pricing')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          >
            Pricing
          </button>

          <button
            onClick={() => scrollTo('faqs')}
            style={{
              color: '#FFFFFF',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bg-hero-pink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          >
            FAQs
          </button>
        </nav>

        {/* Action Buttons (Right) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {onEnterDevLab && (
            <button
              onClick={onEnterDevLab}
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'transparent',
                color: '#AAAAAA',
                border: '1.5px solid #333333',
                padding: '0.55rem 0.95rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              className="dev-lab-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.color = '#FFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.color = '#AAA';
              }}
              title="Hardware device pairing console"
            >
              <Terminal size={13} />
              <span>Pair Device</span>
            </button>
          )}

          {/* The White Pill Pre-order Button matching reference "Log in" pill */}
          <button
            onClick={onOpenPreorderModal}
            className="btn-brutal btn-brutal-white"
            style={{
              padding: '0.6rem 1.4rem',
              fontSize: '0.9rem',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px rgba(255,255,255,0.4)',
            }}
          >
            <Sparkles size={14} style={{ color: '#FF9F1C' }} />
            <span>Pre-order $49</span>
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
            onClick={() => scrollTo('features')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            Benefits
          </button>
          <button
            onClick={() => scrollTo('how-it-works')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            How it works
          </button>
          <button
            onClick={() => scrollTo('expressions')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            Expressions
          </button>
          <button
            onClick={() => scrollTo('specs')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            Hardware Specs
          </button>
          <button
            onClick={() => scrollTo('pricing')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            Pricing & Plans
          </button>
          <button
            onClick={() => scrollTo('faqs')}
            style={{ color: '#FFF', textAlign: 'left', fontWeight: 800, fontSize: '1.1rem', padding: '0.5rem 0' }}
          >
            FAQs
          </button>
          {onEnterDevLab && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onEnterDevLab();
              }}
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
              <Terminal size={15} />
              <span>Hardware Pairing Console</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .status-badge-desktop {
            display: inline-flex !important;
          }
          .dev-lab-btn {
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
