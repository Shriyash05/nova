import React, { useState, useEffect } from 'react';

/**
 * High-detail isometric robot companion illustration matching the "Super Hello" art style:
 * Pastel yellow/orange, coral, cream, and teal mechanical body, dual rabbit antenna ears,
 * live animated OLED face display, tactile mechanical bolts, and tiny companion figures!
 */

export interface IsometricHeroRobotProps {
  currentExpression?: 'idle' | 'wake' | 'listening' | 'processing' | 'success';
  onExpressionChange?: (expr: 'idle' | 'wake' | 'listening' | 'processing' | 'success') => void;
  className?: string;
}

export const IsometricHeroRobot: React.FC<IsometricHeroRobotProps> = ({
  currentExpression = 'idle',
  onExpressionChange,
  className = '',
}) => {
  const [internalOverride, setInternalOverride] = useState<'idle' | 'wake' | 'listening' | 'processing' | 'success' | null>(null);
  const activeExpr = internalOverride ?? currentExpression;
  const [blink, setBlink] = useState(false);
  const [animTick, setAnimTick] = useState(0);

  // Periodic natural blink
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  // Equalizer animation tick for listening state
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setAnimTick((t) => (t + 1) % 100);
    }, 120);
    return () => clearInterval(tickInterval);
  }, []);

  const handleNextExpr = () => {
    const exprs: Array<'idle' | 'wake' | 'listening' | 'processing' | 'success'> = [
      'idle',
      'wake',
      'listening',
      'processing',
      'success',
    ];
    const next = exprs[(exprs.indexOf(activeExpr) + 1) % exprs.length];
    setInternalOverride(next);
    if (onExpressionChange) onExpressionChange(next);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        margin: '0 auto',
        userSelect: 'none',
      }}
      className={className}
    >
      <svg
        viewBox="0 0 540 680"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: 'auto',
          overflow: 'visible',
          filter: 'drop-shadow(6px 8px 0px rgba(0,0,0,0.85))',
        }}
      >
        {/* ============================================================== */}
        {/* GROUND SHADOW / ISOMETRIC PEDESTAL                             */}
        {/* ============================================================== */}
        <ellipse cx="270" cy="625" rx="210" ry="45" fill="rgba(0,0,0,0.22)" />
        <ellipse cx="270" cy="620" rx="180" ry="32" fill="#000000" opacity="0.35" />

        {/* ============================================================== */}
        {/* DUAL ANTENNA EARS (Top mechanical sensors)                     */}
        {/* ============================================================== */}
        {/* Left Antenna */}
        <g id="left-antenna">
          {/* Base stalk */}
          <path d="M200 135 L200 85 L225 70 L225 120 Z" fill="#E6A620" stroke="#000" strokeWidth="3" />
          <path d="M225 70 L245 82 L245 132 L225 120 Z" fill="#C98A10" stroke="#000" strokeWidth="3" />
          {/* Top Sensor Bulb (Octagonal Neo-Brutalist Pod) */}
          <path d="M190 60 L220 40 L250 58 L250 88 L220 108 L190 88 Z" fill="#FFCF40" stroke="#000" strokeWidth="3.5" />
          <path d="M220 40 L250 58 L240 66 L210 48 Z" fill="#FFE58F" />
          {/* Sensor Lens Core (Pulsing Purple/Cyan) */}
          <rect x="204" y="60" width="30" height="26" rx="6" fill="#6C5CE7" stroke="#000" strokeWidth="2.5" />
          <rect x="210" y="66" width="18" height="14" rx="3" fill="#A29BFE" />
          <circle cx="216" cy="71" r="2.5" fill="#FFFFFF" />
        </g>

        {/* Right Antenna */}
        <g id="right-antenna">
          {/* Base stalk */}
          <path d="M295 130 L295 80 L320 65 L320 115 Z" fill="#E6A620" stroke="#000" strokeWidth="3" />
          <path d="M320 65 L340 77 L340 127 L320 115 Z" fill="#C98A10" stroke="#000" strokeWidth="3" />
          {/* Top Sensor Bulb */}
          <path d="M285 55 L315 35 L345 53 L345 83 L315 103 L285 83 Z" fill="#FFCF40" stroke="#000" strokeWidth="3.5" />
          <path d="M315 35 L345 53 L335 61 L305 43 Z" fill="#FFE58F" />
          {/* Sensor Lens Core */}
          <rect x="299" y="55" width="30" height="26" rx="6" fill="#6C5CE7" stroke="#000" strokeWidth="2.5" />
          <rect x="305" y="61" width="18" height="14" rx="3" fill="#A29BFE" />
          <circle cx="311" cy="66" r="2.5" fill="#FFFFFF" />
        </g>

        {/* ============================================================== */}
        {/* ROBOT HEAD / TOP CHASSIS                                       */}
        {/* ============================================================== */}
        <g id="robot-head">
          {/* Head 3D Left Wall */}
          <path d="M160 180 L270 120 L270 240 L160 300 Z" fill="#FFCF40" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
          {/* Head 3D Top Roof */}
          <path d="M160 180 L270 120 L370 175 L260 235 Z" fill="#FFE680" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
          {/* Head 3D Right Wall */}
          <path d="M260 235 L370 175 L370 295 L260 355 Z" fill="#E5B220" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />

          {/* Head Front Face Plate (Where visor / OLED sits) */}
          <path d="M175 195 L260 148 L260 280 L175 327 Z" fill="#2D3436" stroke="#000" strokeWidth="3" />

          {/* Camera Eye / Microphone Turret on Side of Head */}
          <g transform="translate(142, 215)">
            <ellipse cx="20" cy="20" rx="16" ry="12" fill="#E17055" stroke="#000" strokeWidth="2.5" />
            <ellipse cx="18" cy="19" rx="10" ry="7" fill="#00CEC9" stroke="#000" strokeWidth="2" />
            <circle cx="16" cy="17" r="2.5" fill="#FFFFFF" />
          </g>

          {/* ============================================================ */}
          {/* THE OLED DISPLAY SCREEN (Interactive pixel eyes!)            */}
          {/* ============================================================ */}
          <g
            id="oled-screen"
            onClick={handleNextExpr}
            style={{ cursor: 'pointer' }}
          >
            {/* Screen Bezel */}
            <path
              d="M182 205 L252 165 L252 272 L182 312 Z"
              fill="#0A0D12"
              stroke="#00F2FE"
              strokeWidth="2"
            />
            {/* Subtle Screen Scanline Glare */}
            <path d="M185 210 L250 172 L250 190 L185 228 Z" fill="rgba(0, 242, 254, 0.08)" />

            {/* Expressions Rendered on Isometric Grid */}
            {activeExpr === 'idle' && (
              <g id="expr-idle">
                {blink ? (
                  // Blinking: horizontal flat eyes
                  <>
                    <line x1="194" y1="235" x2="212" y2="225" stroke="#00F2FE" strokeWidth="4" strokeLinecap="round" />
                    <line x1="222" y1="220" x2="240" y2="210" stroke="#00F2FE" strokeWidth="4" strokeLinecap="round" />
                  </>
                ) : (
                  // Open curious pixel eyes
                  <>
                    <rect x="194" y="222" width="16" height="20" rx="4" fill="#00F2FE" transform="skewY(-16)" />
                    <rect x="222" y="206" width="16" height="20" rx="4" fill="#00F2FE" transform="skewY(-16)" />
                    {/* Pupil highlights */}
                    <circle cx="199" cy="225" r="2.5" fill="#FFFFFF" />
                    <circle cx="227" cy="210" r="2.5" fill="#FFFFFF" />
                    {/* Tiny cute smile */}
                    <path d="M208 252 Q217 254 226 248" stroke="#00F2FE" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                )}
              </g>
            )}

            {activeExpr === 'wake' && (
              <g id="expr-wake">
                {/* Wide excited eyes */}
                <ellipse cx="204" cy="230" rx="10" ry="12" fill="#00F2FE" transform="rotate(-14 204 230)" />
                <ellipse cx="232" cy="214" rx="10" ry="12" fill="#00F2FE" transform="rotate(-14 232 214)" />
                <circle cx="202" cy="227" r="3.5" fill="#FFFFFF" />
                <circle cx="230" cy="211" r="3.5" fill="#FFFFFF" />
                <ellipse cx="218" cy="245" rx="5" ry="3" fill="#00F2FE" />
              </g>
            )}

            {activeExpr === 'listening' && (
              <g id="expr-listening">
                {/* Alert eyes */}
                <rect x="194" y="214" width="15" height="15" rx="3" fill="#00F2FE" transform="skewY(-16)" />
                <rect x="222" y="198" width="15" height="15" rx="3" fill="#00F2FE" transform="skewY(-16)" />
                {/* Dancing Equalizer Bars */}
                <g id="oled-equalizer">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const h = 4 + (((animTick + i * 2) % 6) + 1) * 2.5;
                    return (
                      <line
                        key={i}
                        x1={192 + i * 9}
                        y1={258 - i * 4}
                        x2={192 + i * 9}
                        y2={258 - i * 4 - h}
                        stroke="#00F2FE"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              </g>
            )}

            {activeExpr === 'processing' && (
              <g id="expr-processing">
                {/* Rotating Neural Diamond */}
                <g transform={`rotate(${animTick * 18} 217 225)`}>
                  <rect x="207" y="215" width="20" height="20" fill="none" stroke="#00F2FE" strokeWidth="3" rx="2" />
                  <circle cx="217" cy="225" r="4" fill="#00F2FE" />
                </g>
                <text x="195" y="260" fill="#00F2FE" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  THINKING
                </text>
              </g>
            )}

            {activeExpr === 'success' && (
              <g id="expr-success">
                {/* Happy Crescent Eyes */}
                <path d="M194 230 Q203 218 212 226" stroke="#00F2FE" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M222 214 Q231 202 240 210" stroke="#00F2FE" strokeWidth="4" fill="none" strokeLinecap="round" />
                {/* Smile with teeth */}
                <path d="M204 246 Q216 254 228 248 Z" fill="#00F2FE" />
                {/* Sparkle Stars */}
                <circle cx="188" cy="210" r="2" fill="#FFEAA7" />
                <circle cx="246" cy="190" r="2.5" fill="#FFEAA7" />
              </g>
            )}

            {/* Click to Toggle Pill Hint on OLED */}
            <g transform="translate(190, 276)">
              <rect x="0" y="0" width="54" height="14" rx="4" fill="rgba(0, 242, 254, 0.2)" stroke="#00F2FE" strokeWidth="1" />
              <text x="6" y="10" fill="#00F2FE" fontSize="7" fontFamily="sans-serif" fontWeight="bold">
                TAP TO MOOD
              </text>
            </g>
          </g>
        </g>

        {/* ============================================================== */}
        {/* ROBOT CHEST & TORSO (Hardware & Circuitry Enclosure)            */}
        {/* ============================================================== */}
        <g id="robot-torso">
          {/* Main Torso Block */}
          {/* Left Side Wall */}
          <path d="M170 320 L270 260 L270 450 L170 510 Z" fill="#FF7675" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
          {/* Front / Right Side Wall */}
          <path d="M270 260 L390 325 L390 515 L270 450 Z" fill="#D63031" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />

          {/* Mechanical Panel Details on Left Wall */}
          <g transform="translate(182, 330)">
            {/* Ventilation Louvre Slits */}
            <line x1="10" y1="18" x2="65" y2="-12" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="32" x2="65" y2="2" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="46" x2="65" y2="16" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            {/* Round Analog Gauge */}
            <circle cx="38" cy="90" r="16" fill="#FFFDF7" stroke="#000" strokeWidth="2.5" />
            <line x1="38" y1="90" x2="48" y2="82" stroke="#D63031" strokeWidth="2" strokeLinecap="round" />
            <circle cx="38" cy="90" r="3" fill="#000" />
          </g>

          {/* Right Wall Equipment Bay & USB-C Keychain Loop */}
          <g transform="translate(285, 305)">
            {/* Equipment Window / Microcontroller Bay */}
            <path d="M10 20 L80 58 L80 135 L10 97 Z" fill="#FFEAA7" stroke="#000" strokeWidth="3" />
            {/* Glowing Sensor Dots */}
            <circle cx="30" cy="50" r="5" fill="#00CEC9" stroke="#000" strokeWidth="2" />
            <circle cx="48" cy="60" r="5" fill="#FD79A8" stroke="#000" strokeWidth="2" />
            <circle cx="66" cy="70" r="5" fill="#6C5CE7" stroke="#000" strokeWidth="2" />

            {/* Tactile Rocker Switches */}
            <rect x="25" y="85" width="16" height="24" rx="4" fill="#000" />
            <rect x="27" y="87" width="12" height="10" rx="2" fill="#55EFC4" />
            <rect x="50" y="98" width="16" height="24" rx="4" fill="#000" />
            <rect x="52" y="110" width="12" height="10" rx="2" fill="#FF7675" />
          </g>

          {/* Golden Hardware Rivets / Screws */}
          <circle cx="180" cy="335" r="3.5" fill="#FFD23F" stroke="#000" strokeWidth="1.5" />
          <circle cx="180" cy="495" r="3.5" fill="#FFD23F" stroke="#000" strokeWidth="1.5" />
          <circle cx="380" cy="340" r="3.5" fill="#FFD23F" stroke="#000" strokeWidth="1.5" />
          <circle cx="380" cy="500" r="3.5" fill="#FFD23F" stroke="#000" strokeWidth="1.5" />
        </g>

        {/* ============================================================== */}
        {/* LEGS & FEET (Tactile Industrial Neo-Brutalist Feet)            */}
        {/* ============================================================== */}
        {/* Left Foot */}
        <g id="left-foot">
          {/* Leg Strut */}
          <path d="M190 500 L230 478 L230 550 L190 572 Z" fill="#74B9FF" stroke="#000" strokeWidth="3" />
          {/* Foot Base */}
          <path d="M150 565 L245 515 L260 540 L165 590 Z" fill="#0984E3" stroke="#000" strokeWidth="3" />
          {/* Foot Sole Tread */}
          <path d="M150 565 L150 590 L245 640 L245 615 Z" fill="#00CEC9" stroke="#000" strokeWidth="3" />
          <path d="M245 615 L245 640 L260 625 L260 600 Z" fill="#00A8A0" stroke="#000" strokeWidth="2" />
        </g>

        {/* Right Foot */}
        <g id="right-foot">
          {/* Leg Strut */}
          <path d="M305 470 L345 492 L345 565 L305 543 Z" fill="#74B9FF" stroke="#000" strokeWidth="3" />
          {/* Foot Base */}
          <path d="M280 540 L375 590 L395 565 L300 515 Z" fill="#0984E3" stroke="#000" strokeWidth="3" />
          {/* Foot Sole Tread */}
          <path d="M280 540 L280 565 L375 615 L375 590 Z" fill="#00CEC9" stroke="#000" strokeWidth="3" />
          <path d="M375 590 L375 615 L395 590 L395 565 Z" fill="#00A8A0" stroke="#000" strokeWidth="2" />
        </g>

        {/* ============================================================== */}
        {/* TINY COMPANION CHARACTERS (Directly from reference image!)     */}
        {/* ============================================================== */}
        {/* Character 1 (Standing on the left, waving at robot) */}
        <g id="char-waving" transform="translate(100, 480)">
          {/* Shadow */}
          <ellipse cx="20" cy="85" rx="14" ry="4" fill="rgba(0,0,0,0.3)" />
          {/* Legs (Cyan Pants) */}
          <path d="M14 55 L14 82 L18 82 L18 64 L22 64 L22 82 L26 82 L26 55 Z" fill="#00CEC9" stroke="#000" strokeWidth="2" />
          {/* Torso (White T-shirt) */}
          <rect x="12" y="36" width="16" height="20" rx="3" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
          {/* Waving Arm */}
          <path d="M28 40 L38 28 L34 24 L26 36 Z" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
          {/* Head & Hair */}
          <circle cx="20" cy="24" r="9" fill="#FDCB6E" stroke="#000" strokeWidth="2" />
          <path d="M12 22 Q20 12 28 20 Q24 14 16 16 Z" fill="#2D3436" />
        </g>

        {/* Character 2 (Standing on right foot, interacting) */}
        <g id="char-perched" transform="translate(415, 500)">
          {/* Shadow */}
          <ellipse cx="15" cy="80" rx="12" ry="4" fill="rgba(0,0,0,0.3)" />
          {/* Legs */}
          <path d="M10 50 L10 78 L14 78 L14 60 L18 60 L18 78 L22 78 L22 50 Z" fill="#6C5CE7" stroke="#000" strokeWidth="2" />
          {/* Torso */}
          <rect x="8" y="32" width="16" height="20" rx="3" fill="#FF7675" stroke="#000" strokeWidth="2" />
          {/* Head */}
          <circle cx="16" cy="22" r="8" fill="#FDCB6E" stroke="#000" strokeWidth="2" />
          <path d="M10 20 Q16 12 24 18 Q20 12 12 14 Z" fill="#2D3436" />
        </g>

        {/* Character 3 (Tiny user in middle looking up) */}
        <g id="char-center" transform="translate(245, 530)">
          <ellipse cx="14" cy="72" rx="10" ry="3.5" fill="rgba(0,0,0,0.25)" />
          <path d="M9 45 L9 70 L13 70 L13 54 L17 54 L17 70 L21 70 L21 45 Z" fill="#00B894" stroke="#000" strokeWidth="2" />
          <rect x="8" y="28" width="14" height="18" rx="3" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
          <circle cx="15" cy="18" r="7.5" fill="#FDCB6E" stroke="#000" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};
