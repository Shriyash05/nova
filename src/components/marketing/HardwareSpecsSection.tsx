import React from 'react';
import { Cpu, HardDrive, Mic, Eye, BatteryCharging, Radio, Wrench } from 'lucide-react';

export const HardwareSpecsSection: React.FC = () => {
  const specs = [
    {
      icon: <Cpu size={22} style={{ color: '#FF9F1C' }} />,
      title: 'Microcontroller',
      val: 'ESP32-C3 Super Mini',
      desc: '160 MHz single-core 32-bit RISC-V, 400KB SRAM, 384KB ROM, low-power sleep modes.',
    },
    {
      icon: <HardDrive size={22} style={{ color: '#00CEC9' }} />,
      title: 'Flash Memory',
      val: '4 MB SPI Flash',
      desc: 'Dedicated srmodel partition hosting WakeNet wn9s_hiesp model with zero RAM bloat.',
    },
    {
      icon: <Eye size={22} style={{ color: '#6C5CE7' }} />,
      title: 'Display',
      val: 'SSD1306 128×64 OLED',
      desc: '0.96" high-contrast monochrome I2C panel on GPIO8 (SDA) and GPIO9 (SCL) at 400 kHz.',
    },
    {
      icon: <Mic size={22} style={{ color: '#FF7675' }} />,
      title: 'Microphone',
      val: 'MAX4466 Analog Preamp',
      desc: '16 kHz continuous ADC DMA sampling on GPIO1 with dynamic DC-bias tracker and gain trimmer.',
    },
    {
      icon: <BatteryCharging size={22} style={{ color: '#00B894' }} />,
      title: 'Power & Form Factor',
      val: 'USB-C 5V Line Powered',
      desc: 'Pocket-sized transparent polycarbonate chassis (38×24×14mm, 18g) with steel lanyard ring.',
    },
    {
      icon: <Radio size={22} style={{ color: '#E17055' }} />,
      title: 'Connectivity',
      val: 'Wi-Fi 802.11 b/g/n',
      desc: 'Local SoftAP captive provisioning on 192.168.4.1 + TLS 1.3 encrypted HTTPS cloud sync.',
    },
  ];

  return (
    <section
      id="specs"
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
            <Wrench size={14} style={{ color: '#FF9F1C' }} />
            <span>Open Engineering Blueprint</span>
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
            Real parts. Honest hardware.
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              fontWeight: 500,
              color: '#262626',
              maxWidth: '540px',
              margin: '0 auto',
            }}
          >
            No fictional AI marketing or hidden proprietary chips. Every component is off-the-shelf, documented, and fully flashable.
          </p>
        </div>

        {/* Specs Grid in Neo-Brutalist Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.75rem',
          }}
        >
          {specs.map((item, idx) => (
            <div key={idx} className="card-brutal card-brutal-interactive">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: '#FFFDF7',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#666',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.title}
                </span>
              </div>

              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.28rem',
                  fontWeight: 900,
                  color: '#000000',
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem',
                }}
              >
                {item.val}
              </h3>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.92rem',
                  fontWeight: 500,
                  color: '#444444',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
