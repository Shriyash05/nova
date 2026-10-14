import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { WifiProvisionScreen } from './WifiProvisionScreen';
import { ArrowLeft, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';
import type { WifiCredentials, WifiNetwork } from '../../domain/wifi';

export interface WifiRecoveryModalProps {
  onCancel: () => void;
  onProvision: (credentials: WifiCredentials) => Promise<boolean>;
  onScanNetworks: () => Promise<WifiNetwork[]>;
}

export const WifiRecoveryModal: React.FC<WifiRecoveryModalProps> = ({
  onCancel,
  onProvision,
  onScanNetworks,
}) => {
  const [stage, setStage] = useState<'instructions' | 'provisioning'>('instructions');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '2rem' }}>
      <button
        onClick={onCancel}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.88rem',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </button>

      {stage === 'instructions' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 600 }}>Wi-Fi Reconnection & Recovery</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Update your Wi-Fi network without unlinking Notion or losing any stored notes.
            </p>
          </div>

          <NovaDeviceMockup
            size="md"
            oledState="offline"
            caption="OLED: Displaying Recovery QR Code"
          />

          {/* Real hardware recovery procedure */}
          <Card glow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                How Wi-Fi Recovery Works on NOVA:
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'var(--accent-cyan-dim)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  1
                </span>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  When disconnected from your router, the ESP32-C3 firmware automatically renders a <strong>Wi-Fi Recovery QR Code</strong> on the SSD1306 OLED screen.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'var(--accent-cyan-dim)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  2
                </span>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Ensure your NOVA is plugged into USB-C power or awake. The OLED will show the QR matrix.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'var(--accent-cyan-dim)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  3
                </span>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Click <strong>"Enter New Wi-Fi"</strong> below to select your new 2.4GHz network.
                </div>
              </div>
            </div>
          </Card>

          {/* Preservation Guarantee Box */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={18} color="var(--status-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8rem', color: '#a7f3d0', lineHeight: 1.45 }}>
              <strong style={{ display: 'block', marginBottom: '2px' }}>Zero Data Loss Guarantee:</strong>
              Reconnecting Wi-Fi updates <em>only</em> router credentials on the ESP32-C3 NVS flash. Your permanent device identity, existing Notion authorization, cloud notes, and queued recordings remain completely preserved.
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => setStage('provisioning')}
            leftIcon={<QrCode size={18} />}
            rightIcon={<ArrowRight size={18} />}
          >
            Enter New Wi-Fi Credentials
          </Button>
        </div>
      ) : (
        <WifiProvisionScreen
          isRecovery
          onCancelRecovery={onCancel}
          onProvision={onProvision}
          onScanNetworks={onScanNetworks}
        />
      )}
    </div>
  );
};
