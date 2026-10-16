import React from 'react';
import { WaveDivider } from '../illustrations/WaveDivider';
import { IsometricWorkshop } from '../illustrations/IsometricWorkshop';
import { FlowchartSticker } from '../illustrations/RetroStickers';
import { Cpu, Lock, DollarSign, Activity } from 'lucide-react';

export const FutureSection: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-body-yellow)', position: 'relative' }}>
      {/* Wavy Scallop Divider transitioning from Hero Pink to Body Yellow */}
      <WaveDivider fillColor="#FFAEC8" bgColor="var(--bg-body-yellow)" />

      <section
        id="features"
        style={{
          paddingTop: '3rem',
          paddingBottom: '5rem',
          position: 'relative',
        }}
      >
        {/* Floating Retro Flowchart in bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '4%',
            opacity: 0.95,
            zIndex: 10,
          }}
          className="animate-float"
        >
          <FlowchartSticker size={130} />
        </div>

        <div className="marketing-container" style={{ position: 'relative', zIndex: 5 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '3.5rem',
              alignItems: 'center',
            }}
            className="future-grid"
          >
            {/* Left: Isometric Mech Hardware Lab Illustration */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <IsometricWorkshop />
            </div>

            {/* Right: Narrative & The "The future of design services" Headline */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '9999px',
                  padding: '0.35rem 0.95rem',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                <span>Hardware Integrity</span>
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(2rem, 4.2vw, 3.25rem)',
                  fontWeight: 900,
                  color: '#000000',
                  lineHeight: 1.1,
                  letterSpacing: '-0.035em',
                  marginBottom: '1.25rem',
                }}
              >
                The future of keychain assistants
              </h2>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(1rem, 1.25vw, 1.15rem)',
                  fontWeight: 500,
                  color: '#1A1A1A',
                  lineHeight: 1.65,
                  marginBottom: '2rem',
                }}
              >
                Need instant voice memos, effortless Notion synchronization, and a pocket companion that never snoops on you? Welcome home. We're NOVA, your tactile hardware partner with zero monthly subscriptions. We're all about delivering honest personal computing in a tiny keychain.
              </p>

              {/* Neo-brutalist Key Stat Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFDF7',
                    border: '2.5px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.15rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <DollarSign size={18} style={{ color: '#00B894' }} />
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.35rem', color: '#000' }}>
                      $0/mo
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444', margin: 0 }}>
                    Zero monthly subscription. Buy the device, own the hardware forever.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFDF7',
                    border: '2.5px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.15rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Lock size={18} style={{ color: '#FF7675' }} />
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.35rem', color: '#000' }}>
                      Local
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444', margin: 0 }}>
                    Acoustic wake net runs strictly on ESP32-C3 flash. Zero passive streaming.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFDF7',
                    border: '2.5px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.15rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Activity size={18} style={{ color: '#0984E3' }} />
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.35rem', color: '#000' }}>
                      16 kHz
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444', margin: 0 }}>
                    Continuous analog DMA sampling with real-time sound equalizer visualizer.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFDF7',
                    border: '2.5px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.15rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Cpu size={18} style={{ color: '#6C5CE7' }} />
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.35rem', color: '#000' }}>
                      128×64
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444', margin: 0 }}>
                    SSD1306 monochrome OLED featuring 12+ lively procedural expressions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (min-width: 900px) {
            .future-grid {
              grid-template-columns: 0.9fr 1.1fr !important;
            }
          }
        `}</style>
      </section>
    </div>
  );
};
