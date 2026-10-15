import React from 'react';
import { Cpu, Terminal, Mic2, Wifi, AlertCircle } from 'lucide-react';

export const HardwareSection: React.FC = () => {
  return (
    <section
      id="hardware"
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
            Silicon &amp; Component Architecture
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
            Verified component specifications.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Every component in NOVA is chosen for minimal power consumption, physical compactness, and direct microcontroller-level control.
          </p>
        </div>

        {/* 4 Detailed Component Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Microcontroller */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Cpu size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                ESP32-C3 Super Mini
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Espressif 32-bit RISC-V single-core processor clocked up to 160MHz. Features 400KB SRAM and 4MB embedded Flash, delivering low active power draw and native hardware cryptographic acceleration.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Architecture:</strong> RISC-V RV32IMC @ 160MHz</div>
              <div>&bull; <strong>Memory:</strong> 400KB SRAM + 4MB Flash</div>
              <div>&bull; <strong>Hardware Crypto:</strong> SHA-256, AES-128/256, RSA</div>
            </div>
          </div>

          {/* Display */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Terminal size={20} style={{ color: 'var(--accent-blue)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                SSD1306 Monochrome OLED
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              0.96-inch high-contrast 128&times;64 pixel OLED screen. Communicates over high-speed hardware I&sup2;C on address 0x3C via GPIO8 (SDA) and GPIO9 (SCL) with zero background backlight power bleed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Resolution:</strong> 128 &times; 64 monochrome pixels</div>
              <div>&bull; <strong>Bus Interface:</strong> I&sup2;C address 0x3C (GPIO8 / GPIO9)</div>
              <div>&bull; <strong>Power Draw:</strong> Pixel-emissive (0mA on black)</div>
            </div>
          </div>

          {/* Microphone */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Mic2 size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                MAX4466 Electret Mic
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Precision operational amplifier optimized for electret microphones. Delivers adjustable gain, excellent power-supply noise rejection, and feeds the ESP32-C3 12-bit ADC input on GPIO1.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Transducer:</strong> 20Hz &ndash; 20kHz electret capsule</div>
              <div>&bull; <strong>ADC Channel:</strong> GPIO1 (SAR ADC1 channel 1)</div>
              <div>&bull; <strong>Sampling Rate:</strong> 16 kHz 16-bit PCM buffer</div>
            </div>
          </div>

          {/* Radio & SoftAP */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Wifi size={20} style={{ color: 'var(--status-success)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                2.4GHz Wi-Fi &amp; SoftAP
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Single-band 2.4GHz 802.11 b/g/n radio. Uses local password-protected SoftAP at 192.168.4.1 for secure out-of-band network configuration, blocking cloud network eavesdropping.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Radio Band:</strong> 2.4 GHz only (802.11 b/g/n)</div>
              <div>&bull; <strong>Provisioning:</strong> Local SoftAP (192.168.4.1)</div>
              <div>&bull; <strong>Network Vault:</strong> Multi-network failover (up to 5)</div>
            </div>
          </div>
        </div>

        {/* Honest Disclosure: Concept vs Verified Specs */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={22} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Concept Specifications vs Verified Silicon
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              The electronic components above are <strong>verified prototype specifications</strong> currently tested on bench boards. In contrast, mechanical enclosure dimensions, exact finished weight, battery cell capacity, run time between charges, water resistance ratings, and regulatory certifications (FCC/CE) are <strong>unverified concept targets</strong>. We will publish certified measurements only after physical production tooling is completed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
