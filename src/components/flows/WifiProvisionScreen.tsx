import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { SignalStrength } from '../hardware/SignalStrength';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { OledDisplayGuide } from '../hardware/OledDisplayGuide';
import type { WifiNetwork, WifiCredentials } from '../../domain/wifi';
import { Wifi, Bluetooth, Radio, Lock, RefreshCw, Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react';

export interface WifiProvisionScreenProps {
  onProvision: (credentials: WifiCredentials) => Promise<boolean>;
  onScanNetworks: () => Promise<WifiNetwork[]>;
  isRecovery?: boolean;
  onCancelRecovery?: () => void;
}

export const WifiProvisionScreen: React.FC<WifiProvisionScreenProps> = ({
  onProvision,
  onScanNetworks,
  isRecovery = false,
  onCancelRecovery,
}) => {
  const [method, setMethod] = useState<'web_ble' | 'soft_ap'>('web_ble');
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customSsid, setCustomSsid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial network scan
  useEffect(() => {
    let mounted = true;
    const fetchNetworks = async () => {
      setIsScanning(true);
      const res = await onScanNetworks();
      if (mounted) {
        setNetworks(res);
        if (res.length > 0 && !selectedSsid) {
          setSelectedSsid(res[0].ssid);
        }
        setIsScanning(false);
      }
    };
    fetchNetworks();
    return () => {
      mounted = false;
    };
  }, [onScanNetworks, selectedSsid]);

  const handleRefreshScan = async () => {
    setIsScanning(true);
    const res = await onScanNetworks();
    setNetworks(res);
    setIsScanning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSsid.trim()) return;

    setIsSubmitting(true);
    const success = await onProvision({
      ssid: selectedSsid.trim(),
      password: password ? password.trim() : undefined,
      hidden: customSsid,
    });
    if (!success) {
      setIsSubmitting(false);
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
          NOVA connects directly to your 2.4GHz Wi-Fi router to sync voice notes to Notion in the background.
        </p>
      </div>

      {/* Mini Device visual showing OLED screen state */}
      <NovaDeviceMockup
        size="sm"
        oledState={isRecovery ? 'offline' : 'wifi_setup'}
        caption={isRecovery ? 'OLED: Recovery Mode • Awaiting New Wi-Fi' : 'OLED: Wi-Fi Setup • Connecting...'}
      />

      {/* Provisioning Channel Selector (Web BLE vs SoftAP) */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Device Communication Channel:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => setMethod('web_ble')}
              style={{
                background: method === 'web_ble' ? 'var(--accent-cyan-dim)' : 'var(--bg-surface-elevated)',
                border: `1px solid ${method === 'web_ble' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.7rem 0.6rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <Bluetooth size={18} color={method === 'web_ble' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Web Bluetooth (BLE)
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Desktop / Android Chrome
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('soft_ap')}
              style={{
                background: method === 'soft_ap' ? 'var(--accent-cyan-dim)' : 'var(--bg-surface-elevated)',
                border: `1px solid ${method === 'soft_ap' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.7rem 0.6rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <Radio size={18} color={method === 'soft_ap' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Guided SoftAP Hotspot
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                iOS Mobile Safari Standard
              </span>
            </button>
          </div>

          {method === 'soft_ap' && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.8rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              <strong>iPhone / Mobile Safari:</strong> Connect your phone Wi-Fi to hotspot{' '}
              <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                NOVA-Setup-84F3
              </span>
              . The browser relays credentials without requiring an iOS app!
            </div>
          )}
        </div>
      </Card>

      {/* Network Selection and Password Input Form */}
      <Card>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Select 2.4GHz Wi-Fi Network
              </label>
              <button
                type="button"
                onClick={handleRefreshScan}
                disabled={isScanning}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} className={isScanning ? 'spinner' : ''} />
                <span>{isScanning ? 'Scanning...' : 'Rescan'}</span>
              </button>
            </div>

            {!customSsid ? (
              <div className="wifi-list">
                {networks.map((net) => {
                  const isSelected = selectedSsid === net.ssid;
                  return (
                    <div
                      key={net.ssid}
                      className={`wifi-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedSsid(net.ssid)}
                    >
                      <div className="wifi-meta">
                        <Wifi size={16} color={isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                        <span className="wifi-name">{net.ssid}</span>
                        {net.security !== 'open' && <Lock size={12} color="var(--text-muted)" />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SignalStrength rssi={net.rssi} />
                        {isSelected && <Badge variant="cyan">Selected</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Network SSID"
                  value={selectedSsid}
                  onChange={(e) => setSelectedSsid(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setCustomSsid(!customSsid);
                if (!customSsid) setSelectedSsid('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                marginTop: '0.2rem',
              }}
            >
              {customSsid ? '← Pick from visible networks' : '+ Join hidden or manual network'}
            </button>
          </div>

          {/* Wi-Fi Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="wifiPassInput">
              Wi-Fi Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="wifiPassInput"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter WPA2/WPA3 password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
              Credentials are sent directly to your ESP32-C3 device and never stored by our cloud servers.
            </span>
          </div>

          {/* 2.4GHz constraint notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--status-warning-dim)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.55rem 0.75rem',
              fontSize: '0.76rem',
              color: '#fbbf24',
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>ESP32-C3 Super Mini requires a 2.4GHz Wi-Fi band (5GHz-only bands are not supported).</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!selectedSsid.trim() || isSubmitting}
            isLoading={isSubmitting}
            rightIcon={<ArrowRight size={16} />}
          >
            {isSubmitting ? 'Transmitting to NOVA...' : 'Connect to Network'}
          </Button>
        </form>
      </Card>

      <OledDisplayGuide />
    </div>
  );
};
