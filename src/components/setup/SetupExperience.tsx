import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Wifi,
  Shield,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  Cpu,
  FileText,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import type { WifiProfile } from '../../api/types';

interface SetupExperienceProps {
  onBackToWebsite: () => void;
  initialToken?: string;
  initialDeviceId?: string;
}

export const SetupExperience: React.FC<SetupExperienceProps> = ({
  onBackToWebsite,
  initialToken,
  initialDeviceId,
}) => {
  // Authentication & Pairing State
  const [sessionToken, setSessionToken] = useState<string | null>(() => apiClient.getSessionToken());
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    if (initialDeviceId) return initialDeviceId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nova_paired_device_id') || null;
    }
    return null;
  });

  // Pairing Input States
  const [claimInput, setClaimInput] = useState<string>(initialToken || '');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Device Telemetry & Status
  const [deviceData, setDeviceData] = useState<{
    id: string;
    macAddress: string;
    serialNumber: string;
    status: string;
    batteryPercent: number;
    rssi: number | null;
    lastHeartbeat: string | null;
    firmwareVersion: string;
    notionConnected?: boolean;
    notionWorkspace?: string | null;
  } | null>(null);

  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);

  // Wi-Fi Profiles Vault
  const [wifiProfiles, setWifiProfiles] = useState<WifiProfile[]>([]);
  const [isAddWifiOpen, setIsAddWifiOpen] = useState<boolean>(false);
  const [newSsid, setNewSsid] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newIsDefault, setNewIsDefault] = useState<boolean>(false);
  const [isSubmittingWifi, setIsSubmittingWifi] = useState<boolean>(false);

  // UI Accordions / Guides
  const [showSoftApGuide, setShowSoftApGuide] = useState<boolean>(false);
  const [syncTestRunning, setSyncTestRunning] = useState<boolean>(false);
  const [syncTestResult, setSyncTestResult] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load Device Status
  // ---------------------------------------------------------------------------
  const fetchDeviceStatus = useCallback(async (targetDeviceId: string, token: string) => {
    setIsLoadingStatus(true);
    try {
      const res = await apiClient.getDeviceStatus(targetDeviceId, token);
      if (res.success && res.data) {
        setDeviceData({
          id: res.data.device.deviceId,
          macAddress: res.data.wifi?.macAddress || '48:F6:EE:17:34:D8',
          serialNumber: res.data.device.serialNumber,
          status: res.data.device.status,
          batteryPercent: res.data.device.batteryPercent || 100,
          rssi: res.data.wifi?.rssi ?? -55,
          lastHeartbeat: res.data.device.lastHeartbeat,
          firmwareVersion: res.data.device.firmwareVersion || '1.2.0',
          notionConnected: res.data.notion?.isConnected,
          notionWorkspace: res.data.notion?.workspaceName,
        });

        // Also fetch Wi-Fi profiles
        const vaultRes = await apiClient.getWifiProfiles(targetDeviceId, token);
        if (vaultRes.success && vaultRes.data) {
          setWifiProfiles(vaultRes.data.profiles);
        }
      } else {
        if (res.error?.code === 'SESSION_INVALID' || res.error?.code === 'UNAUTHORIZED') {
          apiClient.setSessionToken(null);
          setSessionToken(null);
          localStorage.removeItem('nova_paired_device_id');
        }
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Handle Device Claiming
  // ---------------------------------------------------------------------------
  const handleClaimDevice = useCallback(async (tokenToClaim?: string) => {
    const rawToken = (tokenToClaim || claimInput).trim();
    if (!rawToken) {
      setClaimError('Please provide a claim token or pairing code from the OLED screen.');
      return;
    }

    setIsClaiming(true);
    setClaimError(null);

    try {
      const res = await apiClient.claimDevice({ claimToken: rawToken });
      if (res.success && res.data) {
        const { pairingSessionId, deviceId: pairedId } = res.data;
        apiClient.setSessionToken(pairingSessionId);
        setSessionToken(pairingSessionId);
        setDeviceId(pairedId);
        localStorage.setItem('nova_paired_device_id', pairedId);

        // Fetch full status
        await fetchDeviceStatus(pairedId, pairingSessionId);
      } else {
        setClaimError(res.error?.message || 'Failed to claim device. Verify token on OLED screen.');
      }
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : 'Error connecting to pairing service.');
    } finally {
      setIsClaiming(false);
    }
  }, [claimInput, fetchDeviceStatus]);

  // Auto-claim if initialToken is provided
  useEffect(() => {
    if (initialToken && !sessionToken) {
      const timer = setTimeout(() => {
        void handleClaimDevice(initialToken);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialToken, sessionToken, handleClaimDevice]);

  // Load status on mount if session exists
  useEffect(() => {
    if (sessionToken && deviceId) {
      const timer = setTimeout(() => {
        void fetchDeviceStatus(deviceId, sessionToken);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sessionToken, deviceId, fetchDeviceStatus]);

  // ---------------------------------------------------------------------------
  // Wi-Fi Vault Handlers
  // ---------------------------------------------------------------------------
  const handleAddWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || !sessionToken || !newSsid) return;

    setIsSubmittingWifi(true);
    try {
      const res = await apiClient.createWifiProfile(
        deviceId,
        {
          name: `Network ${wifiProfiles.length + 1}`,
          ssid: newSsid,
          password: newPassword,
          isDefault: newIsDefault,
        },
        sessionToken
      );

      if (res.success) {
        // Refresh vault
        const vaultRes = await apiClient.getWifiProfiles(deviceId, sessionToken);
        if (vaultRes.success && vaultRes.data) {
          setWifiProfiles(vaultRes.data.profiles);
        }
        setIsAddWifiOpen(false);
        setNewSsid('');
        setNewPassword('');
      } else {
        alert(res.error?.message || 'Failed to save Wi-Fi profile.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSubmittingWifi(false);
    }
  };

  const handleMakeDefault = async (profileId: string) => {
    if (!deviceId || !sessionToken) return;
    try {
      const res = await apiClient.makeDefaultWifiProfile(deviceId, profileId, sessionToken);
      if (res.success) {
        const vaultRes = await apiClient.getWifiProfiles(deviceId, sessionToken);
        if (vaultRes.success && vaultRes.data) {
          setWifiProfiles(vaultRes.data.profiles);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWifi = async (profileId: string) => {
    if (!deviceId || !sessionToken || !window.confirm('Remove this Wi-Fi profile from your cloud vault?')) return;
    try {
      const res = await apiClient.deleteWifiProfile(deviceId, profileId, sessionToken);
      if (res.success) {
        const vaultRes = await apiClient.getWifiProfiles(deviceId, sessionToken);
        if (vaultRes.success && vaultRes.data) {
          setWifiProfiles(vaultRes.data.profiles);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Notion Handlers
  // ---------------------------------------------------------------------------
  const handleConnectNotion = async () => {
    if (!deviceId) return;
    try {
      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://buynovastore.vercel.app';
      const res = await apiClient.authorizeNotion({
        deviceId,
        redirectUri,
        pairingSessionId: sessionToken || undefined,
      });
      if (res.success && res.data?.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      } else {
        alert(res.error?.message || 'Failed to initialize Notion authorization.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error starting Notion connection.');
    }
  };

  const handleTestNotionSync = async () => {
    if (!deviceId || !sessionToken) return;
    setSyncTestRunning(true);
    setSyncTestResult(null);
    try {
      const res = await apiClient.testSync(deviceId, sessionToken);
      if (res.success) {
        setSyncTestResult('Notion sync operational. Test action confirmed.');
      } else {
        setSyncTestResult(`Sync error: ${res.error?.message || 'Notion not connected'}`);
      }
    } catch (err: unknown) {
      setSyncTestResult(err instanceof Error ? err.message : 'Sync test failed.');
    } finally {
      setSyncTestRunning(false);
    }
  };

  const handleDisconnectNotion = async () => {
    if (!deviceId || !sessionToken || !window.confirm('Disconnect Notion integration?')) return;
    try {
      const res = await apiClient.disconnectNotion(
        deviceId,
        { confirm: true, revokeToken: true },
        sessionToken
      );
      if (res.success) {
        if (deviceData) {
          setDeviceData({ ...deviceData, notionConnected: false, notionWorkspace: null });
        }
        setSyncTestResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = () => {
    apiClient.setSessionToken(null);
    setSessionToken(null);
    setDeviceId(null);
    setDeviceData(null);
    localStorage.removeItem('nova_paired_device_id');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090b10', color: '#f2f4f8' }}>
      {/* Top Bar */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.9rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0d1017',
        }}
      >
        <button
          onClick={onBackToWebsite}
          style={{
            background: 'none',
            border: 'none',
            color: '#8e96a4',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 500,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          <span>Website</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              color: sessionToken ? '#00e5ff' : '#8e96a4',
              backgroundColor: sessionToken ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.04)',
              padding: '4px 10px',
              borderRadius: '4px',
              border: `1px solid ${sessionToken ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <Cpu size={13} />
            <span>{sessionToken ? 'ESP32-C3 Online' : 'Hardware Pairing'}</span>
          </div>

          {sessionToken && (
            <button
              onClick={handleSignOut}
              title="Disconnect session"
              style={{
                background: 'none',
                border: 'none',
                color: '#8e96a4',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '880px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {/* ===================================================================
            VIEW A: UNPAIRED / PAIRING FLOW
            =================================================================== */}
        {!sessionToken ? (
          <div>
            <div style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 0.5rem' }}>
                Hardware Pairing
              </h1>
              <p style={{ fontSize: '0.95rem', color: '#8e96a4', margin: 0, maxWidth: '580px', lineHeight: 1.55 }}>
                Pair your physical NOVA keychain assistant. The device generates an ephemeral single-use claim token on its 0.96″ OLED display once connected to 2.4GHz Wi-Fi.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
                alignItems: 'start',
              }}
            >
              {/* Form Card */}
              <div
                style={{
                  backgroundColor: '#11141c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '1.75rem',
                }}
              >
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Enter OLED Claim Token</h2>
                <p style={{ fontSize: '0.85rem', color: '#8e96a4', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
                  Scan the QR code shown on your OLED screen or enter the 8-character code (e.g. <code>NOV-48F6</code>) below.
                </p>

                {claimError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{claimError}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleClaimDevice();
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
                >
                  <div>
                    <label
                      htmlFor="claim-token"
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#8e96a4',
                        marginBottom: '0.4rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Token or Shortcode
                    </label>
                    <input
                      id="claim-token"
                      type="text"
                      value={claimInput}
                      onChange={(e) => setClaimInput(e.target.value)}
                      placeholder="clm_live_... or NOV-XXXX"
                      required
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.75rem 0.9rem',
                        backgroundColor: '#171b26',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        color: '#f2f4f8',
                        fontSize: '0.92rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isClaiming}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      backgroundColor: '#00e5ff',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      cursor: isClaiming ? 'wait' : 'pointer',
                      opacity: isClaiming ? 0.7 : 1,
                    }}
                  >
                    {isClaiming ? 'Binding Hardware Identity...' : 'Claim & Authorize Device'}
                  </button>
                </form>

                {/* SoftAP Privacy Notice */}
                <div
                  style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <button
                    onClick={() => setShowSoftApGuide(!showSoftApGuide)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00e5ff',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: 0,
                    }}
                  >
                    <span>Need to configure Wi-Fi on device first?</span>
                    {showSoftApGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showSoftApGuide && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        fontSize: '0.82rem',
                        color: '#8e96a4',
                        lineHeight: 1.5,
                        backgroundColor: '#0d1017',
                        padding: '0.85rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <strong style={{ color: '#f2f4f8', display: 'block', marginBottom: '0.3rem' }}>
                        Local SoftAP Provisioning (192.168.4.1)
                      </strong>
                      1. Connect your phone or laptop to the device&apos;s local Wi-Fi: <code>NOVA-Setup-XXXX</code>.<br />
                      2. Open <code>http://192.168.4.1</code> in your browser.<br />
                      3. Enter your 2.4GHz home Wi-Fi SSID and password.<br />
                      4. Your password is saved directly to device flash and never touches the cloud.<br />
                      5. Once connected, NOVA displays the pairing QR code on the OLED.
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware Reference Card */}
              <div
                style={{
                  backgroundColor: '#11141c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '1.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Shield size={18} style={{ color: '#00e5ff' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Cryptographic Hardware Safeguards</h3>
                </div>

                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#8e96a4', fontSize: '0.84rem', lineHeight: 1.6 }}>
                  <li>
                    <strong style={{ color: '#f2f4f8' }}>Single-Use Claim Tokens:</strong> Tokens expire in 15 minutes and self-invalidate immediately upon redemption.
                  </li>
                  <li>
                    <strong style={{ color: '#f2f4f8' }}>SHA-256 Key Hashing:</strong> Raw device bearer keys are never stored in plaintext on the database.
                  </li>
                  <li>
                    <strong style={{ color: '#f2f4f8' }}>Local Wi-Fi Vault:</strong> Wi-Fi passwords remain strictly encrypted with AES-256-GCM envelope encryption and are only decrypted for authenticated hardware.
                  </li>
                  <li>
                    <strong style={{ color: '#f2f4f8' }}>Acoustic Model:</strong> ESP32-C3 executes local WakeNet9s acoustic recognition for <code>&quot;Hi ESP&quot;</code>.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* ===================================================================
             VIEW B: ACTIVE HARDWARE CONSOLE
             =================================================================== */
          <div>
            {/* Header Telemetry Strip */}
            <div
              style={{
                backgroundColor: '#11141c',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: deviceData?.status === 'online' ? '#22c55e' : '#f59e0b',
                      }}
                    />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                      {deviceData?.id || deviceId}
                    </h2>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8e96a4' }}>
                    MAC: <code>{deviceData?.macAddress || '48:F6:EE:17:34:D8'}</code> • SN: <code>{deviceData?.serialNumber || 'NOV-C3-PROD-01'}</code>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (deviceId && sessionToken) {
                      void fetchDeviceStatus(deviceId, sessionToken);
                    }
                  }}
                  disabled={isLoadingStatus}
                  style={{
                    backgroundColor: '#171b26',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f2f4f8',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={14} className={isLoadingStatus ? 'animate-spin' : ''} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              {/* Metric Indicators */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Battery</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f2f4f8', marginTop: '0.15rem' }}>
                    {deviceData?.batteryPercent ?? 100}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Wi-Fi RSSI</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f2f4f8', marginTop: '0.15rem' }}>
                    {deviceData?.rssi ?? -55} dBm
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Architecture</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f2f4f8', marginTop: '0.15rem' }}>
                    ESP32-C3 (RISC-V)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: '#8e96a4', textTransform: 'uppercase' }}>Wake Word</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#00e5ff', marginTop: '0.15rem' }}>
                    wn9s_hiesp (&quot;Hi ESP&quot;)
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Grid: Wi-Fi Vault + Notion Sync */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {/* Wi-Fi Profiles Vault */}
              <div
                style={{
                  backgroundColor: '#11141c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wifi size={18} style={{ color: '#00e5ff' }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Wi-Fi Profile Vault</h3>
                  </div>

                  <button
                    onClick={() => setIsAddWifiOpen(true)}
                    style={{
                      backgroundColor: 'rgba(0, 229, 255, 0.1)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      color: '#00e5ff',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '5px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Network</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {wifiProfiles.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#8e96a4', padding: '1rem 0' }}>
                      No cloud profiles configured. Add a network profile to sync credentials securely to device boot flash.
                    </div>
                  ) : (
                    wifiProfiles.map((prof) => (
                      <div
                        key={prof.id}
                        style={{
                          backgroundColor: '#171b26',
                          border: `1px solid ${prof.isDefault ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
                          borderRadius: '6px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ fontSize: '0.92rem', color: '#f2f4f8' }}>{prof.ssid}</strong>
                            {prof.isDefault && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color: '#000',
                                  backgroundColor: '#00e5ff',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                }}
                              >
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#8e96a4', marginTop: '0.2rem' }}>
                            Slot: <code>{prof.slotNumber}</code> ({prof.voiceSlot})
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {!prof.isDefault && (
                            <button
                              onClick={() => void handleMakeDefault(prof.id)}
                              title="Make default boot network"
                              style={{
                                background: 'none',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#8e96a4',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                              }}
                            >
                              Make Default
                            </button>
                          )}
                          <button
                            onClick={() => void handleDeleteWifi(prof.id)}
                            title="Delete profile"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f87171',
                              padding: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Network Modal / Inline Form */}
                {isAddWifiOpen && (
                  <form
                    onSubmit={(e) => {
                      void handleAddWifi(e);
                    }}
                    style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      backgroundColor: '#0d1017',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 229, 255, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: '#00e5ff' }}>
                      Add Vault Network
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <input
                        type="text"
                        placeholder="Wi-Fi SSID"
                        value={newSsid}
                        onChange={(e) => setNewSsid(e.target.value)}
                        required
                        style={{
                          padding: '0.6rem 0.8rem',
                          backgroundColor: '#171b26',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          color: '#f2f4f8',
                          fontSize: '0.85rem',
                        }}
                      />
                      <input
                        type="password"
                        placeholder="Wi-Fi Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{
                          padding: '0.6rem 0.8rem',
                          backgroundColor: '#171b26',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          color: '#f2f4f8',
                          fontSize: '0.85rem',
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <input
                          id="new-default"
                          type="checkbox"
                          checked={newIsDefault}
                          onChange={(e) => setNewIsDefault(e.target.checked)}
                        />
                        <label htmlFor="new-default" style={{ fontSize: '0.78rem', color: '#8e96a4' }}>
                          Set as default boot network
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="submit"
                          disabled={isSubmittingWifi}
                          style={{
                            flex: 1,
                            padding: '0.6rem',
                            backgroundColor: '#00e5ff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          {isSubmittingWifi ? 'Encrypting...' : 'Save to Vault'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddWifiOpen(false)}
                          style={{
                            padding: '0.6rem 0.9rem',
                            backgroundColor: '#171b26',
                            color: '#8e96a4',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Notion Cloud Sync */}
              <div
                style={{
                  backgroundColor: '#11141c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <FileText size={18} style={{ color: '#00e5ff' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Notion Synchronization</h3>
                </div>

                <div
                  style={{
                    backgroundColor: '#171b26',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', color: '#8e96a4', marginBottom: '0.3rem' }}>Connection State</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: deviceData?.notionConnected ? '#22c55e' : '#8e96a4',
                      }}
                    />
                    <strong style={{ fontSize: '0.95rem' }}>
                      {deviceData?.notionConnected
                        ? `Linked to ${deviceData?.notionWorkspace || 'Workspace'}`
                        : 'Not Connected'}
                    </strong>
                  </div>
                </div>

                {deviceData?.notionConnected ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button
                      onClick={() => void handleTestNotionSync()}
                      disabled={syncTestRunning}
                      style={{
                        padding: '0.65rem',
                        backgroundColor: '#171b26',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '5px',
                        color: '#f2f4f8',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <RefreshCw size={14} className={syncTestRunning ? 'animate-spin' : ''} />
                      <span>{syncTestRunning ? 'Testing Sync...' : 'Test Sync Connection'}</span>
                    </button>

                    <button
                      onClick={() => void handleDisconnectNotion()}
                      style={{
                        padding: '0.65rem',
                        background: 'none',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '5px',
                        color: '#f87171',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      Disconnect Notion
                    </button>

                    {syncTestResult && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: syncTestResult.includes('operational') ? '#22c55e' : '#f87171',
                          marginTop: '0.4rem',
                          lineHeight: 1.4,
                        }}
                      >
                        {syncTestResult}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.82rem', color: '#8e96a4', lineHeight: 1.5, margin: '0 0 1rem' }}>
                      Authorize your Notion workspace to enable voice memos, task creation, and scratchpad sync directly from the keychain.
                    </p>
                    <button
                      onClick={() => void handleConnectNotion()}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#00e5ff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span>Connect Notion Workspace</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
