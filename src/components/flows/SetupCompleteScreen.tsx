import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { CheckCircle2, ArrowRight, Mic, Sparkles } from 'lucide-react';
import type { NotionConnectionInfo } from '../../domain/notion';
import type { WifiStatus } from '../../domain/wifi';

export interface SetupCompleteScreenProps {
  wifi?: WifiStatus | null;
  notion?: NotionConnectionInfo | null;
  onGoToDashboard: () => void;
}

export const SetupCompleteScreen: React.FC<SetupCompleteScreenProps> = ({
  wifi,
  notion,
  onGoToDashboard,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center', paddingBottom: '2rem' }}>
      <div style={{ marginTop: '0.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--status-success-dim)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '0.35rem 0.85rem',
            fontSize: '0.78rem',
            color: '#34d399',
            marginBottom: '0.75rem',
          }}
        >
          <Sparkles size={14} />
          <span>Setup Successfully Completed</span>
        </div>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Your NOVA is Ready
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Hardware paired, Wi-Fi connected, and Notion synchronization active.
        </p>
      </div>

      <NovaDeviceMockup
        ledState="solid_teal"
        caption="Solid Teal • Ready to capture voice notes"
      />

      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Active Configuration:
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Wi-Fi Network:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {wifi?.connectedSsid || 'Home_Studio_2.4G'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Notion Workspace:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {notion?.workspaceName || 'Acme Research & Notes'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              padding: '0.5rem 0',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Target Database:</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
              {notion?.targetDatabaseName || 'NOVA Voice Inbox'}
            </span>
          </div>
        </div>
      </Card>

      {/* Hardware Usage Tip */}
      <div
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          textAlign: 'left',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <Mic size={18} color="var(--accent-cyan)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--text-primary)' }}>How to record:</strong> Press and hold the center button on your keychain. Speak clearly. When you release, the LED will flash cyan while transcribing and creating your Notion page.
        </div>
      </div>

      <Button
        variant="primary"
        onClick={onGoToDashboard}
        leftIcon={<CheckCircle2 size={18} />}
        rightIcon={<ArrowRight size={18} />}
      >
        Go to Device Dashboard
      </Button>
    </div>
  );
};
