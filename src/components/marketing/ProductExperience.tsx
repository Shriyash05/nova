import React, { useState } from 'react';
import { Mic, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

export const ProductExperience: React.FC = () => {
  const [activeOledTab, setActiveOledTab] = useState<'smile' | 'standby' | 'listening' | 'processing' | 'synced' | 'qr'>('smile');

  return (
    <section
      id="product"
      style={{
        paddingTop: '5rem',
        paddingBottom: '5rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="marketing-container">
        {/* Section Heading */}
        <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--accent-cyan)',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Interaction Lifecycle
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
            }}
          >
            Tactile, glanceable feedback in your pocket.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            NOVA is designed to keep you present. No glowing phone screens or endless notifications—just a dedicated physical assistant with instant visual confirmation.
          </p>
        </div>

        {/* 4-Step Sequence Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '4rem',
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Mic size={18} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Phase 1 &bull; Wake
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
              &quot;Hi ESP&quot; Wake Word
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              The MAX4466 microphone samples audio continuously at 16 kHz. Espressif WakeNet keyword spotting activates voice capture without touching your phone.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Eye size={18} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Phase 2 &bull; Feedback
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
              Monochrome OLED
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              The 128&times;64 pixel OLED immediately reflects your voice state with clean, zero-distraction graphics: standby, listening waveforms, or sync status.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Sparkles size={18} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Phase 3 &bull; Capture
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
              Voice Note Workflow
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Dictate thoughts, capture tasks, and log ideas instantly. The device buffers your audio securely over encrypted 2.4GHz Wi-Fi directly to the backend.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--status-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Phase 4 &bull; Sync
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
              Notion Cloud Sync
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Synchronizes structured notes into your designated Notion workspace database using server-side AES-256-GCM envelope encrypted access tokens.
            </p>
          </div>
        </div>

        {/* Interactive OLED Display State Visualizer & Hardware Render Split */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            marginBottom: '4rem',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
              Interactive Hardware Emulator
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Monochrome OLED Expressions &amp; Physical Render
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Click any expression state to see how the pixel-art communicates status, paired alongside the physical transparent prototype render.
            </p>
          </div>

          {/* State Selectors */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1.75rem',
            }}
          >
            {[
              { id: 'smile', label: '1. Pixel Smile (• ‿ •)' },
              { id: 'standby', label: '2. Standby Text' },
              { id: 'listening', label: '3. Listening Waveform' },
              { id: 'processing', label: '4. Cloud Processing' },
              { id: 'synced', label: '5. Synced to Notion' },
              { id: 'qr', label: '6. Pairing / Claim' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveOledTab(tab.id as any)}
                style={{
                  backgroundColor: activeOledTab === tab.id ? 'var(--accent-cyan)' : 'var(--bg-surface-elevated)',
                  color: activeOledTab === tab.id ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Split View: Left = Interactive OLED Canvas, Right = Physical Render */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              alignItems: 'center',
            }}
          >
            {/* Left: Interactive OLED Display Frame */}
            <div
              style={{
                backgroundColor: '#020406',
                border: '2px solid #1a2233',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                aspectRatio: '2 / 1',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'inset 0 0 20px rgba(0, 242, 254, 0.05)',
                minHeight: '220px',
              }}
            >
              {/* OLED Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#00f2fe', letterSpacing: '0.04em' }}>
                <span style={{ fontWeight: 700 }}>NOVA // 0.96&quot;</span>
                <span>2.4G &bull; -58dBm</span>
              </div>

              {/* OLED Main Content Canvas */}
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                {activeOledTab === 'smile' && (
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#00f2fe', letterSpacing: '0.12em', marginBottom: '0.2rem', fontFamily: 'monospace' }}>
                      • ‿ •
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6be7ff', opacity: 0.9 }}>
                      Standby &bull; Wake with &quot;Hi ESP&quot;
                    </div>
                  </div>
                )}

                {activeOledTab === 'standby' && (
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00f2fe', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                      STANDBY
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6be7ff', opacity: 0.85 }}>
                      Say &quot;Hi ESP&quot; to begin
                    </div>
                  </div>
                )}

                {activeOledTab === 'listening' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3px', height: '36px', marginBottom: '0.25rem' }}>
                      {[8, 16, 26, 34, 18, 30, 36, 22, 14, 28, 32, 18, 10].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            width: '4px',
                            height: `${h}px`,
                            backgroundColor: '#00f2fe',
                            borderRadius: '1px',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#00f2fe', letterSpacing: '0.05em' }}>
                      LISTENING... [MAX4466]
                    </div>
                  </div>
                )}

                {activeOledTab === 'processing' && (
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#00f2fe', marginBottom: '0.35rem' }}>
                      PACKETIZING AUDIO
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6be7ff', opacity: 0.85 }}>
                      Pushing to Vercel Endpoint...
                    </div>
                  </div>
                )}

                {activeOledTab === 'synced' && (
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00f2fe', marginBottom: '0.2rem' }}>
                      &check; NOTION SYNCED
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6be7ff', opacity: 0.9 }}>
                      Note captured into Workspace
                    </div>
                  </div>
                )}

                {activeOledTab === 'qr' && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6be7ff', marginBottom: '0.2rem' }}>
                      PAIRING SHORT CODE
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#00f2fe', letterSpacing: '0.1em' }}>
                      NOV-84F3
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#6be7ff', opacity: 0.75, marginTop: '0.2rem' }}>
                      Scan QR on buynovastore.vercel.app
                    </div>
                  </div>
                )}
              </div>

              {/* OLED Footer Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#00f2fe', opacity: 0.75 }}>
                <span>BATTERY: 5V USB</span>
                <span>SLOT 1 DEFAULT</span>
              </div>
            </div>

            {/* Right: Transparent Front Render Preview */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src="/images/nova-front-expression.jpg"
                alt="NOVA front-facing concept render showing clear transparent polycarbonate casing, four corner M2 screws, glowing cyan pixel smiley face on the monochrome OLED screen, and top metallic keychain loop"
                width={600}
                height={600}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  maxHeight: '260px',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  padding: '0.6rem 1rem',
                  backgroundColor: 'rgba(9, 11, 16, 0.9)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  Physical Enclosure Concept
                </span>
                <span style={{ color: 'var(--accent-cyan)' }}>
                  Clear Polycarbonate &bull; M2 Screws
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transparent Capability Matrix */}
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Project Transparency
            </span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              Capability Roadmap &bull; Verified vs In Development
            </h3>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Capability</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Layer</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verification Status</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Distributed Rate Limiter</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>Serverless Backend</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--status-success)', fontWeight: 600 }}>Verified &bull; Live</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)' }}>PostgreSQL atomic ledger with fail-closed 503 outage protection</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>AES-256-GCM Wi-Fi Profile Vault</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>Database &amp; API</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--status-success)', fontWeight: 600 }}>Verified &bull; Live</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)' }}>Multi-network storage with voice slots; passwords decrypted for firmware only</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notion OAuth 2.0 Integration</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>Cloud Auth</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--status-success)', fontWeight: 600 }}>Verified &bull; Live</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)' }}>HMAC-signed anti-CSRF state tokens with single-use replay protection</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>ESP32-C3 Firmware Audio Pipeline</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>Hardware Firmware</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--status-warning)', fontWeight: 600 }}>In Development</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)' }}>MAX4466 ADC sampling, I2C OLED driver, and Wi-Fi state machine</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Physical Enclosure Production</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>Manufacturing</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Planned</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)' }}>Precision chamfered graphite tooling, lanyard keyring loop, battery sizing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
