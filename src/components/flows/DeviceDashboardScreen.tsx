import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { SignalStrength } from '../hardware/SignalStrength';
import { LedRingGuide } from '../hardware/LedRingGuide';
import type { DeviceTelemetry } from '../../domain/device';
import type { WifiStatus } from '../../domain/wifi';
import type { NotionConnectionInfo, NotionSyncTestResult } from '../../domain/notion';
import {
  Wifi,
  Cloud,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Battery,
  AlertTriangle,
  Send,
  Unlink,
  Radio,
  SlidersHorizontal,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

export interface DeviceDashboardScreenProps {
  telemetry: DeviceTelemetry;
  wifi: WifiStatus;
  notion: NotionConnectionInfo;
  onStartWifiRecovery: () => void;
  onRefreshStatus: () => Promise<void>;
  onTestSync: () => Promise<NotionSyncTestResult | null>;
  onDisconnectNotion: () => Promise<boolean>;
  onReconnectNotion: () => void;
  onFactoryReset: (serial: string) => Promise<boolean>;
}

export const DeviceDashboardScreen: React.FC<DeviceDashboardScreenProps> = ({
  telemetry,
  wifi,
  notion,
  onStartWifiRecovery,
  onRefreshStatus,
  onTestSync,
  onDisconnectNotion,
  onReconnectNotion,
  onFactoryReset,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncTestResult, setSyncTestResult] = useState<NotionSyncTestResult | null>(null);

  // Modals state
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmSerial, setResetConfirmSerial] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshStatus();
    setIsRefreshing(false);
  };

  const handleRunSyncTest = async () => {
    setIsTestingSync(true);
    const result = await onTestSync();
    setSyncTestResult(result);
    setIsTestingSync(false);
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    await onDisconnectNotion();
    setIsDisconnecting(false);
    setIsDisconnectModalOpen(false);
  };

  const handleConfirmReset = async () => {
    if (resetConfirmSerial.trim() !== telemetry.serialNumber) return;
    setIsResetting(true);
    await onFactoryReset(resetConfirmSerial.trim());
    setIsResetting(false);
    setIsResetModalOpen(false);
  };

  const isDeviceOnline = telemetry.status === 'online' && telemetry.cloudMqttConnected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
      {/* Top Bar with Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            NOVA Keychain
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="font-mono">
            {telemetry.serialNumber} • FW {telemetry.firmwareVersion}
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '0.4rem 0.8rem',
            color: 'var(--text-secondary)',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'spinner' : ''} />
          <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Offline Alert Banner with Recovery Recommendations */}
      {!isDeviceOnline && (
        <div
          style={{
            background: 'var(--status-error-dim)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '0.9rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
            <AlertTriangle size={17} />
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Device Offline</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            NOVA is unable to communicate with the cloud backend. Voice memos recorded while offline will stay cached securely on the keychain flash memory and automatically synchronize once reconnected.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={onStartWifiRecovery}
              leftIcon={<Radio size={14} />}
            >
              Update Wi-Fi Network
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Device Hardware View */}
      <NovaDeviceMockup
        size="md"
        ledState={telemetry.ledState}
        caption={
          isDeviceOnline
            ? 'Solid Teal • Standby (Tap center to simulate press)'
            : 'Flashing Red • Disconnected from Router'
        }
      />

      {/* Primary Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* Wi-Fi Card */}
        <Card style={{ margin: 0, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
              <Wifi size={16} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Wi-Fi</span>
            </div>
            {wifi.state === 'connected' ? (
              <Badge variant="online">Connected</Badge>
            ) : (
              <Badge variant="offline">Disconnected</Badge>
            )}
          </div>

          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            {wifi.connectedSsid || 'No Network'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>RSSI: {wifi.rssi ? `${wifi.rssi} dBm` : '--'}</span>
            <SignalStrength rssi={wifi.rssi} />
          </div>

          <button
            onClick={onStartWifiRecovery}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              marginTop: '0.6rem',
              padding: 0,
              textDecoration: 'underline',
              display: 'block',
            }}
          >
            Reconnect Wi-Fi →
          </button>
        </Card>

        {/* Cloud Broker Status Card */}
        <Card style={{ margin: 0, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
              <Cloud size={16} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cloud MQTT</span>
            </div>
            {isDeviceOnline ? (
              <Badge variant="online">Online</Badge>
            ) : (
              <Badge variant="offline">Down</Badge>
            )}
          </div>

          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            {isDeviceOnline ? `${telemetry.pingLatencyMs}ms ping` : 'No Heartbeat'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <Battery size={13} color="var(--text-secondary)" />
            <span>{telemetry.batteryPercent}% Battery</span>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
            Uptime: {Math.floor(telemetry.uptimeSeconds / 60)}m
          </div>
        </Card>
      </div>

      {/* Notion Integration Card */}
      <Card glow={notion.isConnected}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{notion.workspaceIcon || '🧠'}</span>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600 }}>Notion Synchronization</h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  OAuth 2.0 Integration Link
                </span>
              </div>
            </div>

            {notion.isConnected ? (
              <Badge variant="notion">
                <CheckCircle2 size={12} color="var(--status-success)" />
                Connected
              </Badge>
            ) : (
              <Badge variant="offline">Unlinked</Badge>
            )}
          </div>

          {notion.isConnected ? (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Workspace:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {notion.workspaceName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Destination DB:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  {notion.targetDatabaseName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pending Sync Queue:</span>
                <span style={{ fontWeight: 600, color: notion.pendingSyncCount > 0 ? '#fbbf24' : '#34d399' }}>
                  {notion.pendingSyncCount === 0 ? '0 notes (All caught up)' : `${notion.pendingSyncCount} offline notes`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last Cloud Sync:</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {notion.lastSyncAt ? new Date(notion.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.8rem',
                color: '#fca5a5',
              }}
            >
              Notion authorization is currently revoked or unlinked. Re-authorize to enable voice memo delivery.
            </div>
          )}

          {/* Test Sync & Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.2rem' }}>
            {notion.isConnected ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunSyncTest}
                  isLoading={isTestingSync}
                  leftIcon={<Send size={14} />}
                >
                  Test Note Sync
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDisconnectModalOpen(true)}
                  leftIcon={<Unlink size={14} />}
                  style={{ color: '#f87171' }}
                >
                  Disconnect Notion
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onReconnectNotion}
                leftIcon={<ExternalLink size={14} />}
              >
                Reconnect Notion Workspace
              </Button>
            )}
          </div>

          {/* Live Sync Test Feedback */}
          {syncTestResult && (
            <div
              style={{
                marginTop: '0.4rem',
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.9rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {syncTestResult.pageTitle}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    Delivered in {syncTestResult.latencyMs}ms to {syncTestResult.databaseName}
                  </div>
                </div>
              </div>
              <a
                href={syncTestResult.pageUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: 'var(--accent-cyan)',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span>View</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Advanced Device Settings / Danger Zone */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <SlidersHorizontal size={16} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Device Management</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Wi-Fi Network Reconnect
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Safely update router credentials without losing Notion link.
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onStartWifiRecovery}
              style={{ flexShrink: 0 }}
            >
              Change Wi-Fi
            </Button>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f87171' }}>
                Factory Reset Device
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Wipes cloud ownership, unlinks Notion, and clears flash.
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsResetModalOpen(true)}
              leftIcon={<Trash2 size={13} />}
              style={{ flexShrink: 0 }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <LedRingGuide />

      {/* Safe Notion Disconnect Confirmation Modal */}
      <Modal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        title="Disconnect Notion Workspace?"
        description="Review what happens when you unlink Notion from this NOVA device."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <ul
            style={{
              paddingLeft: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}
          >
            <li>Already-synchronized notes in your Notion workspace will <strong>remain safe and untouched</strong>.</li>
            <li>Voice notes recorded while disconnected will remain queued in offline storage on the keychain.</li>
            <li>Cloud token KMS keys are permanently revoked and scrubbed.</li>
          </ul>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setIsDisconnectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDisconnect}
              isLoading={isDisconnecting}
              leftIcon={<Unlink size={16} />}
            >
              Confirm Disconnect
            </Button>
          </div>
        </div>
      </Modal>

      {/* Factory Reset Modal with Serial Confirmation */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Factory Reset NOVA"
        description="This action clears all cloud ownership and firmware bindings."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div
            style={{
              background: 'var(--status-error-dim)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.8rem',
              color: '#fca5a5',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Distinction from Wi-Fi Recovery:</strong> If you only moved routers or changed passwords, use Wi-Fi Recovery instead. Factory reset removes account ownership completely.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="serialResetInput">
              Type device serial number to confirm: <span className="font-mono">{telemetry.serialNumber}</span>
            </label>
            <input
              id="serialResetInput"
              type="text"
              className="form-input font-mono"
              placeholder={telemetry.serialNumber}
              value={resetConfirmSerial}
              onChange={(e) => setResetConfirmSerial(e.target.value.toUpperCase())}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={resetConfirmSerial.trim() !== telemetry.serialNumber || isResetting}
              isLoading={isResetting}
              onClick={handleConfirmReset}
            >
              Wipe & Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
