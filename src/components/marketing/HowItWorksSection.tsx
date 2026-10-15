import React from 'react';
import { Database, KeyRound, Wifi, RefreshCw } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="how-it-works"
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
            System Architecture
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
            A security model engineered for physical hardware.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Most consumer IoT devices take dangerous shortcuts with cloud-relayed passwords and hardcoded tokens. NOVA implements a defense-in-depth model across the device, network, and database.
          </p>
        </div>

        {/* Visual Architecture Flow Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1.5rem',
          }}
          className="architecture-flow"
        >
          {/* Layer 1: Out-of-Band Network Provisioning */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '1.5rem',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Wifi size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Layer 01 &bull; Local Provisioning
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--status-success)', backgroundColor: 'var(--status-success-dim)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-xs)' }}>
                  Out-of-Band
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                Zero Cloud-Relayed Wi-Fi Passwords
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                Wi-Fi credentials are never entered on a public cloud web page. The ESP32-C3 hosts an isolated local SoftAP access point at <code>192.168.4.1</code>. Your browser connects directly to the hardware over an encrypted local radio link, configuring SSIDs without intermediate cloud relays.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Verification:</strong> Cloud API explicitly blocks cloud Wi-Fi provisioning endpoints with HTTP 403 to prevent accidental network exposure.
              </div>
            </div>
          </div>

          {/* Layer 2: Hashed Device Secrets */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '1.5rem',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <KeyRound size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Layer 02 &bull; Cryptographic Identity
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', backgroundColor: 'var(--accent-cyan-dim)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-xs)' }}>
                  SHA-256 at Rest
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                One-Way Hashed Bearer Tokens
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                NOVA never stores raw device keys in PostgreSQL. The backend computes a cryptographic SHA-256 hash at rest. Even in the event of a full database leak, an adversary cannot reconstruct the bearer token needed to impersonate your device.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Key Rotation:</strong> Keys can be rotated on demand via authenticated <code>POST /api/v1/devices/:id/device-key/rotate</code>; old keys are revoked atomically.
              </div>
            </div>
          </div>

          {/* Layer 3: Ephemeral 15-Minute Claim Tokens */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '1.5rem',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--status-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <RefreshCw size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Layer 03 &bull; Web Pairing
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--status-success)', backgroundColor: 'var(--status-success-dim)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-xs)' }}>
                  Single-Use 15m
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                Ephemeral QR Claim Protocol
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                To link NOVA to your browser, the device generates a short-lived token displayed on the 128&times;64 OLED. The token expires in 900 seconds, is single-use, and is invalidated immediately upon redemption. No permanent shared secrets are stored in browser localStorage.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Replay Defense:</strong> Redeeming an already-used claim token returns HTTP 409 conflict and triggers security rate-limiting.
              </div>
            </div>
          </div>

          {/* Layer 4: Fail-Closed Distributed Rate Limiter */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '1.5rem',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--status-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Database size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Layer 04 &bull; Distributed Protection
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--status-warning)', backgroundColor: 'var(--status-warning-dim)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-xs)' }}>
                  Fail-Closed 503
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                Serverless Cold-Start Resilient Limiting
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                In-memory rate limiters reset on serverless cold starts. NOVA backs its rate limiter with PostgreSQL atomic upserts, tracking request ledgers across all Vercel instances. Crucially, during database outages, sensitive endpoints fail closed with HTTP 503 rather than silently weakening brute-force defense.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Health Availability:</strong> Non-sensitive <code>/api/health</code> checks remain accessible and report truthful connectivity status.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
