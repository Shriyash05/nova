import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Loader2, Sparkles, KeyRound, ExternalLink } from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  setSupabaseAnonKey,
  getSupabaseAnonKey,
  SUPABASE_URL,
} from '../../lib/supabase';

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; name?: string | null; avatar_url?: string | null }) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [configured, setConfigured] = useState<boolean>(() => isSupabaseConfigured());
  const [anonKeyInput, setAnonKeyInput] = useState<string>(() => getSupabaseAnonKey());

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');

    const redirectUrl =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? `${window.location.origin}/`
        : 'https://buynovastore.vercel.app/';

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to launch Google Sign-In with Supabase';
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const handleSaveAnonKeyAndSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = anonKeyInput.trim();
    if (!cleanKey) {
      setErrorMsg('Please enter your Supabase anon public key.');
      return;
    }

    setSupabaseAnonKey(cleanKey);
    setConfigured(true);
    setErrorMsg('');
    await handleGoogleSignIn();
  };

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
            Sign in with Google via Supabase to securely link and manage your NOVA keychain devices.
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

        {/* Loading State during Redirect */}
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
              Redirecting to Google via Supabase Auth...
            </span>
          </div>
        )}

        {/* One-Click Sign In Button if Configured */}
        {!loading && configured && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: '2px solid #000000',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '4px 4px 0px #000000',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => setConfigured(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.8rem',
                color: '#666',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Update Supabase API Configuration
            </button>
          </div>
        )}

        {/* Setup Prompt if Anon Key is Missing */}
        {!loading && !configured && (
          <form onSubmit={handleSaveAnonKeyAndSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-card-cream)',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#FF9F1C', marginBottom: '0.4rem' }}>
                <Sparkles size={16} />
                <strong style={{ color: '#000', fontSize: '0.9rem' }}>Supabase Project Connected</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#555', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                Project URL: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{SUPABASE_URL}</code>
              </p>
              <p style={{ fontSize: '0.82rem', color: '#555', margin: 0, lineHeight: 1.4 }}>
                Callback URL: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', wordBreak: 'break-all' }}>{SUPABASE_URL}/auth/v1/callback</code>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#000', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <KeyRound size={14} />
                <span>Supabase Anon Public Key:</span>
              </label>
              <input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKeyInput}
                onChange={(e) => setAnonKeyInput(e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '2px solid #000',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: '#FAFAFA',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.78rem', color: '#666' }}>
                Found in your Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ API $\rightarrow$ Project API keys (anon public).
                You can also add it permanently as <code style={{ fontFamily: 'var(--font-mono)' }}>VITE_SUPABASE_ANON_KEY</code> in Vercel.
              </span>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                backgroundColor: '#FF6B6B',
                color: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '4px 4px 0px #000000',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>Save & Sign In with Google</span>
              <ExternalLink size={16} />
            </button>
          </form>
        )}

        {/* Security Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', marginTop: '1.75rem', color: '#666', fontSize: '0.78rem' }}>
          <ShieldCheck size={14} color="#00B894" />
          <span>Supabase OAuth 2.0 • Secured by Google Cloud Identity</span>
        </div>
      </div>
    </div>
  );
};
