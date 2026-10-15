import React, { useState } from 'react';
import { Menu, X, ArrowRight, Lock, Radio } from 'lucide-react';

export interface NavbarProps {
  onOpenLockedModal: (actionType: 'buy' | 'setup') => void;
  onEnterDevLab?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLockedModal, onEnterDevLab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
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
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="marketing-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.25rem',
        }}
      >
        {/* Brand Wordmark & Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="/"
            aria-label="NOVA home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            <span
              className="font-display"
              style={{
                fontSize: '1.65rem',
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}
            >
              NOVA
            </span>
          </a>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.2rem 0.55rem',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
            }}
            title="Hardware status: In bench prototype stage"
          >
            <Radio size={11} style={{ color: 'var(--accent-cyan)' }} />
            <span>PRE-HARDWARE</span>
          </div>
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
            onClick={() => scrollToSection('product')}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '0.25rem 0',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Product
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '0.25rem 0',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('hardware')}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '0.25rem 0',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Blueprint &amp; Hardware
          </button>
          <button
            onClick={() => scrollToSection('privacy')}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '0.25rem 0',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Security &amp; Notion
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '0.25rem 0',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            FAQ
          </button>
        </nav>

        {/* Action CTAs */}
        <div style={{ display: 'none', alignItems: 'center', gap: '0.75rem' }} className="desktop-actions">
          {/* Locked Setup Button */}
          <button
            onClick={() => onOpenLockedModal('setup')}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Device setup requires physical hardware"
          >
            <Lock size={12} />
            <span>Setup Device</span>
          </button>

          {/* Locked Buy Button */}
          <button
            onClick={() => onOpenLockedModal('buy')}
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Pre-orders not yet open"
          >
            <span>Buy NOVA</span>
            <span
              style={{
                fontSize: '0.65rem',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--status-warning)',
                padding: '0.1rem 0.35rem',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              Soon
            </span>
          </button>

          {onEnterDevLab && (
            <button
              onClick={onEnterDevLab}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                padding: '0.45rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
              title="Open Hardware Bench Lab"
            >
              Lab
            </button>
          )}

          {/* Real Launch Conversion Button */}
          <button
            onClick={() => scrollToSection('launch-signup')}
            style={{
              backgroundColor: 'var(--accent-cyan)',
              color: 'var(--text-on-accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'opacity var(--transition-fast)',
            }}
          >
            <span>Get Updates</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            color: 'var(--text-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
          }}
          className="mobile-toggle"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-strong)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
          className="mobile-drawer"
        >
          <button
            onClick={() => scrollToSection('product')}
            style={{
              background: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              textAlign: 'left',
              padding: '0.5rem 0',
            }}
          >
            Product
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            style={{
              background: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              textAlign: 'left',
              padding: '0.5rem 0',
            }}
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('hardware')}
            style={{
              background: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              textAlign: 'left',
              padding: '0.5rem 0',
            }}
          >
            Blueprint &amp; Hardware
          </button>
          <button
            onClick={() => scrollToSection('privacy')}
            style={{
              background: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              textAlign: 'left',
              padding: '0.5rem 0',
            }}
          >
            Security &amp; Notion
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            style={{
              background: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              textAlign: 'left',
              padding: '0.5rem 0',
            }}
          >
            FAQ
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection('launch-signup');
              }}
              style={{
                backgroundColor: 'var(--accent-cyan)',
                color: 'var(--text-on-accent)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>Get Launch Notifications</span>
              <ArrowRight size={15} />
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLockedModal('setup');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                }}
              >
                <Lock size={12} />
                <span>Setup</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLockedModal('buy');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>Buy</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--status-warning)' }}>(Soon)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media query styling for navbar */}
      <style>{`
        @media (min-width: 860px) {
          .desktop-nav { display: flex !important; }
          .desktop-actions { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </header>
  );
};
