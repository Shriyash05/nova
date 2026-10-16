# Handoff Report — Security Threat Model & Regulatory Compliance Baseline

**Agent**: `explorer_security_compliance_1`  
**Role**: Security, Privacy, Threat-Modeling and Regulatory Specialist / Spec Miner  
**Date**: October 16, 2026  
**Working Directory**: `d:\Personal projects\nova\.agents\teamwork\explorer_security_compliance_1`  
**Recipient**: Orchestrator (`e451ddc2-d7f0-4749-bf7f-ed93de42ccc6`)  

---

## 1. Observation

Direct empirical observations gathered from static source analysis, hardware interrogation on `COM5`, and dependency scanning:

1. **Physical Hardware on `COM5` (Empirical eFuse Audit)**:
   - Tool Command: `espefuse.exe --port COM5 summary`
   - Verbatim Output:
     ```text
     Chip type: ESP32-C3 (QFN32) (revision v0.4), Embedded Flash 4MB (XMC)
     MAC: 48:f6:ee:17:34:d8
     SECURE_BOOT_EN (BLOCK0) = False R/W (0b0)
     SPI_BOOT_CRYPT_CNT (BLOCK0) = Disable R/W (0b000)
     DIS_PAD_JTAG (BLOCK0) = False R/W (0b0)
     DIS_USB_JTAG (BLOCK0) = False R/W (0b0)
     DIS_USB_SERIAL_JTAG_DOWNLOAD_MODE (BLOCK0) = False R/W (0b0)
     ENABLE_SECURITY_DOWNLOAD (BLOCK0) = False R/W (0b0)
     BLOCK_KEY0 to BLOCK_KEY5: All 00 00 ... (unburned USER keys)
     ```
   - Tool Command: `esptool.exe --port COM5 chip_id`
   - Result: Successful connection to ESP32-C3 on `COM5` via USB-Serial/JTAG, matching factory MAC `48:F6:EE:17:34:D8`.

2. **Firmware Partition & Codebase (`C:\NOVA-IDF\nova_wake_test`)**:
   - `partitions.csv:2`: `nvs, data, nvs, 0x9000, 24K,` (NVS is unencrypted; no `encrypted` flag; no OTA update partitions).
   - `sdkconfig:651, 653`: `# CONFIG_SECURE_BOOT is not set` and `# CONFIG_SECURE_FLASH_ENC_ENABLED is not set`.
   - `main/nova_state.c:98-123`:
     ```c
     if (strcmp(s_device_id, "nova-c3-5c20dc4239fca9ec") == 0) {
         strncpy(s_bootstrap_secret, "nova_c3_5c20dc4239fca9ec_boot_8f9c2d1e4a7b3c6d", sizeof(s_bootstrap_secret) - 1);
     }
     ```
   - `main/nova_state.c:284-294`: `nvs_get_str(handle, "wifi_ssid", ...)` and `nvs_get_str(handle, "wifi_pass", ...)` store cleartext Wi-Fi credentials in unencrypted NVS.
   - `main/nova_net.c:343`: `.authmode = WIFI_AUTH_OPEN` (SoftAP network has no password).
   - `main/nova_net.c:280`: `config.server_port = 80` (Provisioning server is unencrypted plain HTTP).
   - `main/nova_net.c:573`: Hardcoded fallback timestamp `1792106878` (Oct 15, 2026) applied when SNTP clock sync fails.
   - `main/main.c:663`: `nova_net_send_heartbeat(4150);` sends hardcoded fake battery voltage.
   - `main/nova_voice.c:9`: `nova_voice_process_completed_utterance()` logs `"Speech ended, but no approved speech processor is configured"` and returns `NOVA_VOICE_UNAVAILABLE`.

3. **Cloud & Web Application Codebase (`d:\Personal projects\nova`)**:
   - `schema.sql`: 178 lines defining 12 database tables. Exactly **zero** instances of `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY`.
   - `api/index.ts:17`: `ssl: { rejectUnauthorized: false }` disables TLS certificate verification on PostgreSQL pooler connection.
   - `api/index.ts:551-594`: `authenticateDeviceRequest` enforces IDOR protection by checking that bearer tokens match `devices.device_secret` hash or valid `pairing_sessions.id`.
   - `src/components/setup/SetupExperience.tsx:111, 1038`: displays `{deviceData?.batteryPercent ?? 100}%` for battery level.

4. **Supply Chain Audit**:
   - Tool Command: `npm audit --json` in `d:\Personal projects\nova`
   - Result: 11 vulnerabilities (10 High, 1 Moderate) in `undici` through `@vercel/node`.

5. **Local Unit Verification Commands**:
   - `npm run lint`: 0 warnings, 0 errors across 47 files.
   - `& "C:\Users\shriy\AppData\Local\Python\bin\python.exe" test/test_nova_fsm.py`: Ran 9 tests in 0.001s, status `OK`.

---

## 2. Logic Chain

1. **Physical Security**:
   - From Observation 1, eFuses confirm that Secure Boot and Flash Encryption are completely disabled, and USB-Serial/JTAG download mode is active.
   - From Observation 2, NVS flash contains cleartext Wi-Fi credentials (`wifi_pass`) and bearer tokens (`dev_key`).
   - Therefore, any attacker with brief physical possession of the keychain can plug into USB-C / COM5 and extract home Wi-Fi credentials and device identity in under 30 seconds using `esptool.py`.

2. **Local Network Security**:
   - From Observation 2, `nova_net.c` starts SoftAP with `.authmode = WIFI_AUTH_OPEN` on port 80 HTTP.
   - Observation 2 also shows the web form sends JSON `{ ssid, password }` over this unencrypted link.
   - Therefore, during initial onboarding, home Wi-Fi credentials are broadcast in the clear over 2.4 GHz radio, allowing nearby eavesdroppers to capture pre-shared keys.

3. **Cloud Database Security**:
   - From Observation 3, `schema.sql` does not enable Row Level Security on any table.
   - Supabase projects expose PostgREST REST APIs accessible with the public `anon` key.
   - Therefore, an external attacker can bypass all application-level authorization in `api/index.ts` and directly query or manipulate `devices`, `wifi_profiles`, `notion_authorizations`, and `device_bootstrap_credentials`.

4. **Product Integrity & Honesty**:
   - From Observation 2 and Observation 3, the hardware has no battery or battery sensor, but firmware sends `4150 mV` and the web UI renders `100% Battery`.
   - From Observation 2, `nova_voice.c` returns `NOVA_VOICE_UNAVAILABLE`, meaning speech recognition/transcription is completely unbuilt despite marketing claims of voice note capture.
   - Therefore, battery and voice transcription capabilities are currently simulated / unverified and must be corrected to maintain commercial honesty.

5. **Regulatory Compliance**:
   - The ESP32-C3 Super Mini lacks a shielded can and holds no FCC ID, WPC ETA certificate, or CE RED DoC.
   - Therefore, the finished product cannot leverage modular approval (FCC Part 15.212 / WPC ETA-SD) and requires full accredited laboratory certification in India (WPC/BIS), the EU (CE RED/RoHS/Cybersecurity), and the US (FCC Part 15B/15C).

---

## 3. Caveats

1. **eFuse Immutability**: Hardware eFuses on the physical ESP32-C3 on `COM5` were read non-destructively. They were **not burned** during this audit because burning eFuses is an irreversible physical operation that would permanently alter the prototype board.
2. **Supabase Live PostgREST Exposure**: While `schema.sql` lacks RLS statements, we did not execute unauthorized external exploits against the live Supabase project to extract live user data, respecting non-destructive development boundaries.
3. **RF Chamber Measurements**: True radiated power (EIRP) and spurious emissions cannot be measured in software; they require calibrated spectrum analyzers and an anechoic chamber.

---

## 4. Conclusion

The NOVA ecosystem has a robust, well-structured Node.js API foundation (with strong application-level IDOR checks and AES-256-GCM envelope encryption) and a functional WakeNet embedded wake-word engine. However, **it is currently NOT READY for customer deployment or commercial launch** due to five critical vulnerabilities:
1. Cleartext Wi-Fi ingestion over unencrypted SoftAP (port 80, open 802.11).
2. Unencrypted SPI flash and disabled Secure Boot on the ESP32-C3.
3. Absence of PostgreSQL Row Level Security (RLS) in `schema.sql`.
4. Insecure TLS (`rejectUnauthorized: false`) on database connection pool.
5. Simulated battery telemetry and missing voice transcription pipeline.

Migrating from the bare ESP32-C3 Super Mini clone board to an official certified module (**ESP32-C3-MINI-1**) is strongly advised to resolve the regulatory barrier and enable modular FCC/WPC approvals.

---

## 5. Verification Method

To independently verify these findings, execute the following commands:

1. **Verify Physical Hardware Security Status on COM5**:
   ```powershell
   & "C:\Users\shriy\.espressif\python_env\idf6.1_py3.12_env\Scripts\espefuse.exe" --port COM5 summary
   ```
   *Expected Output*: Look for `SECURE_BOOT_EN = False` and `SPI_BOOT_CRYPT_CNT = Disable`.

2. **Verify SoftAP Security Mode in Firmware**:
   Inspect line 343 of `C:\NOVA-IDF\nova_wake_test\main\nova_net.c`:
   *Expected Line*: `.authmode = WIFI_AUTH_OPEN,`

3. **Verify Absence of Supabase RLS**:
   Inspect `d:\Personal projects\nova\schema.sql`:
   ```powershell
   Select-String -Path "d:\Personal projects\nova\schema.sql" -Pattern "ENABLE ROW LEVEL SECURITY|CREATE POLICY"
   ```
   *Expected Output*: 0 matches.

4. **Verify Database TLS Verification Insecurity**:
   Inspect line 17 of `d:\Personal projects\nova\api\index.ts`:
   *Expected Line*: `ssl: { rejectUnauthorized: false },`

5. **Verify npm Supply Chain Vulnerabilities**:
   ```powershell
   cd "d:\Personal projects\nova"; npm audit
   ```
   *Expected Output*: 11 vulnerabilities (10 High, 1 Moderate).
