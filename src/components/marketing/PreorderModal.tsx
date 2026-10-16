import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, Shield, ArrowRight } from 'lucide-react';

export interface PreorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTier?: 'maker' | 'keychain' | 'twin';
}

export const PreorderModal: React.FC<PreorderModalProps> = ({
  isOpen,
  onClose,
  initialTier = 'keychain',
}) => {
  const [selectedTier, setSelectedTier] = useState<'maker' | 'keychain' | 'twin'>(initialTier);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    // Simulate real pre-order queue submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 700);
  };

  const getTierPrice = () => {
    switch (selectedTier) {
      case 'maker': return '$39';
      case 'twin': return '$99';
      default: return '$59';
    }
  };

  const getTierName = () => {
    switch (selectedTier) {
      case 'maker': return 'Maker Kit Edition';
      case 'twin': return 'Dev Twin Pack (2× NOVA)';
      default: return 'NOVA Keychain Edition';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {!submitted ? (
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }} className="badge-brutal badge-brutal-pink">
              <Sparkles size={13} />
              <span>Batch #1 Pre-order</span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.85rem',
                fontWeight: 900,
                color: '#000000',
                marginBottom: '0.5rem',
                letterSpacing: '-0.03em',
              }}
            >
              Reserve your NOVA companion
            </h2>

            <p style={{ fontSize: '0.92rem', color: '#555', marginBottom: '1.5rem' }}>
              No upfront charge today. Lock in your Batch #1 priority queue spot, early-bird pricing, and instant Notion workspace template.
            </p>

            {/* Tier Selector Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {(['maker', 'keychain', 'twin'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 0.5rem',
                    borderRadius: '12px',
                    border: '2px solid #000000',
                    backgroundColor: selectedTier === tier ? 'var(--bg-body-yellow)' : '#FFFFFF',
                    boxShadow: selectedTier === tier ? '3px 3px 0px #000000' : 'none',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div>{tier === 'maker' ? 'Maker' : tier === 'twin' ? 'Twin Pack' : 'Keychain'}</div>
                  <div style={{ fontSize: '1.05rem', marginTop: '2px' }}>
                    {tier === 'maker' ? '$39' : tier === 'twin' ? '$99' : '$59'}
                  </div>
                </button>
              ))}
            </div>

            {/* Order Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#000' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '2px solid #000000',
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem',
                    color: '#000',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#000' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="ada@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '2px solid #000000',
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem',
                    color: '#000',
                  }}
                />
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#FFF8E7',
                  border: '2px solid #000000',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#000' }}>{getTierName()}</div>
                  <div style={{ fontSize: '0.78rem', color: '#666' }}>Estimated dispatch: Batch #1 (Nov 2026)</div>
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.4rem', color: '#000' }}>
                  {getTierPrice()}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-brutal btn-brutal-amber"
                style={{ width: '100%', fontSize: '1.05rem', padding: '1rem' }}
              >
                <span>{loading ? 'Securing Spot...' : `Reserve for ${getTierPrice()}`}</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1rem', fontSize: '0.78rem', color: '#666' }}>
                <Shield size={13} style={{ color: '#00B894' }} />
                <span>Zero spam guarantee • 100% money-back pre-dispatch guarantee</span>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#55EFC4',
                border: '3px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <CheckCircle2 size={32} style={{ color: '#000' }} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2rem',
                fontWeight: 900,
                color: '#000',
                marginBottom: '0.5rem',
                letterSpacing: '-0.03em',
              }}
            >
              Spot secured, {name}!
            </h2>

            <p style={{ fontSize: '0.98rem', color: '#444', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              We've saved your reservation for the <strong>{getTierName()}</strong>. We sent a verification receipt and Notion setup guide to <strong>{email}</strong>.
            </p>

            <button
              onClick={onClose}
              className="btn-brutal btn-brutal-amber"
              style={{ padding: '0.85rem 2rem' }}
            >
              <span>Back to Website</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
