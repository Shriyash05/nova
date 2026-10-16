import React from 'react';
import {
  LightningBoltSticker,
  PaperAirplaneSticker,
  EyeGlyphSticker,
} from '../illustrations/RetroStickers';

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="how-it-works"
      style={{
        backgroundColor: 'var(--bg-body-yellow)',
        paddingTop: '2rem',
        paddingBottom: '5rem',
        position: 'relative',
      }}
    >
      <div className="marketing-container">
        {/* Centered Heading exactly as in the reference image */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              fontWeight: 900,
              color: '#000000',
              letterSpacing: '-0.04em',
            }}
          >
            How it works
          </h2>
        </div>

        {/* The 3 Neo-Brutalist Cards Grid (Directly matching the 3 cards in the reference image!) */}
        <div className="grid-cards-3" style={{ marginBottom: '4.5rem' }}>
          {/* Card 1: 1. Wake (Lightning Bolt) */}
          <div className="card-brutal card-brutal-interactive">
            {/* Inset Pink Icon Box with Center Line */}
            <div
              className="card-inset-pink"
              style={{
                height: '140px',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ position: 'relative', zIndex: 2 }}>
                <LightningBoltSticker size={64} />
              </div>
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#000000',
                letterSpacing: '-0.03em',
                marginBottom: '0.85rem',
              }}
            >
              Wake
            </h3>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.98rem',
                fontWeight: 500,
                color: '#262626',
                lineHeight: 1.6,
              }}
            >
              Kickstart your companion by saying “Hi ESP”. NOVA’s local WakeNet engine spots the acoustic trigger on the ESP32-C3 RISC-V core with zero cloud lag.
            </p>
          </div>

          {/* Card 2: 2. Speak (Paper Airplane) */}
          <div className="card-brutal card-brutal-interactive">
            {/* Inset Pink Icon Box with Center Line */}
            <div
              className="card-inset-pink"
              style={{
                height: '140px',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ position: 'relative', zIndex: 2 }}>
                <PaperAirplaneSticker size={76} />
              </div>
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#000000',
                letterSpacing: '-0.03em',
                marginBottom: '0.85rem',
              }}
            >
              Speak
            </h3>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.98rem',
                fontWeight: 500,
                color: '#262626',
                lineHeight: 1.6,
              }}
            >
              Alright, you're in! Speak your thoughts, ideas, or to-dos. The analog MAX4466 microphone captures crisp audio while the OLED equalizer bars dance in real-time.
            </p>
          </div>

          {/* Card 3: 3. Express & Sync (All-Seeing Eye) */}
          <div className="card-brutal card-brutal-interactive">
            {/* Inset Pink Icon Box with Center Line */}
            <div
              className="card-inset-pink"
              style={{
                height: '140px',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ position: 'relative', zIndex: 2 }}>
                <EyeGlyphSticker size={78} />
              </div>
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#000000',
                letterSpacing: '-0.03em',
                marginBottom: '0.85rem',
              }}
            >
              Express &amp; Sync
            </h3>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.98rem',
                fontWeight: 500,
                color: '#262626',
                lineHeight: 1.6,
              }}
            >
              Hold tight! In just seconds, NOVA’s OLED eyes react with joyful sparkles, and your voice memo syncs directly to your Notion database with zero monthly fee.
            </p>
          </div>
        </div>

        {/* The Marquee Ticker: "We've got you... Notion Sync, ESP32-C3, Local WakeNet" */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.5rem, 3.5vw, 2.35rem)',
              fontWeight: 900,
              color: '#000000',
              letterSpacing: '-0.03em',
            }}
          >
            We've got you... Notion Sync, Offline Privacy &amp; Pure Hardware
          </h3>
        </div>
      </div>

      {/* Infinite Scrolling Ticker Banner across the full width */}
      <div className="ticker-wrap">
        <div className="ticker-move">
          {[0, 1].map((copyIndex) => (
            <div key={copyIndex} style={{ display: 'flex', alignItems: 'center' }}>
              <span className="ticker-item">
                <span style={{ color: 'var(--bg-hero-pink)' }}>★</span> ZERO SUBSCRIPTION
              </span>
              <span className="ticker-item">
                <span style={{ color: 'var(--btn-amber)' }}>⚡</span> ESP32-C3 160MHZ RISC-V
              </span>
              <span className="ticker-item">
                <span style={{ color: '#55EFC4' }}>🔒</span> LOCAL WAKENET WAKE-WORD
              </span>
              <span className="ticker-item">
                <span style={{ color: '#74B9FF' }}>📝</span> DIRECT NOTION DATABASE SYNC
              </span>
              <span className="ticker-item">
                <span style={{ color: 'var(--bg-hero-pink)' }}>👀</span> 128×64 ANIMATED OLED
              </span>
              <span className="ticker-item">
                <span style={{ color: 'var(--btn-amber)' }}>🎤</span> MAX4466 16 KHZ SAMPLING
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
