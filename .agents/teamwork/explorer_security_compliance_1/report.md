# NOVA 1.0 — Security Threat Model, Privacy Audit & Regulatory Compliance Baseline

**Author**: `explorer_security_compliance_1`  
**Role**: Security, Privacy, Threat-Modeling and Regulatory Specialist / Spec Miner  
**Date**: October 16, 2026  
**Target Hardware**: ESP32-C3 Super Mini (QFN32 revision v0.4, 4MB Flash, MAC: `48:F6:EE:17:34:D8` on `COM5`)  
**Web & Cloud Stack**: Next.js / TypeScript (`buynovastore.vercel.app`), PostgreSQL / Supabase (`aws-0-us-east-1.pooler.supabase.com:6543`), Notion API  

---

## 1. Executive Summary

This report establishes the baseline security threat model, privacy capability audit, and jurisdiction-specific regulatory compliance requirements across the entire NOVA product ecosystem. 

Our investigation combined static source code analysis across the web platform (`d:\Personal projects\nova`) and embedded firmware repository (`C:\NOVA-IDF\nova_wake_test`), dynamic dependency scanning (`npm audit`), and **direct, non-destructive empirical probing of the live physical hardware on `COM5`** using ESP-IDF security tooling (`esptool.py` and `espefuse.py`).

### Critical Security Findings at a Glance
1. **Physical Exposure (P0 - High Severity)**: Live eFuse interrogation confirms `SECURE_BOOT_EN = False` and `SPI_BOOT_CRYPT_CNT = Disable`. Flash Encryption and Secure Boot V2 are completely inactive. Any physical actor can dump the SPI flash over USB-Serial/JTAG (`COM5`) to extract cleartext Wi-Fi credentials (`wifi_ssid`, `wifi_pass`), the persistent bearer `dev_key`, and the hardcoded device bootstrap secret.
2. **Local Wi-Fi Network Exposure (P0 - High Severity)**: In `nova_net.c`, the Wi-Fi provisioning SoftAP is explicitly set to `.authmode = WIFI_AUTH_OPEN` and the embedded web server runs on plain HTTP (`port 80`). Although `API_CONTRACT.md` claims "Local password-protected SoftAP", anyone within 2.4 GHz radio range can connect without a password and sniff home Wi-Fi credentials in plaintext during setup.
3. **Supabase Database Architecture Vulnerability (P0 - High Severity)**: In `schema.sql`, **not a single table has Row Level Security (RLS) enabled**. If Supabase PostgREST endpoints are exposed with the project's public anonymous key, external attackers can completely bypass API route authorization (`authenticateDeviceRequest`) and execute arbitrary read/write queries against `devices`, `wifi_profiles`, `notion_authorizations`, and `device_bootstrap_credentials`.
4. **Database Transit TLS Insecurity (P1 - High Severity)**: In `api/index.ts:17`, the PostgreSQL connection pool is initialized with `ssl: { rejectUnauthorized: false }`, disabling certificate validation on database queries.
5. **Supply Chain Vulnerabilities (P1 - Moderate to High)**: `npm audit` reveals 11 vulnerabilities (10 High, 1 Moderate) in `@vercel/node` / `undici`, including WebSocket DoS, CRLF injection, and HTTP request smuggling.
6. **Capability & Marketing Honesty Gap**: The hardware is powered solely by 5V USB and has no battery or voltage measurement circuit. However, firmware sends a fake hardcoded heartbeat of `4150 mV`, and frontend components display `100% Battery`. Furthermore, while marketing references voice notes and voice switching, `nova_voice.c` returns `NOVA_VOICE_UNAVAILABLE` with no speech processor or cloud audio streaming pipeline implemented.

---

## 2. Threat Model & Attack Surface Mapping (STRIDE & DREAD)

### 2.1 Threat Scoring Methodology
- **STRIDE**: **S**poofing, **T**ampering, **R**epudiation, **I**nformation Disclosure, **D**enial of Service, **E**levation of Privilege.
- **DREAD**: Scored 1 to 10 on **D**amage potential, **R**eproducibility, **E**xploitability, **A**ffected users, **D**iscoverability. Total score out of 50:
  - **40 – 50**: Critical Severity (Immediate mitigation required before any production release).
  - **28 – 39**: High Severity (Mitigation required before customer test group).
  - **15 – 27**: Medium Severity.
  - **< 15**: Low Severity.

---

### 2.2 Attack Surface 1: Physical & Hardware Interconnects

#### Empirical Hardware Probe Results (`COM5`)
Direct non-destructive interrogation of the hardware via `espefuse.py summary --port COM5` yielded the following authoritative findings:
```text
Hardware: ESP32-C3 (QFN32, revision v0.4, 4MB embedded XMC flash)
Factory MAC: 48:f6:ee:17:34:d8
SECURE_BOOT_EN: False (0b0)
SPI_BOOT_CRYPT_CNT: Disable (0b000)
DIS_PAD_JTAG: False (0b0) - Hard JTAG enabled
DIS_USB_JTAG: False (0b0) - USB JTAG enabled
DIS_USB_SERIAL_JTAG_DOWNLOAD_MODE: False - USB Download boot mode active
ENABLE_SECURITY_DOWNLOAD: False - Insecure download mode enabled
BLOCK_KEY0 to BLOCK_KEY5: All 00 00 ... (unburned USER keys)
```

#### Detailed Physical Vectors
1. **SPI Flash Readout via esptool / SPI Sniffing**:
   - *STRIDE*: Information Disclosure / Tampering
   - *Observation*: `partitions.csv` allocates `nvs` at `0x9000` (24KB) without the `encrypted` flag. `sdkconfig:653` leaves `CONFIG_SECURE_FLASH_ENC_ENABLED` unset.
   - *Impact*: Connecting a USB-C cable to COM5 allows executing `esptool.py --port COM5 read_flash 0x0 0x400000 dump.bin`. The attacker extracts:
     - Cleartext Wi-Fi SSID and WPA2/WPA3 password (`nova_state.c:284-294`).
     - Persistent bearer device token `dev_key`.
     - Device bootstrap secret `boot_secret`.
   - *DREAD Score*: D=9, R=10, E=9, A=10, D=9 -> **47 / 50 (Critical)**.
2. **Firmware Modification / Malicious Flashing (Lack of Secure Boot)**:
   - *STRIDE*: Tampering / Elevation of Privilege
   - *Observation*: Secure Boot V2 is disabled (`CONFIG_SECURE_BOOT is not set`).
   - *Impact*: An attacker with physical possession of the keychain can reflash modified firmware that streams microphone audio from MAX4466 directly to an attacker-controlled server or implants malware on the user's local network.
   - *DREAD Score*: D=10, R=10, E=8, A=10, D=8 -> **46 / 50 (Critical)**.
3. **Hardcoded Secrets in Source / Binary (.rodata)**:
   - *STRIDE*: Spoofing / Elevation of Privilege
   - *Observation*: `nova_state.c:98-123` hardcodes the factory bootstrap secret:
     `strncpy(s_bootstrap_secret, "nova_c3_5c20dc4239fca9ec_boot_8f9c2d1e4a7b3c6d", sizeof(s_bootstrap_secret) - 1);`
   - *Impact*: Anyone with access to the binary or git repo can impersonate device `nova-c3-5c20dc4239fca9ec` against `POST /api/v1/devices/bootstrap` or `/recover`, seize the device session, and intercept user vault data.
   - *DREAD Score*: D=8, R=10, E=9, A=6, D=9 -> **42 / 50 (Critical)**.

---

### 2.3 Attack Surface 2: Local Network & Provisioning

1. **Unencrypted SoftAP Wi-Fi Beacon & Radio Sniffing**:
   - *STRIDE*: Information Disclosure
   - *Observation*: `nova_net.c:343` configures:
     `.authmode = WIFI_AUTH_OPEN`
   - *Impact*: During setup, NOVA creates an open Wi-Fi network `NOVA-Setup-XXXX`. Any nearby device (within ~100m) can associate without authentication. 802.11 frames are unencrypted at the link layer.
   - *DREAD Score*: D=8, R=10, E=9, A=10, D=9 -> **46 / 50 (Critical)**.
2. **Unencrypted HTTP Captive Portal Credential Ingestion**:
   - *STRIDE*: Information Disclosure / Tampering
   - *Observation*: `nova_net.c:280` sets `config.server_port = 80`. The setup form (`nova_net.c:162`) transmits Wi-Fi credentials via plain HTTP:
     `fetch('/api/wifi', { method:'POST', body: JSON.stringify({ ssid: s, password: p }) })`
   - *Impact*: Since the radio link is OPEN and the transport is plain HTTP, Wi-Fi credentials (SSID and cleartext pre-shared key) are broadcast unencrypted over the air. Any passive packet capture extracts the home Wi-Fi password.
   - *DREAD Score*: D=9, R=10, E=10, A=10, D=10 -> **49 / 50 (Critical)**.
3. **Captive Portal Evil Twin & DNS Spoofing**:
   - *STRIDE*: Spoofing / Tampering
   - *Observation*: No mutual authentication between setup client and hardware.
   - *Impact*: An attacker can broadcast a fake `NOVA-Setup-XXXX` AP with stronger signal strength, present an identical setup page, and harvest victim Wi-Fi credentials.
   - *DREAD Score*: D=8, R=8, E=7, A=8, D=8 -> **39 / 50 (High)**.
4. **Hardcoded Epoch Timestamp Fallback for SNTP**:
   - *STRIDE*: Tampering / Repudiation
   - *Observation*: `nova_net.c:573`:
     `struct timeval tv = { .tv_sec = 1792106878LL, .tv_usec = 0 }; settimeofday(&tv, NULL);`
   - *Impact*: If SNTP fails (e.g. UDP port 123 blocked), time is pinned to `2026-10-15 23:27:58 UTC`. An attacker can replay expired TLS certificates that were valid in October 2026 or bypass expiration checks.
   - *DREAD Score*: D=6, R=7, E=6, A=6, D=5 -> **30 / 50 (High)**.

---

### 2.4 Attack Surface 3: Cloud, API & Database

1. **Supabase Row Level Security (RLS) Complete Absence**:
   - *STRIDE*: Elevation of Privilege / Information Disclosure / Tampering
   - *Observation*: In `schema.sql`, none of the 12 tables (`devices`, `device_bootstrap_credentials`, `wifi_profiles`, `claim_tokens`, `pairing_sessions`, `notion_authorizations`, `device_actions`, `rate_limits`, `oauth_states`, `launch_subscribers`, `users`, `user_devices`) contain `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
   - *Impact*: Supabase by default exposes a public PostgREST API at `https://<project-ref>.supabase.co/rest/v1/`. Anyone with the public `anon` key (bundled in web frontends) can query the database directly, bypassing Vercel API routes and dumping:
     - User accounts and emails (`users`, `launch_subscribers`).
     - Stored Wi-Fi profile metadata and AES-GCM encrypted passwords (`wifi_profiles`).
     - Encrypted Notion OAuth access tokens (`notion_authorizations`).
     - Device secrets and bootstrap hashes (`devices`, `device_bootstrap_credentials`).
   - *DREAD Score*: D=10, R=10, E=9, A=10, D=8 -> **47 / 50 (Critical)**.
2. **Disabled TLS Certificate Validation on Database Connection**:
   - *STRIDE*: Information Disclosure / Tampering
   - *Observation*: `api/index.ts:17`:
     `ssl: { rejectUnauthorized: false }`
   - *Impact*: Connections from Vercel serverless lambdas to the Supabase pooler do not verify the server's certificate. A cloud network adversary or DNS/BGP hijacker can perform TLS interception on database queries and exfiltrate secrets.
   - *DREAD Score*: D=9, R=7, E=6, A=10, D=6 -> **38 / 50 (High)**.
3. **Application-Level IDOR vs Database Isolation**:
   - *STRIDE*: Elevation of Privilege
   - *Observation*: In `api/index.ts:551-594`, `authenticateDeviceRequest` verifies that the `Bearer` token matches either a hashed `device_secret` or an active `pairing_sessions` entry belonging to `targetDeviceId`. If there is a mismatch, it returns 403 `FORBIDDEN`.
   - *Assessment*: IDOR prevention is well-engineered at the Node.js API layer. However, because RLS is missing at the database layer (Vector 1 above), the API security perimeter is porous.
   - *DREAD Score*: D=7, R=6, E=5, A=8, D=6 -> **32 / 50 (High)**.
4. **Notion OAuth Token Permanence**:
   - *STRIDE*: Elevation of Privilege / Information Disclosure
   - *Observation*: Notion OAuth tokens do not expire and Notion does not provide refresh tokens. In `api/index.ts:2816`, the decrypted token is transmitted in plaintext `Bearer` headers to `api.notion.com`.
   - *Impact*: If a token leaks from server memory, logs, or backup snapshots, it grants perpetual read/write access to the user's Notion workspace until revoked manually by the user in Notion settings.
   - *DREAD Score*: D=8, R=5, E=5, A=7, D=5 -> **30 / 50 (High)**.

---

### 2.5 Attack Surface 4: Dependency Supply Chain

1. **npm Ecosystem Vulnerabilities (`d:\Personal projects\nova`)**:
   - *Command Output*: `npm audit --json` identified **11 vulnerabilities** (10 High, 1 Moderate).
   - *Root Component*: `undici` via `@vercel/node@^24.0.0`:
     - `GHSA-vrm6-8vpv-qv8q` (High, CVSS 7.5): Unbounded memory consumption in WebSocket permessage-deflate decompression.
     - `GHSA-v9p9-hfj2-hcw8` (High, CVSS 7.5): Unhandled exception in WebSocket client due to invalid `server_max_window_bits`.
     - `GHSA-vxpw-j846-p89q` (High, CVSS 7.5): DoS via fragment count bypass.
     - `GHSA-2mjp-6q6p-2qxm` (Moderate, CVSS 6.5): HTTP request/response smuggling.
     - `GHSA-4992-7rv2-5pvq` (Moderate, CVSS 4.6): CRLF injection via `upgrade` option.
     - `GHSA-p88m-4jfj-68fv` (Moderate, CVSS 5.9): HTTP header injection via Set-Cookie percent-decoding.
   - *DREAD Score*: D=7, R=8, E=6, A=10, D=7 -> **38 / 50 (High)**.
2. **ESP-IDF Managed Components (`C:\NOVA-IDF\nova_wake_test`)**:
   - *Manifest*: `main/idf_component.yml` lists:
     - `espressif/esp-sr: ~2.6.0` (WakeNet 9s voice recognition model)
     - `espressif/qrcode: ^0.2.0`
     - `espressif/cjson: 1.7.19~2`
   - *Risk*: Fixed-buffer JSON handling in `nova_net.c:214` (`char content[256]`) and dynamic allocation in `connect_task` (`malloc(alloc_len)`). While cJSON version is modern, unvalidated inputs could trigger memory exhaustion on the 400KB SRAM ESP32-C3.
   - *DREAD Score*: D=6, R=5, E=5, A=6, D=5 -> **27 / 50 (Medium)**.

---

## 3. Threat Model Summary Matrix (DREAD Scored)

| # | Threat Vector | STRIDE | D | R | E | A | D | Total | Severity | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| T1 | Unencrypted SoftAP & Plaintext HTTP Setup | Info Disclosure | 9 | 10 | 10 | 10 | 10 | **49** | Critical | Active Vulnerability |
| T2 | SPI Flash Dump (No Flash Encryption) | Info Disclosure | 9 | 10 | 9 | 10 | 9 | **47** | Critical | Active Vulnerability |
| T3 | Missing Supabase Row Level Security (RLS) | Elev. of Privilege | 10 | 10 | 9 | 10 | 8 | **47** | Critical | Active Vulnerability |
| T4 | Arbitrary Firmware Flashing (No Secure Boot) | Tampering | 10 | 10 | 8 | 10 | 8 | **46** | Critical | Active Vulnerability |
| T5 | Hardcoded Factory Bootstrap Secret in Code | Spoofing | 8 | 10 | 9 | 6 | 9 | **42** | Critical | Active Vulnerability |
| T6 | Captive Portal Evil Twin / DNS Spoofing | Spoofing | 8 | 8 | 7 | 8 | 8 | **39** | High | Active Vulnerability |
| T7 | Disabled Database Connection TLS Verification | Tampering | 9 | 7 | 6 | 10 | 6 | **38** | High | Active Vulnerability |
| T8 | Undici / @vercel/node Supply Chain CVEs | DoS / Smuggling | 7 | 8 | 6 | 10 | 7 | **38** | High | Active Vulnerability |
| T9 | Static Hardcoded SNTP Fallback Epoch | Tampering | 6 | 7 | 6 | 6 | 5 | **30** | High | Active Vulnerability |
| T10 | Perpetual Notion Access Token Exposure | Info Disclosure | 8 | 5 | 5 | 7 | 5 | **30** | High | Architecture Risk |
| T11 | Embedded cJSON Heap Exhaustion | DoS | 6 | 5 | 5 | 6 | 5 | **27** | Medium | Mitigated via Length Checks |

---

## 4. Privacy & Capability Claims Audit (The Honesty Ledger)

To maintain absolute commercial integrity and prevent deceptive capability representations, we audited all codebase claims against physical hardware reality:

| Claimed Capability | Source Code / Marketing Claims | Physical Hardware Observation | Honesty Audit Verdict | Required Remediation |
|---|---|---|---|---|
| **Battery Life & Monitoring** | Marketing mentions "1,000 mAh Li-Po cell" (`FaqSection.tsx`). `SetupExperience.tsx:1038` displays `{deviceData?.batteryPercent ?? 100}%`. `main.c:663` sends `batteryMv: 4150`. | ESP32-C3 Super Mini has NO battery, NO battery charger IC, NO voltage divider on ADC, and is powered solely via USB-C 5V. | **SIMULATED / FALSE** | Scrub simulated battery percentage from UI. Display "USB Powered (5V)". Gate battery telemetry behind physical hardware sensor availability. |
| **Voice Note Recording & Cloud Sync** | Marketing promises voice memo capture into Notion. Web UI has a "Sync Test" button. | MAX4466 microphone is connected to ADC GPIO1 for WakeNet wake-word recognition only. `nova_voice.c:9` returns `NOVA_VOICE_UNAVAILABLE`. No cloud speech-to-text pipeline exists. "Sync Test" merely inserts boilerplate text via web button. | **PARTIALLY SIMULATED** | Update UI and disclosures: WakeNet ("Hi ESP") local trigger is verified; speech memo transcription is unbuilt. Disclose that test sync is a backend connectivity check. |
| **Voice Network Switching** | `API_CONTRACT.md:476` specifies voice command *"Hi ESP, connect to network one"*. | WakeNet model only recognizes the wake-word "Hi ESP". It has no MultiNet command recognition model compiled in firmware for parsing phrases like "connect to network one". | **UNIMPLEMENTED / ASPIRATIONAL** | Add MultiNet or disclose network switching as web dashboard controlled. Remove claims of active voice command phrase parsing. |
| **Password-Protected SoftAP** | `API_CONTRACT.md:16` claims *"password-protected SoftAP (SSID: NOVA-Setup-A9EC)"*. | `nova_net.c:343` sets `.authmode = WIFI_AUTH_OPEN`. The AP has no password. | **FALSE / INACCURATE** | Either configure WPA2-PSK SoftAP with a factory-printed pin or explicitly document that SoftAP is open during provisioning. |

---

## 5. Jurisdiction-Specific Regulatory Compliance Matrix

### 5.1 India Compliance Roadmap

#### 1. WPC ETA (Wireless Planning & Coordination Wing, Ministry of Communications)
- **Applicable Regulations**: Indian Wireless Telegraphy Act, 1933; Equipment Type Approval (ETA) under GSR 45(E) and GSR 1048(E) (Use of low power and very low power Short Range Radio Frequency Devices in 2.4 GHz – 2.4835 GHz frequency band).
- **Standards & Limits**:
  - Maximum Radiated Power (EIRP): ≤ 100 mW (20 dBm).
  - Frequency Range: 2400 MHz to 2483.5 MHz.
  - Test Standard: ETSI EN 300 328 or FCC Part 15.247 accredited test report.
- **Modular vs Host Certification**:
  - *Current Status*: NOVA uses a generic "ESP32-C3 Super Mini" clone board without an accredited WPC ETA certificate or shielding can.
  - *Consequence*: Self-Declaration ETA (ETA-SD) via the Saral Sanchar portal is **NOT permitted** for this board. NOVA must submit samples to an accredited Indian test laboratory (TEC / NABL approved) for full RF chamber testing, or migrate to an official certified Espressif module (e.g. ESP32-C3-WROOM-02 or ESP32-C3-MINI-1 with existing ETA approval).
- **Status**: **MANDATORY ACCREDITED LAB TESTING REQUIRED**.

#### 2. BIS CRS (Bureau of Indian Standards — Compulsory Registration Scheme)
- **Applicable Order**: Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order.
- **Product Category**: "Information Technology Equipment" / "Smart Electronic Products".
- **Standard**: **IS 16333 / IEC 62368-1:2018** (Audio/video, information and communication technology equipment — Safety requirements), superseding IS 13252 (Part 1):2010.
- **Mandatory Laboratory Tests**:
  - Electric shock hazard (Clause 5).
  - Fire hazard and flammability of materials (V-0 / V-1 rating for enclosure, Clause 6).
  - Thermal injury and touch temperature limits under normal and fault conditions (Clause 9).
  - Resistance to mechanical impact and drop tests (Clause 4.4).
- **Labeling Requirement**: Affix Standard Mark with Registration Number: `IS 16333:2018 / R-XXXXXXXX` on product and retail packaging.
- **Status**: **MANDATORY ACCREDITED LAB TESTING REQUIRED**.

#### 3. DPDP Act 2023 (Digital Personal Data Protection Act, 2023)
- **Authority**: Data Protection Board of India.
- **Provisions & Direct Hardware/Cloud Impact**:
  - *Notice & Consent (Sections 5 & 6)*: Must give clear notice of data collected (audio data, Wi-Fi network names, email) before collection, with option to view notice in English and any of the 22 Eighth-Schedule Indian languages.
  - *Processing of Voice Data*: Audio recordings contain personal identifiers. Processing voice on cloud servers requires unambiguous, itemized consent.
  - *Children's Data (Section 9)*: NOVA is a portable keychain assistant likely to be handled by minors (<18 years). Section 9 prohibits processing personal data of children without verifiable parental consent and strictly forbids behavioral tracking or targeted advertising directed at children.
  - *Data Fiduciary Safeguards (Section 8)*: Mandatory implementation of reasonable security safeguards (encryption in transit and at rest). Mandatory data breach notification to the Data Protection Board and affected users (Section 8(6)). Penalties up to ₹250 Crore for security failures.
  - *Cross-Border Transfers*: Permitted unless countries are placed on negative restriction lists by the Central Government.
- **Status**: **ENGINEERING VERIFICATION COMPLETED (Architecture & Encryption); LEGAL COMPLIANCE FILING PENDING**.

---

### 5.2 European Union (EU) Compliance Roadmap

#### 1. CE Marking — Radio Equipment Directive (RED) 2014/53/EU
- **Article 3.1(a) Health & Electrical Safety**:
  - **EN IEC 62368-1:2020 + A11:2020**: Safety of ICT equipment.
  - **EN 62479:2010 / EN 50663:2017**: Assessment of low-power electronic equipment related to human exposure to electromagnetic fields (10 MHz to 300 GHz). Transmit power < 20 mW qualifies for low-power SAR exemption.
- **Article 3.1(b) Electromagnetic Compatibility (EMC)**:
  - **ETSI EN 301 489-1 V2.2.3**: Common technical requirements for radio equipment.
  - **ETSI EN 301 489-17 V3.2.4**: Specific conditions for Broadband Data Transmission Systems (2.4 GHz).
  - **EN 55032:2015 + A11:2020**: Class B radiated and conducted emissions.
  - **EN 55035:2017 + A11:2020**: Immunity testing (ESD ±4kV contact / ±8kV air, RF field immunity 3V/m).
- **Article 3.2 Radio Spectrum Efficiency**:
  - **ETSI EN 300 328 V2.2.2**: Wideband transmission systems operating in the 2.4 GHz ISM band:
    - Equivalent Isotropically Radiated Power (EIRP) ≤ 20 dBm (100 mW).
    - Maximum Power Spectral Density ≤ 10 dBm/1MHz.
    - Occupied Channel Bandwidth (99% power) within 2400 – 2483.5 MHz.
    - Transmitter unwanted emissions in the out-of-band and spurious domains (down to -30 dBm / -54 dBm).
    - Receiver spurious emissions (≤ -57 dBm up to 1 GHz, ≤ -47 dBm above 1 GHz).
- **Article 3.3(d)(e)(f) Cybersecurity Delegated Regulation (EU) 2022/30 (Mandatory August 1, 2025)**:
  - Standards: **EN 18031-1** (Network protection), **EN 18031-2** (Personal data protection), **EN 18031-3** (Fraud prevention).
  - Baseline Standard: **ETSI EN 303 645** (Cybersecurity for Consumer IoT):
    - *Provision 5.1-1*: No universal default passwords (NOVA's open SoftAP currently violates this).
    - *Provision 5.3-13*: Secure software update mechanism (NOVA lacks an OTA partition, violating this).
    - *Provision 5.4-1*: Secure storage of sensitive data (NOVA's unencrypted NVS flash currently violates this).
- **Status**: **MANDATORY ACCREDITED NOTIFIED BODY LAB TESTING REQUIRED**.

#### 2. RoHS Directive 2011/65/EU as amended by Directive (EU) 2015/863 (RoHS 3)
- **Standard**: **EN IEC 63000:2018** (Technical documentation for the assessment of electrical and electronic products with respect to the restriction of hazardous substances).
- **Restricted Substances (10)**: Lead (Pb, 0.1%), Mercury (Hg, 0.1%), Cadmium (Cd, 0.01%), Hexavalent Chromium (Cr VI, 0.1%), PBB (0.1%), PBDE (0.1%), DEHP (0.1%), BBP (0.1%), DBP (0.1%), DIBP (0.1%).
- **Requirements**: Component Bill of Materials (BOM) declarations, supplier Certificates of Compliance (CoC), and laboratory X-ray Fluorescence (XRF) screening.
- **Status**: **SUPPLIER BOM AUDIT COMPLETED; LAB XRF SCREENING REQUIRED**.

#### 3. WEEE Directive 2012/19/EU
- **Requirement**: Producer registration in national registers of EU member states prior to commercial shipment; product marked with crossed-out wheeled bin symbol (EN 50419:2022).
- **Status**: **ADMINISTRATIVE REGISTRATION REQUIRED PRIOR TO LAUNCH**.

---

### 5.3 United States Compliance Roadmap

#### 1. FCC Part 15 Subpart B (Unintentional Radiators — Class B)
- **Rule**: 47 CFR § 15.101 – § 15.123 (Class B equipment intended for residential and consumer environments).
- **Limits**: 47 CFR § 15.109 radiated emission limits (30 MHz to 1 GHz and above) and § 15.107 conducted emissions on AC/USB power lines.
- **Authorization Route**: Supplier’s Declaration of Conformity (SDoC) or Certification.
- **Testing Standard**: ANSI C63.4:2014 in an FCC-recognized ISO/IEC 17025 accredited laboratory.
- **Status**: **MANDATORY ACCREDITED LAB TESTING REQUIRED**.

#### 2. FCC Part 15 Subpart C (Intentional Radiators — 47 CFR § 15.247)
- **Scope**: Digital Transmission Systems (DTS) in the 2400 – 2483.5 MHz band (Wi-Fi 802.11b/g/n and Bluetooth Low Energy 5.0).
- **Key Technical Requirements**:
  - Minimum 6 dB Bandwidth: ≥ 500 kHz (§ 15.247(a)(2)).
  - Maximum Peak Conducted Output Power: ≤ 1.0 Watt (30 dBm) (§ 15.247(b)(3)).
  - Power Spectral Density: ≤ 8 dBm in any 3 kHz band (§ 15.247(e)).
  - Radiated Spurious Emissions & Band Edge: Must comply with § 15.205 restricted bands and § 15.209 general emission limits.
  - RF Exposure: 47 CFR § 1.1307(b) and KDB 447498 D01. Because device radiated power is under 10 mW and portable separation distance is typical, it qualifies for SAR test exclusion upon mathematical verification.
- **Modular vs Host Certification (47 CFR § 15.212)**:
  - If using a pre-certified Espressif module (e.g. ESP32-C3-MINI-1, FCC ID: `2AC7Z-ESPC3MINI1`), the product could be marketed as a host product under modular integration rules, requiring only Part 15B SDoC and radiated spurious spot-checking.
  - Because the "ESP32-C3 Super Mini" is an uncertified bare clone board with no shielding or FCC ID, NOVA **cannot use modular integration**. It requires **Full Standalone FCC Equipment Authorization (Certification through a TCB)**.
- **Status**: **MANDATORY ACCREDITED TCB LAB CERTIFICATION REQUIRED**.

---

## 6. Engineering Verification vs Mandatory Accredited Laboratory Testing

To maintain strict boundaries between internal software/hardware validation and legal regulatory certification, the engineering ledger enforces this division:

| Discipline / Domain | In-House Engineering Verification (Completed / Locally Testable) | Mandatory Accredited Lab Testing (External Gate / Legal Prerequisite) |
|---|---|---|
| **RF / Wireless Performance** | Wi-Fi 802.11b/g/n connection reliability, RSSI logging (-99 to -40 dBm), auto-reconnect state recovery, packet sniffing | Anechoic chamber RF power (EIRP), 6 dB bandwidth, PSD, harmonics, spurious emissions to 25 GHz (ETSI EN 300 328, FCC 15.247, WPC ETA) |
| **Electromagnetic Compatibility (EMC)** | Functional stability under switching power noise, I2C bus rise-time tuning, ground plane routing | Formal radiated emissions (30 MHz – 6 GHz) and conducted emissions (EN 55032 Class B, FCC 15B Class B), ESD immunity (EN 61000-4-2) |
| **Electrical Safety** | USB 5V supply voltage tolerance, continuous current draw (~120–240mA), basic thermal probe check | High-voltage breakdown, creepage and clearance distances, flame resistance rating (UL94 V-0), touch temperatures (IS 16333, EN IEC 62368-1) |
| **Hazardous Substances (RoHS)** | Component BOM collection, supplier declarations of conformity review | Laboratory X-ray Fluorescence (XRF) spectroscopy and wet chemical analysis for RoHS 10 substances (EN IEC 63000:2018) |
| **Cybersecurity (EU RED Art 3.3)** | IDOR penetration testing, encryption at rest verification, token lifetime checks | Accredited third-party ETSI EN 303 645 / EN 18031 cybersecurity evaluation and Notified Body EU Type Examination Certificate |
| **Data Privacy & Protection** | Envelope encryption (AES-256-GCM), zero cleartext password logging, CSRF state verification | Legal privacy counsel review, DPDP Act 2023 compliance audit, statutory Data Protection Officer (DPO) registration |

---

## 7. Non-Negotiable Verification Criteria & Integrity Guidelines

The following guidelines are mandatory and non-negotiable for all engineering disciplines across firmware, backend, and frontend:

1. **Hardware Truth Principle**:
   - The user interface must never display fake or simulated hardware metrics.
   - If a sensor or subsystem does not exist in the physical build (e.g. battery fuel gauge, speaker, vibration motor), the UI must explicitly disclose this or omit the element.
   - Status indicators (`Online`, `Connected`) must be driven strictly by authenticated heartbeats within a 90-second freshness window, never by database row existence.
2. **Mandatory Secure Boot & Flash Encryption Deployment**:
   - Before any external user testing or production pilot, burn eFuses on the ESP32-C3 for Secure Boot V2 (`SECURE_BOOT_EN`) and Flash Encryption (`SPI_BOOT_CRYPT_CNT = 0b001`).
   - Secure UART download mode (`ENABLE_SECURITY_DOWNLOAD`) must be enabled and JTAG (`DIS_PAD_JTAG`, `DIS_USB_JTAG`) permanently disabled.
3. **SoftAP Provisioning Hardening**:
   - The provisioning SoftAP must either be protected with WPA2-PSK (using a unique device passkey) or utilize encrypted BLE provisioning (ESP-IDF Protocomm / NimBLE with Curve25519 key exchange).
   - Cleartext HTTP transmission of Wi-Fi credentials over open 802.11 links is strictly prohibited.
4. **Supabase Row Level Security Enforcement**:
   - Every table in PostgreSQL must have RLS enabled (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).
   - Policies must enforce strict per-user and per-device isolation.
   - Disable PostgREST public exposure for sensitive tables (`device_bootstrap_credentials`, `notion_authorizations`) or restrict them to `service_role` execution.
5. **Enforce Database Connection TLS Verification**:
   - Remove `ssl: { rejectUnauthorized: false }` from `api/index.ts`. Provide the official Supabase root CA certificate to guarantee encrypted, authenticated database transit.
6. **Regulatory Module Migration Recommendation**:
   - Cease using bare "ESP32-C3 Super Mini" clone boards for commercial manufacturing. Migrate the physical layout to an official certified module (**ESP32-C3-MINI-1** or **ESP32-C3-WROOM-02**), which already holds FCC Modular Approval (FCC ID: `2AC7Z-ESPC3MINI1`) and WPC ETA, drastically reducing certification costs and regulatory time-to-market.

---

## 8. Spec Miner Discoveries & Edge Cases Tables

### 8.1 Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| F1 | Physical Security | eFuse Hardware Security Engine | Hardware-enforced one-time programmable bits controlling Secure Boot, Flash Encryption, JTAG, and UART boot modes | eFuse burn commands / register queries | Hardware bit status summary | Irreversible once burned | `espefuse.py summary --port COM5` |
| F2 | Physical Security | SPI Flash Readout | Ability to read entire 4MB SPI flash content via USB-Serial/JTAG port | Serial port COM5, baud 115200 | Binary flash dump (4MB) | Fails only if secure download mode is burned | `esptool.py chip-id --port COM5` |
| F3 | Firmware Provisioning | Local SoftAP Web Portal | On-device HTTP web server on port 80 presenting Wi-Fi setup HTML form | Client HTTP GET `/` / `setup` on 192.168.4.1 | HTML setup page | Returns 404 on unhandled URIs | `nova_net.c:125-186` |
| F4 | Firmware Provisioning | Wi-Fi Credential Ingestion Endpoint | Unencrypted JSON POST endpoint accepting home router credentials | JSON `{"ssid": "...", "password": "..."}` | JSON `{"success": true, "deviceId": "..."}` | 400 Bad Request if SSID missing; 500 if payload > 256 bytes | `nova_net.c:213-270` |
| F5 | Cloud Auth | Hardware Bootstrap Enrollment | Exchanges unique factory secret for rotatable bearer key and claim token | POST `/api/v1/devices/bootstrap` with deviceId and credential | JSON `{"deviceKey": "...", "claimToken": "..."}` | 409 Conflict if already enrolled; 401 if hash mismatch | `nova_net.c:675-725`, `api/index.ts:1313` |
| F6 | Cloud Auth | Device Key Recovery | Fallback endpoint recovering deviceKey using unique bootstrap secret header | POST `/api/v1/devices/:id/recover` with `x-nova-bootstrap` header | JSON with active deviceKey and portalUrl | 401 Unauthorized if secret invalid | `nova_net.c:637-673`, `api/index.ts:1326` |
| F7 | Cloud Telemetry | Firmware Heartbeat Transmission | Telemetry ping reporting RSSI, Wi-Fi status, and battery millivolts | POST `/api/v1/devices/:id/heartbeat` with bearer `deviceKey` | JSON with server acknowledgement and pending action count | 401 if invalid key; 403 if key belongs to different device | `nova_net.c:842-883`, `api/index.ts:1612` |
| F8 | Cloud Security | Application-Level IDOR Guard | Middleware validating that bearer token matches the targeted device resource | `Authorization: Bearer <token>`, target deviceId | Access granted or 403 FORBIDDEN | Returns 403 `CROSS_DEVICE_FORBIDDEN` | `api/index.ts:527-602` |
| F9 | Integration | Notion OAuth Token Encryption | Envelope encryption of Notion OAuth access tokens using AES-256-GCM | Raw Notion access token, server encryption key | Stored `iv:authTag:ciphertext` in PostgreSQL | Rejects invalid tokens | `api/index.ts:2666-2713` |
| F10 | Integration | Anti-CSRF OAuth State Ledger | Single-use cryptographically bound state tokens for OAuth redirects | Random HMAC state token in `oauth_states` table | Verified callback redirect | Rejects expired (>15 min) or replayed tokens | `api/index.ts:2412-2628` |

### 8.2 Edge Cases & Vulnerability Vectors
| # | Feature | Input / Condition | Observed Behavior |
|---|---|---|---|
| E1 | SoftAP Provisioning | Unauthenticated client connects to `NOVA-Setup-XXXX` | Association succeeds immediately without password (`WIFI_AUTH_OPEN`). Client receives IP `192.168.4.2` via DHCP. |
| E2 | Wi-Fi Credential POST | Malformed JSON or oversized payload (> 256 bytes) to `/api/wifi` | Returns HTTP 500 or 400 Bad Request; server does not crash, but credentials are not stored. |
| E3 | Cloud TLS Validation | SNTP sync fails (NTP UDP port 123 blocked by firewall) | Firmware waits 2.5s, then sets system clock to hardcoded fallback `1792106878` (Oct 15, 2026), continuing TLS handshake. |
| E4 | Database Querying | Attacker issues direct PostgREST request to Supabase using public anon key | Request succeeds without authorization check because RLS is disabled on all tables in `schema.sql`. |
| E5 | Device Key Rotation | Client presents valid pairing session token for device A to rotate key for device B | Returns HTTP 403 `FORBIDDEN` (`Pairing session is not authorized for device B`). |
| E6 | Heartbeat Battery | Firmware sends heartbeat while running on continuous 5V USB | Firmware transmits hardcoded `batteryMv = 4150`. Database ignores it; web frontend displays `100% Battery`. |
| E7 | Voice Memo Utterance | User speaks wake-word "Hi ESP" and finishes speaking phrase | Firmware detects audio energy on MAX4466, then calls `nova_voice_process_completed_utterance()`, which logs `NOVA_VOICE_UNAVAILABLE` and discards the audio. |
| E8 | Physical COM5 Probe | Attacker runs `espefuse.py summary` over USB connection | Full eFuse bit dump returned with zero resistance; JTAG, UART, and flash readouts are fully permissible. |
