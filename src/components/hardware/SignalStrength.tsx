import React from 'react';

export interface SignalStrengthProps {
  rssi?: number | null; // e.g. -50 (great) to -85 (poor)
}

export const SignalStrength: React.FC<SignalStrengthProps> = ({ rssi }) => {
  if (rssi === null || rssi === undefined) {
    return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>--</span>;
  }

  // Calculate 1 to 4 bars
  let bars = 1;
  let color = '#ef4444'; // Red
  if (rssi >= -60) {
    bars = 4;
    color = '#10b981'; // Great
  } else if (rssi >= -70) {
    bars = 3;
    color = '#34d399'; // Good
  } else if (rssi >= -80) {
    bars = 2;
    color = '#f59e0b'; // Fair
  }

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}
      title={`${rssi} dBm (${bars}/4 bars)`}
    >
      {[1, 2, 3, 4].map((barIndex) => (
        <span
          key={barIndex}
          style={{
            width: '3px',
            height: `${barIndex * 3 + 2}px`,
            borderRadius: '1px',
            backgroundColor: barIndex <= bars ? color : 'rgba(255, 255, 255, 0.15)',
            transition: 'background-color 200ms ease',
          }}
        />
      ))}
    </div>
  );
};
