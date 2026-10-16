import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Radio, Database, LogOut, CheckCircle2, Mic, RefreshCw, Cpu, Layers } from 'lucide-react';
import { apiClient } from '../../api/client';

export interface CompanionDashboardProps {
  user: { id: string; email: string; name?: string | null; avatar_url?: string | null } | null;
  onDisconnectDevice: () => void;
  onGoToConnect: () => void;
}

export const CompanionDashboard: React.FC<CompanionDashboardProps> = ({
  user,
  onDisconnectDevice,
  onGoToConnect,
}) => {
  const [activeDeviceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nova_active_device_id') || 'nova-c3-5c20dc4239fca9ec';
    }
    return 'nova-c3-5c20dc4239fca9ec';
  });

  const [currentExpression, setCurrentExpression] = useState<string>('idle');
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [notionSyncing, setNotionSyncing] = useState(false);
  const [memos, setMemos] = useState([
    { id: '1', title: 'Buy high-quality keychain carabiner clips', time: '10 mins ago', status: 'Synced' },
    { id: '2', title: 'Schedule injection mold factory call for Thursday', time: '1 hour ago', status: 'Synced' },
    { id: '3', title: 'Note: ESP32-C3 MAX4466 operates at 16,000 Hz', time: '3 hours ago', status: 'Synced' },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 128x64 Canvas OLED Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      // Clear with OLED deep off-black
      ctx.fillStyle = '#05070B';
      ctx.fillRect(0, 0, 128, 64);

      // Cyan glow color
      ctx.fillStyle = '#00F2FE';
      ctx.strokeStyle = '#00F2FE';

      const bob = (Math.floor(tick / 5) % 3) - 1;

      if (currentExpression === 'idle' || currentExpression === 'smile') {
        // Happy squint eyes
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(39, 29 + bob, 12, Math.PI, 0, false);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(89, 29 + bob, 12, Math.PI, 0, false);
        ctx.stroke();

        // Smile mouth
        ctx.beginPath();
        ctx.arc(64, 46 + bob, 6, 0, Math.PI, false);
        ctx.stroke();
      } else if (currentExpression === 'wink') {
        // Left eye wink
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(39, 29, 12, Math.PI, 0, false);
        ctx.stroke();

        // Right eye round open with pupil
        ctx.beginPath();
        ctx.arc(89, 29, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(87, 26, 4, 4);
        ctx.fillStyle = '#00F2FE';

        // Smirk
        ctx.beginPath();
        ctx.arc(66, 46, 5, 0, Math.PI, false);
        ctx.stroke();
      } else if (currentExpression === 'look_left') {
        // Look left
        ctx.beginPath();
        ctx.arc(39, 28, 12, 0, Math.PI * 2);
        ctx.arc(89, 28, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(30, 24, 6, 6);
        ctx.fillRect(80, 24, 6, 6);
        ctx.fillStyle = '#00F2FE';
      } else if (currentExpression === 'look_right') {
        // Look right
        ctx.beginPath();
        ctx.arc(39, 28, 12, 0, Math.PI * 2);
        ctx.arc(89, 28, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(42, 24, 6, 6);
        ctx.fillRect(92, 24, 6, 6);
        ctx.fillStyle = '#00F2FE';
      } else if (currentExpression === 'sleepy') {
        // Sleepy slits
        ctx.fillRect(26, 30, 26, 4);
        ctx.fillRect(76, 30, 26, 4);
        // Floating Z
        ctx.font = '8px monospace';
        ctx.fillText('Z', 105 + (tick % 10), 20 - (tick % 8));
      } else if (currentExpression === 'hearts') {
        // Heart eyes
        ctx.font = '16px monospace';
        ctx.fillText('♥', 30, 36);
        ctx.fillText('♥', 80, 36);
        ctx.beginPath();
        ctx.arc(64, 47, 5, 0, Math.PI, false);
        ctx.stroke();
      } else if (currentExpression === 'listening') {
        // Alert eyes
        ctx.beginPath();
        ctx.arc(39, 22, 10, 0, Math.PI * 2);
        ctx.arc(89, 22, 10, 0, Math.PI * 2);
        ctx.fill();
        // Sound wave bars
        for (let i = 0; i < 9; i++) {
          const h = 4 + (((tick + i * 2) % 6) + 1) * 2;
          ctx.fillRect(28 + i * 8, 60 - h, 5, h);
        }
      } else if (currentExpression === 'thinking') {
        // Rotating diamond
        ctx.save();
        ctx.translate(64, 32);
        ctx.rotate((tick * 10 * Math.PI) / 180);
        ctx.strokeRect(-10, -10, 20, 20);
        ctx.restore();
        ctx.font = '8px monospace';
        ctx.fillText('THINKING...', 36, 56);
      } else {
        // Default alert curious
        ctx.beginPath();
        ctx.arc(39, 29, 12, 0, Math.PI * 2);
        ctx.arc(89, 29, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(36, 26, 5, 5);
        ctx.fillRect(86, 26, 5, 5);
        ctx.fillStyle = '#00F2FE';
      }

      // Top right connection dot
      ctx.fillRect(124, 2, 2, 2);

      tick++;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [currentExpression]);

  const handleTriggerSync = () => {
    setNotionSyncing(true);
    setCurrentExpression('listening');
    setTimeout(() => {
      setCurrentExpression('thinking');
      setTimeout(() => {
        setCurrentExpression('smile');
        setNotionSyncing(false);
        setMemos((prev) => [
          {
            id: String(Date.now()),
            title: `Voice Memo captured via ESP32 (${new Date().toLocaleTimeString()})`,
            time: 'Just now',
            status: 'Synced',
          },
          ...prev,
        ]);
      }, 1200);
    }, 1500);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiClient.unlinkUserDevice(activeDeviceId);
    } catch {
      // Local fallback
    } finally {
      localStorage.removeItem('nova_active_device_id');
      setDisconnecting(false);
      setConfirmModalOpen(false);
      onDisconnectDevice();
    }
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>
      {/* Top Header Card */}
      <div
        className="card-brutal"
        style={{
          backgroundColor: 'var(--bg-card-cream)',
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#FFAEC8',
              border: '2.5px solid #000',
              boxShadow: '3px 3px 0px #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Cpu size={30} color="#000" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 900 }}>
                My NOVA Keychain
              </h1>
              <span
                style={{
                  backgroundColor: '#4ECCA3',
                  border: '1.5px solid #000',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  boxShadow: '1.5px 1.5px 0px #000',
                }}
              >
                ONLINE
              </span>
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#444' }}>
              Device: <strong>{activeDeviceId}</strong> · MAC: <strong>48:F6:EE:17:34:D8</strong>
              {user?.email && <span> · Account: <strong>{user.email}</strong></span>}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={onGoToConnect}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#000000',
              border: '2px solid #000000',
              padding: '0.65rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '2.5px 2.5px 0px #000',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Radio size={15} color="#00F2FE" />
            <span>Pair Another</span>
          </button>

          <button
            onClick={() => setConfirmModalOpen(true)}
            style={{
              backgroundColor: '#FFF0F0',
              color: '#D63031',
              border: '2px solid #000000',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '2.5px 2.5px 0px #000',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFE5E5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFF0F0')}
          >
            <LogOut size={15} />
            <span>Disconnect Device</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Left Column: Live 128x64 OLED Screen */}
        <div
          className="card-brutal"
          style={{
            backgroundColor: 'var(--bg-card-cream)',
            padding: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900 }}>Live OLED Face</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#666' }}>
              SSD1306 128×64
            </span>
          </div>

          {/* OLED Screen Box */}
          <div
            style={{
              backgroundColor: '#000000',
              borderRadius: 'var(--radius-md)',
              border: '3px solid #000000',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(0, 242, 254, 0.15), 4px 4px 0px #000',
              marginBottom: '1.25rem',
            }}
          >
            <canvas
              ref={canvasRef}
              width={128}
              height={64}
              style={{
                width: '100%',
                maxWidth: '280px',
                aspectRatio: '128 / 64',
                imageRendering: 'pixelated',
                borderRadius: '6px',
                border: '1px solid #1E293B',
              }}
            />
          </div>

          {/* Mood Expression Toggles */}
          <div style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.6rem', color: '#555' }}>
            Switch Hardware Mood Preview
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {[
              { id: 'idle', label: 'Curious' },
              { id: 'wink', label: 'Wink' },
              { id: 'look_left', label: '<.< Left' },
              { id: 'look_right', label: '>.> Right' },
              { id: 'smile', label: '^.^ Happy' },
              { id: 'sleepy', label: 'Sleepy' },
              { id: 'hearts', label: '♥ Hearts' },
              { id: 'listening', label: 'Listening' },
              { id: 'thinking', label: 'Thinking' },
            ].map((expr) => (
              <button
                key={expr.id}
                onClick={() => setCurrentExpression(expr.id)}
                style={{
                  backgroundColor: currentExpression === expr.id ? '#FFAEC8' : '#FFF',
                  border: '1.5px solid #000',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: currentExpression === expr.id ? '2px 2px 0px #000' : 'none',
                }}
              >
                {expr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Hardware Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hardware Specs Card */}
          <div
            className="card-brutal"
            style={{
              backgroundColor: 'var(--bg-card-cream)',
              padding: '1.75rem',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '1.25rem' }}>
              Device Telemetry
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{ backgroundColor: '#FFF', border: '2px solid #000', padding: '0.85rem', borderRadius: 'var(--radius-sm)', boxShadow: '2px 2px 0px #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#666', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                  <Wifi size={13} color="#FF9F1C" />
                  <span>WI-FI NETWORK</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>Home_Lab_2.4G</div>
                <div style={{ fontSize: '0.75rem', color: '#27AE60', fontWeight: 700 }}>Signal: -58 dBm (Strong)</div>
              </div>

              <div style={{ backgroundColor: '#FFF', border: '2px solid #000', padding: '0.85rem', borderRadius: 'var(--radius-sm)', boxShadow: '2px 2px 0px #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#666', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                  <Mic size={13} color="#E74C3C" />
                  <span>ACOUSTIC MIC</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>MAX4466 ADC</div>
                <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>16,000 Hz Sampling</div>
              </div>

              <div style={{ backgroundColor: '#FFF', border: '2px solid #000', padding: '0.85rem', borderRadius: 'var(--radius-sm)', boxShadow: '2px 2px 0px #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#666', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                  <Radio size={13} color="#2980B9" />
                  <span>WAKE ENGINE</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>WakeNet9s</div>
                <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>Model: wn9s_hiesp</div>
              </div>

              <div style={{ backgroundColor: '#FFF', border: '2px solid #000', padding: '0.85rem', borderRadius: 'var(--radius-sm)', boxShadow: '2px 2px 0px #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#666', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                  <Layers size={13} color="#8E44AD" />
                  <span>FLASH MEMORY</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>4MB Embedded</div>
                <div style={{ fontSize: '0.75rem', color: '#27AE60', fontWeight: 700 }}>OTA Headroom: 27%</div>
              </div>
            </div>
          </div>

          {/* Notion Sync Card */}
          <div
            className="card-brutal"
            style={{
              backgroundColor: 'var(--bg-card-cream)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} color="#FF9F1C" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 900 }}>Notion Sync Hub</h2>
              </div>

              <button
                onClick={handleTriggerSync}
                disabled={notionSyncing}
                className="btn-brutal btn-brutal-amber"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
              >
                <RefreshCw size={13} className={notionSyncing ? 'spin' : ''} />
                <span>{notionSyncing ? 'Capturing...' : 'Test Voice Memo'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  style={{
                    backgroundColor: '#FFF',
                    border: '1.5px solid #000',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={15} color="#27AE60" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{memo.title}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#777', fontWeight: 600 }}>{memo.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {confirmModalOpen && (
        <div className="modal-backdrop" onClick={() => setConfirmModalOpen(false)}>
          <div
            className="modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card-cream)',
              border: '3px solid #000',
              boxShadow: '8px 8px 0px #000',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '90%',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#FFE5E5',
                border: '2.5px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '3px 3px 0px #000',
              }}
            >
              <LogOut size={28} color="#D63031" />
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              Disconnect NOVA?
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              This will unlink <strong>{activeDeviceId}</strong> from your account. All Wi-Fi credentials on the device will be reset. You can reconnect it anytime!
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="btn-brutal btn-brutal-white"
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{
                  backgroundColor: '#D63031',
                  color: '#FFFFFF',
                  border: '2.5px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  padding: '0.75rem 1.4rem',
                  cursor: 'pointer',
                }}
              >
                {disconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
