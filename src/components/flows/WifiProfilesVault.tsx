import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { apiClient } from '../../api/client';
import type { WifiProfile, WifiConnectionResult } from '../../api/types';
import {
  Wifi,
  Plus,
  Star,
  Trash2,
  Edit2,
  ShieldCheck,
  Radio,
  Mic,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
} from 'lucide-react';

export interface WifiProfilesVaultProps {
  deviceId: string;
  authToken?: string;
  onProfileChanged?: () => void;
}

export const WifiProfilesVault: React.FC<WifiProfilesVaultProps> = ({
  deviceId,
  authToken,
  onProfileChanged,
}) => {
  const [profiles, setProfiles] = useState<WifiProfile[]>([]);
  const [vaultVersion, setVaultVersion] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<WifiProfile | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSsid, setFormSsid] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getWifiProfiles(deviceId, authToken);
      if (res.success && res.data) {
        setProfiles(res.data.profiles);
        setVaultVersion(res.data.vaultVersion);
      } else {
        setErrorMessage(res.error?.message || 'Failed to load Wi-Fi profile vault.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error loading profiles.');
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, authToken]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleOpenAddModal = () => {
    setFormName(`Network ${profiles.length + 1}`);
    setFormSsid('');
    setFormPassword('');
    setFormIsDefault(profiles.length === 0);
    setShowPassword(false);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (profile: WifiProfile) => {
    setSelectedProfile(profile);
    setFormName(profile.name);
    setFormSsid(profile.ssid);
    setFormPassword('');
    setFormIsDefault(profile.isDefault);
    setShowPassword(false);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (profile: WifiProfile) => {
    setSelectedProfile(profile);
    setIsDeleteModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSsid.trim()) {
      setFormError('SSID is required.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await apiClient.createWifiProfile(
        deviceId,
        {
          name: formName.trim() || formSsid.trim(),
          ssid: formSsid.trim(),
          password: formPassword || undefined,
          isDefault: formIsDefault,
        },
        authToken
      );
      if (res.success) {
        setIsAddModalOpen(false);
        await fetchProfiles();
        if (onProfileChanged) onProfileChanged();
      } else {
        setFormError(res.error?.message || 'Failed to create Wi-Fi profile.');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    if (!formSsid.trim()) {
      setFormError('SSID is required.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await apiClient.updateWifiProfile(
        deviceId,
        selectedProfile.id,
        {
          name: formName.trim() || formSsid.trim(),
          ssid: formSsid.trim(),
          password: formPassword || undefined,
          isDefault: formIsDefault,
        },
        authToken
      );
      if (res.success) {
        setIsEditModalOpen(false);
        await fetchProfiles();
        if (onProfileChanged) onProfileChanged();
      } else {
        setFormError(res.error?.message || 'Failed to update Wi-Fi profile.');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error updating profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProfile) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.deleteWifiProfile(deviceId, selectedProfile.id, authToken);
      if (res.success) {
        setIsDeleteModalOpen(false);
        await fetchProfiles();
        if (onProfileChanged) onProfileChanged();
      } else {
        alert(res.error?.message || 'Failed to delete profile.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakeDefault = async (profileId: string) => {
    try {
      const res = await apiClient.makeDefaultWifiProfile(deviceId, profileId, authToken);
      if (res.success) {
        await fetchProfiles();
        if (onProfileChanged) onProfileChanged();
      } else {
        alert(res.error?.message || 'Failed to set default profile.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error setting default profile.');
    }
  };

  const renderResultBadge = (result: WifiConnectionResult, attemptedAt: string | null, rssi: number | null) => {
    switch (result) {
      case 'connected':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Badge variant="online">Verified Online</Badge>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {rssi ? `${rssi} dBm` : 'Connected'}
              {attemptedAt && ` • ${new Date(attemptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
        );
      case 'pending':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Badge variant="warning">Pending Verification</Badge>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Awaiting ESP32 Heartbeat
            </span>
          </div>
        );
      case 'auth_failed':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Badge variant="offline">Auth Failed</Badge>
            <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
              Check router password
            </span>
          </div>
        );
      case 'not_found':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Badge variant="offline">SSID Not Found</Badge>
            <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
              2.4GHz range check
            </span>
          </div>
        );
      case 'timeout':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Badge variant="offline">Timeout</Badge>
            <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
              Router unresponsive
            </span>
          </div>
        );
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <Card glow={profiles.some((p) => p.isDefault)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Wifi size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Wi-Fi Profile Vault
              </h3>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.72rem',
                  color: profiles.length >= 5 ? '#f59e0b' : 'var(--accent-cyan)',
                  fontWeight: 600,
                }}
              >
                {profiles.length}/5 Profiles
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Encrypted credentials stored on cloud vault and synced over TLS to ESP32-C3 hardware.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={fetchProfiles}
              disabled={isLoading}
              title="Refresh profiles from backend"
              aria-label="Refresh profiles"
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '0.4rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
            </button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddModal}
              disabled={profiles.length >= 5}
              leftIcon={<Plus size={15} />}
            >
              Add Profile
            </Button>
          </div>
        </div>

        {/* Security & Hardware Truth Banner */}
        <div
          style={{
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.22)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            <ShieldCheck size={16} />
            <span>Encrypted at Rest • Verified Directly by Physical Hardware</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Passwords are encrypted server-side with AES-256-GCM envelope encryption and are <strong>never returned to browser storage or UI responses</strong>. The NOVA keychain pulls updated profiles (vault v{vaultVersion}) over TLS and authenticates directly against your router.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            <Mic size={13} color="var(--accent-cyan)" />
            <span>
              Voice Switching: Say <strong>"Hi ESP, connect to network one"</strong> (or network two..five).
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            style={{
              background: 'var(--status-error-dim)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              color: '#fca5a5',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profiles List */}
        {isLoading && profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            <RefreshCw size={20} className="spinner" style={{ margin: '0 auto 0.5rem' }} />
            Loading profile vault...
          </div>
        ) : profiles.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '1.8rem 1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <Radio size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
              No Wi-Fi Profiles in Vault
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', maxWidth: '340px', margin: '0.25rem auto 1rem' }}>
              Add up to 5 Wi-Fi profiles for your home, office, or mobile hotspot. NOVA will boot to the default profile and switch on voice command.
            </p>
            <Button variant="secondary" size="sm" onClick={handleOpenAddModal} leftIcon={<Plus size={14} />}>
              Add First Wi-Fi Profile
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {profiles.map((profile) => (
              <div
                key={profile.id}
                style={{
                  background: profile.isDefault ? 'rgba(0, 242, 254, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${profile.isDefault ? 'rgba(0, 242, 254, 0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                {/* Profile Top Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-cyan)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      Slot {profile.slotNumber} • "{profile.voiceSlot}"
                    </span>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {profile.name}
                    </h4>

                    {profile.isDefault && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          borderRadius: 'var(--radius-full)',
                          padding: '0.15rem 0.55rem',
                          fontSize: '0.7rem',
                          color: '#34d399',
                          fontWeight: 600,
                        }}
                      >
                        <Star size={10} fill="#34d399" />
                        Boot Default
                      </span>
                    )}
                  </div>

                  {renderResultBadge(profile.lastConnectionResult, profile.lastAttemptedAt, profile.lastRssi)}
                </div>

                {/* Profile Details Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      SSID: <strong style={{ color: 'var(--text-primary)' }}>{profile.ssid}</strong> (2.4GHz)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Password: {profile.hasPassword ? '•••••••• (Encrypted at rest)' : 'None (Open)'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {!profile.isDefault && (
                      <button
                        onClick={() => handleMakeDefault(profile.id)}
                        title="Set as boot default network"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.3rem 0.6rem',
                          color: 'var(--text-secondary)',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Star size={12} />
                        <span>Make Default</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(profile)}
                      title="Edit profile"
                      aria-label="Edit profile"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.5rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => handleOpenDeleteModal(profile)}
                      title="Delete profile"
                      aria-label="Delete profile"
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.5rem',
                        color: '#f87171',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Offline & SoftAP Recovery Protocol Information */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Info size={14} color="var(--accent-cyan)" />
            <span>Hardware Boot & Local SoftAP Recovery Protocol:</span>
          </div>
          <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>
              On boot, the ESP32-C3 attempts connection <strong>only to the Default Profile</strong>.
            </li>
            <li>
              If connected, OLED indicates Wi-Fi link and NOVA delivers heartbeats.
            </li>
            <li>
              If connection fails, the device remains offline safely without wiping credentials or Notion authorization. Say <strong>"Hi ESP, connect to network two"</strong> to switch slots.
            </li>
            <li>
              If no saved profiles connect, NOVA starts its local recovery SoftAP at <strong>192.168.4.1</strong> with zero data loss.
            </li>
          </ol>
        </div>
      </div>

      {/* Add Profile Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Wi-Fi Profile"
        description="Add a 2.4GHz network to your NOVA keychain profile vault (maximum 5 profiles)."
      >
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.5rem' }}>
          {formError && (
            <div style={{ padding: '0.5rem 0.75rem', background: 'var(--status-error-dim)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.8rem' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Profile Name (Display Label)
            </label>
            <input
              type="text"
              placeholder="e.g. Home, Studio, Hotspot"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
              maxLength={32}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              2.4GHz Wi-Fi SSID
            </label>
            <input
              type="text"
              placeholder="Router Network Name"
              value={formSsid}
              onChange={(e) => setFormSsid(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
              required
              maxLength={32}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
              NOVA hardware supports 2.4GHz Wi-Fi only (802.11 b/g/n).
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Wi-Fi Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (leave empty if open network)"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', paddingRight: '2.5rem' }}
                maxLength={64}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldCheck size={12} />
              Envelope-encrypted at rest. Never displayed again after save.
            </span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            <input
              type="checkbox"
              checked={formIsDefault}
              onChange={(e) => setFormIsDefault(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Set as Default Boot Network (NOVA connects to this automatically on power-on)</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.6rem' }}>
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting} leftIcon={<CheckCircle2 size={15} />}>
              Save Profile to Vault
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Wi-Fi Profile"
        description="Update profile settings or set a new password."
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.5rem' }}>
          {formError && (
            <div style={{ padding: '0.5rem 0.75rem', background: 'var(--status-error-dim)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.8rem' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Profile Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
              maxLength={32}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              2.4GHz Wi-Fi SSID
            </label>
            <input
              type="text"
              value={formSsid}
              onChange={(e) => setFormSsid(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
              required
              maxLength={32}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Update Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Leave blank to keep existing encrypted password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', paddingRight: '2.5rem' }}
                maxLength={64}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Stored passwords cannot be read back by design. Enter a new password only if changing routers.
            </span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            <input
              type="checkbox"
              checked={formIsDefault}
              onChange={(e) => setFormIsDefault(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Set as Default Boot Network</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.6rem' }}>
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting} leftIcon={<CheckCircle2 size={15} />}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Wi-Fi Profile"
        description="Are you sure you want to remove this Wi-Fi network from NOVA's profile vault?"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            Removing <strong>"{selectedProfile?.name}"</strong> (SSID: <code>{selectedProfile?.ssid}</code>) will recompact remaining profile voice slots (1 through {Math.max(1, profiles.length - 1)}).
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm} isLoading={isSubmitting} leftIcon={<Trash2 size={14} />}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
