import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface LedGuideItem {
  color: string;
  pattern: string;
  stateName: string;
  meaning: string;
  actionRequired: string;
}

const LED_GUIDE_ITEMS: LedGuideItem[] = [
  {
    color: '#00f2fe',
    pattern: 'Pulsing Cyan',
    stateName: 'Bluetooth Pairing Ready',
    meaning: 'Device is broadcasting BLE advertisement and waiting to be claimed.',
    actionRequired: 'Scan the QR code on the back of your NOVA or packaging.',
  },
  {
    color: '#f59e0b',
    pattern: 'Pulsing Amber',
    stateName: 'Wi-Fi Setup Mode',
    meaning: 'Wi-Fi credentials transfer in progress or SoftAP is broadcasting.',
    actionRequired: 'Follow the on-screen steps to select and enter your 2.4GHz Wi-Fi.',
  },
  {
    color: '#10b981',
    pattern: 'Solid Teal',
    stateName: 'Connected & Idle',
    meaning: 'NOVA is securely connected to the cloud and Notion sync is active.',
    actionRequired: 'Press and hold button to capture a voice note anytime.',
  },
  {
    color: '#00f2fe',
    pattern: 'Rapid Cyan Flash',
    stateName: 'Recording & Syncing',
    meaning: 'Microphones are active and audio is transmitting to Notion.',
    actionRequired: 'Release button when done speaking.',
  },
  {
    color: '#a855f7',
    pattern: 'Breathing Purple',
    stateName: 'Wi-Fi Recovery Mode',
    meaning: 'Device is ready for new Wi-Fi credentials while retaining Notion link.',
    actionRequired: 'Update Wi-Fi from the onboarding portal.',
  },
  {
    color: '#ef4444',
    pattern: 'Flashing Red',
    stateName: 'Offline / Disconnected',
    meaning: 'Cannot reach configured Wi-Fi network or router is offline.',
    actionRequired: 'Move closer to router or use Wi-Fi Recovery to change networks.',
  },
];

export const LedRingGuide: React.FC = () => {
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
          <HelpCircle size={15} color="var(--accent-cyan)" />
          <span>Physical LED Light Guide</span>
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div style={{ padding: '0.5rem 1rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {LED_GUIDE_ITEMS.map((item) => (
              <div
                key={item.stateName}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}`,
                    marginTop: '4px',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.pattern} — {item.stateName}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                    {item.meaning}
                  </div>
                  <div style={{ color: 'var(--accent-cyan)', marginTop: '2px', fontSize: '0.78rem' }}>
                    Tip: {item.actionRequired}
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
