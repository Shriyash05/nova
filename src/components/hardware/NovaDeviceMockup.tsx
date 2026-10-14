import React, { useState } from 'react';
import type { LedRingPattern } from '../../domain/device';
import { Mic } from 'lucide-react';

export interface NovaDeviceMockupProps {
  ledState?: LedRingPattern;
  interactive?: boolean;
  onButtonPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  caption?: string;
}

export const NovaDeviceMockup: React.FC<NovaDeviceMockupProps> = ({
  ledState = 'pulse_cyan',
  interactive = true,
  onButtonPress,
  size = 'md',
  caption,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.15 : 1;

  const handlePointerDown = () => {
    if (!interactive) return;
    setIsPressed(true);
    if (onButtonPress) onButtonPress();
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const getLedDescription = (pattern: LedRingPattern): string => {
    switch (pattern) {
      case 'pulse_cyan':
        return 'Pulsing Cyan • Ready for Bluetooth Pairing';
      case 'pulse_amber':
        return 'Pulsing Amber • Wi-Fi Provisioning Mode';
      case 'solid_teal':
        return 'Solid Teal • Cloud Connected & Standby';
      case 'flash_cyan':
        return 'Active Cyan • Streaming Voice Memo';
      case 'flash_red':
        return 'Flashing Red • Offline or Connection Failed';
      case 'breathe_purple':
        return 'Breathing Purple • Wi-Fi Recovery Mode Active';
      default:
        return 'Active Light Ring';
    }
  };

  return (
    <div className="device-stage" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <div className="keychain-loop" />
      <div className="device-enclosure">
        {/* Dual MEMS Microphone ports */}
        <div className="mic-array" title="Dual beamforming MEMS microphones">
          <div className="mic-hole" />
          <div className="mic-hole" />
        </div>

        {/* Central Tactile Talk Button + LED Light Ring */}
        <div
          className="talk-button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            transform: isPressed ? 'scale(0.95)' : 'scale(1)',
            cursor: interactive ? 'pointer' : 'default',
            transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title={interactive ? 'Tap to test physical talk button' : 'Tactile talk button'}
        >
          <div className={`led-ring ${ledState}`} />
          <Mic
            size={24}
            color={
              ledState === 'flash_cyan'
                ? '#00f2fe'
                : ledState === 'solid_teal'
                ? '#34d399'
                : ledState === 'pulse_amber'
                ? '#f59e0b'
                : ledState === 'flash_red'
                ? '#ef4444'
                : 'var(--text-secondary)'
            }
          />
        </div>

        <span className="device-label">NOVA S3</span>
      </div>

      <div className="led-status-pill">
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background:
              ledState === 'pulse_amber'
                ? '#f59e0b'
                : ledState === 'solid_teal'
                ? '#10b981'
                : ledState === 'flash_red'
                ? '#ef4444'
                : ledState === 'breathe_purple'
                ? '#a855f7'
                : '#00f2fe',
            boxShadow: `0 0 8px currentColor`,
          }}
        />
        <span>{caption || getLedDescription(ledState)}</span>
      </div>
    </div>
  );
};
