import React, { useState } from 'react';
import { Cpu, Terminal, Mic2, Wifi, Layers, ShieldAlert } from 'lucide-react';

export const HardwareSection: React.FC = () => {
  const [activeBlueprintTab, setActiveBlueprintTab] = useState<'all' | 'exploded' | 'internal' | 'dimensions' | 'lifestyle'>('all');

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
        <div style={{ maxWidth: '680px', marginBottom: '3.5rem' }}>
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
            Hardware Architecture &amp; Blueprint
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
            Engineered in clear acrylic. Fully transparent.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Guided by the official NOVA transparent keychain blueprint. Every sensor, PCB layer, screw boss, and silicon package is exposed to view with zero decorative veneer.
          </p>
        </div>

        {/* Blueprint Visual Showcase Box */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            marginBottom: '4rem',
          }}
        >
          {/* Blueprint Header Bar */}
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                NOVA Transparent Keychain Blueprint Reference
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  backgroundColor: 'rgba(0, 242, 254, 0.1)',
                  color: 'var(--accent-cyan)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 600,
                }}
              >
                PROTOTYPE CAD
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Target: 35 &times; 50 &times; 15 mm</span>
              <span>&bull;</span>
              <span>M2 Screws</span>
              <span>&bull;</span>
              <span>0.96&quot; OLED</span>
            </div>
          </div>

          {/* Blueprint Interactive Tab Filter */}
          <div
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
            }}
          >
            {[
              { id: 'all', label: 'All Perspectives' },
              { id: 'exploded', label: 'Exploded View' },
              { id: 'internal', label: 'Internal Layout' },
              { id: 'dimensions', label: 'Dimensions & Cutouts' },
              { id: 'lifestyle', label: 'Scale & Everyday Carry' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveBlueprintTab(tab.id as any)}
                style={{
                  backgroundColor: activeBlueprintTab === tab.id ? 'var(--accent-cyan)' : 'var(--bg-surface-elevated)',
                  color: activeBlueprintTab === tab.id ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Blueprint Viewer Image */}
          <div style={{ position: 'relative', backgroundColor: '#05070a' }}>
            <img
              src="/images/nova-blueprint-master.jpg"
              alt="NOVA transparent keychain device technical blueprint depicting front, back, left, right, top, bottom views, exploded component view, internal layout, and mechanical dimensions"
              width={1024}
              height={682}
              loading="lazy"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                maxHeight: '620px',
                objectFit: 'contain',
              }}
            />

            {/* Blueprint Overlay Caption */}
            <div
              style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                right: '1rem',
                backgroundColor: 'rgba(9, 11, 16, 0.88)',
                backdropFilter: 'blur(6px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {activeBlueprintTab === 'all' && (
                  <span><strong style={{ color: 'var(--text-primary)' }}>Full Blueprint:</strong> 6 orthographic views, exploded assembly, internal stack, technical dimensions, in-hand scale, and keychain pocket clip.</span>
                )}
                {activeBlueprintTab === 'exploded' && (
                  <span><strong style={{ color: 'var(--text-primary)' }}>Exploded Assembly:</strong> Front shell &bull; M2 screws &bull; 0.96&quot; OLED &bull; MCU board &bull; MAX4466 mic &bull; 1,000 mAh Li-Po cell &bull; Rear shell.</span>
                )}
                {activeBlueprintTab === 'internal' && (
                  <span><strong style={{ color: 'var(--text-primary)' }}>Internal Architecture:</strong> Component stack showing centered 0.96&quot; OLED displaying pixel smile `• ‿ •`, upper-right mic capsule, and USB-C port at base.</span>
                )}
                {activeBlueprintTab === 'dimensions' && (
                  <span><strong style={{ color: 'var(--text-primary)' }}>Technical Dimensions:</strong> 35.0 mm W &times; 50.0 mm H &times; 15.0 mm D &bull; 2.0 mm screw hole &Oslash; &bull; 5.0 mm boss &Oslash; &bull; 27.0 &times; 20.0 mm OLED cutout.</span>
                )}
                {activeBlueprintTab === 'lifestyle' && (
                  <span><strong style={{ color: 'var(--text-primary)' }}>Scale &amp; Everyday Carry:</strong> Compact pocketable keychain form factor held in a human hand and clipped onto a pocket via a 6mm lanyard ring.</span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Scale: 1:1 Pocket Keychain
              </div>
            </div>
          </div>
        </div>

        {/* Microcontroller Silicon Evaluation: C3 vs S3 */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            marginBottom: '3.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Cpu size={22} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Microcontroller Architecture Evaluation
            </h3>
            <span
              style={{
                fontSize: '0.7rem',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--status-warning)',
                padding: '0.15rem 0.55rem',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 600,
              }}
            >
              ENGINEERING NOTE
            </span>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: '780px' }}>
            Previous repository firmware and backend mock contracts were built around the <strong>ESP32-C3 Super Mini</strong>, while the industrial design blueprint specifies the <strong>ESP32-S3 SuperMini</strong>. Rather than masking this discrepancy, we document the comparative engineering considerations below as an active bench evaluation.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Specification Parameter</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>ESP32-C3 Super Mini (Current Build)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-blue)' }}>ESP32-S3 SuperMini (Blueprint Target)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Architecture Impact</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>CPU Core &amp; ISA</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Single-core 32-bit RISC-V @ 160 MHz</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Dual-core 32-bit Xtensa LX7 @ 240 MHz</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>S3 provides dual cores for separating audio DSP from Wi-Fi stack</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Vector Instructions (DSP)</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Standard integer instructions only</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Dedicated vector instructions (PIE)</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>Vector extensions accelerate WakeNet neural acoustic models</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>SRAM &amp; Memory</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>400 KB SRAM + 4 MB Flash</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>512 KB SRAM + up to 8 MB Flash</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>S3 offers larger heap margin for circular audio ring-buffers</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Active &amp; Sleep Power</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Lower baseline draw (~5 &mu;A deep sleep)</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Slightly higher draw (~7 &mu;A deep sleep)</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>C3 offers superior standby longevity on keychain batteries</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Implementation Status</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--status-success)', fontWeight: 600 }}>Active in Repo Test Suites &amp; Mock Store</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--status-warning)', fontWeight: 600 }}>Under Bench Evaluation for Production</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>Both boards share I&sup2;C pin compatibility for SSD1306 and ADC1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4 Core Subsystem Deep-Dive Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Enclosure */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Layers size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Transparent Enclosure
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Molded transparent polycarbonate casing with front and rear shells secured by 6 precision M2 machine screws. Features an integrated 6mm stainless lanyard ring and bottom USB-C port cutout.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Dimensions:</strong> 35.0 &times; 50.0 &times; 15.0 mm</div>
              <div>&bull; <strong>Fasteners:</strong> M2 Torx (2.0mm hole &bull; 5.0mm boss)</div>
              <div>&bull; <strong>Carry:</strong> 6mm &Oslash; top keychain / lanyard loop</div>
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
                0.96&quot; Monochrome OLED
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              High-contrast 128&times;64 pixel OLED visible through a 27.0 &times; 20.0 mm window. Emits crisp cyan/white pixel art expressions (`• ‿ •`) and status indicators over I&sup2;C address 0x3C with zero backlight bleed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Window Cutout:</strong> 27.0 mm &times; 20.0 mm</div>
              <div>&bull; <strong>Pixel Array:</strong> 128 &times; 64 monochrome pixels</div>
              <div>&bull; <strong>I&sup2;C Bus:</strong> Address 0x3C (GPIO8 SDA / GPIO9 SCL)</div>
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
                MAX4466 Microphone
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Precision electret microphone capsule paired with an ultra-low noise op-amp. Located in the upper-right corner with a dedicated acoustic port hole, feeding analog voltage into ADC1 on GPIO1.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Placement:</strong> Upper-right acoustic inlet</div>
              <div>&bull; <strong>Audio Sampling:</strong> 16 kHz 16-bit PCM ADC stream</div>
              <div>&bull; <strong>Wake Engine:</strong> WakeNet offline keyword spotting</div>
            </div>
          </div>

          {/* Power & Battery */}
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
                Power &amp; Connectivity
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              The blueprint includes a 1,000 mAh Li-Po pouch cell wrapped in protective Kapton film, with a bottom USB-C port for 5V charging and firmware flashing, plus single-band 2.4GHz 802.11b/g/n Wi-Fi.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>&bull; <strong>Battery Target:</strong> 1,000 mAh 3.7V Li-Po (Target)</div>
              <div>&bull; <strong>Port:</strong> USB-C (Charging + Serial Data)</div>
              <div>&bull; <strong>Wi-Fi:</strong> 2.4 GHz only (802.11 b/g/n)</div>
            </div>
          </div>
        </div>

        {/* Unconfirmed Specifications Disclosure */}
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
          <ShieldAlert size={22} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Unconfirmed Concept Specifications Disclosure
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              The cloud backend, database schemas, encryption algorithms, and distributed rate limiting are <strong>fully verified in code and live tests</strong>. However, the blueprint&apos;s 1,000 mAh battery operating hours, charging IC thermal profile, final enclosure drop-test durability, and physical ESP32-S3 vs C3 production selection remain <strong>unconfirmed prototype specifications</strong>. Certified metrics will be published only after physical bench testing of assembled prototypes is complete.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
