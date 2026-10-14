import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { SignalStrength } from '../hardware/SignalStrength';
import { OledDisplayGuide } from '../hardware/OledDisplayGuide';
import type { DeviceTelemetry } from '../../domain/device';
import type { WifiStatus } from '../../domain/wifi';
import type { NotionConnectionInfo, NotionSyncTestResult } from '../../domain/notion';
import {
  Wifi,
  Cloud,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Send,
  Unlink,
  Radio,
  SlidersHorizontal,
  Mic,
} from 'lucide-react';
import { WifiProfilesVault } from './WifiProfilesVault';

export interface DeviceDashboardScreenProps {
  deviceId?: string;
  authToken?: string;
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
  deviceId,
  authToken,
  telemetry,
  wifi,
  notion,
  onStartWifiRecovery,
  onRefreshStatus,
  onTestSync,
  onDisconnectNotion,
  onReconnectNotion,
}) => {
  const resolvedDeviceId =
    deviceId ||
    (typeof window !== 'undefined' ? localStorage.getItem('nova_device_id') : null) ||
    'nova-c3-5c20dc4239fca9ec';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncTestResult, setSyncTestResult] = useState<NotionSyncTestResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Modals state
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshStatus();
    setIsRefreshing(false);
  };

  const handleRunSyncTest = async () => {
    setIsTestingSync(true);
    setSyncError(null);
    try {
      const result = await onTestSync();
      if (result) {
        setSyncTestResult(result);
      } else {
        setSyncError('Sync test did not receive confirmation from backend.');
      }
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Failed to trigger sync test');
    } finally {
      setIsTestingSync(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    await onDisconnectNotion();
    setIsDisconnecting(false);
    setIsDisconnectModalOpen(false);
  };

  const isDeviceOnline = telemetry.status === 'online' && telemetry.cloudMqttConnected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
      {/* Top Bar with Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            NOVA Keychain Dashboard
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="font-mono">
            {telemetry.serialNumber} • {telemetry.hardwareModel}
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
            NOVA is disconnected from the router. The SSD1306 OLED screen is displaying the Recovery QR Code. Audio memos will stay cached on local flash and sync once reconnected.
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

      {/* Interactive Device Hardware View with OLED Screen */}
      <NovaDeviceMockup
        size="md"
        oledState={telemetry.oledState}
        caption={
          isDeviceOnline
            ? 'OLED: Standby • Click screen to simulate "Hi ESP"'
            : 'OLED: Router Disconnected • Recovery QR active'
        }
      />

      {/* Primary Telemetry Grid: Truthful Hardware & Network States */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* Wi-Fi Card */}
        <Card style={{ margin: 0, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
              <Wifi size={16} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Wi-Fi (2.4GHz)</span>
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
            Update Wi-Fi →
          </button>
        </Card>

        {/* Cloud Connection & Hardware Specs Card */}
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
            <Mic size={13} color="var(--accent-cyan)" />
            <span>Wake: "Hi ESP"</span>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
            FW {telemetry.firmwareVersion} • TLS 1.3
          </div>
        </Card>
      </div>

      {/* Multi-Wi-Fi Profile Vault (Max 5 Profiles, Stable Voice Slots, Encrypted at Rest) */}
      <WifiProfilesVault
        deviceId={resolvedDeviceId}
        authToken={authToken}
        isDeviceOnline={isDeviceOnline}
        activeConnectedSsid={wifi.connectedSsid}
        onProfileChanged={onRefreshStatus}
      />

      {/* Notion Integration Card */}
      <Card glow={notion.isConnected}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{notion.workspaceIcon || '🧠'}</span>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600 }}>Notion Synchronization</h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Server-Side OAuth 2.0 (Tokens Encrypted in KMS)
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
                  {notion.workspaceName || 'Linked Workspace'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Destination Database:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  {notion.targetDatabaseName || 'NOVA Voice Inbox'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pending Queue Count:</span>
                <span style={{ fontWeight: 600, color: notion.pendingSyncCount > 0 ? '#fbbf24' : '#34d399' }}>
                  {notion.pendingSyncCount === 0 ? '0 pending (Idempotent queue caught up)' : `${notion.pendingSyncCount} offline actions`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Most Recent Sync:</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {notion.lastSyncAt ? new Date(notion.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None yet'}
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
              Notion authorization is currently not linked. Authorize your Notion workspace to enable voice note delivery.
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
                  Test Note Sync (Real API)
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
                Connect Notion Workspace
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
                    Created in Notion via POST /api/v1/devices/:id/sync/test
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

          {syncError && (
            <div
              style={{
                marginTop: '0.4rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.8rem',
                fontSize: '0.78rem',
                color: '#fca5a5',
              }}
            >
              Sync Error: {syncError}
            </div>
          )}
        </div>
      </Card>

      {/* Hardware Architecture Reference Card */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <SlidersHorizontal size={16} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Physical Hardware Specifications</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.6rem',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Microcontroller</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>ESP32-C3 Super Mini</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Monochrome Display</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>SSD1306 OLED (0x3C)</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Microphone Sensor</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>MAX4466 (ADC GPIO1)</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Voice Wake Model</div>
              <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px' }}>WakeNet "Hi ESP"</div>
            </div>
          </div>
        </div>
      </Card>

      <OledDisplayGuide />

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
            <li>Voice notes recorded while offline remain queued on the ESP32-C3 flash memory.</li>
            <li>Server-side encrypted access tokens are permanently scrubbed.</li>
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
    </div>
  );
};
