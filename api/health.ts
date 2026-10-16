import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// -----------------------------------------------------------------------------
// Database Pool Configuration & TLS Security
// -----------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
let pool: pg.Pool | null = null;

const SUPABASE_ROOT_CA_2021 = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

/**
 * Normalizes custom TLS Certificate Authority (CA) data provided via environment variables.
 * Compatible with api/index.ts implementation.
 */
export function parseSslCa(rawCa?: string): string | undefined {
  if (!rawCa) return undefined;
  let trimmed = rawCa.trim();
  if (!trimmed) return undefined;

  // 1. File path check
  if (!trimmed.includes('\n') && (trimmed.endsWith('.crt') || trimmed.endsWith('.pem') || trimmed.includes('/') || trimmed.includes('\\'))) {
    try {
      if (fs.existsSync(trimmed)) {
        return fs.readFileSync(trimmed, 'utf8').trim();
      }
    } catch {
      // Proceed with content checks if file read fails
    }
  }

  // 2. Unescape literal '\n' sequences from single-line environment configurations
  if (trimmed.includes('\\n')) {
    trimmed = trimmed.replace(/\\n/g, '\n');
  }

  // 3. Direct PEM header match
  if (trimmed.includes('-----BEGIN CERTIFICATE-----')) {
    return trimmed;
  }

  // 4. Base64-encoded PEM certificate check
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.includes('-----BEGIN CERTIFICATE-----')) {
      return decoded.trim();
    }
  } catch {
    // Not a valid base64 payload
  }

  return trimmed;
}

function getPool(): pg.Pool | null {
  if (!pool && process.env.DATABASE_URL) {
    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    let ca = parseSslCa(process.env.DATABASE_SSL_CA || process.env.SUPABASE_SSL_CA);

    // Fallback: If no explicit CA is configured and connecting to a Supabase pooler,
    // load the bundled Supabase Root 2021 CA certificate to ensure strict TLS verification succeeds.
    if (!ca && (process.env.DATABASE_URL.includes('supabase.co') || process.env.DATABASE_URL.includes('pooler.supabase.com'))) {
      try {
        const bundledPath = path.resolve(process.cwd(), 'api/certs/supabase-ca.pem');
        if (fs.existsSync(bundledPath)) {
          ca = fs.readFileSync(bundledPath, 'utf8').trim();
        }
      } catch {
        // Fallback to embedded certificate string
      }
      if (!ca) {
        ca = SUPABASE_ROOT_CA_2021;
      }
    }

    const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== undefined
      ? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
      : Boolean(ca || (isProduction && !isTestEnv));

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized,
        ...(ca ? { ca } : {}),
      },
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  const EXACT_ALLOWED_ORIGINS = [
    'https://buynovastore.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
  const PREVIEW_ORIGIN_REGEX = /^https:\/\/nova-[a-z0-9-]+-shriyash05s-projects\.vercel\.app$/;
  const isOriginAllowed = origin
    ? EXACT_ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_REGEX.test(origin)
    : false;

  if (origin) {
    if (isOriginAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'https://buynovastore.vercel.app');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  // Defensive HTTP Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.method === 'OPTIONS') {
    if (origin && !isOriginAllowed) {
      res.statusCode = 403;
      res.end();
      return;
    }
    res.statusCode = 204;
    res.end();
    return;
  }

  let dbStatus = 'disconnected';
  let deviceCount = 0;
  const p = getPool();

  if (p) {
    try {
      const dbRes = await p.query('SELECT count(*) as count FROM devices');
      dbStatus = 'connected';
      deviceCount = parseInt(dbRes.rows[0]?.count || '0', 10);
    } catch {
      dbStatus = 'error';
    }
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      status: 'healthy',
      service: 'NOVA Cloud API',
      hardware: {
        chipset: 'ESP32-C3 Super Mini (RISC-V @ 160MHz)',
        display: 'SSD1306 monochrome 128x64 OLED (0x3C, GPIO8/GPIO9)',
        microphone: 'MAX4466 analog electret (ADC GPIO1)',
        wakeWord: 'Hi ESP (WakeNet)',
        provisioning: 'Local password-protected SoftAP (192.168.4.1)',
      },
      database: {
        status: dbStatus,
        registeredDevices: deviceCount,
      },
      notionConfigured: Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET),
      timestamp: new Date().toISOString(),
    })
  );
}
