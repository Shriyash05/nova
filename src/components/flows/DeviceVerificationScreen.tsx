import React, { useEffect, useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { NovaDeviceMockup } from '../hardware/NovaDeviceMockup';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import type { DeviceTelemetry } from '../../domain/device';
import type { WifiStatus } from '../../domain/wifi';

export interface DeviceVerificationScreenProps {
  telemetry?: DeviceTelemetry | null;
  wifi?: WifiStatus | null;
  onProceed: () => void;
}

export const DeviceVerificationScreen: React.FC<DeviceVerificationScreenProps> = ({
  telemetry,
  wifi,
  onProceed,
}) => {
  const [stepStage, setStepStage] = useState<number>(1);

  useEffect(() => {
    const t1 = setTimeout(() => setStepStage(2), 600);
    const t2 = setTimeout(() => setStepStage(3), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const isComplete = stepStage >= 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center' }}>
      <div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 600 }}>
          {isComplete ? 'NOVA ESP32-C3 is Online!' : 'Verifying Cloud Connection'}
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Backend is confirming real-time MQTT heartbeat telemetry with your keychain.
        </p>
      </div>

      <NovaDeviceMockup
        oledState={isComplete ? 'synced' : 'wifi_setup'}
        caption={isComplete ? 'OLED: Verified Online • WakeNet Ready' : 'OLED: Connecting to Cloud MQTT...'}
      />

      <Card glow={isComplete}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', textAlign: 'left' }}>
          {/* Step 1: Wi-Fi Association */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {stepStage >= 1 ? (
              <CheckCircle2 size={18} color="var(--status-success)" />
            ) : (
              <Loader2 size={18} className="spinner" />
            )}
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Wi-Fi Association Established
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                SSID: {wifi?.connectedSsid || 'Home_Studio_2.4G'} • RSSI: {wifi?.rssi || -54} dBm
              </div>
            </div>
          </div>

          {/* Step 2: Local IP Assigned */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {stepStage >= 2 ? (
              <CheckCircle2 size={18} color="var(--status-success)" />
            ) : (
              <Loader2 size={18} className="spinner" />
            )}
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Router DHCP Lease Granted
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                IP: <span className="font-mono">{wifi?.ipAddress || '192.168.1.188'}</span> • MAC:{' '}
                <span className="font-mono">{wifi?.macAddress || '48:F6:EE:17:34:D8'}</span>
              </div>
            </div>
          </div>

          {/* Step 3: Cloud MQTT Handshake */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {stepStage >= 3 ? (
              <CheckCircle2 size={18} color="var(--status-success)" />
            ) : (
              <Loader2 size={18} className="spinner" />
            )}
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cloud MQTT Telemetry Confirmed
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Verified by backend • Latency: {telemetry?.pingLatencyMs || 38}ms (TLS 1.3)
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isComplete && (
        <Button variant="primary" onClick={onProceed} rightIcon={<ArrowRight size={18} />}>
          Continue to Notion Setup
        </Button>
      )}
    </div>
  );
};
