import React from 'react';
import { ArrowRight, Cpu, Radio, Lock } from 'lucide-react';

export interface HeroSectionProps {
  onOpenLockedModal: (actionType: 'buy' | 'setup') => void;
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
  onSignupClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenLockedModal,
  onExploreClick,
  onHowItWorksClick,
  onSignupClick,
}) => {
  return (
    <section
      style={{
        paddingTop: '3.5rem',
        paddingBottom: '4.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
      }}
    >
      <div className="marketing-container">
        {/* Top Concept Pre-Hardware Notice */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Radio size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span>Industrial Design Concept &bull; Pre-Hardware Prototype</span>
          </div>
        </div>

        {/* Editorial Grid: Copy Left, Hero Render Right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left Column: Headline & Value Proposition */}
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(2.75rem, 5.5vw, 4.5rem)',
                lineHeight: 1.04,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginBottom: '1.25rem',
              }}
            >
              Small enough to carry. Designed to respond.
            </h1>

            <p
              style={{
                fontSize: 'clamp(1rem, 1.25vw, 1.15rem)',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                marginBottom: '2rem',
                maxWidth: '520px',
              }}
            >
              NOVA is an ambient voice-assistant keychain enclosed in a precision transparent enclosure. Engineered around an animated monochrome OLED display, acoustic wake-word spotting, and seamless Notion workspace synchronization.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
                marginBottom: '2.5rem',
              }}
            >
              <button
                onClick={onExploreClick}
                style={{
                  backgroundColor: 'var(--accent-cyan)',
                  color: 'var(--text-on-accent)',
                  padding: '0.85rem 1.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'opacity var(--transition-fast)',
                }}
              >
                <span>Explore NOVA</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={onSignupClick}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  padding: '0.85rem 1.4rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                Get Launch Updates
              </button>

              <button
                onClick={onHowItWorksClick}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.85rem 1.2rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                }}
              >
                How It Works
              </button>

              <button
                onClick={() => onOpenLockedModal('buy')}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--border-subtle)',
                  padding: '0.85rem 1.1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
                title="Pre-orders currently locked"
              >
                <Lock size={13} />
                <span>Buy NOVA</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--status-warning)' }}>Coming Soon</span>
              </button>
            </div>

            {/* Hardware Verification Disclaimer */}
            <div
              style={{
                borderLeft: '2px solid var(--border-strong)',
                paddingLeft: '1rem',
                maxWidth: '480px',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, display: 'block' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Hardware Status Disclosure:</strong> Cloud backend, distributed rate limiting, and encrypted Wi-Fi vault APIs are verified and live. Physical enclosure tooling, battery integration (1,000 mAh target), and ESP32 firmware are in active prototype development.
              </span>
            </div>
          </div>

          {/* Right Column: Hero Concept Render */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src="/images/nova-transparent-hero.jpg"
                alt="NOVA transparent pocket keychain voice assistant concept render showing clear polycarbonate enclosure, exposed internal electronics, 0.96-inch monochrome OLED with cyan pixel smiley face, and metallic keychain loop"
                width={1280}
                height={720}
                loading="eager"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'cover',
                }}
              />

              {/* Render Technical Overlay Bar */}
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Cpu size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    NOVA Prototype Concept Render
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Transparent Shell &bull; 0.96&quot; OLED (• ‿ •) &bull; 35&times;50&times;15mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Hardware Component Badges Strip */}
        <div
          style={{
            marginTop: '3.5rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Form Factor
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              35 &times; 50 &times; 15 mm Keychain
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Visual Feedback
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              0.96&quot; Monochrome OLED (• ‿ •)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Microcontroller
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              ESP32-C3 / S3 (In Evaluation)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Acoustic Input
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              MAX4466 Electret Capsule
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 960px) {
          .hero-grid {
            grid-template-columns: 1.05fr 0.95fr !important;
          }
        }
      `}</style>
    </section>
  );
};
