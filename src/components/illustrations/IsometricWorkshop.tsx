import React from 'react';

/**
 * Isometric hardware workbench illustration matching the mid-section of the reference image.
 * Shows NOVA's hardware lab with ESP32-C3, OLED ribbon, tiny testing engineers,
 * oscilloscope monitor, and floating retro badges.
 */

export const IsometricWorkshop: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        userSelect: 'none',
      }}
      className={className}
    >
      <svg
        viewBox="0 0 500 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: 'auto',
          overflow: 'visible',
          filter: 'drop-shadow(5px 6px 0px rgba(0,0,0,0.85))',
        }}
      >
        {/* ============================================================== */}
        {/* GROUND PEDESTAL / WORKBENCH SHADOW                             */}
        {/* ============================================================== */}
        <ellipse cx="250" cy="430" rx="200" ry="40" fill="rgba(0,0,0,0.22)" />
        <ellipse cx="250" cy="425" rx="170" ry="28" fill="#000000" opacity="0.3" />

        {/* ============================================================== */}
        {/* FLOATING RETRO BADGES (Code Window & Thumbs-up from reference)  */}
        {/* ============================================================== */}
        {/* Code Window Badge (Top Left) */}
        <g transform="translate(45, 60)">
          <rect x="4" y="4" width="46" height="52" rx="8" fill="#000000" />
          <rect x="0" y="0" width="46" height="52" rx="8" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
          <circle cx="10" cy="10" r="2.5" fill="#FF7675" />
          <circle cx="18" cy="10" r="2.5" fill="#FDCB6E" />
          <circle cx="26" cy="10" r="2.5" fill="#00B894" />
          <line x1="8" y1="20" x2="30" y2="20" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="28" x2="38" y2="28" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="36" x2="24" y2="36" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Thumbs-up / Check Badge (Top Right) */}
        <g transform="translate(385, 80)">
          <rect x="4" y="4" width="48" height="42" rx="8" fill="#000000" />
          <rect x="0" y="0" width="48" height="42" rx="8" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
          <path
            d="M16 26 L22 26 L26 14 C27 12 30 12 31 15 L31 22 L38 22 C40 22 41 24 40 26 L36 34 C35 36 33 36 31 36 L16 36 Z"
            fill="#FFCF40"
            stroke="#000000"
            strokeWidth="2"
          />
        </g>

        {/* Lightning Spark Above Mech (From reference image!) */}
        <g transform="translate(230, 25)">
          <path d="M12 2 L4 20 L14 20 L8 36 L24 16 L14 16 Z" fill="#FFD23F" stroke="#000" strokeWidth="2.5" />
        </g>

        {/* ============================================================== */}
        {/* MAIN HARDWARE CHARGING BAY / MECH LAB                          */}
        {/* ============================================================== */}
        {/* Main Base Unit Block */}
        <path d="M140 180 L250 125 L360 180 L250 235 Z" fill="#FFEAA7" stroke="#000" strokeWidth="3.5" />
        <path d="M140 180 L250 235 L250 365 L140 310 Z" fill="#FF7675" stroke="#000" strokeWidth="3.5" />
        <path d="M250 235 L360 180 L360 310 L250 365 Z" fill="#E17055" stroke="#000" strokeWidth="3.5" />

        {/* Top Machinery Deck (Antenna Turret & Rotary Valve) */}
        <g transform="translate(225, 85)">
          <path d="M10 20 L35 8 L60 20 L35 32 Z" fill="#74B9FF" stroke="#000" strokeWidth="2.5" />
          <path d="M10 20 L35 32 L35 50 L10 38 Z" fill="#0984E3" stroke="#000" strokeWidth="2.5" />
          <path d="M35 32 L60 20 L60 38 L35 50 Z" fill="#0652DD" stroke="#000" strokeWidth="2.5" />
        </g>

        {/* Left Side OLED Panel on Machine */}
        <g transform="translate(155, 205)">
          <path d="M5 25 L50 2 L85 20 L40 43 Z" fill="#00CEC9" stroke="#000" strokeWidth="2.5" />
          <path d="M5 25 L40 43 L40 85 L5 67 Z" fill="#00A8A0" stroke="#000" strokeWidth="2.5" />
          <path d="M40 43 L85 20 L85 62 L40 85 Z" fill="#008882" stroke="#000" strokeWidth="2.5" />
          {/* Cyan screen face */}
          <rect x="12" y="38" width="22" height="32" rx="4" fill="#0A0D12" stroke="#00F2FE" strokeWidth="1.5" />
          <circle cx="20" cy="50" r="3" fill="#00F2FE" />
          <circle cx="28" cy="50" r="3" fill="#00F2FE" />
        </g>

        {/* Right Side Equipment Grille & Circular Lens */}
        <g transform="translate(265, 240)">
          {/* Round Camera Port / Mic Core */}
          <ellipse cx="40" cy="40" rx="20" ry="16" fill="#2D3436" stroke="#000" strokeWidth="3" />
          <ellipse cx="40" cy="40" rx="14" ry="11" fill="#0984E3" stroke="#000" strokeWidth="2" />
          <ellipse cx="38" cy="38" rx="8" ry="6" fill="#74B9FF" />
          <circle cx="36" cy="36" r="2.5" fill="#FFFFFF" />

          {/* Yellow Hazard Stripes */}
          <rect x="15" y="75" width="55" height="18" rx="4" fill="#FFCF40" stroke="#000" strokeWidth="2" />
          <line x1="25" y1="75" x2="20" y2="93" stroke="#000" strokeWidth="3" />
          <line x1="38" y1="75" x2="33" y2="93" stroke="#000" strokeWidth="3" />
          <line x1="51" y1="75" x2="46" y2="93" stroke="#000" strokeWidth="3" />
        </g>

        {/* Lower Chassis Tread Feet */}
        <g id="tread-feet">
          {/* Left Foot */}
          <path d="M125 315 L180 288 L205 320 L150 347 Z" fill="#FFEAA7" stroke="#000" strokeWidth="3" />
          <path d="M125 315 L125 350 L180 380 L180 345 Z" fill="#00CEC9" stroke="#000" strokeWidth="3" />
          {/* Right Foot */}
          <path d="M295 350 L350 322 L375 354 L320 382 Z" fill="#FFEAA7" stroke="#000" strokeWidth="3" />
          <path d="M320 382 L375 354 L375 385 L320 413 Z" fill="#00CEC9" stroke="#000" strokeWidth="3" />
        </g>

        {/* ============================================================== */}
        {/* TINY HARDWARE CHARACTERS (Directly from reference image!)     */}
        {/* ============================================================== */}
        {/* Character 1 (Standing on Left Circular Pad with VR Goggles) */}
        <g id="char-vr-left" transform="translate(85, 270)">
          {/* Yellow circular base pad */}
          <ellipse cx="25" cy="85" rx="22" ry="7" fill="#FFD23F" stroke="#000" strokeWidth="2.5" />
          {/* Legs */}
          <path d="M18 50 L18 80 L22 80 L22 60 L28 60 L28 80 L32 80 L32 50 Z" fill="#000000" stroke="#000" strokeWidth="2" />
          {/* White Torso */}
          <rect x="16" y="32" width="18" height="20" rx="3" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
          {/* Head & VR Visor */}
          <circle cx="25" cy="22" r="9" fill="#FDCB6E" stroke="#000" strokeWidth="2" />
          <rect x="18" y="18" width="16" height="7" rx="3" fill="#00CEC9" stroke="#000" strokeWidth="1.5" />
        </g>

        {/* Character 2 (Standing on Right Pad with Blue Shirt) */}
        <g id="char-blue-right" transform="translate(390, 260)">
          {/* Pad */}
          <ellipse cx="22" cy="85" rx="20" ry="6" fill="#FFD23F" stroke="#000" strokeWidth="2.5" />
          {/* Legs */}
          <path d="M16 52 L16 80 L20 80 L20 62 L24 62 L24 80 L28 80 L28 52 Z" fill="#2D3436" stroke="#000" strokeWidth="2" />
          {/* Cyan Shirt */}
          <rect x="14" y="34" width="16" height="20" rx="3" fill="#00CEC9" stroke="#000" strokeWidth="2" />
          {/* Head & Hair */}
          <circle cx="22" cy="24" r="8" fill="#FDCB6E" stroke="#000" strokeWidth="2" />
          <path d="M16 20 Q22 14 28 20 Z" fill="#000" />
        </g>

        {/* Character 3 (Connecting Power Cable from Mech) */}
        <g id="char-cable" transform="translate(315, 230)">
          {/* Curved Power Cord connecting from machine to ground */}
          <path d="M-15 40 Q20 50 15 80" stroke="#000" strokeWidth="2.5" fill="none" />
          {/* Tiny worker waving arm */}
          <rect x="8" y="42" width="14" height="18" rx="3" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
          <circle cx="15" cy="34" r="7" fill="#FDCB6E" stroke="#000" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};
