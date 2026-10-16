import React, { useState } from 'react';
import { Database, Plus, CheckCircle2, Lock } from 'lucide-react';

interface NotionRow {
  id: string;
  title: string;
  tag: string;
  tagColor: string;
  timestamp: string;
  status: string;
}

export const NotionSyncSection: React.FC = () => {
  const [rows, setRows] = useState<NotionRow[]>([
    {
      id: '1',
      title: 'Order replacement USB-C braided cables for desk',
      tag: 'Hardware',
      tagColor: '#FF7675',
      timestamp: 'Today, 2:45 PM',
      status: 'Synced',
    },
    {
      id: '2',
      title: 'Review ESP-IDF 6.1 audio DMA buffer limits',
      tag: 'Firmware',
      tagColor: '#00CEC9',
      timestamp: 'Today, 11:20 AM',
      status: 'Synced',
    },
    {
      id: '3',
      title: 'Draft landing page copy for Super Nova launch',
      tag: 'Product',
      tagColor: '#FFCF40',
      timestamp: 'Yesterday, 6:15 PM',
      status: 'Synced',
    },
  ]);

  const addSampleMemo = () => {
    const samples = [
      { title: 'Remind team about WPC regulatory compliance filing', tag: 'Regulatory', tagColor: '#6C5CE7' },
      { title: 'Calibrate MAX4466 analog gain potentiometer on bench', tag: 'Lab', tagColor: '#00B894' },
      { title: 'Schedule weekly pair-programming check-in with design team', tag: 'Team', tagColor: '#E17055' },
    ];
    const picked = samples[rows.length % samples.length];
    const newRow: NotionRow = {
      id: Date.now().toString(),
      title: picked.title,
      tag: picked.tag,
      tagColor: picked.tagColor,
      timestamp: 'Just now',
      status: 'Synced',
    };
    setRows([newRow, ...rows]);
  };

  return (
    <section
      id="notion-sync"
      style={{
        backgroundColor: 'var(--bg-body-yellow)',
        paddingTop: '3rem',
        paddingBottom: '5rem',
      }}
    >
      <div className="marketing-container">
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: '9999px',
              padding: '0.35rem 1rem',
              marginBottom: '1rem',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.82rem',
              fontWeight: 900,
              textTransform: 'uppercase',
            }}
          >
            <Database size={14} style={{ color: '#000000' }} />
            <span>Productivity Supercharged</span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)',
              fontWeight: 900,
              color: '#000000',
              letterSpacing: '-0.04em',
              marginBottom: '0.75rem',
            }}
          >
            Your thoughts, straight to Notion
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              fontWeight: 500,
              color: '#262626',
              maxWidth: '560px',
              margin: '0 auto',
            }}
          >
            Say what's on your mind. NOVA captures your utterance, checks network connectivity, and securely streams it into your private Notion database via Supabase OAuth.
          </p>
        </div>

        {/* Interactive Notion Mock Table Card */}
        <div
          style={{
            maxWidth: '820px',
            margin: '0 auto',
            backgroundColor: '#FFFDF7',
            border: '3px solid #000000',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '6px 6px 0px #000000',
            overflow: 'hidden',
          }}
        >
          {/* Notion Header Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderBottom: '2.5px solid #000000',
              padding: '1rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'serif',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                }}
              >
                N
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', color: '#000' }}>
                  NOVA Voice Memos
                </div>
                <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 600 }}>
                  Workspace: Personal • Synced via OAuth 2.0
                </div>
              </div>
            </div>

            <button
              onClick={addSampleMemo}
              className="btn-brutal btn-brutal-amber"
              style={{
                fontSize: '0.85rem',
                padding: '0.5rem 1.15rem',
              }}
            >
              <Plus size={14} />
              <span>Simulate Voice Memo</span>
            </button>
          </div>

          {/* Database Rows */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F6EF', borderBottom: '2px solid #000000' }}>
                  <th style={{ padding: '0.85rem 1.5rem', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>
                    Title
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>
                    Category
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>
                    Created
                  </th>
                  <th style={{ padding: '0.85rem 1.5rem', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1.5px solid #E8E5DD',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF8E7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '1.1rem 1.5rem', fontWeight: 700, fontSize: '0.96rem', color: '#000' }}>
                      {row.title}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <span
                        style={{
                          backgroundColor: row.tagColor,
                          border: '1.5px solid #000000',
                          boxShadow: '1.5px 1.5px 0px #000000',
                          borderRadius: '6px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: '#000000',
                          display: 'inline-block',
                        }}
                      >
                        {row.tag}
                      </span>
                    </td>
                    <td style={{ padding: '1.1rem 1rem', fontSize: '0.88rem', color: '#666', fontFamily: 'monospace' }}>
                      {row.timestamp}
                    </td>
                    <td style={{ padding: '1.1rem 1.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#00B894' }}>
                        <CheckCircle2 size={15} />
                        <span>{row.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Privacy Guarantee Footer Note */}
          <div
            style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: '#FFF8E7',
              borderTop: '2px solid #000000',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#444',
            }}
          >
            <Lock size={16} style={{ color: '#000000', flexShrink: 0 }} />
            <span>
              <strong>Zero Audio Storage</strong>: Raw microphone samples are processed in memory and never stored long-term on any external server.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
