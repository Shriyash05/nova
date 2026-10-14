import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Monitor, Mic } from 'lucide-react';

interface OledGuideItem {
  stateName: string;
  trigger: string;
  displayGraphic: string;
  hardwareBehavior: string;
}

const OLED_GUIDE_ITEMS: OledGuideItem[] = [
  {
    stateName: 'Idle & Standby Screen',
    trigger: 'Default powered-on state',
    displayGraphic: 'NOVA logo, battery level, and Wi-Fi indicator',
    hardwareBehavior: 'WakeNet actively listens on MAX4466 microphone (GPIO1) at 16 kHz.',
  },
  {
    stateName: 'Wake Word Detected ("Hi ESP")',
    trigger: 'Say "Hi ESP" near the keychain',
    displayGraphic: 'Animated pulsing soundwave bars + WAKE banner',
    hardwareBehavior: 'Wakes ESP32-C3 from low-power state and opens 10-second audio stream.',
  },
  {
    stateName: '10-Second Voice Capture',
    trigger: 'Active speech following wake word',
    displayGraphic: 'Oscilloscope audio waveform + "REC 10s" countdown',
    hardwareBehavior: 'Samples voice at 16 kHz, compresses audio, and prepares cloud payload.',
  },
  {
    stateName: 'On-Screen Ephemeral Pairing QR',
    trigger: 'First boot or lost Wi-Fi connection',
    displayGraphic: 'High-contrast QR code pixel matrix + shortcode',
    hardwareBehavior: 'Renders single-use 15-minute claim token directly on the SSD1306 OLED.',
  },
  {
    stateName: 'Notion Sync Confirmed',
    trigger: 'Cloud acknowledges Notion page creation',
    displayGraphic: 'Checkmark badge + "NOTION SYNCED" banner',
    hardwareBehavior: 'Confirms idempotent delivery into your chosen Notion database.',
  },
];

export const OledDisplayGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginTop: '0.8rem',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.8rem 1rem',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Monitor size={15} color="var(--accent-cyan)" />
          <span>SSD1306 OLED Screen Reference Guide</span>
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
            <Mic size={14} />
            <span>Hardware: ESP32-C3 Super Mini • SSD1306 (0x3C) • MAX4466 (GPIO1) • No physical buttons</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {OLED_GUIDE_ITEMS.map((item) => (
              <div
                key={item.stateName}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#00f2fe',
                    boxShadow: '0 0 8px #00f2fe',
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.stateName}
                  </div>
                  <div style={{ color: 'var(--accent-cyan)', fontSize: '0.76rem', marginTop: '1px' }}>
                    Trigger: {item.trigger}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                    OLED Graphic: {item.displayGraphic}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '2px' }}>
                    {item.hardwareBehavior}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
