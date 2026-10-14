import React, { useState } from 'react';
import type { OledScreenState } from '../../domain/device';
import { Mic, Wifi, Battery, QrCode, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';

export interface NovaDeviceMockupProps {
  oledState?: OledScreenState;
  interactive?: boolean;
  onSimulateWakeWord?: () => void;
  size?: 'sm' | 'md' | 'lg';
  caption?: string;
}

export const NovaDeviceMockup: React.FC<NovaDeviceMockupProps> = ({
  oledState = 'idle',
  interactive = true,
  onSimulateWakeWord,
  size = 'md',
  caption,
}) => {
  const [isWoken, setIsWoken] = useState(false);

  const scale = size === 'sm' ? 0.8 : size === 'lg' ? 1.15 : 1;
  const activeState: OledScreenState = isWoken ? 'wake_word' : oledState;

  const handleSimulateWake = () => {
    if (!interactive) return;
    setIsWoken(true);
    if (onSimulateWakeWord) onSimulateWakeWord();
    setTimeout(() => setIsWoken(false), 2500);
  };

  const getOledDescription = (state: OledScreenState): string => {
    switch (state) {
      case 'idle':
        return 'OLED: Idle • WakeNet listening for "Hi ESP"';
      case 'wake_word':
        return 'OLED: "Hi ESP" Wake Detected • 16 kHz Audio Stream Active';
      case 'listening':
        return 'OLED: Recording Voice Memo • 10-Second Listening Window';
      case 'pairing_qr':
        return 'OLED: Displaying 15-Minute Ephemeral Setup QR Code';
      case 'wifi_setup':
        return 'OLED: Establishing 2.4GHz Wi-Fi Connection';
      case 'synced':
        return 'OLED: Voice Memo Successfully Appended to Notion';
      case 'offline':
        return 'OLED: Router Disconnected • Displaying Recovery QR';
      default:
        return 'OLED: SSD1306 Monochrome Display Active';
    }
  };

  return (
    <div className="device-stage" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
      {/* ESP32-C3 Super Mini Keychain Hardware Enclosure */}
      <div className="c3-device-enclosure">
        {/* Metal Keychain Ring Loop */}
        <div className="keychain-loop" />

        {/* Top Header: MAX4466 Microphone Sensor Capsule */}
        <div className="mic-module-header" title="MAX4466 Electret Microphone on ADC GPIO1">
          <div className="mic-gold-port">
            <div className="mic-core" />
          </div>
          <span className="mic-label">MAX4466 • 16 kHz</span>
        </div>

        {/* SSD1306 Monochrome OLED Screen (0.96", 128x64 pixels, I2C 0x3C) */}
        <div
          className="oled-display-bezel"
          onClick={handleSimulateWake}
          title={interactive ? 'Click to simulate saying "Hi ESP"' : 'SSD1306 OLED Display (0x3C)'}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
        >
          {/* OLED Screen Glass Surface */}
          <div className={`oled-screen-glass ${activeState}`}>
            {/* Top Status Bar on OLED */}
            <div className="oled-status-bar">
              <span className="oled-bar-brand">NOVA-C3</span>
              <div className="oled-bar-icons">
                <Wifi size={10} color="#00f2fe" />
                <Battery size={11} color="#00f2fe" />
              </div>
            </div>

            {/* OLED Main Canvas Graphic */}
            <div className="oled-canvas">
              {activeState === 'idle' && (
                <div className="oled-idle-face">
                  <div className="oled-eye" />
                  <div className="oled-mouth">◠</div>
                  <div className="oled-eye" />
                  <span className="oled-caption">Say "Hi ESP"</span>
                </div>
              )}

              {activeState === 'wake_word' && (
                <div className="oled-wake-anim">
                  <div className="oled-wave-bars">
                    <span className="wave-bar b1" />
                    <span className="wave-bar b2" />
                    <span className="wave-bar b3" />
                    <span className="wave-bar b4" />
                    <span className="wave-bar b5" />
                  </div>
                  <span className="oled-wake-text">WAKE: "Hi ESP"</span>
                </div>
              )}

              {activeState === 'listening' && (
                <div className="oled-listening-anim">
                  <div className="oled-rec-pill">
                    <span className="rec-dot" />
                    <span>REC 10s</span>
                  </div>
                  <div className="oled-oscilloscope">
                    <span className="osc-line" />
                    <span className="osc-line tall" />
                    <span className="osc-line" />
                    <span className="osc-line tall" />
                    <span className="osc-line" />
                  </div>
                </div>
              )}

              {activeState === 'pairing_qr' && (
                <div className="oled-qr-view">
                  <div className="oled-qr-matrix">
                    <QrCode size={34} color="#00f2fe" />
                  </div>
                  <span className="oled-qr-subtext">SCAN TO PAIR</span>
                </div>
              )}

              {activeState === 'wifi_setup' && (
                <div className="oled-wifi-setup">
                  <Radio size={22} className="spinner" color="#00f2fe" />
                  <span className="oled-connecting-text">Wi-Fi SETUP...</span>
                </div>
              )}

              {activeState === 'synced' && (
                <div className="oled-synced-view">
                  <CheckCircle2 size={24} color="#10b981" />
                  <span className="oled-synced-text">NOTION SYNCED</span>
                </div>
              )}

              {activeState === 'offline' && (
                <div className="oled-offline-view">
                  <AlertTriangle size={20} color="#f59e0b" />
                  <span className="oled-offline-text">RECOVERY QR</span>
                </div>
              )}
            </div>

            {/* Subtle OLED Pixel Grid Overlay */}
            <div className="oled-scanlines" />
          </div>
        </div>

        {/* Hardware Architecture Footer Badge */}
        <div className="c3-hardware-specs">
          <span className="c3-chip-name">ESP32-C3 Super Mini</span>
          <span className="c3-i2c-addr">I2C 0x3C • GPIO 8/9</span>
        </div>

        {/* USB-C Bottom Port */}
        <div className="usbc-port" />
      </div>

      {/* Real Hardware Explanation Pill */}
      <div className="led-status-pill" style={{ marginTop: '1.4rem' }}>
        <Mic size={13} color="var(--accent-cyan)" />
        <span>{caption || getOledDescription(activeState)}</span>
      </div>
    </div>
  );
};
