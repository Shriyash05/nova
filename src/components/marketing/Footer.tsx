import React from 'react';
import { Radio, Cpu } from 'lucide-react';

export interface FooterProps {
  onEnterDevLab?: () => void;
  onOpenLockedModal: (actionType: 'buy' | 'setup') => void;
}

export const Footer: React.FC<FooterProps> = ({ onEnterDevLab, onOpenLockedModal }) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer
      style={{
        backgroundColor: '#06080d',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '4.5rem',
        paddingBottom: '3.5rem',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="marketing-container">
        {/* Main 4-Column Footer Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2.5rem',
            marginBottom: '4rem',
          }}
        >
          {/* Col 1: Wordmark & Architecture Statement */}
          <div style={{ maxWidth: '300px' }}>
            <span
              className="font-display"
              style={{
                fontSize: '2rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
                display: 'block',
                marginBottom: '0.75rem',
              }}
            >
              NOVA
            </span>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              The ambient voice assistant keychain. Built on a transparent polycarbonate chassis, monochrome OLED, and secure Notion synchronization.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.6rem',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              <Radio size={11} style={{ color: 'var(--status-warning)' }} />
              <span>Phase: Pre-Hardware Prototype</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <li>
                <button
                  onClick={() => scrollTo('product')}
                  style={{ background: 'none', color: 'var(--text-secondary)', textAlign: 'left', padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  Product Experience
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  style={{ background: 'none', color: 'var(--text-secondary)', textAlign: 'left', padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('hardware')}
                  style={{ background: 'none', color: 'var(--text-secondary)', textAlign: 'left', padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  Hardware Specifications
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('privacy')}
                  style={{ background: 'none', color: 'var(--text-secondary)', textAlign: 'left', padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  Security &amp; Notion
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('faq')}
                  style={{ background: 'none', color: 'var(--text-secondary)', textAlign: 'left', padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Actions & Developer Mode */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Access &amp; Actions
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <li>
                <button
                  onClick={() => scrollTo('launch-signup')}
                  style={{ background: 'none', color: 'var(--accent-cyan)', textAlign: 'left', padding: 0, fontWeight: 600 }}
                >
                  Get Launch Updates &rarr;
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLockedModal('setup')}
                  style={{ background: 'none', color: 'var(--text-muted)', textAlign: 'left', padding: 0 }}
                >
                  Device Setup (Locked)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLockedModal('buy')}
                  style={{ background: 'none', color: 'var(--text-muted)', textAlign: 'left', padding: 0 }}
                >
                  Buy NOVA (Coming Soon)
                </button>
              </li>
              {onEnterDevLab && (
                <li style={{ marginTop: '0.5rem' }}>
                  <button
                    onClick={onEnterDevLab}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.35rem 0.65rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                    title="Launch Device Lab & Vault Management"
                  >
                    <Cpu size={13} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Enter Bench Lab</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Repository & Real Support */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Open Source &amp; Code
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <li>
                <a
                  href="https://github.com/Shriyash05/nova"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Shriyash05/nova/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  Issue Tracker
                </a>
              </li>
              <li>
                <a
                  href="https://buynovastore.vercel.app/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  Live Health Check API
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Baseline Bar */}
        <div
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            &copy; 2026 NOVA Project. Prototype development phase. All hardware behavior subject to bench testing.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>ESP32 Firmware Evaluation (v1.0.0-dev)</span>
            <span style={{ color: 'var(--border-subtle)' }}>&bull;</span>
            <span>Production: buynovastore.vercel.app</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
