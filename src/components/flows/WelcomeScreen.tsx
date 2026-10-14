import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { QrCode, ArrowRight, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export interface WelcomeScreenProps {
  onStartSetup: () => void;
  onStartRecovery: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartSetup, onStartRecovery }) => {
  return (
    <div style={{ display: 'flex', flexFlow: 'column', gap: '1.2rem', paddingBottom: '2rem' }}>
      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
          Meet NOVA
        </h1>
        <p style={{ maxWidth: '340px', margin: '0 auto', fontSize: '0.95rem' }}>
          The ambient voice assistant keychain. Instant capture for your thoughts, streamed directly to Notion.
        </p>
      </div>

      {/* Central Hardware Showcase */}
      <NovaDeviceMockup ledState="pulse_cyan" caption="Pulsing Cyan • Ready to pair" />

      {/* Primary Setup Card */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div>
            <h2 className="card-title">New Device Setup</h2>
            <p className="card-desc">
              Pair your keychain and connect it to your Wi-Fi and Notion workspace in under 2 minutes. No app store installation required.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={onStartSetup}
            leftIcon={<QrCode size={18} />}
            rightIcon={<ArrowRight size={18} />}
          >
            Set up NOVA
          </Button>
        </div>
      </Card>

      {/* Reconnect / Recovery Card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Changing Wi-Fi Network?
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Reconnect your existing device without re-authenticating Notion or wiping cloud notes.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onStartRecovery}
            leftIcon={<RefreshCw size={14} />}
            style={{ flexShrink: 0 }}
          >
            Reconnect
          </Button>
        </div>
      </Card>

      {/* Security & Architecture Highlights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginTop: '0.2rem',
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
            <ShieldCheck size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Zero Device Secrets</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
            Ephemeral single-use pairing tokens. Notion credentials never touch browser storage.
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
            <Zap size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No App Required</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
            Direct browser onboarding using Web Bluetooth or guided ESP32 SoftAP provisioning.
          </p>
        </div>
      </div>
    </div>
  );
};
