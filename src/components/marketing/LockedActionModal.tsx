import React, { useEffect, useRef } from 'react';
import { X, Lock, Cpu, ArrowRight, ShieldAlert } from 'lucide-react';

export interface LockedActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'buy' | 'setup';
  onEnterDevMode?: () => void;
  onJumpToSignup?: () => void;
}

export const LockedActionModal: React.FC<LockedActionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  onEnterDevMode,
  onJumpToSignup,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="locked-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '480px',
          width: '100%',
          padding: '1.75rem',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            color: 'var(--text-muted)',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-warning)',
              flexShrink: 0,
            }}
          >
            <Lock size={18} />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--status-warning)',
                fontWeight: 600,
              }}
            >
              Action Locked • Prototype Phase
            </span>
            <h2 id="locked-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.15rem' }}>
              {actionType === 'buy' ? 'Pre-Orders Are Not Yet Open' : 'Physical Device Setup Locked'}
            </h2>
          </div>
        </div>

        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {actionType === 'buy' ? (
            <>
              NOVA is currently in the <strong>pre-hardware bench prototype stage</strong>. We do not accept payments, deposits, or fake orders before physical firmware integration and batch manufacturing are fully certified.
            </>
          ) : (
            <>
              Device onboarding requires a physical <strong>ESP32-C3 Super Mini</strong> running verified NOVA firmware to generate genuine OLED single-use claim tokens. Setup is intentionally locked to prevent fake pairing.
            </>
          )}
        </p>

        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.9rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <ShieldAlert size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
              Truth in Hardware Guarantee
            </strong>
            Physical device behavior is only represented as operational once verified on actual silicon. Register for launch updates to be notified when hardware batches open.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {onJumpToSignup && (
            <button
              onClick={() => {
                onClose();
                onJumpToSignup();
              }}
              style={{
                backgroundColor: 'var(--accent-cyan)',
                color: 'var(--text-on-accent)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>Get Launch Notifications</span>
              <ArrowRight size={16} />
            </button>
          )}

          {actionType === 'setup' && onEnterDevMode && (
            <button
              onClick={() => {
                onClose();
                onEnterDevMode();
              }}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                padding: '0.7rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Cpu size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Enter Bench Developer Lab Mode</span>
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              padding: '0.6rem',
              fontSize: '0.85rem',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
