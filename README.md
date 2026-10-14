# NOVA — Voice Assistant Onboarding Platform

A modern, mobile-first onboarding platform for **NOVA**, an ESP32-S3-based voice assistant keychain that records spontaneous voice notes and automatically syncs them into Notion.

Built with **React 19**, **TypeScript**, and **Vanilla CSS** featuring a deep navy/dark graphite aesthetic, restrained electric cyan accents, subtle glow, and an interactive hardware mockup with live animated RGB light-ring states.

---

## ⚡ Quickstart

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Run typecheck & build production bundle
npm run build

# 4. Run automated test suite
npm run test

# 5. Run linter
npm run lint
```

The application runs at `http://localhost:5173`.

---

## 📱 User Flows

### A. First-Time Setup
1. **Welcome**: Introduces the NOVA keychain and guides the user into setup.
2. **Device Claim**: Camera QR code viewfinder (with fallback to 8-character laser-etched shortcode `NOV-84F3`). Validates single-use claim token.
3. **Wi-Fi Provisioning**: Communicates with ESP32-S3 using **Web Bluetooth (Web BLE)** on supported browsers, or **Guided SoftAP Hotspot** (`NOVA-Setup-XXXX`) on Mobile Safari. Scans visible 2.4GHz networks and transmits credentials.
4. **Backend Heartbeat Verification**: Real-time confirmation of local DHCP IP assignment and cloud MQTT TLS 1.3 heartbeat.
5. **Notion OAuth Authorization**: Explains granular permissions (adding blocks, reading database properties) and what NOVA never accesses (passwords, unrelated pages). Never asks for manual API key pasting.
6. **Setup Complete & Dashboard**: Confirmation summary, usage tips, and transition to live telemetry dashboard.

### B. Wi-Fi Reconnection & Recovery
- Accessible directly from the welcome screen or device dashboard.
- Step-by-step instructions on holding the center button for **5 seconds** until the light ring pulses amber/purple.
- Preserves device identity, cloud ownership, Notion authorization, unsynced audio buffer, and sync history.
- **Never re-prompts for Notion authorization** merely because Wi-Fi changed.
- Clearly distinguishes safe Wi-Fi recovery from destructive Factory Reset (15-second button hold).

### C. Notion Connection Management
- Live status displaying connected workspace name, target database, and last sync timestamp.
- **Test Note Sync**: Simulates a live voice memo delivery, animates the hardware LED flash, and provides a direct link to the newly generated Notion page.
- Deliberate "Reconnect Notion" action only if authorization is revoked or expired.
- Safe disconnect action with an interactive confirmation modal detailing data retention guarantees.

### D. Device Status & Telemetry
- Real-time Wi-Fi status (SSID, RSSI dBm signal bars, MAC address, frequency band).
- Cloud MQTT connection health (ping latency, uptime, firmware version).
- Battery level & charging state.
- Pending synchronization count (e.g. 0 notes pending or queued offline notes).
- Offline diagnostic banner with troubleshooting recommendations when disconnected.

---

## 🔐 Security Architecture

- **No Permanent Secrets in Browser**: Neither device flash encryption keys nor permanent Notion tokens are stored in browser storage (`localStorage` / `sessionStorage`).
- **Single-Use Ephemeral Claims**: QR codes contain short-lived claim tokens (15-minute lifespan). They do not store Wi-Fi credentials or permanent device tokens.
- **Backend Authority**: Device ownership and Notion OAuth exchange (`code` -> `access_token`) occur exclusively on the backend and are encrypted in KMS.
- **Realistic Provisioning**: Acknowledges browser sandbox limitations. Uses Web Bluetooth GATT service (`00000001-6e6f-7661-7769-6669-70726f760000`) where supported, with guided SoftAP hotspot fallback for iOS Safari.

---

## 🛠️ Architecture & Project Structure

```
nova/
├── public/                  # Static assets & favicon
├── src/
│   ├── api/
│   │   ├── client.ts        # Typed API client with configurable base URL
│   │   ├── endpoints.ts     # Endpoint contract metadata & readiness status
│   │   ├── mockApi.ts       # In-memory hardware store & mock API implementation
│   │   └── types.ts         # Request/response interfaces & domain errors
│   ├── domain/
│   │   ├── device.ts        # Telemetry, claim models, LED ring patterns
│   │   ├── notion.ts        # Notion connection info, scopes, sync test
│   │   ├── wifi.ts          # Network models, security types, signal calculation
│   │   └── stateMachine.ts  # Onboarding state machine types & transitions
│   ├── hooks/
│   │   ├── useOnboarding.ts # Core state machine hook & action handlers
│   │   └── useWebBle.ts     # Web Bluetooth support detector & connection hook
│   ├── components/
│   │   ├── common/          # Reusable Button, Card, Badge, Header, Modal
│   │   ├── hardware/        # NovaDeviceMockup, LedRingGuide, SignalStrength
│   │   ├── flows/           # Welcome, QRScanner, WifiProvision, Verification,
│   │   │                    # NotionAuth, SetupComplete, Dashboard, Recovery
│   │   └── dev/             # DevModeDrawer (hardware sandbox & API inspector)
│   ├── styles/
│   │   ├── variables.css    # Design tokens, color palette, glassmorphism
│   │   ├── global.css       # Mobile Safari reset, typography, animations
│   │   └── components.css   # Component styles
│   ├── __tests__/           # Vitest unit test suite (state machine & API client)
│   ├── App.tsx              # Main application orchestrator
│   └── main.tsx             # Application entry point
├── API_CONTRACT.md          # REST API & hardware provisioning specification
├── vercel.json              # Vercel deployment & SPA routing rewrites
├── .env.example             # Environment variable documentation
└── package.json
```

---

## 🌐 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the NOVA Cloud Backend | `""` (Relative/Mock) |
| `VITE_MOCK_API` | Set to `"false"` to communicate with real backend | `"true"` |
| `VITE_NOTION_CLIENT_ID`| Public Notion OAuth Client ID | `nova_iot_client_9918` |
| `VITE_BLE_SERVICE_UUID` | ESP32 Bluetooth GATT Provisioning Service UUID | `00000001-6e6f-7661-7769-6669-70726f760000` |

---

## 🚀 Deployment on Vercel

The project includes `vercel.json` configured for SPA routing and asset caching:

1. Import the repository in [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Set environment variable `VITE_MOCK_API=false` when deploying alongside a real backend.

---

## 📊 Integration Readiness Report

> [!NOTE]
> As per IoT engineering best practices, end-to-end hardware functionality should not be claimed until verified against physical production hardware and active backend servers.

| Feature Area | Status | Notes |
| :--- | :--- | :--- |
| **Onboarding State Machine** | ✅ **Implemented** | 100% test coverage; supports setup, recovery, Notion auth, and error states |
| **Mobile-First UI & Design System** | ✅ **Implemented** | Dark graphite foundation, electric cyan accents, safe-area insets, interactive SVG/CSS hardware mockup |
| **Development & Hardware Sandbox** | ✅ **Implemented** | Slide-out drawer with offline toggles, latency sliders, fault injection, and mock resets |
| **Web Bluetooth Wi-Fi Handshake** | 🔄 **Mocked / Browser-Ready** | Web BLE API client implemented with UUIDs; requires pairing with physical ESP32 firmware running Protocomm |
| **Guided SoftAP Wi-Fi Mode** | 🔄 **Mocked / Documented** | Guided instructions and fallback gateway endpoints ready for iOS Safari; requires ESP32 AP firmware |
| **Backend API Endpoints** | 🚧 **In Progress (Backend)** | Endpoints defined in `API_CONTRACT.md`; mocked in frontend via `mockApi.ts` |
| **Cloud Notion OAuth KMS Token Store**| 🚧 **In Progress (Backend)** | Frontend OAuth URL and callback handlers implemented; requires live Notion integration client secret in KMS |
| **Physical ESP32 Microphone Recording**| 🚧 **Pending Hardware Verification**| Tested with synthetic voice note ping; requires bench testing with physical NOVA hardware |
