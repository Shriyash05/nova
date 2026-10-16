import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; name?: string | null; avatar_url?: string | null }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
      };
    };
  }
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const activeClientId = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '').trim();

  const [loading, setLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const handleCredentialResponse = React.useCallback(
    async (response: { credential: string }) => {
      if (!response.credential) {
        setErrorMsg('No credential returned by Google Identity Services.');
        return;
      }

      setLoading(true);
      setErrorMsg('');

      try {
        const res = await apiClient.loginWithGoogle({
          credential: response.credential,
        });

        if (res.success && res.data?.user) {
          onSuccess(res.data.user);
          onClose();
        } else {
          setErrorMsg(res.error?.message || 'Google token verification failed on server.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error during Google authentication.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onClose]
  );

  // Check for window.google script availability
  useEffect(() => {
    if (!isOpen) return;

    let checkInterval: ReturnType<typeof setInterval>;
    if (window.google?.accounts?.id) {
      const timer = setTimeout(() => setGsiReady(true), 0);
      return () => clearTimeout(timer);
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          setGsiReady(true);
          clearInterval(checkInterval);
        }
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isOpen]);

  // Initialize and render real Google Identity Services button
  useEffect(() => {
    if (!isOpen || !gsiReady || !activeClientId || !googleButtonRef.current) {
      return;
    }

    try {
      window.google!.accounts.id.initialize({
        client_id: activeClientId,
        callback: handleCredentialResponse,
        cancel_on_tap_outside: false,
      });

      googleButtonRef.current.innerHTML = '';

      window.google!.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize Google Sign-In SDK';
      setTimeout(() => setErrorMsg(msg), 0);
    }
  }, [isOpen, gsiReady, activeClientId, handleCredentialResponse]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-auth-title"
    >
      <div
        className="modal-window"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          border: '3px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '460px',
          width: '92%',
          padding: '2.25rem 2rem',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '2.2rem',
            height: '2.2rem',
            borderRadius: 'var(--radius-sm)',
            border: '2px solid #000',
            backgroundColor: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '2px 2px 0px #000',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000',
              boxShadow: '3px 3px 0px #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.1rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>

          <h2
            id="google-auth-title"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.75rem',
              fontWeight: 900,
              color: '#000000',
              letterSpacing: '-0.03em',
              marginBottom: '0.4rem',
            }}
          >
            Google Account Sign-In
          </h2>

          <p style={{ color: '#555', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
            Sign in with your verified Google account to persist and sync your paired NOVA keychain devices.
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: '#FFF0F0',
              border: '2px solid #E02424',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              color: '#C81E1E',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading State during Server Verification */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              gap: '0.75rem',
            }}
          >
            <Loader2 size={32} className="spin-animate" color="#000" />
            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>
              Verifying Google ID Token with Identity Provider...
            </span>
          </div>
        )}

        {/* Real Google Button Container */}
        {!loading && activeClientId && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div
              ref={googleButtonRef}
              style={{
                minHeight: '44px',
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}
            />

            {!gsiReady && (
              <div style={{ fontSize: '0.85rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Loader2 size={14} className="spin-animate" />
                <span>Connecting to Google Identity Services...</span>
              </div>
            )}
          </div>
        )}

        {/* Notice if VITE_GOOGLE_CLIENT_ID is not configured in environment */}
        {!loading && !activeClientId && (
          <div
            style={{
              backgroundColor: 'var(--bg-card-cream)',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: 'var(--radius-sm)',
              padding: '1.25rem',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#FF9F1C', marginBottom: '0.5rem' }}>
              <Sparkles size={16} />
              <strong style={{ color: '#000', fontSize: '0.95rem' }}>OAuth Client Deployment</strong>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#555', margin: '0 0 1rem', lineHeight: 1.5 }}>
              Google Sign-In is configured via Vercel environment variables (<code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', backgroundColor: '#EEE', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>VITE_GOOGLE_CLIENT_ID</code>).
            </p>
            <div style={{ fontSize: '0.8rem', color: '#777' }}>
              Add your Google Cloud Web Client ID in the Vercel Dashboard to activate for all visitors.
            </div>
          </div>
        )}

        {/* Security & Compliance Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', marginTop: '1.75rem', color: '#666', fontSize: '0.78rem' }}>
          <ShieldCheck size={14} color="#00B894" />
          <span>Official Google Identity Services (GIS) • Cryptographically Verified</span>
        </div>
      </div>
    </div>
  );
};
