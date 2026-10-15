import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Mail } from 'lucide-react';

export const LaunchSignupSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid, well-formed email address.');
      setStatus('error');
      return;
    }

    if (!consent) {
      setErrorMessage('Please confirm your consent to receive NOVA launch updates.');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/v1/launch-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          consent: true,
          hp: honeypot || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setErrorMessage('Too many signup requests from your network. Please wait a minute before retrying.');
        } else {
          setErrorMessage(data?.error?.message || 'Unable to register email. Please try again shortly.');
        }
        setStatus('error');
        return;
      }

      setSuccessMessage(data?.data?.message || 'Thank you! You are confirmed for NOVA launch updates.');
      setStatus('success');
      setEmail('');
    } catch {
      setErrorMessage('Network connection lost. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return (
    <section
      id="launch-signup"
      style={{
        paddingTop: '5rem',
        paddingBottom: '5.5rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="marketing-container">
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(2rem, 4vw, 3.5rem)',
            maxWidth: '860px',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {/* Section Header */}
          <div style={{ maxWidth: '600px', marginBottom: '2rem' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--accent-cyan)',
                display: 'block',
                marginBottom: '0.5rem',
              }}
            >
              Hardware Availability
            </span>
            <h2
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              Be first when batch 01 opens.
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              We will only manufacture physical hardware after firmware benchmarks pass rigorous power and wake-word testing. Register to receive engineering updates and priority access when physical units become available.
            </p>
          </div>

          {/* Form */}
          {status === 'success' ? (
            <div
              role="alert"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
              }}
            >
              <CheckCircle2 size={24} style={{ color: 'var(--status-success)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Confirmed for Launch Updates
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {successMessage}
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  style={{
                    marginTop: '0.75rem',
                    background: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Register another email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Anti-Spam Honeypot Field (invisible to humans) */}
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
                <label htmlFor="website-hp">Leave this field blank</label>
                <input
                  id="website-hp"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {/* Email Input Field & Submit Button */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  maxWidth: '560px',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    htmlFor="launch-email-input"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Mail size={18} />
                    </div>
                    <input
                      id="launch-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@domain.com"
                      required
                      aria-required="true"
                      aria-invalid={status === 'error'}
                      aria-describedby={status === 'error' ? 'signup-error-desc' : undefined}
                      disabled={status === 'loading'}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-input)',
                        border: `1px solid ${status === 'error' ? 'var(--status-error)' : 'var(--border-strong)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.85rem 1rem 0.85rem 2.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        transition: 'border-color var(--transition-fast)',
                      }}
                    />
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <input
                    id="launch-consent-checkbox"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    style={{
                      marginTop: '0.2rem',
                      width: '16px',
                      height: '16px',
                      accentColor: 'var(--accent-cyan)',
                      cursor: 'pointer',
                    }}
                  />
                  <label
                    htmlFor="launch-consent-checkbox"
                    style={{
                      fontSize: '0.825rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      cursor: 'pointer',
                    }}
                  >
                    I consent to receiving engineering progress, hardware batch announcements, and firmware releases from NOVA. No spam, no third-party sharing.
                  </label>
                </div>

                {/* Error Banner */}
                {status === 'error' && (
                  <div
                    id="signup-error-desc"
                    role="alert"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem 0.9rem',
                      fontSize: '0.85rem',
                      color: '#fca5a5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    backgroundColor: 'var(--accent-cyan)',
                    color: 'var(--text-on-accent)',
                    padding: '0.85rem 1.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: status === 'loading' ? 0.8 : 1,
                    transition: 'opacity var(--transition-fast)',
                    marginTop: '0.5rem',
                  }}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Saving Subscription...</span>
                    </>
                  ) : (
                    <>
                      <span>Register for Launch Updates</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              {/* Privacy Reassurance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={14} style={{ color: 'var(--status-success)' }} />
                <span>Your email is stored in an encrypted PostgreSQL ledger protected by rate limiting. Unsubscribe anytime.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
