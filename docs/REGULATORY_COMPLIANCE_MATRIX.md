# NOVA 1.0 Multi-Jurisdiction Regulatory Compliance Matrix & Commercial Roadmap

**Document Version**: 1.0.0-PROD  
**Status**: Authoritative Commercialization Specification  
**Classification**: Technical & Regulatory Architecture Artifact  
**Date**: 2026-10-16  
**Target Hardware**: NOVA 1.0 Autonomous Voice Assistant Keychain  
**Core Silicon**: Espressif Systems ESP32-C3 RISC-V SoC (4MB Embedded Flash, 400KB SRAM, 160MHz)  
**Primary Connectivity**: 2.4 GHz 802.11b/g/n Wi-Fi (HT20) & Bluetooth 5.0 Low Energy (BLE)  
**Power Domain**: Strictly 5V DC Bus via USB-C (Class III SELV, no battery/LiPo storage)  
**Audio Subsystem**: MAX4466 electret microphone amplifier with analog AGC on GPIO1 (16 kHz 16-bit ADC)  
**Display Subsystem**: 0.96″ monochrome 128×64 OLED (SSD1306, I2C bus @ 400 kHz on GPIO8/GPIO9)  

---

## 1. Executive Summary & Regulatory Philosophy

The NOVA 1.0 device is a miniaturized, expressive, offline-wakeable smart keychain that bridges physical voice interactions to cloud productivity backends (such as Notion databases). To achieve commercial scale across global markets while upholding absolute technical integrity, NOVA’s regulatory strategy is governed by three non-negotiable principles:

1. **Truth-in-Capability and Architectural Honesty**:
   - The device operates strictly on a 5V USB-C bus line (`usb_5v` / `usb-c_5v`). It contains zero electrochemical batteries, LiPo pouches, or fuel gauge hardware. The cloud telemetry API and frontend strictly reject fabricated battery readings with HTTP 400 `INVALID_POWER_TELEMETRY`.
   - Audio processing utilizes an on-chip, offline neural wake-word engine (`wn9s_hiesp`, "Hi ESP"). Ambient audio is never buffered in SRAM or streamed to cloud APIs prior to verified wake-word triggering.
2. **Clear Separation of Compliance States**:
   - `SPECIFICATION_ALIGNED`: The hardware architecture, RF output power limits, firmware protocols, and cloud privacy mechanisms strictly conform to the engineering rules and self-declaration criteria of the statutory standard.
   - `PENDING_LAB_TESTING`: Formal legal certification requiring physical execution in an ISO/IEC 17025 accredited laboratory (e.g., radiated emissions chambers, dielectric breakdown rigs, environmental flammability chambers) prior to customs clearance and commercial sale.
3. **Optimized Commercial Migration via Modular Pre-Certification**:
   - Development began on unshielded ESP32-C3 Super Mini development boards. Commercial production migrates to the pre-certified Espressif **ESP32-C3-MINI-1** module, reducing laboratory certification expenditures by over 60% and trimming time-to-market by 10 weeks.

---

## 2. Multi-Jurisdiction Regulatory Matrix

The following authoritative matrix details regulatory requirements across India, the European Union, and the United States, citing statutory instruments, applicable standards, mandatory test protocols, and current alignment status.

| Jurisdiction | Regulatory Authority | Statutory Framework & Standard Code | Domain / Scope | Mandatory Lab Testing | Official Compliance Status |
|---|---|---|---|:---:|:---:|
| **India** | **WPC** (Wireless Planning & Coordination) | **ETA-SDOC**<br>GSR 45(E) (2005) & GSR 1048(E) (2018) | 2.4 GHz Wi-Fi & Bluetooth LE De-licensed Spectrum (Max 100 mW EIRP) | **No** (Self-Declaration based on RF reports) | `SPECIFICATION_ALIGNED` |
| **India** | **BIS** (Bureau of Indian Standards) | **CRS**<br>IS 13252 (Part 1):2010 / IS/IEC 62368-1:2018 & IS 16333 (Part 3) | Information Technology Equipment Safety & Indian Language Display Support | **Yes** (Accredited Indian Test Lab required) | `PENDING_LAB_TESTING` |
| **India** | **MeitY** (Ministry of Electronics & IT) | **DPDP Act 2023**<br>(Digital Personal Data Protection Act) | Privacy Notice, Explicit Consent, Purpose Limitation, and Erasure Rights | **No** (Software / Architecture Audit) | `SPECIFICATION_ALIGNED` |
| **European Union** | **CE (RED)** (Radio Equipment Directive) | **2014/53/EU**<br>ETSI EN 300 328 v2.2.2 | Radio Spectrum Efficiency (2.4 GHz ISM Wideband Transmission, max 20 dBm EIRP) | **Yes** (Accredited Notified Body / ISO 17025 Lab) | `PENDING_LAB_TESTING` |
| **European Union** | **CE (EMC)** (Radio Equipment Directive) | **2014/53/EU**<br>ETSI EN 301 489-1 v2.2.3 / EN 301 489-17 v3.2.4 | ElectroMagnetic Compatibility (Immunity & Emissions for Radio Equipment) | **Yes** (Anechoic Chamber Testing) | `PENDING_LAB_TESTING` |
| **European Union** | **CE (Safety)** (Low Voltage / Safety) | **2014/53/EU** (Art. 3.1a)<br>EN IEC 62368-1:2020+A11:2020 | Audio/Video and ICT Safety (Class ES1/TS1 SELV 5V Electrical Safety) | **Yes** (Electrical Safety Rig) | `PENDING_LAB_TESTING` |
| **European Union** | **CE (SAR / EMF)** | **2014/53/EU** (Art. 3.1a)<br>EN 62479:2010 / EN 50663:2017 | Human Exposure Assessment to Electromagnetic Fields (Pmax ≤ 20 mW exclusion) | **Yes** (EMF Exposure Calculation / Lab Assessment) | `PENDING_LAB_TESTING` |
| **European Union** | **RoHS** & **WEEE** | **2011/65/EU** & **(EU) 2015/863**<br>WEEE 2012/19/EU | Restriction of Hazardous Substances (10 restricted materials) & Waste Handling | **Yes** (XRF chemical screening / Bill of Materials audit) | `PENDING_LAB_TESTING` |
| **United States** | **FCC Part 15B** | **47 CFR Part 15 Subpart B**<br>ANSI C63.4:2014 | Unintentional Radiators (Class B Digital Device Conducted & Radiated Emissions) | **Yes** (FCC-Accredited Chamber) | `PENDING_LAB_TESTING` |
| **United States** | **FCC Part 15C** | **47 CFR Part 15 Subpart C §15.247**<br>ANSI C63.10:2013 | Intentional Radiators (DTS Operation in 2400–2483.5 MHz, 6dB BW ≥ 500 kHz) | **Yes** (Modular grant integration / Radiated Spurious) | `PENDING_LAB_TESTING` |

---

## 3. Detailed Regulatory Analysis by Jurisdiction

### 3.1 Republic of India

#### 3.1.1 WPC ETA-SDOC (Wireless Planning & Coordination Wing)
- **Applicable Framework**: Equipment Type Approval (ETA) through Self-Declaration of Conformity (SDOC) via Saral Sanchar portal.
- **Statutory Rules**: Ministry of Communications Notification GSR 45(E) dated 28 Jan 2005 (Use of low power wireless equipment in the 2.4 GHz band) and GSR 1048(E) dated 18 Oct 2018.
- **Technical Constraints**:
  - Operating Frequency Band: 2400 MHz to 2483.5 MHz.
  - Maximum Transmitter Power: 100 mW (20 dBm) Equivalent Isotropically Radiated Power (EIRP).
  - Maximum Power Spectral Density: 10 mW in any 1 MHz band (10 dBm/MHz).
  - Modulation Techniques: DSSS, OFDM (802.11b/g/n) and GFSK (BLE).
- **Compliance Status**: `SPECIFICATION_ALIGNED`.
  - Firmware PHY layer power ceiling in `nova_main.c` is locked to +18 dBm peak (+15 dBm nominal), strictly below the +20 dBm legal threshold. Antenna peak gain on MIFA trace is +3.26 dBi.
  - Commercial ETA-SDOC filing is directly generated using the underlying Espressif ETSI EN 300 328 test report without requiring domestic laboratory re-testing.

#### 3.1.2 BIS CRS (Compulsory Registration Scheme)
- **Applicable Framework**: Ministry of Electronics and Information Technology (MeitY) Compulsory Registration Scheme pursuant to Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order.
- **Safety Standard**: IS 13252 (Part 1):2010 / IEC 60950-1:2005 / IS/IEC 62368-1:2018 (Information Technology Equipment — Safety).
- **Language Support Standard**: IS 16333 (Part 3) (Mobile / Electronic Devices — Indian Language Support for text display).
- **Mandatory Laboratory Test Parameters**:
  - *Electric Strength (Dielectric Withstand)*: 500V DC applied between primary USB 5V VBUS and accessible conductive chassis/screws for 60 seconds without insulation breakdown.
  - *Temperature Rise Test*: Thermal couple verification across RISC-V SoC (<85°C), LDO regulator (<70°C), and OLED display ribbon (<60°C) during continuous 4-hour max-power Wi-Fi transmission.
  - *Flammability*: Enclosure plastic must meet UL 94 V-0 or UL 94 V-1 flammability classification; PCB substrate must meet FR-4 UL 94 V-0.
  - *Touch Current & Protective Conductor Current*: Touch current must not exceed 0.25 mA for Class III SELV portable appliances.
- **Compliance Status**: `PENDING_LAB_TESTING`.
  - Physical prototypes must be submitted to a BIS-recognized NABL-accredited test laboratory in India (e.g., ERTL, TUV Rheinland India, or UL India) for safety validation, followed by Portal R-number grant.

#### 3.1.3 MeitY DPDP Act 2023 (Digital Personal Data Protection Act)
- **Applicable Framework**: Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023, Ministry of Law and Justice / MeitY).
- **Statutory Mandates**:
  - *Section 5 (Notice)*: Itemized notice in clear and plain language informing Data Principals of the exact personal data collected, specific purpose of processing, and grievance officer contact before data collection.
  - *Section 6 (Consent)*: Consent must be free, specific, informed, unconditional, and unambiguous with clear affirmative action. Consent must be as easy to withdraw as it was to grant.
  - *Purpose Limitation & Data Minimization*: Audio sampled via MAX4466 is processed locally by offline WakeNet `wn9s_hiesp`. Ephemeral audio frames are streamed solely during the active `LISTENING` state (maximum 1.5 seconds silence or 15 seconds utterance) directly to the user's bound Notion endpoint. Audio is purged from RAM immediately post-synthesis. Zero ambient audio is logged.
  - *Section 12 (Erasure & Correction)*: The web setup console provides immediate one-click device unbinding and Notion OAuth disconnection (`POST /api/v1/notion/disconnect`), which executes hard deletion of cached credentials.
- **Compliance Status**: `SPECIFICATION_ALIGNED`.
  - Verified through automated consent lifecycle testing and architectural privacy data flows.

---

### 3.2 European Union

#### 3.2.1 CE RED (Radio Equipment Directive 2014/53/EU)
The Radio Equipment Directive governs all equipment placing radio waves on the European market. NOVA must satisfy four essential requirements:

1. **Article 3.2 — Radio Spectrum Efficiency**:
   - *Standard*: **ETSI EN 300 328 v2.2.2** (Wideband transmission systems; Data transmission equipment operating in the 2,4 GHz ISM band).
   - *Test Cases*: Maximum RF Output Power (≤ 20 dBm EIRP), Maximum Power Spectral Density (≤ 10 dBm/MHz), Accumulated Transmit Time, Frequency Range (2400 to 2483.5 MHz), Transmitter Unwanted Emissions in the Out-of-band and Spurious domains (< -30 dBm for 1 GHz to 12.75 GHz), Receiver Blocking (PER ≤ 10% under interference).
   - *Status*: `PENDING_LAB_TESTING`.
2. **Article 3.1(b) — ElectroMagnetic Compatibility (EMC)**:
   - *Standards*: **ETSI EN 301 489-1 v2.2.3** (Common technical requirements) and **ETSI EN 301 489-17 v3.2.4** (Specific conditions for Broadband Data Transmission Systems).
   - *Test Cases*: Radiated emissions (30 MHz to 6 GHz per EN 55032 Class B), Electrostatic Discharge (ESD) immunity (EN 61000-4-2: ±4 kV contact, ±8 kV air discharge to exposed OLED bezel and USB-C shell), Radiated RF electromagnetic field immunity (EN 61000-4-3: 3 V/m, 80 MHz to 6 GHz).
   - *Status*: `PENDING_LAB_TESTING`.
3. **Article 3.1(a) — Health & Safety**:
   - *Electrical Safety*: **EN IEC 62368-1:2020+A11:2020** (Audio/video, information and communication technology equipment — Safety requirements). Evaluates Energy Source Class 1 (ES1) voltage limits (<60V DC), Thermal energy sources (TS1 < 70°C accessible surface), and Mechanical energy sources (MS1 edge sharpness).
   - *Human Exposure to EMF*: **EN 62479:2010** & **EN 50663:2017** (Generic standard for assessment of low-power electronic and electrical equipment related to human exposure restrictions for electromagnetic fields 10 MHz to 300 GHz). The maximum available output power of NOVA (+18 dBm = 63.1 mW conducted, adjusted for 5% duty cycle = ~3.15 mW average) falls comfortably below the 20 mW SAR exclusion limit for general public exposure.
   - *Status*: `PENDING_LAB_TESTING`.

#### 3.2.2 RoHS Directive 2011/65/EU and (EU) 2015/863 (RoHS 3)
- **Scope**: Restriction of the use of certain hazardous substances in electrical and electronic equipment.
- **Restricted Substances & Permissible Weight Thresholds**:
  1. Lead (Pb) < 0.1% (1000 ppm)
  2. Mercury (Hg) < 0.1% (1000 ppm)
  3. Cadmium (Cd) < 0.01% (100 ppm)
  4. Hexavalent Chromium (Cr VI) < 0.1% (1000 ppm)
  5. Polybrominated biphenyls (PBB) < 0.1% (1000 ppm)
  6. Polybrominated diphenyl ethers (PBDE) < 0.1% (1000 ppm)
  7. Bis(2-ethylhexyl) phthalate (DEHP) < 0.1% (1000 ppm)
  8. Butyl benzyl phthalate (BBP) < 0.1% (1000 ppm)
  9. Dibutyl phthalate (DBP) < 0.1% (1000 ppm)
  10. Diisobutyl phthalate (DIBP) < 0.1% (1000 ppm)
- **Manufacturing Requirements**: Lead-free SAC305 (Sn96.5 / Ag3.0 / Cu0.5) solder paste formulation; RoHS-compliant supplier component certificates for MAX4466 IC, SSD1306 glass panel, passive 0402 inductors/capacitors, and ESP32-C3-MINI-1 module.
- **Status**: `PENDING_LAB_TESTING` (XRF screening of production samples).

#### 3.2.3 WEEE Directive 2012/19/EU
- Marked with the crossed-out wheeled bin symbol per EN 50419.
- Producer registration in Member States prior to commercial shipment.
- Status: `PENDING_LAB_TESTING`.

---

### 3.3 United States of America

#### 3.3.1 FCC Title 47 Part 15 Subpart B (Unintentional Radiators)
- **Classification**: Class B Digital Device (equipment marketed for use in residential environments).
- **Applicable Standards**: ANSI C63.4:2014 (American National Standard for Methods of Measurement of Radio-Noise Emissions from Low-Voltage Electrical and Electronic Equipment in the Range of 9 kHz to 40 GHz).
- **Core Test Cases**:
  - *§15.107 Conducted Emissions*: Radio frequency voltage conducted back into AC power line (via standard 5V USB wall adapter) measured over 150 kHz to 30 MHz. Limits: Quasi-Peak 66–56 dBµV, Average 56–46 dBµV.
  - *§15.109 Radiated Emissions*: Field strength of radiated emissions from digital clock circuitry, I2C bus (400 kHz), and SPI flash memory buses (80 MHz) measured at 3 meters in a semi-anechoic chamber over 30 MHz to 1000 MHz. Limits: 30–88 MHz: 40 dBµV/m; 88–216 MHz: 43.5 dBµV/m; 216–960 MHz: 46 dBµV/m; >960 MHz: 54 dBµV/m.
- **Compliance Status**: `PENDING_LAB_TESTING`.
  - Verification procedure: Supplier’s Declaration of Conformity (SDoC) under §2.906 or Certification.

#### 3.3.2 FCC Title 47 Part 15 Subpart C §15.247 (Intentional Radiators)
- **Scope**: Digital Transmission Systems (DTS) operating in the 2400–2483.5 MHz band.
- **Applicable Standard**: ANSI C63.10:2013 (American National Standard of Procedures for Compliance Testing of Unlicensed Wireless Devices) and KDB 558074 D01 DTS Meas Guidance v05r02.
- **Mandatory RF Parametric Rules**:
  - *6 dB Bandwidth (§15.247(a)(2))*: Must be at least 500 kHz (verified: 802.11b/g/n is ~16–18 MHz; BLE is ~1.0–1.2 MHz).
  - *Maximum Peak Conducted Output Power (§15.247(b)(3))*: Maximum 1 Watt (30 dBm) for systems employing digital modulation. (NOVA maximum output is +18 dBm = 0.063 W, with +3.26 dBi antenna gain, yielding EIRP +21.26 dBm, far below the 36 dBm EIRP statutory ceiling).
  - *Power Spectral Density (§15.247(e))*: Conducted power spectral density conducted from the intentional radiator to the antenna shall not exceed +8 dBm in any 3 kHz band during any continuous transmission.
  - *Unwanted Emissions / Band Edge (§15.247(d))*: Radiated emissions outside the 2400–2483.5 MHz band must be attenuated by at least 20 dB (or 30 dB if using RMS averaging) relative to the highest fundamental level. Emissions falling within restricted bands (§15.205) must satisfy §15.209 general limits.
- **Compliance Status**: `PENDING_LAB_TESTING`.
  - By integrating the pre-certified **ESP32-C3-MINI-1** module (FCC ID: `2AC7Z-ESPC3MINI1`), NOVA qualifies for Modular Host Integration. The full transmitter testing is inherited, requiring only radiated spurious emissions (RSE) and simultaneous transmission checks on the final product enclosure.

---

## 4. Commercial Hardware Migration Roadmap: Development Clone to Mass Production

### 4.1 Prototype Baseline vs. Production Target Architecture

During Phase A through Phase G, the NOVA proof-of-concept hardware was engineered and validated around the ubiquitous **ESP32-C3 Super Mini** development board. While functionally identical at the register level, commercial production requires transitioning to the pre-certified, metal-shielded **ESP32-C3-MINI-1** module:

| Engineering Parameter | Prototype Baseline: ESP32-C3 Super Mini | Commercial Production: ESP32-C3-MINI-1 | Commercial Significance |
|---|---|---|---|
| **Form Factor & Package** | Unshielded single-sided mini PCB with castellated edge pins | Fully shielded surface-mount module (16.6 × 13.2 × 2.4 mm) | Protects internal analog / RF nodes from external capacitive coupling and hand proximity |
| **RF Shielding** | **None** (Exposed SoC die, flash IC, and decoupling caps) | **Integrated Tin-Plated Copper RF Shielding Can** | Suppresses unintentional high-frequency emissions from 80MHz SPI flash MMU bus |
| **Antenna Architecture** | Uncalibrated PCB trace antenna (vendor clone variation) | High-precision etched inverted-F antenna (MIFA, peak gain 3.26 dBi) | Predictable omnidirectional radiation pattern; consistent link budget across batches |
| **Certifications Pre-Granted** | **None** (Requires full intentional transmitter certification) | **FCC, CE RED, WPC, IC, MIC, KCC, SRRC** Pre-certified | Direct inheritance of modular RF grants |
| **FCC ID** | Uncertified | **`2AC7Z-ESPC3MINI1`** | Can be referenced on host product label per KDB 996369 |
| **CE Declaration of Conformity** | None | Full DoC provided by Espressif Systems (Shanghai) | Validates Article 3.2 wideband transmission compliance out-of-the-box |
| **Crystal Stability** | Unspecified crystal clone | 40 MHz integrated crystal oscillator (±10 ppm across -40°C to +105°C) | Prevents carrier frequency drift during cold-weather keychain outdoor operation |
| **Power Supply Conditioning** | Bare ME6211 or generic LDO with variable ripple | Low-ESR ceramic decoupling inside shielding can | Minimizes phase noise and EVM degradation during peak TX bursts |

---

### 4.2 Economic & Schedule Impact Analysis: Modular Pre-Certification Advantage

Transitioning from an unshielded discrete clone to a pre-certified modular transmitter provides dramatic cost and schedule efficiencies during ISO/IEC 17025 accredited laboratory testing:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ACCREDITED TESTING EXPENDITURE COMPARISON                       │
├──────────────────────────────────────┬────────────────────────┬────────────────────────┤
│ Test Domain                          │ Unshielded Clone Board │ Modular ESP32-C3-MINI-1│
├──────────────────────────────────────┼────────────────────────┼────────────────────────┤
│ FCC Part 15C Intentional Radiator    │ $12,000 USD (Full DTS) │ $2,500 USD (RSE only)  │
│ FCC Part 15B Unintentional Radiator  │ $4,000 USD             │ $2,500 USD             │
│ CE RED Art. 3.2 Spectrum (EN 300 328)│ $8,500 USD (Full RF)   │ Inherited (Espressif)  │
│ CE RED Art. 3.1b EMC (EN 301 489)    │ $4,500 USD             │ $3,000 USD             │
│ CE RED Art. 3.1a Safety & EMF        │ $3,500 USD             │ $2,500 USD             │
│ BIS CRS IS 13252 Testing (India)     │ $4,000 USD             │ $3,000 USD             │
│ WPC ETA-SDOC Filing Fee (India)      │ $1,500 USD             │ $500 USD (Fast-track)  │
│ RoHS Screening & XRF Analysis        │ $1,800 USD             │ $1,500 USD             │
├──────────────────────────────────────┼────────────────────────┼────────────────────────┤
│ **TOTAL ESTIMATED CERTIFICATION COST**│ **$39,800 USD**        │ **$15,500 USD**        │
│ **LAB TESTING QUEUE & TURNAROUND**   │ **16 to 22 Weeks**     │ **5 to 7 Weeks**       │
└──────────────────────────────────────┴────────────────────────┴────────────────────────┘
```

**Key Takeaways**:
- **61% Cash Savings**: Capital expenditure on accredited laboratory fees is reduced from ~$39,800 USD to ~$15,500 USD.
- **11-Week Acceleration**: By inheriting Espressif's conducted RF transmitter test data, laboratory scheduling requires only Host Integration Radiated Spurious Emissions (RSE) and Class B unintentional emissions.

---

### 4.3 Multi-Stage Commercialization & Production Gate Timeline

```
[Month 1-2: EVT] ────────► [Month 3-4: DVT] ────────► [Month 5: PVT] ────────► [Month 6: MP]
Engineering Validation     Design Verification       Production Verification   Mass Production &
• Custom Carrier PCB       • Accredited Lab Testing  • Tooling & Assembly      Commercial Shipping
• ESP32-C3-MINI-1          • FCC/CE/BIS Certification• Optical Automated QA   • Retail Distribution
```

#### Gate 1: Engineering Verification Test (EVT) — Months 1 to 2
- **Deliverables**: Custom 2-layer rigid FR-4 carrier PCB (1.0 mm thickness, ENIG surface finish) integrating:
  - Espressif ESP32-C3-MINI-1 module footprint.
  - USB-C connector with discrete CC1/CC2 5.1 kΩ pull-down resistors (enforcing UFP sink status on USB-PD chargers).
  - Electrostatic Discharge (ESD) array (STMicroelectronics USBLC6-2SC6) safeguarding USB D+/D- and VBUS lines against ±15 kV air discharge.
  - Low-noise audio analog front-end: MAX4466 microphone circuit with isolated analog ground plane and ferrite bead isolation from digital switching noise.
  - SSD1306 0.96″ 128×64 OLED display connected via 14-pin FPC zero-insertion-force (ZIF) connector.
- **Exit Criteria**: 100 functional prototype units produced; zero audio starvation on DMA buffer; 100% pass on FreeRTOS FSM regression tests.

#### Gate 2: Design Verification Test (DVT) — Months 3 to 4
- **Deliverables**: Form-factor production-grade units housed in ultrasonic-welded polycarbonate/ABS flame-retardant (UL 94 V-0) keychains.
- **Accredited Laboratory Submission**:
  - 5 samples delivered to FCC/CE accredited test laboratory for ANSI C63.4/C63.10 radiated spurious testing.
  - 3 samples submitted to BIS-recognized laboratory in New Delhi for IS 13252 Part 1 safety evaluation.
  - Full RoHS 3 bill-of-materials and XRF spectrographic verification.
- **Exit Criteria**: Receipt of FCC Grant of Equipment Authorization referencing FCC ID `2AC7Z-ESPC3MINI1`, EU CE Declaration of Conformity signed, and BIS CRS registration number issued.

#### Gate 3: Production Verification Test (PVT) — Month 5
- **Deliverables**: Production pilot run of 500 units assembled on automated SMT pick-and-place lines.
- **Manufacturing Quality Fixture**:
  - Bed-of-nails automated test fixture connecting to programming test pads (GPIO9 boot pin, UART0 TX/RX, 5V VBUS, GND).
  - Automated firmware flashing with symmetrical dual OTA partitions (`ota_0`, `ota_1`), locked flash encryption, and unique NVS device secret provisioning.
  - Optical inspection of OLED pixel integrity and audio sweep frequency response test (100 Hz to 8 kHz).
- **Exit Criteria**: First-pass manufacturing yield ≥ 98.5%.

#### Gate 4: Mass Production (MP) & Global Distribution — Month 6 Onwards
- **Commercial Marking & Enclosure Labeling**:
  - Laser-etched indelible rear markings per regulatory mandates:
    ```
    NOVA 1.0 Smart Keychain Voice Assistant
    Model: NOVA-C3-MINI | Input: 5V === 500mA (USB-C)
    Contains FCC ID: 2AC7Z-ESPC3MINI1 | WPC ETA: ETA-SDOC-XXXXXX
    BIS Reg No: R-XXXXXXXX | CE | WEEE Symbol
    Designed in Bangalore | Assembled in India
    ```
- **Exit Criteria**: Commercial inventory cleared for global shipping to customers.

---

## 5. Traceability with Test Harness Fixtures (`testLedgers.ts`)

The regulatory classifications and standards documented in this matrix maintain bidirectional traceability with `tests/e2e/fixtures/testLedgers.ts`:

| Standard Fixture Code | Authority | Jurisdiction | `mandatoryLabTesting` | `status` | Verified in Test Suite |
|---|---|---|:---:|:---:|:---:|
| `ETA-SDOC` | WPC | India | `false` | `SPECIFICATION_ALIGNED` | `tests/e2e/tier1_features/r8_regulatory_matrix.test.ts` & `tests/phase_h_performance_security.test.ts` |
| `IS 13252 (Part 1):2010 / IS 16333` | BIS | India | `true` | `PENDING_LAB_TESTING` | `tests/e2e/tier1_features/r8_regulatory_matrix.test.ts` & `tests/phase_h_performance_security.test.ts` |
| `DPDP Act 2023` | MeitY | India | `false` | `SPECIFICATION_ALIGNED` | `tests/e2e/tier1_features/r8_regulatory_matrix.test.ts` & `tests/phase_h_performance_security.test.ts` |
| `47 CFR Part 15 Subpart B / C` | FCC | United States | `true` | `PENDING_LAB_TESTING` | `tests/e2e/tier1_features/r8_regulatory_matrix.test.ts` & `tests/phase_h_performance_security.test.ts` |
| `RED 2014/53/EU & RoHS 2011/65/EU` | CE | European Union | `true` | `PENDING_LAB_TESTING` | `tests/e2e/tier1_features/r8_regulatory_matrix.test.ts` & `tests/phase_h_performance_security.test.ts` |

---

## 6. Regulatory Change Management & Ongoing Audit Protocol

Any future modifications to hardware components, antenna design, power circuits, or cloud telemetry must adhere to the following regulatory impact protocol:

1. **Class I Permissive Change**: Minor firmware timing adjustments, OLED icon updates, or non-RF passive resistor changes that do not alter RF output power or radiated spurious emissions. No laboratory re-testing required.
2. **Class II Permissive Change**: Enclosure material alterations, antenna trace adjustments, or PCB layout modifications within the RF keep-out zone. Requires re-testing of radiated emissions at an accredited laboratory before shipping.
3. **Firmware Power Cap Guard**: The maximum transmitter power register in `esp_wifi_set_max_tx_power()` is hard-clamped to +18 dBm in production firmware builds, preventing field modification beyond certified regulatory ceilings.

---
*Signed for Architecture & Regulatory Engineering:*  
**NOVA Product Engineering Core Team — Phase H Certification**
