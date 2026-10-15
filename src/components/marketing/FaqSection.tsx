import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'availability',
    question: 'Can I purchase or order a physical NOVA device today?',
    answer:
      'No. NOVA is currently in the bench prototype development phase. We have verified the cloud backend, database schemas, encryption algorithms, and distributed rate limiting, but physical ESP32-C3 firmware capture and injection-molded enclosure production are still in progress. Buy and Setup remain intentionally locked until end-to-end hardware validation is completed.',
  },
  {
    id: 'custom-hardware',
    question: 'Can I build my own hardware prototype using off-the-shelf parts?',
    answer:
      'Yes. NOVA is built entirely around standard maker hardware: an ESP32-C3 Super Mini development board, an SSD1306 128×64 monochrome OLED display (I²C 0x3C on GPIO8/GPIO9), and a MAX4466 analog electret microphone amplifier (ADC input GPIO1). Our API contracts, bootstrap hash protocols, and database schemas are open and documented in our repository.',
  },
  {
    id: 'wifi-compatibility',
    question: 'Does NOVA support 5GHz Wi-Fi networks?',
    answer:
      'No. The ESP32-C3 SoC contains a 2.4GHz 802.11 b/g/n radio and does not support 5GHz Wi-Fi bands. If your home uses dual-band Wi-Fi, NOVA will connect to the 2.4GHz network. The multi-Wi-Fi vault allows storing up to 5 networks with automatic failover.',
  },
  {
    id: 'wake-word',
    question: 'How does wake-word detection work, and does it listen continuously?',
    answer:
      'Wake-word detection is designed to run locally using Espressif WakeNet keyword spotting ("Hi ESP"). The analog microphone is sampled into a circular memory buffer on the ESP32-C3. Audio packets are only transmitted to the cloud assistant pipeline after the wake word is detected.',
  },
  {
    id: 'notion-permissions',
    question: 'What access permissions does NOVA require for Notion?',
    answer:
      'NOVA connects via standard Notion OAuth 2.0. You select exactly which pages or databases NOVA has access to during the authorization screen. Access tokens are encrypted at rest with AES-256-GCM envelope encryption, and disconnecting Notion in the web portal immediately revokes access.',
  },
  {
    id: 'battery-specs',
    question: 'What is the battery life, dimensions, and weight of NOVA?',
    answer:
      'We do not publish estimated battery runtimes or finished weight because physical battery capacity and enclosure materials are still undergoing bench qualification. Rather than inventing battery figures or water resistance ratings, we clearly designate physical dimensions as concept specifications until bench testing is certified.',
  },
  {
    id: 'mobile-app',
    question: 'Do I need to install an iOS or Android app to set up NOVA?',
    answer:
      'No. NOVA is designed with zero mandatory mobile app downloads. Network provisioning is performed by connecting your phone or laptop directly to the device’s local SoftAP web portal at 192.168.4.1. Account pairing is completed by scanning the single-use 15-minute OLED QR code in any modern web browser.',
  },
  {
    id: 'device-recovery',
    question: 'What happens if I change my Wi-Fi network or lose my device key?',
    answer:
      'NOVA features a hardware recovery mechanism. Each physical unit possesses a unique bootstrap credential hash burned during initial manufacturing. If your Wi-Fi credentials change or device keys are rotated, scanning the Recovery QR restores connectivity and issues a fresh device key without wiping your saved notes, device identity, or Notion integration.',
  },
];

export const FaqSection: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('availability');

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section
      id="faq"
      style={{
        paddingTop: '5rem',
        paddingBottom: '5rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="marketing-container">
        {/* Section Heading */}
        <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
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
            Questions &amp; Answers
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
            }}
          >
            Clear answers. Zero marketing hype.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Have questions about NOVA hardware, security, or release plans? Here is everything you need to know directly from the engineering team.
          </p>
        </div>

        {/* Accordion List */}
        <div style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${isOpen ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  id={`faq-question-${faq.id}`}
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.5rem',
                    textAlign: 'left',
                    background: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.4 }}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform var(--transition-fast)',
                      color: isOpen ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${faq.id}`}
                    role="region"
                    aria-labelledby={`faq-question-${faq.id}`}
                    style={{
                      padding: '0 1.5rem 1.25rem 1.5rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.925rem',
                      lineHeight: 1.65,
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '1rem',
                    }}
                  >
                    {faq.answer}
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
