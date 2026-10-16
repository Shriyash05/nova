import React from 'react';

interface WaveDividerProps {
  fillColor?: string;
  bgColor?: string;
  flip?: boolean;
}

export const WaveDivider: React.FC<WaveDividerProps> = ({
  fillColor = '#FFAEC8',
  bgColor = '#F5CE51',
  flip = false,
}) => {
  return (
    <div
      className="wave-divider"
      style={{
        backgroundColor: bgColor,
        transform: flip ? 'rotate(180deg)' : 'none',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Scalloped / Wavy Organic Shape */}
        <path
          d="M0,0 C120,60 240,90 360,70 C480,50 600,10 720,40 C840,70 960,95 1080,75 C1200,55 1320,15 1440,35 L1440,0 L0,0 Z"
          fill={fillColor}
        />
        {/* Crisp Neo-Brutalist 2.5px Black Outline on Wave Crest */}
        <path
          d="M0,0 C120,60 240,90 360,70 C480,50 600,10 720,40 C840,70 960,95 1080,75 C1200,55 1320,15 1440,35"
          stroke="#000000"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};
