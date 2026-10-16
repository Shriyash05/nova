/**
 * Authoritative Hardware & Architecture Specifications for NOVA 1.0 E2E Testing
 * Derived strictly from ORIGINAL_REQUEST.md and API_CONTRACT.md
 */

export interface HardwareTargetSpec {
  microcontroller: string;
  flashSizeMB: number;
  sramKB: number;
  cpuFrequencyMHz: number;
  oledController: string;
  oledResolution: { width: number; height: number };
  oledI2CAddress: string;
  oledPins: { sda: number; scl: number };
  microphone: string;
  micPin: number;
  audioSampleRateHz: number;
  wakeWordModel: string;
  softApSsidPrefix: string;
  softApGatewayIp: string;
  primaryComPort: string;
  uartBaudRate: number;
  hasRgbLed: boolean;
  hasSpeaker: boolean;
  hasVibrationMotor: boolean;
  hasPttButton: boolean;
}

export const AUTHORITATIVE_HARDWARE_SPEC: HardwareTargetSpec = {
  microcontroller: 'ESP32-C3 Super Mini',
  flashSizeMB: 4,
  sramKB: 400,
  cpuFrequencyMHz: 160,
  oledController: 'SSD1306',
  oledResolution: { width: 128, height: 64 },
  oledI2CAddress: '0x3C',
  oledPins: { sda: 8, scl: 9 },
  microphone: 'MAX4466',
  micPin: 1,
  audioSampleRateHz: 16000,
  wakeWordModel: 'wn9s_hiesp',
  softApSsidPrefix: 'NOVA-Setup-',
  softApGatewayIp: '192.168.4.1',
  primaryComPort: 'COM5',
  uartBaudRate: 115200,
  hasRgbLed: false,
  hasSpeaker: false,
  hasVibrationMotor: false,
  hasPttButton: false,
};

export interface TechnicalLedgerItem {
  subsystem: string;
  component: string;
  status: 'KEEP' | 'REFACTOR' | 'REPLACE' | 'REMOVE';
  justification: string;
  secretExposureRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export const AUTHORITATIVE_TECHNICAL_LEDGER: TechnicalLedgerItem[] = [
  {
    subsystem: 'firmware',
    component: 'wn9s_hiesp WakeNet Model',
    status: 'KEEP',
    justification: 'Offline neural wake-word engine natively supported on ESP32-C3',
    secretExposureRisk: 'NONE',
  },
  {
    subsystem: 'firmware',
    component: 'SSD1306 Non-blocking Animation Loop',
    status: 'REFACTOR',
    justification: 'Prevent audio starvation during pixel rendering',
    secretExposureRisk: 'NONE',
  },
  {
    subsystem: 'firmware',
    component: 'Hardcoded Wi-Fi Credential Arrays in firmware source',
    status: 'REMOVE',
    justification: 'Credentials must only be provisioned dynamically via SoftAP into encrypted NVS',
    secretExposureRisk: 'HIGH',
  },
  {
    subsystem: 'web',
    component: 'Vite + React 19 Frontend',
    status: 'KEEP',
    justification: 'Modern lightweight client for pairing, status monitoring, and profile management',
    secretExposureRisk: 'NONE',
  },
  {
    subsystem: 'web',
    component: 'Mock API Fallbacks in Production Bundle',
    status: 'REMOVE',
    justification: 'Production must exclusively use real authenticated backend APIs',
    secretExposureRisk: 'LOW',
  },
  {
    subsystem: 'cloud',
    component: 'AES-256-GCM Envelope Encryption for Stored Wi-Fi Passwords',
    status: 'KEEP',
    justification: 'Protects user home network credentials at rest in PostgreSQL',
    secretExposureRisk: 'HIGH',
  },
];

export interface ComplianceStandard {
  jurisdiction: 'India' | 'European Union' | 'United States';
  authority: string;
  standardCode: string;
  title: string;
  mandatoryLabTesting: boolean;
  status: 'PENDING_LAB_TESTING' | 'SELF_DECLARATION' | 'SPECIFICATION_ALIGNED';
}

export const AUTHORITATIVE_COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  {
    jurisdiction: 'India',
    authority: 'WPC',
    standardCode: 'ETA-SDOC',
    title: 'Equipment Type Approval (Self-Declaration of Conformity for 2.4GHz Wi-Fi)',
    mandatoryLabTesting: false,
    status: 'SPECIFICATION_ALIGNED',
  },
  {
    jurisdiction: 'India',
    authority: 'BIS',
    standardCode: 'IS 13252 (Part 1):2010 / IS 16333',
    title: 'Information Technology Equipment — Safety & Language Support',
    mandatoryLabTesting: true,
    status: 'PENDING_LAB_TESTING',
  },
  {
    jurisdiction: 'India',
    authority: 'MeitY',
    standardCode: 'DPDP Act 2023',
    title: 'Digital Personal Data Protection (Notice, Consent, and Purpose Limitation)',
    mandatoryLabTesting: false,
    status: 'SPECIFICATION_ALIGNED',
  },
  {
    jurisdiction: 'United States',
    authority: 'FCC',
    standardCode: '47 CFR Part 15 Subpart B / C',
    title: 'Radio Frequency Devices (Unintentional & Intentional Radiators 2.4GHz)',
    mandatoryLabTesting: true,
    status: 'PENDING_LAB_TESTING',
  },
  {
    jurisdiction: 'European Union',
    authority: 'CE',
    standardCode: 'RED 2014/53/EU & RoHS 2011/65/EU',
    title: 'Radio Equipment Directive & Restriction of Hazardous Substances',
    mandatoryLabTesting: true,
    status: 'PENDING_LAB_TESTING',
  },
];
