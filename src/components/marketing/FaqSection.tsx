import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: 'Does NOVA require a monthly subscription fee?',
      a: 'Never. You buy the hardware once and own it forever. There are zero cloud subscriptions, zero lock-ins, and zero recurring fees for voice memo capture or Notion syncing.',
    },
    {
      q: 'How does the acoustic wake-word work offline without cloud servers?',
      a: 'NOVA runs Espressif’s neural WakeNet (wn9s_hiesp) directly on the onboard ESP32-C3 160MHz RISC-V processor. The acoustic model spots “Hi ESP” locally within 120ms with zero network connection required.',
    },
    {
      q: 'Does NOVA record my conversations in the background?',
      a: 'Absolutely not. The MAX4466 analog microphone feeds a temporary ring buffer in volatile SRAM solely for wake-word detection. If the wake-word is not detected, audio samples are continuously discarded. Raw audio is never stored or transmitted to external servers.',
    },
    {
      q: 'How does Notion database synchronization work?',
      a: 'You authenticate your Notion workspace once through NOVA’s secure local Wi-Fi provisioning page or web console. When an utterance completes, NOVA sends an encrypted HTTPS payload via Supabase OAuth to automatically insert a formatted row into your designated Notion database.',
    },
    {
      q: 'Can I write my own firmware or customize the OLED animations?',
      a: 'Yes! NOVA is built on open ESP-IDF 6.1 and FreeRTOS. You can fork the C codebase, add custom OLED expressions, map new GPIO sensors, or train your own wake word with ESP-SR.',
    },
    {
      q: 'How is NOVA powered?',
      a: 'NOVA is powered via its standard USB-C port (5V). You can plug it into a laptop, charging dock, wall adapter, or a miniature portable keychain power bank for mobile use.',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section
      id="faqs"
      style={{
        backgroundColor: 'var(--bg-body-yellow)',
        paddingTop: '3rem',
        paddingBottom: '5rem',
      }}
    >
      <div className="marketing-container" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
            <HelpCircle size={14} style={{ color: '#FF9F1C' }} />
            <span>Got Questions?</span>
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
            Frequently asked questions
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.05rem',
              fontWeight: 500,
              color: '#262626',
              maxWidth: '520px',
              margin: '0 auto',
            }}
          >
            Everything you need to know about NOVA's hardware, privacy architecture, and open firmware.
          </p>
        </div>

        {/* Accordion Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFDF7',
                  border: '2.5px solid #000000',
                  boxShadow: isOpen ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                <button
                  onClick={() => toggle(idx)}
                  style={{
                    width: '100%',
                    padding: '1.35rem 1.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.08rem',
                    fontWeight: 800,
                    color: '#000000',
                    cursor: 'pointer',
                    gap: '1rem',
                  }}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <div
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronDown size={20} />
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 1.6rem 1.35rem',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.96rem',
                      lineHeight: 1.65,
                      color: '#333333',
                      borderTop: '1.5px solid #F0ECE1',
                      paddingTop: '1rem',
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
