import React from 'react';
import { Cpu, Wifi, WifiOff } from 'lucide-react';
import type { DeviceTelemetry } from '../../domain/device';

export interface HeaderProps {
  telemetry?: DeviceTelemetry | null;
  onOpenDevDrawer?: () => void;
  isMockMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  onOpenDevDrawer,
  isMockMode = true,
}) => {
  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-gem" />
        <span className="brand-logo">NOVA</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '-2px', letterSpacing: '0.05em' }}>
          CORE
        </span>
      </div>

      <div className="header-actions">
        {telemetry && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
            }}
          >
            {telemetry.status === 'online' ? (
              <>
                <Wifi size={13} color="var(--status-success)" />
                <span style={{ color: 'var(--status-success)', fontWeight: 500 }}>Live</span>
              </>
            ) : (
              <>
                <WifiOff size={13} color="var(--status-error)" />
                <span style={{ color: 'var(--status-error)', fontWeight: 500 }}>Offline</span>
              </>
            )}
          </div>
        )}

        {onOpenDevDrawer && (
          <button
            onClick={onOpenDevDrawer}
            style={{
              background: isMockMode ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isMockMode ? 'rgba(0, 242, 254, 0.3)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-full)',
              padding: '0.25rem 0.65rem',
              fontSize: '0.72rem',
              color: isMockMode ? 'var(--accent-cyan)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
            title="Open Developer & Mock Control Drawer"
          >
            <Cpu size={12} />
            <span>{isMockMode ? 'MOCK MODE' : 'LIVE API'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
