import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, Mic, RefreshCw } from 'lucide-react';

type ExprState = 'idle' | 'wake' | 'listening' | 'processing' | 'success' | 'error' | 'offline';

export const OledSimulatorSection: React.FC = () => {
  const [state, setState] = useState<ExprState>('idle');
  const [tick, setTick] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render loop ticking at 10 FPS (pdMS_TO_TICKS(100) matching ESP32 firmware!)
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Draw 128x64 monochrome pixel art directly matching main.c firmware
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background to deep OLED black
    ctx.fillStyle = '#06080C';
    ctx.fillRect(0, 0, 128, 64);

    // Pixel phosphor color (electric cyan OLED monochrome)
    ctx.fillStyle = '#00F2FE';
    ctx.strokeStyle = '#00F2FE';

    const ellipse = (cx: number, cy: number, rx: number, ry: number, fill = true) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
      if (fill) ctx.fill();
      else ctx.stroke();
    };

    const rect = (x: number, y: number, w: number, h: number, fill = true) => {
      if (fill) ctx.fillRect(x, y, w, h);
      else ctx.strokeRect(x, y, w, h);
    };

    if (state === 'idle') {
      const isBlink = tick % 45 >= 42;
      const h = isBlink ? 2 : 11;
      ellipse(39, 29, 14, h);
      ellipse(89, 29, 14, h);
      if (h >= 6) {
        ctx.fillStyle = '#06080C';
        rect(33, 25, 4, 4, true);
        rect(83, 25, 4, 4, true);
        ctx.fillStyle = '#00F2FE';
      }
      if (h >= 10 && tick % 60 >= 30) {
        // Small curiosity mouth
        ellipse(64, 46, 4, 2);
      }
    } else if (state === 'wake') {
      const h = 5 + (tick % 10);
      ellipse(39, 29, 16, h);
      ellipse(89, 29, 16, h);
      if (h >= 6) {
        ctx.fillStyle = '#06080C';
        rect(33, 25, 4, 4, true);
        rect(83, 25, 4, 4, true);
        ctx.fillStyle = '#00F2FE';
      }
      ellipse(64, 49, 5, 3);
    } else if (state === 'listening') {
      ellipse(39, 25, 14, 11);
      ellipse(89, 25, 14, 11);
      ctx.fillStyle = '#06080C';
      rect(34, 22, 4, 4, true);
      rect(84, 22, 4, 4, true);
      ctx.fillStyle = '#00F2FE';

      // Sound equalizer bars reacting to animation tick
      for (let i = 0; i < 9; i++) {
        const p = (tick + i * 3) % 12;
        let barH = 3 + (p < 6 ? p : 12 - p) + 3;
        if (barH > 14) barH = 14;
        rect(28 + i * 9, 60 - barH, 4, barH, true);
      }
    } else if (state === 'processing') {
      // Rotating/pulsing neural diamond
      for (let r = 4; r <= 26; r += 7) {
        const d = (tick * 2 + r) % 20;
        if (d < 12) {
          rect(64 - r / 2, 32 - r / 2, r, 2, true);
          rect(64 - r / 2, 32 + r / 2, r, 2, true);
          rect(64 - r / 2, 32 - r / 2, 2, r, true);
          rect(64 + r / 2, 32 - r / 2, 2, r, true);
        }
      }
    } else if (state === 'success') {
      // Happy eyes with celebratory sparkles
      ellipse(39, 29, 16, 10);
      ellipse(89, 29, 16, 10);
      ctx.fillStyle = '#06080C';
      rect(33, 25, 4, 4, true);
      rect(83, 25, 4, 4, true);
      ctx.fillStyle = '#00F2FE';
      ellipse(64, 48, 9, 4);
      for (let i = 0; i < 5; i++) {
        rect(12 + ((tick + i * 19) % 105), 6 + ((tick * 3 + i * 11) % 48), 2, 2, true);
      }
    } else if (state === 'error') {
      ellipse(39, 31, 16, 8);
      ellipse(89, 31, 16, 8);
      ctx.fillStyle = '#06080C';
      rect(33, 28, 4, 4, true);
      rect(83, 28, 4, 4, true);
      ctx.fillStyle = '#00F2FE';
      // Tilted brows
      rect(25, 19, 26, 2, true);
      rect(77, 19, 26, 2, true);
    } else if (state === 'offline') {
      ellipse(39, 29, 14, 11);
      ellipse(89, 29, 14, 11);
      // Wi-Fi alert exclamation mark
      rect(62, 20, 4, 16, true);
      rect(62, 40, 4, 4, true);
    }
  }, [state, tick]);

  // Automated voice interaction simulation
  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Sequence: WAKE -> LISTENING -> PROCESSING -> SUCCESS -> IDLE
    setState('wake');
    setTimeout(() => {
      setState('listening');
      setTimeout(() => {
        setState('processing');
        setTimeout(() => {
          setState('success');
          setTimeout(() => {
            setState('idle');
            setIsSimulating(false);
          }, 2200);
        }, 1200);
      }, 2500);
    }, 1200);
  };

  return (
    <section
      id="expressions"
      style={{
        backgroundColor: 'var(--bg-body-yellow)',
        paddingTop: '3rem',
        paddingBottom: '5rem',
      }}
    >
      <div className="marketing-container">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: '9999px',
              padding: '0.35rem 1rem',
              marginBottom: '1rem',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.82rem',
              fontWeight: 900,
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} style={{ color: '#FF9F1C' }} />
            <span>Interactive Hardware Simulator</span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)',
              fontWeight: 900,
              color: '#000000',
              letterSpacing: '-0.04em',
              marginBottom: '0.75rem',
            }}
          >
            A living OLED personality
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              fontWeight: 500,
              color: '#262626',
              maxWidth: '560px',
              margin: '0 auto',
            }}
          >
            NOVA isn't a silent piece of plastic. Its 128×64 monochrome OLED reacts with intentional, procedural expressions rendered pixel-by-pixel.
          </p>
        </div>

        {/* Simulator Enclosure Card */}
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            backgroundColor: '#FFFDF7',
            border: '3px solid #000000',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '6px 6px 0px #000000',
            padding: '2.5rem',
          }}
        >
          {/* Physical Keychain Mockup Frame */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '2rem',
              position: 'relative',
            }}
          >
            {/* Lanyard Ring Top Hole */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#FFFDF7',
                border: '3px solid #000000',
                marginBottom: '-16px',
                zIndex: 2,
                boxShadow: '2px 2px 0px #000',
              }}
            />

            {/* Hardware Shell */}
            <div
              style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: '#1E2530',
                border: '3px solid #000000',
                borderRadius: '24px',
                padding: '1.75rem',
                boxShadow: '4px 4px 0px #000000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Mic Port Indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00F2FE', opacity: 0.8 }} />
                <span style={{ fontSize: '0.65rem', color: '#8899A6', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  MIC: GPIO1
                </span>
              </div>

              {/* OLED Screen Bezel */}
              <div
                style={{
                  backgroundColor: '#000000',
                  border: '2.5px solid #333333',
                  borderRadius: '14px',
                  padding: '8px',
                  boxShadow: 'inset 0 0 12px rgba(0,0,0,0.9)',
                  display: 'inline-block',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={128}
                  height={64}
                  style={{
                    display: 'block',
                    width: '256px',
                    height: '128px',
                    imageRendering: 'pixelated',
                    borderRadius: '6px',
                  }}
                />
              </div>

              {/* Status Bar Under Display */}
              <div
                style={{
                  marginTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  color: '#A0B0C0',
                }}
              >
                <span>FSM: <strong>{state.toUpperCase()}</strong></span>
                <span>•</span>
                <span>SSD1306 128×64 I2C</span>
              </div>
            </div>
          </div>

          {/* Interactive Mood Buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            {(['idle', 'wake', 'listening', 'processing', 'success', 'error', 'offline'] as const).map((expr) => (
              <button
                key={expr}
                onClick={() => {
                  setIsSimulating(false);
                  setState(expr);
                }}
                className={`badge-brutal ${state === expr ? 'badge-brutal-yellow' : 'badge-brutal-white'}`}
                style={{
                  cursor: 'pointer',
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                }}
              >
                {expr === 'listening' && <Mic size={12} />}
                {expr === 'processing' && <RefreshCw size={12} />}
                {expr === 'success' && <Sparkles size={12} />}
                <span>{expr}</span>
              </button>
            ))}
          </div>

          {/* Auto Simulation Trigger Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="btn-brutal btn-brutal-amber"
              style={{
                width: '100%',
                maxWidth: '380px',
                opacity: isSimulating ? 0.7 : 1,
              }}
            >
              <Play size={16} />
              <span>{isSimulating ? 'Simulating Voice Cycle...' : 'Simulate Voice Cycle (“Hi ESP”)'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
