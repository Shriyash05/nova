import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { NOTION_REQUESTED_SCOPES, NOTION_EXCLUDED_PERMISSIONS } from '../../domain/notion';
import { ShieldCheck, Lock, ExternalLink, CheckCircle2, ChevronRight } from 'lucide-react';

export interface NotionAuthScreenProps {
  onCompleteAuth: (simulatedCode?: string) => Promise<void>;
  isMockMode?: boolean;
}

export const NotionAuthScreen: React.FC<NotionAuthScreenProps> = ({
  onCompleteAuth,
  isMockMode = true,
}) => {
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState('db_voice_inbox');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleStartOAuth = () => {
    if (isMockMode) {
      setIsConsentModalOpen(true);
    } else {
      // Real backend redirect flow
      window.location.href = `/api/v1/auth/notion/authorize?redirect_uri=${encodeURIComponent(
        window.location.origin + '/setup/callback'
      )}`;
    }
  };

  const handleApproveConsent = async () => {
    setIsAuthorizing(true);
    await onCompleteAuth(`code_notion_verified_${selectedDatabase}`);
    setIsAuthorizing(false);
    setIsConsentModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#ffffff',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.8rem',
            boxShadow: '0 8px 24px rgba(255, 255, 255, 0.15)',
            fontWeight: 800,
            fontSize: '1.8rem',
            fontFamily: 'serif',
          }}
        >
          N
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 600 }}>Link Your Notion Workspace</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          NOVA transcribes your audio notes and delivers them directly into your chosen Notion database.
        </p>
      </div>

      {/* Permissions Breakdown Card */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            What NOVA Can Access:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {NOTION_REQUESTED_SCOPES.map((scope) => (
              <div key={scope.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <CheckCircle2 size={16} color="var(--accent-cyan)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {scope.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {scope.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              What NOVA Never Touches:
            </div>
            <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {NOTION_EXCLUDED_PERMISSIONS.map((item, idx) => (
                <li key={idx} style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Zero Token Key Storing Guarantee */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(0, 242, 254, 0.05)',
          border: '1px solid rgba(0, 242, 254, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.8rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Lock size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <span>
          <strong>OAuth 2.0 Security:</strong> You will never be asked to copy/paste an API secret. Token exchange occurs exclusively on the backend and is encrypted at rest in KMS.
        </span>
      </div>

      <Button
        variant="primary"
        onClick={handleStartOAuth}
        leftIcon={<ExternalLink size={18} />}
        rightIcon={<ChevronRight size={18} />}
      >
        Authorize with Notion
      </Button>

      {/* Realistic Mock OAuth Modal (when running in mock mode) */}
      <Modal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        title="Notion Authorization"
        description="NOVA is requesting access to your Notion workspace."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>🧠</div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Acme Research & Notes
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                user@example.com • 42 pages
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dbSelect">
              Select Target Database for Voice Notes
            </label>
            <select
              id="dbSelect"
              className="form-input"
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
            >
              <option value="db_voice_inbox">📥 NOVA Voice Inbox & Action Items</option>
              <option value="db_daily_notes">📅 Daily Notes & Journal</option>
              <option value="db_meeting_notes">🎙️ Meeting Transcripts & Tasks</option>
            </select>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.75rem',
            }}
          >
            By clicking "Allow Access", you authorize NOVA to create pages and blocks within the selected database. You can revoke this integration at any time from your Notion Settings or NOVA portal.
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setIsConsentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApproveConsent}
              isLoading={isAuthorizing}
              leftIcon={<ShieldCheck size={16} />}
            >
              Allow Access
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
