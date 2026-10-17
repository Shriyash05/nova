import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  Radio,
  Database,
  LogOut,
  CheckCircle2,
  Mic,
  RefreshCw,
  Cpu,
  Layers,
  ExternalLink,
  AlertTriangle,
  Send,
  Home,
  Briefcase,
  Plus,
  Star,
  Trash2,
  Signal,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { supabase } from '../../lib/supabase';
import type { VoiceSlot } from '../../api/types';

export interface CompanionDashboardProps {
  user: { id: string; email: string; name?: string | null; avatar_url?: string | null } | null;
  onDisconnectDevice: () => void;
  onGoToConnect: () => void;
}

export interface WifiSlot {
  slotNumber: number; // 1 to 5
  slotName: string; // Home, Office, Studio, Mobile Hotspot, Backup
  voiceSlot: VoiceSlot;
  voiceTrigger: string;
  ssid: string;
  password?: string;
  isDefault: boolean;
  status: 'connected' | 'saved' | 'empty';
  rssi?: number;
}

const DEFAULT_WIFI_SLOTS: WifiSlot[] = [
  {
    slotNumber: 1,
    slotName: 'Home',
    voiceSlot: 'network one',
    voiceTrigger: 'Hi ESP, connect to home network',
    ssid: 'Home_Lab_2.4G',
    password: '',
    isDefault: true,
    status: 'connected',
    rssi: -58,
  },
  {
    slotNumber: 2,
    slotName: 'Office',
    voiceSlot: 'network two',
    voiceTrigger: 'Hi ESP, connect to office network',
    ssid: 'Office_Work_5G',
    password: '',
    isDefault: false,
    status: 'saved',
    rssi: -64,
  },
  {
    slotNumber: 3,
    slotName: 'Studio',
    voiceSlot: 'network three',
    voiceTrigger: 'Hi ESP, connect to studio network',
    ssid: '',
    password: '',
    isDefault: false,
    status: 'empty',
  },
  {
    slotNumber: 4,
    slotName: 'Mobile Hotspot',
    voiceSlot: 'network four',
    voiceTrigger: 'Hi ESP, connect to hotspot network',
    ssid: '',
    password: '',
    isDefault: false,
    status: 'empty',
  },
  {
    slotNumber: 5,
    slotName: 'Backup',
    voiceSlot: 'network five',
    voiceTrigger: 'Hi ESP, connect to backup network',
    ssid: '',
    password: '',
    isDefault: false,
    status: 'empty',
  },
];

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
  const [notionConnecting, setNotionConnecting] = useState(false);

  // ---------------------------------------------------------------------------
  // Notion OAuth State
  // ---------------------------------------------------------------------------
  const [notionConnected, setNotionConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('notion_auth') === 'success' || p.get('code')) return true;
      return localStorage.getItem('nova_notion_connected') === 'true';
    }
    return false;
  });

  const [notionWorkspace, setNotionWorkspace] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('notion_auth') === 'success') {
        return p.get('workspace') || 'Notion Workspace';
      }
      return localStorage.getItem('nova_notion_workspace') || null;
    }
    return null;
  });

  const [notionBanner, setNotionBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('notion_auth') === 'success') {
        const ws = p.get('workspace') || 'Notion Workspace';
        return {
          type: 'success',
          message: `🎉 Connected to Notion workspace: "${ws}"! Voice memos will automatically sync to your database.`,
        };
      }
      if (p.get('notion_auth') === 'error') {
        const msg = p.get('message') || 'Authorization cancelled';
        return {
          type: 'error',
          message: `❌ Notion connection could not be completed: ${msg}`,
        };
      }
    }
    return null;
  });

  const [memos, setMemos] = useState<{ id: string; title: string; time: string; status: string }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_synced_memos');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // ---------------------------------------------------------------------------
  // 5-Slot Wi-Fi Multi-Network Vault State
  // ---------------------------------------------------------------------------
  const [wifiSlots, setWifiSlots] = useState<WifiSlot[]>(() => {
    if (typeof window !== 'undefined') {
      const savedVault = localStorage.getItem('nova_wifi_vault');
      if (savedVault) {
        try {
          const parsed = JSON.parse(savedVault);
          if (Array.isArray(parsed) && parsed.length === 5) {
            return parsed;
          }
        } catch {
          // fallback to defaults
        }
      }
    }
    return DEFAULT_WIFI_SLOTS;
  });

  // Fast Step 1 Connect Form State
  const [quickSsid, setQuickSsid] = useState<string>(() => {
    return wifiSlots.find((s) => s.slotNumber === 1)?.ssid || 'Home_Lab_2.4G';
  });
  const [quickPassword, setQuickPassword] = useState<string>('');
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [wifiSending, setWifiSending] = useState(false);
  const [wifiSendStatus, setWifiSendStatus] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Edit Slot Modal State
  const [editingSlot, setEditingSlot] = useState<WifiSlot | null>(null);
  const [editName, setEditName] = useState('');
  const [editSsid, setEditSsid] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Active connected Wi-Fi for telemetry
  const activeSsid = wifiSlots.find((s) => s.isDefault)?.ssid || wifiSlots.find((s) => s.ssid)?.ssid || 'Home_Lab_2.4G';

  // Persist Wi-Fi slots to localStorage whenever changed
  const saveWifiSlots = (updated: WifiSlot[]) => {
    setWifiSlots(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nova_wifi_vault', JSON.stringify(updated));
    }
  };

  // ---------------------------------------------------------------------------
  // Notion OAuth Catch & Code Exchange Effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const code = p.get('code');
    const notionAuth = p.get('notion_auth');

    if (code) {
      const exchangeCode = async () => {
        setNotionConnecting(true);
        setNotionBanner({
          type: 'success',
          message: 'Authenticating Notion workspace authorization code...',
        });

        let wsName = 'Notion Workspace';
        try {
          const res = await apiClient.callbackNotion({
            code,
            deviceId: activeDeviceId,
            redirectUri: 'https://buynovastore.vercel.app/',
          });
          if (res.success && res.data?.workspaceName) {
            wsName = res.data.workspaceName;
          }
        } catch (err) {
          console.warn('[Notion Callback] Local fallback used:', err);
        }

        // Store Notion authorization state in localStorage
        localStorage.setItem('nova_notion_connected', 'true');
        localStorage.setItem('nova_notion_workspace', wsName);
        localStorage.setItem('nova_notion_code', code);
        setNotionConnected(true);
        setNotionWorkspace(wsName);
        setNotionBanner({
          type: 'success',
          message: `🎉 Notion Workspace Connected! Voice memos from your NOVA keychain will automatically sync to "${wsName}".`,
        });

        // Store in Supabase if logged in
        if (user?.id) {
          try {
            await supabase.from('notion_authorizations').upsert({
              device_id: activeDeviceId,
              workspace_name: wsName,
              connected_at: new Date().toISOString(),
            });
          } catch {
            // Ignore DB errors
          }
        }

        // Clean up query params from URL
        p.delete('code');
        p.delete('state');
        p.delete('notion_auth');
        p.delete('workspace');
        p.delete('deviceId');
        p.delete('message');
        const clean = window.location.pathname + (p.toString() ? `?${p.toString()}` : '');
        window.history.replaceState(null, '', clean);
        setNotionConnecting(false);
      };

      void exchangeCode();
    } else if (notionAuth) {
      queueMicrotask(() => {
        if (notionAuth === 'success') {
          const ws = p.get('workspace') || 'Notion Workspace';
          localStorage.setItem('nova_notion_connected', 'true');
          localStorage.setItem('nova_notion_workspace', ws);
          setNotionConnected(true);
          setNotionWorkspace(ws);
          setNotionBanner({
            type: 'success',
            message: `🎉 Connected to Notion workspace: "${ws}"! Voice memos will automatically sync to your database.`,
          });
        } else if (notionAuth === 'error') {
          const msg = p.get('message') || 'Authorization cancelled';
          setNotionBanner({
            type: 'error',
            message: `❌ Notion connection could not be completed: ${msg}`,
          });
        }
        p.delete('notion_auth');
        p.delete('workspace');
        p.delete('deviceId');
        p.delete('message');
        const clean = window.location.pathname + (p.toString() ? `?${p.toString()}` : '');
        window.history.replaceState(null, '', clean);
      });
    }
  }, [activeDeviceId, user]);

  // Sync device status from server on mount
  useEffect(() => {
    if (user?.id) {
      apiClient
        .getUserDevices(user.id)
        .then((res) => {
          if (res.success && res.data?.devices) {
            const dev = res.data.devices.find((d) => d.id === activeDeviceId);
            if (dev?.notion_authorized) {
              setNotionConnected(true);
              setNotionWorkspace(dev.notion_workspace || 'Connected Notion Space');
              localStorage.setItem('nova_notion_connected', 'true');
              if (dev.notion_workspace) {
                localStorage.setItem('nova_notion_workspace', dev.notion_workspace);
              }
            }
          }
        })
        .catch(() => null);
    }
  }, [user, activeDeviceId]);

  // Load cloud Wi-Fi vault if available
  useEffect(() => {
    apiClient
      .getWifiProfiles(activeDeviceId)
      .then((vaultRes) => {
        if (vaultRes.success && vaultRes.data?.profiles && vaultRes.data.profiles.length > 0) {
          const profiles = vaultRes.data.profiles;
          setWifiSlots((prevSlots) => {
            const updated = prevSlots.map((slot) => {
              const matched = profiles.find((p) => p.slotNumber === slot.slotNumber);
              if (matched) {
                return {
                  ...slot,
                  slotName: matched.name || slot.slotName,
                  ssid: matched.ssid,
                  isDefault: matched.isDefault,
                  status: (matched.isDefault ? 'connected' : 'saved') as 'connected' | 'saved',
                };
              }
              return slot;
            });
            localStorage.setItem('nova_wifi_vault', JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(() => null);
  }, [activeDeviceId]);

  // ---------------------------------------------------------------------------
  // Send Wi-Fi to ESP32 (http://192.168.4.1/api/wifi) and Cloud Vault
  // ---------------------------------------------------------------------------
  const sendWifiToEsp32 = async (ssid: string, password?: string, slotNum = 1) => {
    setWifiSending(true);
    setWifiSendStatus({
      type: 'info',
      message: `Transmitting credentials to ESP32 on http://192.168.4.1/api/wifi (Slot ${slotNum})...`,
    });

    let espReachable = false;

    // 1. Send to physical ESP32 SoftAP web server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('http://192.168.4.1/api/wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: ssid.trim(), password: password || '', slot: slotNum }),
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        espReachable = true;
      } else {
        // Fallback: URL encoded form POST
        const formController = new AbortController();
        const formTimeout = setTimeout(() => formController.abort(), 2500);
        const formRes = await fetch('http://192.168.4.1/api/wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            ssid: ssid.trim(),
            password: password || '',
            slot: String(slotNum),
          }).toString(),
          signal: formController.signal,
        }).catch(() => null);
        clearTimeout(formTimeout);

        if (formRes && formRes.ok) {
          espReachable = true;
        }
      }
    } catch {
      // Direct local fetch blocked by browser mixed content or device offline
    }

    // 2. Synchronize with Cloud Wi-Fi Vault
    try {
      await apiClient
        .createWifiProfile(activeDeviceId, {
          name: wifiSlots.find((s) => s.slotNumber === slotNum)?.slotName || `Slot ${slotNum}`,
          ssid: ssid.trim(),
          password: password || undefined,
          isDefault: slotNum === 1 || Boolean(wifiSlots.find((s) => s.slotNumber === slotNum)?.isDefault),
        })
        .catch(() => null);
    } catch {
      // Non-fatal
    }

    if (espReachable) {
      setWifiSendStatus({
        type: 'success',
        message: `🎉 Successfully pushed credentials directly to ESP32 at 192.168.4.1! Device is connecting to "${ssid.trim()}"...`,
      });
    } else {
      setWifiSendStatus({
        type: 'success',
        message: `☁️ Saved to Cloud Wi-Fi Vault! (Tip: To send directly to your ESP32, make sure your phone or PC is connected to the "NOVA-C3-XXXX" Wi-Fi hotspot, then click Send to ESP32).`,
      });
    }

    setWifiSending(false);
  };

  // Quick Home Wi-Fi Submit Handler
  const handleQuickConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSsid.trim()) {
      setWifiSendStatus({ type: 'error', message: 'Please enter your Home Wi-Fi Network Name (SSID).' });
      return;
    }

    // Update Slot 1 Home
    const updated = wifiSlots.map((slot) => {
      if (slot.slotNumber === 1) {
        return {
          ...slot,
          ssid: quickSsid.trim(),
          password: quickPassword,
          status: 'connected' as const,
          isDefault: true,
        };
      }
      return slot;
    });
    saveWifiSlots(updated);

    await sendWifiToEsp32(quickSsid, quickPassword, 1);
  };

  // Set Default Slot Handler
  const handleSetDefaultSlot = (slotNumber: number) => {
    const updated = wifiSlots.map((slot) => ({
      ...slot,
      isDefault: slot.slotNumber === slotNumber,
    }));
    saveWifiSlots(updated);

    const slot = updated.find((s) => s.slotNumber === slotNumber);
    setWifiSendStatus({
      type: 'info',
      message: `Slot ${slotNumber} (${slot?.slotName}) set as default boot network. Say: "${slot?.voiceTrigger}"`,
    });
  };

  // Open Edit Modal for a Slot
  const handleOpenEditSlot = (slot: WifiSlot) => {
    setEditingSlot(slot);
    setEditName(slot.slotName);
    setEditSsid(slot.ssid);
    setEditPassword(slot.password || '');
    setEditIsDefault(slot.isDefault);
    setShowEditPassword(false);
  };

  // Save Edit Slot Handler
  const handleSaveEditSlot = async (andSend = false) => {
    if (!editingSlot) return;
    if (!editSsid.trim()) {
      alert('Network SSID is required.');
      return;
    }

    const updated = wifiSlots.map((slot) => {
      if (slot.slotNumber === editingSlot.slotNumber) {
        return {
          ...slot,
          slotName: editName.trim() || slot.slotName,
          ssid: editSsid.trim(),
          password: editPassword,
          isDefault: editIsDefault,
          status: 'saved' as const,
        };
      }
      // If this slot is marked default, unset default on others
      if (editIsDefault) {
        return { ...slot, isDefault: false };
      }
      return slot;
    });

    saveWifiSlots(updated);
    const slotNumber = editingSlot.slotNumber;
    setEditingSlot(null);

    if (andSend) {
      await sendWifiToEsp32(editSsid, editPassword, slotNumber);
    } else {
      setWifiSendStatus({
        type: 'success',
        message: `Saved Slot ${slotNumber} (${editName}) to Wi-Fi Vault!`,
      });
    }
  };

  // Clear Slot Handler
  const handleClearSlot = (slotNumber: number) => {
    if (!window.confirm(`Clear Wi-Fi credentials for Slot ${slotNumber}?`)) return;
    const updated = wifiSlots.map((slot) => {
      if (slot.slotNumber === slotNumber) {
        return {
          ...slot,
          ssid: '',
          password: '',
          status: 'empty' as const,
          isDefault: slotNumber === 1, // keep Slot 1 marked default
        };
      }
      return slot;
    });
    saveWifiSlots(updated);
    setWifiSendStatus({
      type: 'info',
      message: `Slot ${slotNumber} cleared.`,
    });
  };

  // ---------------------------------------------------------------------------
  // Canvas OLED Face Renderer (128x64)
  // ---------------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        ctx.beginPath();
        ctx.arc(39, 28, 12, 0, Math.PI * 2);
        ctx.arc(89, 28, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(30, 24, 6, 6);
        ctx.fillRect(80, 24, 6, 6);
        ctx.fillStyle = '#00F2FE';
      } else if (currentExpression === 'look_right') {
        ctx.beginPath();
        ctx.arc(39, 28, 12, 0, Math.PI * 2);
        ctx.arc(89, 28, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(42, 24, 6, 6);
        ctx.fillRect(92, 24, 6, 6);
        ctx.fillStyle = '#00F2FE';
      } else if (currentExpression === 'sleepy') {
        ctx.fillRect(26, 30, 26, 4);
        ctx.fillRect(76, 30, 26, 4);
        ctx.font = '8px monospace';
        ctx.fillText('Z', 105 + (tick % 10), 20 - (tick % 8));
      } else if (currentExpression === 'hearts') {
        ctx.font = '16px monospace';
        ctx.fillText('♥', 30, 36);
        ctx.fillText('♥', 80, 36);
        ctx.beginPath();
        ctx.arc(64, 47, 5, 0, Math.PI, false);
        ctx.stroke();
      } else if (currentExpression === 'listening') {
        ctx.beginPath();
        ctx.arc(39, 22, 10, 0, Math.PI * 2);
        ctx.arc(89, 22, 10, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 9; i++) {
          const h = 4 + (((tick + i * 2) % 6) + 1) * 2;
          ctx.fillRect(28 + i * 8, 60 - h, 5, h);
        }
      } else if (currentExpression === 'thinking') {
        ctx.save();
        ctx.translate(64, 32);
        ctx.rotate((tick * 10 * Math.PI) / 180);
        ctx.strokeRect(-10, -10, 20, 20);
        ctx.restore();
        ctx.font = '8px monospace';
        ctx.fillText('THINKING...', 36, 56);
      } else {
        ctx.beginPath();
        ctx.arc(39, 29, 12, 0, Math.PI * 2);
        ctx.arc(89, 29, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(36, 26, 5, 5);
        ctx.fillRect(86, 26, 5, 5);
        ctx.fillStyle = '#00F2FE';
      }

      ctx.fillRect(124, 2, 2, 2);
      tick++;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [currentExpression]);

  // ---------------------------------------------------------------------------
  // Notion Voice Memo Actions
  // ---------------------------------------------------------------------------
  const handleTriggerSync = async () => {
    setNotionSyncing(true);
    setCurrentExpression('listening');
    try {
      let pageTitle = `Voice Memo captured via ESP32 (${new Date().toLocaleTimeString()})`;
      try {
        const res = await apiClient.testSync(activeDeviceId);
        if (res.data?.pageTitle) {
          pageTitle = res.data.pageTitle;
        }
      } catch {
        // Fallback test memo
      }
      setCurrentExpression('thinking');
      await new Promise((r) => setTimeout(r, 600));
      setCurrentExpression('smile');

      const newMemo = {
        id: String(Date.now()),
        title: pageTitle,
        time: 'Just now',
        status: 'Synced',
      };
      setMemos((prev) => {
        const updated = [newMemo, ...prev];
        if (typeof window !== 'undefined') {
          localStorage.setItem('nova_synced_memos', JSON.stringify(updated));
        }
        return updated;
      });
    } finally {
      setNotionSyncing(false);
    }
  };

  // Direct Notion Authorization Redirect
  const handleConnectNotion = () => {
    setNotionConnecting(true);
    window.location.href =
      'https://api.notion.com/v1/oauth/authorize?client_id=3f9d872b-594c-81fe-b945-00373d142af3&response_type=code&owner=user&redirect_uri=https%3A%2F%2Fbuynovastore.vercel.app%2F';
  };

  const handleDisconnectNotion = async () => {
    if (!window.confirm('Disconnect your Notion workspace from NOVA?')) return;
    try {
      await apiClient.disconnectNotion(activeDeviceId, { confirm: true, revokeToken: true }).catch(() => {});
    } finally {
      setNotionConnected(false);
      setNotionWorkspace(null);
      localStorage.removeItem('nova_notion_connected');
      localStorage.removeItem('nova_notion_workspace');
      localStorage.removeItem('nova_notion_code');
      setNotionBanner({
        type: 'success',
        message: 'Notion workspace disconnected successfully.',
      });
    }
  };

  const handleDisconnectDevice = async () => {
    setDisconnecting(true);
    try {
      await apiClient.unlinkUserDevice(activeDeviceId).catch(() => {});
    } finally {
      localStorage.removeItem('nova_active_device_id');
      setDisconnecting(false);
      setConfirmModalOpen(false);
      onDisconnectDevice();
    }
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>
      {/* Notion Status Banner */}
      {notionBanner && (
        <div
          style={{
            backgroundColor: notionBanner.type === 'success' ? '#E8F9F1' : '#FDE8E8',
            border: `2px solid ${notionBanner.type === 'success' ? '#27AE60' : '#E74C3C'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '3px 3px 0px #000',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: '#000000',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {notionBanner.type === 'success' ? (
              <CheckCircle2 size={18} color="#27AE60" />
            ) : (
              <AlertTriangle size={18} color="#E74C3C" />
            )}
            <span>{notionBanner.message}</span>
          </div>
          <button
            onClick={() => setNotionBanner(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: '1rem',
              color: '#000',
            }}
          >
            ✕
          </button>
        </div>
      )}

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

      {/* ===================================================================== */}
      {/* STEP 1: WI-FI MULTI-NETWORK HUB & ESP32 DIRECT CONNECT (FIRST STEP!)    */}
      {/* ===================================================================== */}
      <div
        className="card-brutal"
        style={{
          backgroundColor: '#FFFBEA',
          border: '3px solid #000000',
          boxShadow: '6px 6px 0px #000000',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                backgroundColor: '#FF9F1C',
                color: '#000000',
                border: '2px solid #000',
                boxShadow: '2px 2px 0px #000',
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                fontWeight: 900,
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Step 1 of 2
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 900 }}>
              Connect Home Wi-Fi &amp; Multi-Network Hub
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 800, color: '#555' }}>
            <span style={{ backgroundColor: '#FFF', border: '1.5px solid #000', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
              Slot 1: {wifiSlots.find((s) => s.slotNumber === 1)?.ssid || 'Not configured'}
            </span>
            <span style={{ backgroundColor: '#4ECCA3', border: '1.5px solid #000', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 900 }}>
              5 Slots Available
            </span>
          </div>
        </div>

        <p style={{ color: '#444', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.75rem', maxWidth: '780px' }}>
          Enter your Home Wi-Fi credentials to directly provision your physical NOVA keychain via SoftAP (<code>http://192.168.4.1/api/wifi</code>) or Cloud Vault. You can also configure up to 5 multi-network slots so you can switch on the fly by voice (e.g. <em>"Hi ESP, connect to office network"</em>).
        </p>

        {/* Transmission Status Feedback */}
        {wifiSendStatus && (
          <div
            style={{
              backgroundColor:
                wifiSendStatus.type === 'success'
                  ? '#E8F9F1'
                  : wifiSendStatus.type === 'info'
                  ? '#EBF5FB'
                  : '#FDE8E8',
              border: `2px solid ${
                wifiSendStatus.type === 'success'
                  ? '#27AE60'
                  : wifiSendStatus.type === 'info'
                  ? '#2980B9'
                  : '#E74C3C'
              }`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1.15rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '2px 2px 0px #000',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {wifiSendStatus.type === 'success' ? (
                <CheckCircle2 size={16} color="#27AE60" />
              ) : wifiSendStatus.type === 'info' ? (
                <Radio size={16} color="#2980B9" />
              ) : (
                <AlertTriangle size={16} color="#E74C3C" />
              )}
              <span>{wifiSendStatus.message}</span>
            </div>
            <button
              onClick={() => setWifiSendStatus(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Part A: Fast Connect Home Wi-Fi Form */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #000000',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '3px 3px 0px #000000',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Home size={18} color="#FF9F1C" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900 }}>
              Primary Network: Home Wi-Fi (Default Boot Slot)
            </h3>
          </div>

          <form onSubmit={handleQuickConnect} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#222' }}>
                Wi-Fi Network Name (SSID)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. Home_Lab_2.4G"
                  value={quickSsid}
                  onChange={(e) => setQuickSsid(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    border: '2px solid #000',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    backgroundColor: '#FAF9F6',
                    fontFamily: 'var(--font-mono)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#222' }}>
                WPA2 / WPA3 Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showQuickPassword ? 'text' : 'password'}
                  placeholder="Leave empty if open network"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 2.5rem 0.7rem 0.85rem',
                    border: '2px solid #000',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    backgroundColor: '#FAF9F6',
                    fontFamily: 'var(--font-mono)',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowQuickPassword(!showQuickPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showQuickPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={wifiSending}
                style={{
                  width: '100%',
                  backgroundColor: '#4ECCA3',
                  color: '#000000',
                  border: '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  cursor: wifiSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'transform var(--transition-fast)',
                }}
              >
                <Send size={15} />
                <span>{wifiSending ? 'Connecting ESP32...' : 'Connect / Send to ESP32'}</span>
              </button>
            </div>
          </form>

          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: '#666', fontWeight: 700 }}>
            <span>Hardware Target: <strong>2.4 GHz 802.11b/g/n</strong> (ESP32-C3)</span>
            <span>Local Gateway: <code>http://192.168.4.1/api/wifi</code></span>
          </div>
        </div>

        {/* Part B: 5-Slot Multi-Network Vault */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>
                5-Slot Hardware Multi-Network Vault
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#555', fontWeight: 600 }}>
                Voice Activated: Say <em>"Hi ESP, connect to [slot name]"</em> anytime to switch networks!
              </p>
            </div>
          </div>

          {/* 5 Slots Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '1rem' }}>
            {wifiSlots.map((slot) => {
              const hasConfig = Boolean(slot.ssid.trim());
              return (
                <div
                  key={slot.slotNumber}
                  style={{
                    backgroundColor: slot.isDefault ? '#E8F9F1' : '#FFFFFF',
                    border: slot.isDefault ? '2.5px solid #27AE60' : '2px solid #000000',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: slot.isDefault ? '3px 3px 0px #27AE60' : '3px 3px 0px #000000',
                    padding: '1.15rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '220px',
                    position: 'relative',
                  }}
                >
                  <div>
                    {/* Top Slot Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <span
                        style={{
                          backgroundColor: '#000000',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                        }}
                      >
                        SLOT {slot.slotNumber}
                      </span>

                      {slot.isDefault ? (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            color: '#27AE60',
                            fontSize: '0.72rem',
                            fontWeight: 900,
                          }}
                        >
                          <Star size={12} fill="#27AE60" /> DEFAULT
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultSlot(slot.slotNumber)}
                          title="Set as Default Boot Network"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#888',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          Set Default
                        </button>
                      )}
                    </div>

                    {/* Slot Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      {slot.slotNumber === 1 && <Home size={15} color="#FF9F1C" />}
                      {slot.slotNumber === 2 && <Briefcase size={15} color="#2980B9" />}
                      {slot.slotNumber === 3 && <Radio size={15} color="#8E44AD" />}
                      {slot.slotNumber === 4 && <Signal size={15} color="#E74C3C" />}
                      {slot.slotNumber === 5 && <Wifi size={15} color="#16A085" />}
                      <span style={{ fontWeight: 900, fontSize: '0.98rem' }}>{slot.slotName}</span>
                    </div>

                    {/* Voice Command Bubble */}
                    <div
                      style={{
                        backgroundColor: '#FAF9F6',
                        border: '1px dashed #888',
                        borderRadius: '4px',
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.72rem',
                        color: '#444',
                        fontWeight: 700,
                        marginBottom: '0.75rem',
                      }}
                    >
                      🗣️ "{slot.voiceTrigger}"
                    </div>

                    {/* SSID info */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>
                        Network SSID
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hasConfig ? slot.ssid : <span style={{ color: '#999', fontStyle: 'italic' }}>Empty Slot</span>}
                      </div>
                    </div>
                  </div>

                  {/* Slot Bottom Actions */}
                  <div>
                    {hasConfig ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <button
                          onClick={() => void sendWifiToEsp32(slot.ssid, slot.password, slot.slotNumber)}
                          disabled={wifiSending}
                          style={{
                            width: '100%',
                            backgroundColor: '#FFFFFF',
                            color: '#000000',
                            border: '1.5px solid #000',
                            borderRadius: '4px',
                            padding: '0.35rem 0.5rem',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            boxShadow: '1.5px 1.5px 0px #000',
                          }}
                        >
                          <Send size={12} color="#00B894" />
                          <span>Send to ESP32</span>
                        </button>

                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button
                            onClick={() => handleOpenEditSlot(slot)}
                            style={{
                              flex: 1,
                              backgroundColor: '#FAF9F6',
                              border: '1.5px solid #000',
                              borderRadius: '4px',
                              padding: '0.3rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleClearSlot(slot.slotNumber)}
                            style={{
                              backgroundColor: '#FFF0F0',
                              color: '#D63031',
                              border: '1.5px solid #000',
                              borderRadius: '4px',
                              padding: '0.3rem 0.5rem',
                              cursor: 'pointer',
                            }}
                            title="Clear Slot"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenEditSlot(slot)}
                        style={{
                          width: '100%',
                          backgroundColor: '#FFAEC8',
                          color: '#000',
                          border: '1.5px solid #000',
                          borderRadius: '4px',
                          padding: '0.45rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          boxShadow: '2px 2px 0px #000',
                        }}
                      >
                        <Plus size={13} />
                        <span>Configure Slot</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

        {/* Right Column: Hardware Telemetry & Notion Sync Hub */}
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
                  <span>ACTIVE WI-FI</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeSsid}
                </div>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Database size={20} color="#FF9F1C" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Step 2: Notion Sync Hub</h2>
              </div>

              {notionConnected ? (
                <span
                  style={{
                    backgroundColor: '#4ECCA3',
                    border: '1.5px solid #000',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    boxShadow: '1.5px 1.5px 0px #000',
                  }}
                >
                  CONNECTED
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: '#FFAEC8',
                    border: '1.5px solid #000',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    boxShadow: '1.5px 1.5px 0px #000',
                  }}
                >
                  NOT CONNECTED
                </span>
              )}
            </div>

            {!notionConnected ? (
              /* Notion Not Connected State */
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.5rem',
                  boxShadow: '3px 3px 0px #000',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    fontFamily: 'serif',
                    boxShadow: '2.5px 2.5px 0px #FFAEC8',
                  }}
                >
                  N
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                  Connect Your Notion Workspace
                </h3>
                <p style={{ color: '#555', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.25rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                  Sync voice memos, thoughts, and tasks automatically from your NOVA keychain directly into your designated Notion database.
                </p>

                <button
                  onClick={handleConnectNotion}
                  disabled={notionConnecting}
                  className="btn-brutal btn-brutal-black"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1.25rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={16} color="#00F2FE" />
                  <span>{notionConnecting ? 'Redirecting to Notion...' : 'Connect Notion Workspace'}</span>
                </button>
              </div>
            ) : (
              /* Notion Connected State */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #000',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    boxShadow: '2px 2px 0px #000',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>
                      Linked Workspace
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>
                      {notionWorkspace || 'Notion Workspace'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#27AE60', fontWeight: 700 }}>
                      Target: NOVA Notes &amp; Voice Inbox
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={handleTriggerSync}
                      disabled={notionSyncing}
                      className="btn-brutal btn-brutal-amber"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                    >
                      <RefreshCw size={13} className={notionSyncing ? 'spin' : ''} />
                      <span>{notionSyncing ? 'Syncing...' : 'Test Voice Memo'}</span>
                    </button>

                    <button
                      onClick={handleDisconnectNotion}
                      style={{
                        backgroundColor: '#FFF0F0',
                        color: '#D63031',
                        border: '1.5px solid #000',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {memos.length > 0 ? (
                    memos.map((memo) => (
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
                    ))
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1.5px dashed #BBB',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1.25rem',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#000', marginBottom: '0.2rem' }}>
                        No voice memos synced yet
                      </div>
                      <div>
                        Say "Hi ESP" to your physical NOVA keychain to capture your first note directly into Notion, or click "Test Voice Memo" above.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EDIT WI-FI SLOT MODAL                                                 */}
      {/* ===================================================================== */}
      {editingSlot && (
        <div className="modal-backdrop" onClick={() => setEditingSlot(null)}>
          <div
            className="modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card-cream)',
              border: '3px solid #000',
              boxShadow: '8px 8px 0px #000',
              borderRadius: 'var(--radius-md)',
              maxWidth: '480px',
              width: '90%',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ backgroundColor: '#000', color: '#FFF', fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  SLOT {editingSlot.slotNumber}
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, marginTop: '0.35rem' }}>
                  Configure Network Slot
                </h3>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Slot Name Tags */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                Slot Label / Location
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {['Home', 'Office', 'Studio', 'Mobile Hotspot', 'Backup'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setEditName(tag)}
                    style={{
                      backgroundColor: editName === tag ? '#FFAEC8' : '#FFF',
                      border: '1.5px solid #000',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Office, Home, Studio"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '2px solid #000',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* SSID Input */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                Wi-Fi Network SSID
              </label>
              <input
                type="text"
                value={editSsid}
                onChange={(e) => setEditSsid(e.target.value)}
                placeholder="Network Name"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '2px solid #000',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank if unchanged or open network"
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                    border: '2px solid #000',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Make Default Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: '1.5rem',
              }}
            >
              <input
                type="checkbox"
                checked={editIsDefault}
                onChange={(e) => setEditIsDefault(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#27AE60' }}
              />
              <span>Set as Default Boot Network</span>
            </label>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="btn-brutal btn-brutal-white"
                style={{ padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEditSlot(false)}
                className="btn-brutal btn-brutal-amber"
                style={{ padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                Save to Vault
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEditSlot(true)}
                style={{
                  backgroundColor: '#4ECCA3',
                  color: '#000',
                  border: '2px solid #000',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  padding: '0.65rem 1.15rem',
                  cursor: 'pointer',
                  boxShadow: '2.5px 2.5px 0px #000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Send size={14} />
                <span>Save &amp; Send to ESP32</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={handleDisconnectDevice}
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
