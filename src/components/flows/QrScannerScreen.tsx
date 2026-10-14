import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { QrCode, Keyboard, Camera, Shield, ArrowLeft, CheckCircle2 } from 'lucide-react';

export interface QrScannerScreenProps {
  onScanSuccess: (tokenOrCode: string) => void;
  onBack: () => void;
}

export const QrScannerScreen: React.FC<QrScannerScreenProps> = ({ onScanSuccess, onBack }) => {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  const handleSimulateScan = (code: string) => {
    setIsScanning(false);
    setTimeout(() => {
      onScanSuccess(code);
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setMode('camera')}
            style={{
              background: mode === 'camera' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: `1px solid ${mode === 'camera' ? 'var(--accent-cyan)' : 'transparent'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.6rem',
              color: mode === 'camera' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Camera size={13} />
            <span>Camera</span>
          </button>
          <button
            onClick={() => setMode('manual')}
            style={{
              background: mode === 'manual' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: `1px solid ${mode === 'manual' ? 'var(--accent-cyan)' : 'transparent'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.6rem',
              color: mode === 'manual' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Keyboard size={13} />
            <span>Short Code</span>
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Scan OLED Screen QR Code</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Point your phone camera at the 0.96-inch monochrome OLED screen on your NOVA ESP32-C3 keychain.
        </p>
      </div>

      {mode === 'camera' ? (
        <div>
          {/* Viewfinder Mockup */}
          <div className="scanner-container">
            <div className="scanner-video-mock">
              <div className="scanner-reticle">
                {isScanning && <div className="scanner-laser" />}
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                background: 'rgba(0, 0, 0, 0.75)',
                padding: '0.35rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <QrCode size={13} color="var(--accent-cyan)" />
              <span>Align OLED display inside reticle</span>
            </div>
          </div>

          {/* Quick Triggers for testing */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Test Claim Tokens (Single-Use, 15-Minute Expiry):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSimulateScan('clm_live_9f82d1c74a0e')}
                  leftIcon={<CheckCircle2 size={14} color="var(--status-success)" />}
                >
                  Scan Active Token: NOVA-C3 Super Mini (`clm_live_9f82d1c74a0e`)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSimulateScan('INVALID')}
                  style={{ color: 'var(--status-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  Test Stale / Expired Claim Token
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Manual Code Input */
        <Card>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="shortCodeInput">
                8-Character Code Shown on OLED Screen
              </label>
              <input
                id="shortCodeInput"
                type="text"
                className="form-input font-mono"
                placeholder="e.g. NOV-84F3"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                autoFocus
                maxLength={20}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                Displayed underneath the QR matrix on the SSD1306 display.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!manualCode.trim()}
              rightIcon={<CheckCircle2 size={16} />}
            >
              Pair Device
            </Button>
          </form>
        </Card>
      )}

      {/* Security note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 0.9rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Shield size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Ephemeral Claim Guarantee:</strong> The QR code is generated by ESP32-C3 firmware with a 15-minute lifespan and is invalidated immediately upon first redemption. It contains zero Wi-Fi passwords or Notion API secrets.
        </span>
      </div>
    </div>
  );
};
