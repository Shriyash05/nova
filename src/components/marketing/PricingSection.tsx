import React from 'react';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

export interface PricingSectionProps {
  onSelectTier: (tier: 'maker' | 'keychain' | 'twin') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectTier }) => {
  return (
    <section
      id="pricing"
      style={{
        backgroundColor: 'var(--bg-body-yellow)',
        paddingTop: '3rem',
        paddingBottom: '6rem',
        position: 'relative',
      }}
    >
      <div className="marketing-container">
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: '9999px',
              padding: '0.35rem 1rem',
              marginBottom: '1rem',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.82rem',
              fontWeight: 900,
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} style={{ color: '#FF9F1C' }} />
            <span>Early Access Hardware Editions</span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)',
              fontWeight: 900,
              color: '#000000',
              letterSpacing: '-0.04em',
              marginBottom: '0.75rem',
            }}
          >
            Zero monthly subscriptions. Ever.
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              fontWeight: 500,
              color: '#262626',
              maxWidth: '560px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            NOVA is currently in pre-production. Join the priority waitlist today for batch #1 allocation with zero upfront payment.
          </p>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '2rem',
            alignItems: 'stretch',
          }}
        >
          {/* Tier 1: Maker Kit */}
          <div className="card-brutal" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <span className="badge-brutal badge-brutal-white" style={{ marginBottom: '0.75rem' }}>
                Hacker / DIY
              </span>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 900, color: '#000' }}>
                Maker Kit
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#555', marginTop: '0.25rem' }}>
                For makers who want to build, 3D print, and solder their own companion.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.75rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.75rem', fontWeight: 900, color: '#000' }}>
                $39
              </span>
              <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 700 }}>one-time</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>ESP32-C3 Super Mini (Pre-flashed)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>SSD1306 128×64 Monochrome OLED</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>MAX4466 Analog Mic module with gain pot</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>Open source C firmware &amp; 3D STL CAD</span>
              </li>
            </ul>

            <button
              onClick={() => onSelectTier('maker')}
              className="btn-brutal btn-brutal-white"
              style={{ width: '100%' }}
            >
              <span>Join Waitlist (Maker Kit)</span>
            </button>
          </div>

          {/* Tier 2: NOVA Keychain Edition (FEATURED / MOST POPULAR) */}
          <div
            className="card-brutal"
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#FFFFFF',
              border: '3.5px solid #000000',
              boxShadow: '8px 8px 0px #000000',
              position: 'relative',
              transform: 'translateY(-8px)',
            }}
          >
            {/* Pop Ribbon / Badge on Top */}
            <div
              style={{
                position: 'absolute',
                top: '-16px',
                right: '24px',
                backgroundColor: 'var(--bg-hero-pink)',
                color: '#000000',
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0.35rem 0.95rem',
                borderRadius: '9999px',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
              }}
            >
              ★ MOST POPULAR
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span className="badge-brutal badge-brutal-yellow" style={{ marginBottom: '0.75rem' }}>
                Full Assembled Companion
              </span>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 900, color: '#000' }}>
                NOVA Keychain
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.25rem' }}>
                The complete pocket experience. Fully assembled, calibrated, and ready on day one.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.75rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', fontWeight: 900, color: '#000' }}>
                $59
              </span>
              <span style={{ fontSize: '0.95rem', color: '#666', fontWeight: 700 }}>one-time</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 700 }}>
                <Check size={17} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>Assembled transparent polycarbonate chassis</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 700 }}>
                <Check size={17} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>Stainless steel keychain ring &amp; braided cable</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 700 }}>
                <Check size={17} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>Local WakeNet “Hi ESP” model pre-tuned</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 700 }}>
                <Check size={17} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>1-Click Notion workspace integration template</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 700 }}>
                <Check size={17} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>1-Year hardware warranty &amp; OTA updates</span>
              </li>
            </ul>

            <button
              onClick={() => onSelectTier('keychain')}
              className="btn-brutal btn-brutal-amber"
              style={{ width: '100%', fontSize: '1.05rem', padding: '1rem' }}
            >
              <span>Join Waitlist (Keychain Edition)</span>
              <ArrowRight size={17} />
            </button>
          </div>

          {/* Tier 3: Dev Twin Pack */}
          <div className="card-brutal" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <span className="badge-brutal badge-brutal-white" style={{ marginBottom: '0.75rem' }}>
                Hacker &amp; Dev Twin
              </span>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 900, color: '#000' }}>
                Dev Twin Pack
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#555', marginTop: '0.25rem' }}>
                Two devices for developers, home automators, and firmware hackers.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.75rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.75rem', fontWeight: 900, color: '#000' }}>
                $99
              </span>
              <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 700 }}>one-time ($20 off)</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>2× Fully assembled NOVA companions (Frost &amp; Smoke)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>UART / JTAG debugging cable &amp; test header</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>Custom wake-word model training SDK guide</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 600 }}>
                <Check size={16} style={{ color: '#00B894', flexShrink: 0 }} />
                <span>Priority Batch #1 dispatch queue</span>
              </li>
            </ul>

            <button
              onClick={() => onSelectTier('twin')}
              className="btn-brutal btn-brutal-white"
              style={{ width: '100%' }}
            >
              <span>Join Waitlist (Twin Pack)</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
