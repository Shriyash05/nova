import React, { useState } from 'react';
import { WaveDivider } from '../illustrations/WaveDivider';
import { Sparkles, Terminal, ArrowRight } from 'lucide-react';

export interface FooterProps {
  onOpenWaitlist?: () => void;
  onOpenPreorderModal?: () => void;
  onEnterDevLab?: () => void;
  onNavigate?: (page: 'home' | 'dashboard' | 'connect' | 'story') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenWaitlist,
  onOpenPreorderModal: _onOpenPreorderModal,
  onEnterDevLab,
  onNavigate,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer style={{ backgroundColor: '#000000', color: '#FFFFFF', position: 'relative' }}>
      {/* Wave transition from yellow body into black footer */}
      <WaveDivider fillColor="var(--bg-body-yellow)" bgColor="#000000" />

      <div className="marketing-container" style={{ paddingTop: '3.5rem', paddingBottom: '4rem' }}>
        {/* Top Newsletter / Preorder Banner in Footer */}
        <div
          style={{
            backgroundColor: '#161616',
            border: '2px solid #333333',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            marginBottom: '4rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-hero-pink)',
              color: '#000',
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: '0.8rem',
              padding: '0.35rem 0.95rem',
              borderRadius: '9999px',
              border: '2px solid #000',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Sparkles size={13} />
            <span>JOIN BATCH #1 QUEUE</span>
          </div>

          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.8rem, 3.8vw, 2.75rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              maxWidth: '600px',
              margin: 0,
            }}
          >
            Ready to give your keys a voice?
          </h3>

          <p style={{ color: '#AAAAAA', fontSize: '1rem', maxWidth: '460px', margin: 0 }}>
            Get launch dispatches, private firmware builds, and early access to the custom WakeNet model trainer.
          </p>

          {!subscribed ? (
            <form
              onSubmit={handleNewsletterSubmit}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '460px',
              }}
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: '1 1 240px',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  border: '2px solid #444',
                  backgroundColor: '#0A0A0A',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                }}
              />
              <button
                type="submit"
                className="btn-brutal btn-brutal-amber"
                style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}
              >
                <span>Subscribe</span>
                <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(0, 184, 148, 0.2)',
                border: '1.5px solid #00B894',
                color: '#55EFC4',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
            >
              ✓ You're in line for Batch #1 notifications!
            </div>
          )}
        </div>

        {/* Navigation & Brand Links Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3.5rem',
          }}
        >
          {/* Column 1: Brand & Identity */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                marginBottom: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              super
              <span style={{ color: 'var(--bg-hero-pink)', marginLeft: '0.15rem' }}>nova</span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-cyan)',
                  marginLeft: '0.25rem',
                }}
              />
            </div>
            <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '280px', marginBottom: '1.25rem' }}>
              The pocket-sized keychain voice assistant with local wake-word, zero subscriptions, and an expressive OLED face.
            </p>
            {onEnterDevLab && (
              <button
                onClick={onEnterDevLab}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#1E1E1E',
                  color: '#AAAAAA',
                  border: '1.5px solid #333333',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Terminal size={12} />
                <span>Device Setup Console</span>
              </button>
            )}
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', marginBottom: '1rem', letterSpacing: '0.04em' }}>
              Explore
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {onNavigate && (
                <>
                  <button onClick={() => onNavigate('home')} style={{ color: '#888', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer' }}>
                    Home
                  </button>
                  <button onClick={() => onNavigate('story')} style={{ color: '#888', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer' }}>
                    The NOVA Story
                  </button>
                  <button onClick={() => onNavigate('dashboard')} style={{ color: 'var(--accent-cyan)', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 700 }}>
                    Companion Hub
                  </button>
                  <button onClick={() => onNavigate('connect')} style={{ color: 'var(--bg-hero-pink)', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 700 }}>
                    Connect Device
                  </button>
                </>
              )}
              <button onClick={() => { if (onNavigate) onNavigate('home'); setTimeout(() => scrollTo('how-it-works'), 50); }} style={{ color: '#888', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer' }}>
                How It Works
              </button>
              <button onClick={() => { if (onNavigate) onNavigate('home'); setTimeout(() => scrollTo('expressions'), 50); }} style={{ color: '#888', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer' }}>
                OLED Expressions
              </button>
              <button onClick={() => { if (onNavigate) onNavigate('home'); setTimeout(() => scrollTo('specs'), 50); }} style={{ color: '#888', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer' }}>
                Hardware Blueprint
              </button>
              <button onClick={() => { if (onOpenWaitlist) onOpenWaitlist(); else if (onNavigate) { onNavigate('home'); setTimeout(() => scrollTo('pricing'), 50); } }} style={{ color: '#888', textAlign: 'left', fontSize: '0.9rem', cursor: 'pointer' }}>
                Early Access Editions
              </button>
            </div>
          </div>

          {/* Column 3: Open Source & Hardware */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', marginBottom: '1rem', letterSpacing: '0.04em' }}>
              Open Stack
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', color: '#888', fontSize: '0.9rem' }}>
              <span>ESP-IDF 6.1 Framework</span>
              <span>WakeNet wn9s_hiesp</span>
              <span>FreeRTOS Dual-Task Architecture</span>
              <span>SSD1306 400kHz I2C Driver</span>
              <span>Supabase &amp; Notion OAuth 2.0</span>
            </div>
          </div>

          {/* Column 4: Hardware Telemetry Verification Beacon */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', marginBottom: '1rem', letterSpacing: '0.04em' }}>
              Bench Status
            </h4>
            <div
              style={{
                backgroundColor: '#121212',
                border: '1.5px solid #282828',
                borderRadius: '12px',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: '#55EFC4', fontSize: '0.82rem', fontWeight: 800 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#55EFC4', boxShadow: '0 0 6px #55EFC4' }} />
                <span>COM5 LIVE ON BENCH</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#777', lineHeight: 1.5, margin: 0 }}>
                ESP32-C3 active at 16,000 Hz audio DMA. Centralized state machine &amp; 10s utterance guard deployed.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal / Regulatory Line */}
        <div
          style={{
            borderTop: '1px solid #222222',
            paddingTop: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.82rem',
            color: '#666',
          }}
        >
          <div>
            © 2026 NOVA Project. Built with open hardware integrity and zero subscription lock-in.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>DPDP 2023 Compliant</span>
            <span>•</span>
            <span>WPC ETA Self-Declaration</span>
            <span>•</span>
            <span>RoHS Lead-Free</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
