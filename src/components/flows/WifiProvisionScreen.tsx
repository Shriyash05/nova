import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { OledDisplayGuide } from '../hardware/OledDisplayGuide';
import { apiClient } from '../../api/client';
import {
  Radio,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface WifiProvisionScreenProps {
  onProvision: (credentials: { ssid: string; password?: string }) => Promise<boolean>;
  onScanNetworks: () => Promise<any[]>;
  isRecovery?: boolean;
  onCancelRecovery?: () => void;
}

export const WifiProvisionScreen: React.FC<WifiProvisionScreenProps> = ({
  onProvision,
  isRecovery = false,
  onCancelRecovery,
}) => {
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Automatic periodic check to detect when ESP32-C3 comes online
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.getDeviceStatus('nova_c3_84f3eba1');
        if (active && res.success && res.data?.wifi?.state === 'connected') {
          setStatusMessage('ESP32-C3 verified online! Redirecting...');
          onProvision({ ssid: res.data.wifi.connectedSsid || 'Home_2.4G' });
        }
      } catch {
        // Device still offline, keep waiting
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [onProvision]);

  const handleManualCheck = async () => {
    setIsCheckingStatus(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.getDeviceStatus('nova_c3_84f3eba1');
      if (res.success && res.data?.wifi?.state === 'connected') {
        setStatusMessage('NOVA is online and registered with cloud backend!');
        await onProvision({ ssid: res.data.wifi.connectedSsid || 'Home_2.4G' });
      } else {
        setStatusMessage('Device is not yet online on your Wi-Fi network. Complete setup at 192.168.4.1.');
      }
    } catch {
      setStatusMessage('Device status check failed. Ensure NOVA is powered on.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSimulateOnline = async () => {
    setIsSimulating(true);
    try {
      await apiClient.bootstrapDevice({
        deviceId: 'nova_c3_84f3eba1',
        serialNumber: 'NOVA-C3-84F3EBA1',
        macAddress: '84:F3:EB:A1:0C:4A',
        wifiSsid: 'Home_Studio_2.4G',
        ipAddress: '192.168.1.188',
        rssi: -54,
      });
      setStatusMessage('Simulated ESP32-C3 SoftAP connection and TLS cloud registration.');
      await onProvision({ ssid: 'Home_Studio_2.4G' });
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '2rem' }}>
      {/* Recovery Banner if in Wi-Fi Recovery mode */}
      {isRecovery && (
        <div
          style={{
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.84rem', color: '#e9d5ff' }}>
            <strong>Wi-Fi Recovery Active:</strong> Device identity and Notion link remain intact.
          </div>
          {onCancelRecovery && (
            <button
              onClick={onCancelRecovery}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#c084fc',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 600 }}>Connect NOVA to Wi-Fi</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          NOVA provisions directly via its local password-protected setup hotspot.
        </p>
      </div>

      {/* Mini Device visual showing OLED screen state */}
      <NovaDeviceMockup
        size="sm"
        oledState={isRecovery ? 'offline' : 'wifi_setup'}
        caption={isRecovery ? 'OLED: SoftAP Active • Setup: NOVA-C3-84F3' : 'OLED: SoftAP Active • Setup: NOVA-C3-84F3'}
      />

      {/* Hardware SoftAP Step-by-Step Guide */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Protected Local SoftAP Setup
            </span>
            <Badge variant="cyan">No App Required</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--accent-cyan-dim)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '0.1rem',
                }}
              >
                1
              </div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Connect to NOVA's Hotspot:</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  On your phone or laptop, open Wi-Fi settings and join:
                </div>
                <div
                  className="font-mono"
                  style={{
                    display: 'inline-block',
                    background: 'rgba(0, 240, 255, 0.08)',
                    color: 'var(--accent-cyan)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    marginTop: '0.3rem',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                  }}
                >
                  SSID: NOVA-Setup-84F3
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--accent-cyan-dim)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '0.1rem',
                }}
              >
                2
              </div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Enter Router Password Locally:</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  A setup portal will pop up automatically, or visit{' '}
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    http://192.168.4.1
                  </span>
                  . Select your 2.4GHz network and submit.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--accent-cyan-dim)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '0.1rem',
                }}
              >
                3
              </div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Direct Hardware Handshake:</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Wi-Fi credentials are saved directly to ESP32 flash over the local session. They are never sent to the cloud.
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Guarantee */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldCheck size={16} color="var(--status-online)" />
            <span style={{ fontSize: '0.76rem', color: '#a7f3d0' }}>
              Zero Cloud Exposure: Your home Wi-Fi password never passes through Vercel or public backend servers.
            </span>
          </div>

          {statusMessage && (
            <div
              style={{
                fontSize: '0.82rem',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                background: statusMessage.includes('verified') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                color: statusMessage.includes('verified') ? '#34d399' : 'var(--text-secondary)',
              }}
            >
              {statusMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.4rem' }}>
            <Button
              variant="primary"
              size="default"
              isLoading={isCheckingStatus}
              leftIcon={<CheckCircle2 size={16} />}
              onClick={handleManualCheck}
            >
              I've Connected NOVA to Wi-Fi
            </Button>

            {!import.meta.env.PROD && (
              <Button
                variant="outline"
                size="sm"
                isLoading={isSimulating}
                leftIcon={<Radio size={14} />}
                onClick={handleSimulateOnline}
              >
                Dev: Simulate Device Online
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* OLED Visual Reference Guide */}
      <OledDisplayGuide />
    </div>
  );
};
