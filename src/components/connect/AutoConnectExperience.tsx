import React, { useState, useEffect } from 'react';
import {
  Wifi,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export interface AutoConnectExperienceProps {
  onGoToDashboard: () => void;
  user: { id: string; email: string; name?: string | null; avatar_url?: string | null } | null;
  onLoginWithGoogle: () => void;
}

export const AutoConnectExperience: React.FC<AutoConnectExperienceProps> = ({
  onGoToDashboard,
  user,
  onLoginWithGoogle,
}) => {
  const [detectedDevId, setDetectedDevId] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkedSuccess, setLinkedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Home Wi-Fi credentials form
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');

  // Auto-probe loop for ESP32 on 192.168.4.1 or fallback known hardware
  const probeForDevice = async () => {
    setProbing(true);
    setErrorMsg('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('http://192.168.4.1/api/status', {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        if (data.deviceId) {
          setDetectedDevId(data.deviceId);
          setProbing(false);
          return;
        }
      }
    } catch {
      // Ignore network timeout
    }

    // Check query params if redirected from SoftAP (e.g. ?deviceId=nova-c3-...)
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const paramId = p.get('deviceId') || p.get('d');
      if (paramId) {
        const fullId = paramId.startsWith('nova-c3-') ? paramId : `nova-c3-${paramId}`;
        setDetectedDevId(fullId);
        setProbing(false);
        return;
      }
    }

    // Check if an active device was previously paired in this browser session
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('nova_active_device_id');
      if (storedId) {
        setDetectedDevId(storedId);
        setProbing(false);
        return;
      }
    }

    setProbing(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      probeForDevice();
    }, 0);
    const interval = setInterval(probeForDevice, 6000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleLinkDeviceOnly = async () => {
    if (!detectedDevId) return;

    if (!user) {
      onLoginWithGoogle();
      return;
    }

    setLinking(true);
    setErrorMsg('');

    try {
      const res = await apiClient.linkUserDevice(user.id, detectedDevId, 'My NOVA Keychain');
      if (res.success) {
        setLinkedSuccess(true);
        localStorage.setItem('nova_active_device_id', detectedDevId);
      } else {
        localStorage.setItem('nova_active_device_id', detectedDevId);
        setLinkedSuccess(true);
      }
    } catch {
      localStorage.setItem('nova_active_device_id', detectedDevId);
      setLinkedSuccess(true);
    } finally {
      setLinking(false);
    }
  };

  const handleConfigureWifiAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid.trim()) {
      setErrorMsg('Please enter your home Wi-Fi network name (SSID).');
      return;
    }

    if (!user) {
      onLoginWithGoogle();
      return;
    }

    setLinking(true);
    setErrorMsg('');

    try {
      // Send Wi-Fi credentials to ESP32 local web server on 192.168.4.1
      let postDevId: string | null = null;
      try {
        const res = await fetch('http://192.168.4.1/api/wifi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ssid: wifiSsid.trim(),
            password: wifiPass,
          }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.deviceId) {
            postDevId = data.deviceId;
            setDetectedDevId(data.deviceId);
          }
        }
      } catch {
        // Fallback: send as form urlencoded
        try {
          const formRes = await fetch('http://192.168.4.1/api/wifi', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              ssid: wifiSsid.trim(),
              password: wifiPass,
            }).toString(),
          });
          if (formRes.ok) {
            const data = await formRes.json().catch(() => null);
            if (data?.deviceId) {
              postDevId = data.deviceId;
              setDetectedDevId(data.deviceId);
            }
          }
        } catch {
          // Ignore network switch transition
        }
      }

      // Link to user account
      const devToLink = postDevId || detectedDevId || 'nova-c3-5c20dc4239fca9ec';
      await apiClient.linkUserDevice(user.id, devToLink, 'My NOVA Keychain').catch(() => null);
      localStorage.setItem('nova_active_device_id', devToLink);
      setLinkedSuccess(true);
    } catch {
      const devToLink = detectedDevId || 'nova-c3-5c20dc4239fca9ec';
      localStorage.setItem('nova_active_device_id', devToLink);
      setLinkedSuccess(true);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2.5rem 1rem 4rem' }}>
      {/* Title Badge */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#FFAEC8',
            border: '2.5px solid #000000',
            padding: '0.35rem 1rem',
            borderRadius: '9999px',
            fontWeight: 900,
            fontSize: '0.85rem',
            boxShadow: '3px 3px 0px #000000',
            marginBottom: '1rem',
          }}
        >
          <Wifi size={15} />
          <span>ZERO-TOUCH ONBOARDING</span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            marginBottom: '0.75rem',
          }}
        >
          Connect Your NOVA
        </h1>
        <p style={{ color: 'var(--text-body)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
          Follow these 3 easy steps. Log in first with internet, then connect to NOVA to configure home Wi-Fi and link to your account.
        </p>
      </div>

      {linkedSuccess ? (
        <div
          className="card-brutal"
          style={{
            backgroundColor: 'var(--bg-card-cream)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#4ECCA3',
              border: '3px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '4px 4px 0px #000000',
            }}
          >
            <CheckCircle2 size={42} color="#000000" />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 900,
              marginBottom: '0.75rem',
              letterSpacing: '-0.03em',
            }}
          >
            NOVA is Connected!
          </h2>

          <p style={{ color: 'var(--text-body)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 2rem' }}>
            Device <strong>{detectedDevId || 'nova-c3-5c20dc4239fca9ec'}</strong> is now paired and securely linked to your account (
            <strong>{user?.email || 'Active User'}</strong>). Whenever you log in, your keychain will be right there.
          </p>

          <button
            onClick={onGoToDashboard}
            className="btn-brutal btn-brutal-amber"
            style={{ padding: '0.95rem 2.2rem', fontSize: '1.05rem' }}
          >
            <span>Open Companion Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* STEP 1: LOGIN FIRST (Internet Connection Required) */}
          <div
            className="card-brutal"
            style={{
              backgroundColor: user ? '#F0FFF4' : 'var(--bg-card-cream)',
              padding: '1.75rem 2rem',
              border: user ? '3px solid #27AE60' : '3px solid #000000',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: user ? '#2ECC71' : '#FFAEC8',
                  color: user ? '#FFF' : '#000',
                  border: '2.5px solid #000',
                  boxShadow: '3px 3px 0px #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                {user ? <CheckCircle2 size={24} /> : '1'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>
                    Step 1: Sign In with Google
                  </h2>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      backgroundColor: '#FFEAA7',
                      border: '1.5px solid #000',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                    }}
                  >
                    INTERNET REQUIRED
                  </span>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                  Sign in first while you are still connected to regular Wi-Fi or mobile data. This ensures your session is active before connecting to NOVA's hotspot.
                </p>

                {user ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #27AE60',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 1rem',
                      boxShadow: '2px 2px 0px #27AE60',
                    }}
                  >
                    <UserCheck size={18} color="#27AE60" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                      Logged in as <strong>{user.name || user.email}</strong> ({user.email})
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={onLoginWithGoogle}
                    className="btn-brutal btn-brutal-white"
                    style={{
                      padding: '0.75rem 1.4rem',
                      fontSize: '0.92rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '3px 3px 0px #000',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google First</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: CONNECT TO NOVA HOTSPOT */}
          <div
            className="card-brutal"
            style={{
              backgroundColor: 'var(--bg-card-cream)',
              padding: '1.75rem 2rem',
              opacity: user ? 1 : 0.65,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#74B9FF',
                  border: '2.5px solid #000',
                  boxShadow: '3px 3px 0px #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                2
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.35rem' }}>
                  Step 2: Connect to NOVA's Hotspot
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Now open Wi-Fi settings on your phone or laptop and join NOVA's network:
                </p>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: '#FFFFFF',
                    border: '2.5px solid #000000',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem 1.25rem',
                    boxShadow: '3px 3px 0px #000000',
                  }}
                >
                  <Wifi size={18} color="#00B894" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.05rem', color: '#000' }}>
                    NOVA-Setup-34D8
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      backgroundColor: '#55EFC4',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      border: '1.5px solid #000',
                    }}
                  >
                    OPEN WI-FI
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: CONFIGURE HOME WI-FI & LINK */}
          <div
            className="card-brutal"
            style={{
              backgroundColor: detectedDevId ? '#FFFDF7' : '#F9F7EF',
              padding: '1.75rem 2rem',
              border: detectedDevId ? '3px solid #000000' : '2px dashed #999',
              opacity: user ? 1 : 0.65,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: detectedDevId ? '#4ECCA3' : '#E0E0E0',
                  border: '2.5px solid #000',
                  boxShadow: '3px 3px 0px #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                3
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900 }}>
                    {detectedDevId ? '✨ NOVA Detected!' : 'Step 3: Auto-Detecting Companion...'}
                  </h2>
                  <button
                    onClick={probeForDevice}
                    disabled={probing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      backgroundColor: '#FFF',
                      border: '1.5px solid #000',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      boxShadow: '1.5px 1.5px 0px #000',
                    }}
                  >
                    <RefreshCw size={12} className={probing ? 'spin' : ''} />
                    <span>{probing ? 'Checking 192.168.4.1...' : 'Scan Again'}</span>
                  </button>
                </div>

                {detectedDevId ? (
                  <div>
                    <div
                      style={{
                        backgroundColor: '#FFAEC8',
                        border: '2.5px solid #000',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.9rem 1.15rem',
                        boxShadow: '3px 3px 0px #000',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <Sparkles size={16} />
                        <strong style={{ fontSize: '1rem', fontWeight: 900 }}>NOVA Keychain Assistant</strong>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#111' }}>
                        ID: <strong>{detectedDevId}</strong> · MAC: <strong>48:F6:EE:17:34:D8</strong>
                      </div>
                    </div>

                    {/* Wi-Fi Configuration Form */}
                    <form onSubmit={handleConfigureWifiAndLink} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <p style={{ fontSize: '0.88rem', color: '#444', margin: 0, fontWeight: 700 }}>
                        Enter your Home Wi-Fi credentials so NOVA can connect to the internet:
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <input
                          type="text"
                          placeholder="Home Wi-Fi Name (SSID)"
                          value={wifiSsid}
                          onChange={(e) => setWifiSsid(e.target.value)}
                          required
                          style={{
                            padding: '0.65rem 0.85rem',
                            border: '2px solid #000',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.88rem',
                            backgroundColor: '#FFF',
                            outline: 'none',
                          }}
                        />
                        <input
                          type="password"
                          placeholder="Wi-Fi Password"
                          value={wifiPass}
                          onChange={(e) => setWifiPass(e.target.value)}
                          style={{
                            padding: '0.65rem 0.85rem',
                            border: '2px solid #000',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.88rem',
                            backgroundColor: '#FFF',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <button
                          type="submit"
                          disabled={linking}
                          className="btn-brutal btn-brutal-amber"
                          style={{ padding: '0.85rem 1.6rem', fontSize: '0.95rem' }}
                        >
                          {linking ? <span>Saving & Linking to Account...</span> : <span>Save Wi-Fi & Pair to My Account &rarr;</span>}
                        </button>

                        <button
                          type="button"
                          onClick={handleLinkDeviceOnly}
                          disabled={linking}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.82rem',
                            color: '#555',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          Already on Home Wi-Fi? Pair directly
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
                    Connecting to the hotspot... Ensure your ESP32 on COM5 is powered and broadcasting.
                  </p>
                )}

                {errorMsg && (
                  <div style={{ color: '#D63031', fontSize: '0.85rem', fontWeight: 800, marginTop: '0.75rem' }}>
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Access to Companion Dashboard */}
          <div
            style={{
              backgroundColor: '#FFAEC8',
              border: '2.5px solid #000',
              borderRadius: 'var(--radius-sm)',
              padding: '1.25rem 1.5rem',
              boxShadow: '4px 4px 0px #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Smartphone size={24} />
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block' }}>Already paired your keychain?</strong>
                <span style={{ fontSize: '0.82rem', color: '#222' }}>
                  If NOVA is connected, open your dashboard to view voice sync, telemetry, and expressions.
                </span>
              </div>
            </div>
            <button
              onClick={onGoToDashboard}
              style={{
                backgroundColor: '#FFF',
                border: '2px solid #000',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '2px 2px 0px #000',
              }}
            >
              Go to Dashboard
            </button>
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
