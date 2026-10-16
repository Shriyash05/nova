import React from 'react';

/**
 * Retro-Pop Isometric 3D Stickers matching the "Super Hello" reference style:
 * Bold black outlines, pastel fills, high-contrast shadows.
 */

export const StarBubbleSticker: React.FC<{ size?: number; className?: string }> = ({
  size = 72,
  className = '',
}) => (
  <svg
    width={size}
    height={size * 0.9}
    viewBox="0 0 100 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* 3D Extrusion Shadow */}
    <path
      d="M12 40 L45 15 L88 35 L55 60 Z"
      fill="#D9D9D9"
      stroke="#000000"
      strokeWidth="3"
    />
    <path
      d="M12 40 L12 52 L55 77 L55 65 Z"
      fill="#B8B8B8"
      stroke="#000000"
      strokeWidth="3"
    />
    <path
      d="M55 65 L55 77 L88 52 L88 40 Z"
      fill="#9E9E9E"
      stroke="#000000"
      strokeWidth="3"
    />
    {/* Speech Bubble Top Surface */}
    <path
      d="M10 38 L45 12 L85 32 L50 58 Z"
      fill="#FFFFFF"
      stroke="#000000"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Speech Bubble Tail */}
    <path
      d="M18 42 L8 58 L28 47 Z"
      fill="#FFFFFF"
      stroke="#000000"
      strokeWidth="2.5"
    />
    {/* Isometric Black Star Glyph */}
    <path
      d="M48 24 L51 32 L59 34 L53 40 L54 48 L47 44 L40 48 L42 40 L36 34 L44 32 Z"
      fill="#000000"
    />
  </svg>
);

export const LightningBoltSticker: React.FC<{ size?: number; className?: string }> = ({
  size = 64,
  className = '',
}) => (
  <svg
    width={size}
    height={size * 1.2}
    viewBox="0 0 80 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* 3D Extrusion Depth */}
    <path
      d="M45 4 L22 52 L42 52 L32 92 L62 44 L42 44 Z"
      fill="#D49A00"
      stroke="#000000"
      strokeWidth="3"
      transform="translate(6, 6)"
    />
    {/* Main Yellow Lightning Bolt */}
    <path
      d="M45 4 L22 52 L42 52 L32 92 L62 44 L42 44 Z"
      fill="#FFD23F"
      stroke="#000000"
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    {/* Highlight Facet */}
    <path
      d="M43 8 L26 50 L38 50 L42 46 L58 46 Z"
      fill="#FFF4B8"
      opacity="0.8"
    />
  </svg>
);

export const PaperAirplaneSticker: React.FC<{ size?: number; className?: string }> = ({
  size = 72,
  className = '',
}) => (
  <svg
    width={size}
    height={size * 0.7}
    viewBox="0 0 100 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Drop Shadow */}
    <path
      d="M10 50 L88 12 L50 62 Z"
      fill="#C4C4C4"
      stroke="#000000"
      strokeWidth="2.5"
      transform="translate(4, 5)"
    />
    {/* Main Left Wing */}
    <path
      d="M8 44 L90 8 L46 56 Z"
      fill="#FFFFFF"
      stroke="#000000"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Center Fold */}
    <path
      d="M46 56 L90 8 L58 60 Z"
      fill="#E6E6E6"
      stroke="#000000"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Right Wing Underfold */}
    <path
      d="M46 56 L58 60 L48 64 Z"
      fill="#BDBDBD"
      stroke="#000000"
      strokeWidth="2.5"
    />
  </svg>
);

export const EyeGlyphSticker: React.FC<{ size?: number; className?: string }> = ({
  size = 70,
  className = '',
}) => (
  <svg
    width={size}
    height={size * 0.65}
    viewBox="0 0 100 65"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Extruded Depth */}
    <path
      d="M8 32 C25 8 75 8 92 32 C75 56 25 56 8 32 Z"
      fill="#D4D4D4"
      stroke="#000000"
      strokeWidth="3"
      transform="translate(4, 4)"
    />
    {/* Eye Sclera White Surface */}
    <path
      d="M8 32 C25 8 75 8 92 32 C75 56 25 56 8 32 Z"
      fill="#FFFDF7"
      stroke="#000000"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Pupil / Iris */}
    <ellipse
      cx="50"
      cy="32"
      rx="15"
      ry="15"
      fill="#000000"
    />
    {/* Cyan OLED Eye Glow Core */}
    <circle
      cx="48"
      cy="30"
      r="5"
      fill="#00F2FE"
    />
    <circle
      cx="54"
      cy="26"
      r="2"
      fill="#FFFFFF"
    />
  </svg>
);

export const FlowchartSticker: React.FC<{ size?: number; className?: string }> = ({
  size = 120,
  className = '',
}) => (
  <svg
    width={size}
    height={size * 0.7}
    viewBox="0 0 140 98"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Connecting Lines */}
    <path
      d="M45 42 L80 42 L80 65 L105 65"
      stroke="#000000"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M80 42 L80 20 L105 20"
      stroke="#000000"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Node 1 (Root Star Node) */}
    <g transform="translate(6, 24)">
      <rect x="3" y="3" width="38" height="30" rx="10" fill="#000000" />
      <rect x="0" y="0" width="38" height="30" rx="10" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
      <path
        d="M19 8 L21 13 L26 14 L22 18 L23 23 L19 20 L15 23 L16 18 L12 14 L17 13 Z"
        fill="#000000"
      />
    </g>

    {/* Node 2 (Top Branch) */}
    <g transform="translate(95, 6)">
      <rect x="3" y="3" width="36" height="26" rx="8" fill="#000000" />
      <rect x="0" y="0" width="36" height="26" rx="8" fill="#FFD23F" stroke="#000000" strokeWidth="2.5" />
      <circle cx="18" cy="13" r="4" fill="#000000" />
    </g>

    {/* Node 3 (Bottom Branch) */}
    <g transform="translate(95, 52)">
      <rect x="3" y="3" width="36" height="26" rx="8" fill="#000000" />
      <rect x="0" y="0" width="36" height="26" rx="8" fill="#FFAEC8" stroke="#000000" strokeWidth="2.5" />
      <rect x="12" y="10" width="12" height="6" rx="2" fill="#000000" />
    </g>
  </svg>
);
