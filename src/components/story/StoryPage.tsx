import React from 'react';
import { ArrowLeft, Sparkles, Shield, Cpu, Heart, Mic, KeyRound } from 'lucide-react';

export interface StoryPageProps {
  onGoHome: () => void;
  onOpenWaitlist: () => void;
}

export const StoryPage: React.FC<StoryPageProps> = ({ onGoHome, onOpenWaitlist }) => {
  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '3rem 1.25rem 6rem' }}>
      {/* Back button */}
      <button
        onClick={onGoHome}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          backgroundColor: '#FFF',
          border: '2px solid #000',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '2.5px 2.5px 0px #000',
          fontWeight: 800,
          fontSize: '0.88rem',
          cursor: 'pointer',
          marginBottom: '2rem',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </button>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#FFAEC8',
            border: '2.5px solid #000',
            padding: '0.35rem 1rem',
            borderRadius: '9999px',
            fontWeight: 900,
            fontSize: '0.85rem',
            boxShadow: '3px 3px 0px #000',
            marginBottom: '1rem',
          }}
        >
          <KeyRound size={15} />
          <span>THE NOVA MANIFESTO</span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 6vw, 3.8rem)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            marginBottom: '1.25rem',
          }}
        >
          Why We Built a Keychain Assistant
        </h1>

        <p style={{ fontSize: '1.25rem', color: 'var(--text-body)', lineHeight: 1.6, fontWeight: 600 }}>
          The world didn't need another 6.7-inch glowing glass rectangle designed to monopolize your attention. We built NOVA because we wanted something tiny, tactile, and loyal.
        </p>
      </div>

      {/* Philosophy Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.75rem', marginBottom: '3.5rem' }}>
        <div
          className="card-brutal"
          style={{ backgroundColor: 'var(--bg-card-cream)', padding: '1.75rem' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', backgroundColor: '#FFAEC8', border: '2.5px solid #000', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Heart size={22} color="#000" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Personality, Not a Megaphone
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            NOVA doesn't speak with a generic synthesized voice across your living room. Instead, it uses a tiny 0.96" OLED screen with 10 expressive pixel-art emotions to tell you when it's thinking, listening, or celebrating your ideas.
          </p>
        </div>

        <div
          className="card-brutal"
          style={{ backgroundColor: 'var(--bg-card-cream)', padding: '1.75rem' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', backgroundColor: '#4ECCA3', border: '2.5px solid #000', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Shield size={22} color="#000" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Privacy by Physical Physics
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            The MAX4466 analog electret microphone is sampled at 16,000 Hz strictly by the ESP32-C3 chip. The acoustic wake model ("Hi ESP") runs locally in firmware. Zero audio is sent to the cloud until you explicitly trigger the wake word.
          </p>
        </div>

        <div
          className="card-brutal"
          style={{ backgroundColor: 'var(--bg-card-cream)', padding: '1.75rem' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--btn-amber)', border: '2.5px solid #000', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Cpu size={22} color="#000" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Open RISC-V Hardware
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Powered by the ESP32-C3 Super Mini with 4MB of flash and built on ESP-IDF 6.1. Flash your own custom firmware, plug in sensors, or rewrite the state machine. Your device belongs to you.
          </p>
        </div>

        <div
          className="card-brutal"
          style={{ backgroundColor: 'var(--bg-card-cream)', padding: '1.75rem' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', backgroundColor: '#00F2FE', border: '2.5px solid #000', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Mic size={22} color="#000" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Direct Notion Workspace Sync
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Capture fleeting thoughts, to-do lists, and voice memos on the go. NOVA formats and transcribes your notes straight into your favorite Notion databases automatically.
          </p>
        </div>
      </div>

      {/* Early Access CTA */}
      <div
        className="card-brutal"
        style={{
          backgroundColor: '#FFAEC8',
          padding: '2.5rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>
          Want to Own a NOVA?
        </h2>
        <p style={{ fontSize: '1.05rem', color: '#111', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          We're handcrafting the first batch of keychain enclosures right now. Join the priority waitlist for early access.
        </p>
        <button
          onClick={onOpenWaitlist}
          className="btn-brutal btn-brutal-amber"
          style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}
        >
          <Sparkles size={16} />
          <span>Join Priority Waitlist</span>
        </button>
      </div>
    </div>
  );
};
