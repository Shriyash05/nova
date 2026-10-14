import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { mockBackendStore } from '../../api/mockApi';
import { apiClient } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import { Cpu, X, WifiOff, Wifi, AlertTriangle, RotateCcw, Clock } from 'lucide-react';

export interface DevModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStateChanged?: () => void;
}

export const DevModeDrawer: React.FC<DevModeDrawerProps> = ({
  isOpen,
  onClose,
  onStateChanged,
}) => {
  const [config, setConfig] = useState(mockBackendStore.getConfig());
  const [isLiveApi, setIsLiveApi] = useState(!apiClient.isMockMode());
  const [activeTab, setActiveTab] = useState<'controls' | 'endpoints'>('controls');

  if (!isOpen) return null;

  const handleToggleOffline = () => {
    const next = !config.deviceStartsOffline;
    mockBackendStore.updateConfig({ deviceStartsOffline: next });
    setConfig(mockBackendStore.getConfig());
    if (onStateChanged) onStateChanged();
  };

  const handleToggleForceError = () => {
    const next = !config.forceError;
    mockBackendStore.updateConfig({ forceError: next });
    setConfig(mockBackendStore.getConfig());
    if (onStateChanged) onStateChanged();
  };

  const handleLatencyChange = (ms: number) => {
    mockBackendStore.updateConfig({ latencyMs: ms });
    setConfig(mockBackendStore.getConfig());
  };

  const handleToggleLiveApi = () => {
    const next = !isLiveApi;
    setIsLiveApi(next);
    apiClient.setMockMode(!next);
    if (onStateChanged) onStateChanged();
  };

  const handleResetMock = () => {
    mockBackendStore.resetToFactory();
    if (onStateChanged) onStateChanged();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dev-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Developer & Hardware Sandbox</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setActiveTab('controls')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'controls' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: `1px solid ${activeTab === 'controls' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
              color: activeTab === 'controls' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Hardware & Cloud Simulation
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'endpoints' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: `1px solid ${activeTab === 'endpoints' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
              color: activeTab === 'endpoints' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            API Contract Readiness
          </button>
        </div>

        {activeTab === 'controls' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {/* Live API toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>API Mode</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isLiveApi ? 'Connecting to VITE_API_BASE_URL' : 'In-memory simulated backend'}
                </div>
              </div>
              <Button
                variant={isLiveApi ? 'outline' : 'secondary'}
                size="sm"
                onClick={handleToggleLiveApi}
              >
                {isLiveApi ? 'Switch to Mock' : 'Switch to Live'}
              </Button>
            </div>

            {/* Offline simulation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>ESP32 Wi-Fi & Cloud Heartbeat</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Simulate router power loss or roaming out of range
                </div>
              </div>
              <Button
                variant={config.deviceStartsOffline ? 'danger' : 'secondary'}
                size="sm"
                onClick={handleToggleOffline}
                leftIcon={config.deviceStartsOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
              >
                {config.deviceStartsOffline ? 'Simulate Online' : 'Simulate Offline'}
              </Button>
            </div>

            {/* Simulated Server Error */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Backend Network Fault</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Forces API requests to reject with HTTP 500
                </div>
              </div>
              <Button
                variant={config.forceError ? 'danger' : 'secondary'}
                size="sm"
                onClick={handleToggleForceError}
                leftIcon={<AlertTriangle size={14} />}
              >
                {config.forceError ? 'Disable Fault' : 'Inject HTTP 500'}
              </Button>
            </div>

            {/* Simulated Latency */}
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <Clock size={14} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Simulated Network Latency</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[0, 300, 600, 1500].map((ms) => (
                  <button
                    key={ms}
                    onClick={() => handleLatencyChange(ms)}
                    style={{
                      flex: 1,
                      padding: '0.35rem',
                      borderRadius: 'var(--radius-sm)',
                      background: config.latencyMs === ms ? 'var(--accent-cyan-dim)' : 'var(--bg-surface-elevated)',
                      border: `1px solid ${config.latencyMs === ms ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                      color: config.latencyMs === ms ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                    }}
                  >
                    {ms === 0 ? '0ms' : `${ms}ms`}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetMock}
              leftIcon={<RotateCcw size={14} />}
            >
              Reset Mock Hardware to Factory Fresh
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              All endpoints specified in the NOVA Architecture Contract:
            </div>
            {Object.entries(API_ENDPOINTS).map(([key, meta]) => (
              <div
                key={key}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        background: meta.method === 'GET' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 242, 254, 0.2)',
                        color: meta.method === 'GET' ? '#34d399' : 'var(--accent-cyan)',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}
                    >
                      {meta.method}
                    </span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>{meta.path}</span>
                  </div>
                  <Badge variant={meta.status === 'production_ready' ? 'online' : 'warning'}>
                    {meta.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.35 }}>
                  {meta.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
