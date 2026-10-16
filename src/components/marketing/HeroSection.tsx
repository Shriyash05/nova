import React, { useState } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap, Database } from 'lucide-react';
import { IsometricHeroRobot } from '../illustrations/IsometricHeroRobot';
import { StarBubbleSticker, LightningBoltSticker } from '../illustrations/RetroStickers';

export interface HeroSectionProps {
  onOpenPreorderModal: () => void;
  onExploreClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenPreorderModal,
  onExploreClick,
}) => {
  const [robotMood, setRobotMood] = useState<'idle' | 'wake' | 'listening' | 'processing' | 'success'>('idle');

  return (
    <section
      style={{
        backgroundColor: 'var(--bg-hero-pink)',
        paddingTop: '3.5rem',
        paddingBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Floating Retro Stickers in the background */}
      <div
        style={{
          position: 'absolute',
          top: '30px',
          left: '4%',
          opacity: 0.9,
          transform: 'rotate(-8deg)',
        }}
        className="animate-float"
      >
        <StarBubbleSticker size={60} />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '46%',
          opacity: 0.8,
          transform: 'rotate(12deg)',
        }}
        className="animate-float-delayed"
      >
        <LightningBoltSticker size={48} />
      </div>

      <div className="marketing-container" style={{ position: 'relative', zIndex: 5 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left Column: Playful, Massive Display Typography */}
          <div>
            {/* The "super hello" Puffy Header from the reference image */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#FFFFFF',
                border: '2.5px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '9999px',
                padding: '0.35rem 1.1rem',
                marginBottom: '1.5rem',
              }}
            >
              <Sparkles size={14} style={{ color: '#FF9F1C' }} />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#000000',
                }}
              >
                Meet NOVA 1.0 — Pocket Hardware
              </span>
            </div>

            {/* Giant Graphic Headline */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(3.5rem, 8.5vw, 6.5rem)',
                  fontWeight: 900,
                  lineHeight: 0.92,
                  letterSpacing: '-0.05em',
                  color: '#FFFFFF',
                  textShadow: '3px 3px 0px #000000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 4px 4px 0px #000',
                  userSelect: 'none',
                }}
              >
                hello
                <span
                  style={{
                    display: 'block',
                    color: '#000000',
                    textShadow: 'none',
                    letterSpacing: '-0.04em',
                  }}
                >
                  nova
                </span>
              </div>
            </div>

            {/* Sub-headline: "A design agency....kinda" -> "A tiny voice companion....kinda" */}
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.5rem, 3.2vw, 2.35rem)',
                fontWeight: 900,
                color: '#000000',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '0.75rem',
              }}
            >
              A tiny voice companion....kinda
            </h1>

            {/* One-sentence hook matching reference */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)',
                fontWeight: 600,
                color: '#222222',
                lineHeight: 1.5,
                maxWidth: '480px',
                marginBottom: '2rem',
              }}
            >
              Zero monthly subscriptions. Instant local wake-word on ESP32-C3 RISC-V. An expressive OLED face on your keychain.
            </p>

            {/* CTA Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                marginBottom: '2.5rem',
              }}
            >
              {/* The Orange Amber Button from reference "See Plans" */}
              <button
                onClick={onOpenPreorderModal}
                className="btn-brutal btn-brutal-amber"
                style={{
                  fontSize: '1.1rem',
                  padding: '1rem 2.25rem',
                }}
              >
                <span>Pre-order NOVA — $49</span>
                <ArrowRight size={18} />
              </button>

              {onExploreClick && (
                <button
                  onClick={onExploreClick}
                  className="btn-brutal btn-brutal-white"
                  style={{
                    fontSize: '1rem',
                    padding: '1rem 1.75rem',
                  }}
                >
                  <span>See How It Works</span>
                </button>
              )}
            </div>

            {/* Trust / Spec Badges */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.65rem',
              }}
            >
              <div className="badge-brutal badge-brutal-white">
                <ShieldCheck size={14} style={{ color: '#00B894' }} />
                <span>100% Offline WakeNet</span>
              </div>
              <div className="badge-brutal badge-brutal-white">
                <Zap size={14} style={{ color: '#FF9F1C' }} />
                <span>ESP32-C3 160MHz</span>
              </div>
              <div className="badge-brutal badge-brutal-white">
                <Database size={14} style={{ color: '#6C5CE7' }} />
                <span>Direct Notion Sync</span>
              </div>
            </div>
          </div>

          {/* Right Column: Handcrafted Isometric Robot Companion */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <IsometricHeroRobot
              currentExpression={robotMood}
              onExpressionChange={setRobotMood}
            />

            {/* Interactive Mood Selector underneath Robot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '1rem',
                backgroundColor: '#FFFFFF',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '9999px',
                padding: '0.35rem 0.65rem',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: '#666',
                  paddingLeft: '0.35rem',
                }}
              >
                Mood:
              </span>
              {(['idle', 'wake', 'listening', 'processing', 'success'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setRobotMood(m)}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    border: robotMood === m ? '1.5px solid #000' : '1.5px solid transparent',
                    backgroundColor: robotMood === m ? 'var(--btn-amber)' : 'transparent',
                    color: '#000',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .hero-grid {
            grid-template-columns: 1.15fr 0.85fr !important;
          }
        }
      `}</style>
    </section>
  );
};
