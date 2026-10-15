import React from 'react';
import { Shield, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export const PrivacyNotionSection: React.FC = () => {
  return (
    <section
      id="privacy"
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
            Integrations &amp; Data Ethics
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
            Notion synchronization without privacy compromises.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            We believe productivity tools should respect your attention and your data. Here is our exact cryptographic and privacy breakdown.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          {/* Notion Security Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Notion OAuth 2.0 Integration
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                  Server-Side OAuth with Envelope Encryption
                </span>
              </div>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--status-success)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Anti-CSRF HMAC States:</strong> Authorization states are signed with a server-side HMAC secret and bound to the initiating pairing session.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--status-success)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Single-Use Replay Protection:</strong> State tokens are recorded in PostgreSQL and marked as used upon callback. Replaying a captured callback returns HTTP 400.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--status-success)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>AES-256-GCM at Rest:</strong> Notion access tokens are encrypted with 96-bit random IVs and authentication tags. Plaintext tokens never enter database logs.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--status-success)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Instant Revocation:</strong> Disconnecting Notion destroys the server-side authorization record and revokes workspace tokens immediately.</span>
              </li>
            </ul>
          </div>

          {/* Privacy Architecture Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 242, 254, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)',
                }}
              >
                <Shield size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Transparent Privacy Model
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  What We Store &bull; What We Don&apos;t
                </span>
              </div>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>No Continuous Cloud Audio Streaming:</strong> The microphone is buffered locally. Audio is only packetized when the hardware wake word triggers.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Passwords Never Return to Web:</strong> When retrieving your Wi-Fi vault in the browser, passwords are masked (null). Only the physical ESP32-C3 can decrypt them over an authenticated channel.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>No Ad Tracking or Third-Party Pixels:</strong> We do not load advertising scripts, social trackers, or cross-site tracking cookies.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--accent-cyan)', lineHeight: 1.55 }}>
                <CheckCircle size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Strict CORS Enforcement:</strong> Only explicitly allowlisted canonical origins can interact with credentialed endpoints; unauthorized origins receive HTTP 403.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* AI Processing Disclosure */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Authentic Processing Clarification:</strong> The ESP32-C3 microcontroller (400KB SRAM) does not run large language models locally on device. Voice recognition for complex commands relies on serverless cloud transcription and language services. Wake-word detection alone is handled on-chip via Espressif WakeNet.
          </p>
        </div>
      </div>
    </section>
  );
};
