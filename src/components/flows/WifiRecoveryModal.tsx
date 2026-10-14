import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { WifiProvisionScreen } from './WifiProvisionScreen';
import { CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
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
            <h2 style={{ fontSize: '1.45rem', fontWeight: 600 }}>Wi-Fi Reconnection Mode</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Put your keychain into pairing mode to provide updated Wi-Fi router credentials.
            </p>
          </div>

          <NovaDeviceMockup
            size="md"
            ledState="breathe_purple"
            caption="Breathing Purple • Wi-Fi Recovery Mode"
          />

          {/* Step by step hardware trigger guide */}
          <Card glow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                How to enter Wi-Fi Setup Mode:
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
                  Ensure your NOVA is awake and nearby.
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
                  Press and hold the center talk button for <strong>5 seconds</strong> until the light ring pulses amber/purple.
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
                  Click "LED is Breathing Purple" below to select your new network.
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
              padding: '0.8rem 1rem',
              display: 'flex',
              gap: '0.7rem',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={18} color="var(--status-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#a7f3d0', lineHeight: 1.4 }}>
              <strong>Zero Data Loss Guarantee:</strong> Wi-Fi recovery updates only your network credentials. Device identity, Notion authorization, queued audio notes, and sync history are completely preserved.
            </div>
          </div>

          <div
            style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              gap: '0.7rem',
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              <strong>Not a Factory Reset:</strong> Factory reset requires holding for 15 seconds until red rapid flashing and wipes cloud account bindings. 5 seconds is safe Wi-Fi recovery only.
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => setStage('provisioning')}
            leftIcon={<CheckCircle2 size={18} />}
            rightIcon={<ArrowRight size={18} />}
          >
            Device is in Wi-Fi Mode
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
