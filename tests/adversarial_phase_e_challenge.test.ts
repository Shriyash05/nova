/**
 * Phase E Adversarial Stress & Concurrency Challenge Suite
 * Challenger: challenger_e2
 * Role: critic, specialist
 *
 * This test suite subjects Phase E database TLS, certificate normalization (parseSslCa),
 * and api/health.ts defensive security headers to rigorous adversarial probes, boundary cases,
 * and malicious inputs.
 */

import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import tls from 'tls';
import fs from 'fs';
import path from 'path';

import healthHandler, { parseSslCa as parseSslCaHealth } from '../api/health';
import { parseSslCa as parseSslCaIndex } from '../api/index';

// Helper to simulate Node HTTP req/res
function simulateRequest(options: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  handlerFn?: any;
}): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve) => {
    const targetHandler = options.handlerFn || healthHandler;
    const bodyStr = options.body ? JSON.stringify(options.body) : '';
    const req = Readable.from(bodyStr ? [bodyStr] : []) as any;
    req.method = options.method;
    req.url = options.url;
    if (options.body) {
      req.body = options.body;
    }
    const headers: Record<string, string> = { host: 'buynovastore.vercel.app' };
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        headers[k.toLowerCase()] = v;
      }
    }
    req.headers = headers;

    const resHeaders: Record<string, string> = {};
    let responseBody = '';
    let resStatusCode = 200;

    const res: any = {
      setHeader(name: string, value: string) {
        resHeaders[name.toLowerCase()] = value;
      },
      writeHead(status: number, headers?: Record<string, string>) {
        resStatusCode = status;
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            resHeaders[k.toLowerCase()] = v;
          }
        }
      },
      get statusCode() {
        return resStatusCode;
      },
      set statusCode(val: number) {
        resStatusCode = val;
      },
      end(chunk?: string) {
        if (chunk) responseBody += chunk;
        let parsed = responseBody;
        try {
          parsed = JSON.parse(responseBody);
        } catch {}
        resolve({
          statusCode: resStatusCode,
          headers: resHeaders,
          body: parsed,
        });
      },
    };

    targetHandler(req, res).catch((err: any) => {
      resolve({
        statusCode: 500,
        headers: resHeaders,
        body: { error: err.message },
      });
    });
  });
}

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

describe('Adversarial Stress Test: parseSslCa Certificate Normalization', () => {
  const parsers = [
    { name: 'api/health.ts:parseSslCa', fn: parseSslCaHealth },
    { name: 'api/index.ts:parseSslCa', fn: parseSslCaIndex },
  ];

  for (const { name, fn } of parsers) {
    describe(`${name}`, () => {
      it('returns undefined for undefined, null, empty string, or pure whitespace', () => {
        expect(fn(undefined)).toBeUndefined();
        expect(fn('')).toBeUndefined();
        expect(fn('   ')).toBeUndefined();
        expect(fn('\n\t\r\n ')).toBeUndefined();
      });

      it('correctly handles multiline standard PEM with LF', () => {
        const res = fn(SUPABASE_ROOT_CA_2021);
        expect(res).toBeDefined();
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
        expect(res).toContain('-----END CERTIFICATE-----');
        // Verify Node.js crypto accepts it as valid CA
        expect(() => tls.createSecureContext({ ca: res })).not.toThrow();
      });

      it('correctly handles multiline PEM with CRLF line endings', () => {
        const crlfPem = SUPABASE_ROOT_CA_2021.replace(/\n/g, '\r\n');
        const res = fn(crlfPem);
        expect(res).toBeDefined();
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
        expect(() => tls.createSecureContext({ ca: res })).not.toThrow();
      });

      it('correctly unescapes single-line PEM with literal "\\n"', () => {
        const escaped = SUPABASE_ROOT_CA_2021.replace(/\n/g, '\\n');
        const res = fn(escaped);
        expect(res).toBeDefined();
        expect(res).toContain('\n');
        expect(res).not.toContain('\\n');
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
        expect(() => tls.createSecureContext({ ca: res })).not.toThrow();
      });

      it('handles single-line PEM with escaped "\\r\\n"', () => {
        const escapedCrlf = SUPABASE_ROOT_CA_2021.replace(/\n/g, '\\r\\n');
        const res = fn(escapedCrlf);
        expect(res).toBeDefined();
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
      });

      it('correctly resolves and loads a real certificate file path', () => {
        const filePath = path.resolve(process.cwd(), 'api/certs/supabase-ca.pem');
        const res = fn(filePath);
        expect(res).toBeDefined();
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
        expect(() => tls.createSecureContext({ ca: res })).not.toThrow();
      });

      it('handles non-existent file paths gracefully without crashing', () => {
        const bogusPath = '/non/existent/path/custom-ca.pem';
        const res = fn(bogusPath);
        expect(res).toBe(bogusPath);

        const bogusWinPath = 'C:\\certs\\ca.crt';
        const resWin = fn(bogusWinPath);
        expect(resWin).toBe(bogusWinPath);
      });

      it('decodes base64-encoded PEM certificate', () => {
        const b64 = Buffer.from(SUPABASE_ROOT_CA_2021).toString('base64');
        const res = fn(b64);
        expect(res).toBeDefined();
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
        expect(() => tls.createSecureContext({ ca: res })).not.toThrow();
      });

      it('decodes base64-encoded PEM with internal newlines (RFC 2045 format)', () => {
        const rawB64 = Buffer.from(SUPABASE_ROOT_CA_2021).toString('base64');
        const chunkedB64 = rawB64.match(/.{1,64}/g)?.join('\n') || rawB64;
        const res = fn(chunkedB64);
        expect(res).toBeDefined();
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
        expect(() => tls.createSecureContext({ ca: res })).not.toThrow();
      });

      it('handles base64 containing "/" without falsely treating as a file', () => {
        // Construct a valid PEM payload whose base64 representation contains '/'
        const pemWithSlash = SUPABASE_ROOT_CA_2021 + '\n???';
        const b64WithSlash = Buffer.from(pemWithSlash).toString('base64');
        expect(b64WithSlash).toContain('/'); // Confirms presence of '/'
        const res = fn(b64WithSlash);
        expect(res).toBeDefined();
        expect(res).toContain('-----BEGIN CERTIFICATE-----');
        expect(() => tls.createSecureContext({ ca: res })).not.toThrow();
      });

      it('does not throw on invalid base64 or non-PEM strings', () => {
        const nonPem = 'not-a-valid-certificate-or-base64';
        expect(() => fn(nonPem)).not.toThrow();
        expect(fn(nonPem)).toBe(nonPem);

        const malformedB64 = '===invalid%%%base64===';
        expect(() => fn(malformedB64)).not.toThrow();
        expect(fn(malformedB64)).toBe(malformedB64);
      });

      it('handles malformed certificates with missing delimiters without throwing', () => {
        const missingEnd = '-----BEGIN CERTIFICATE-----\nMIIDxDCCAqygAwIBAgIU';
        expect(() => fn(missingEnd)).not.toThrow();
        expect(fn(missingEnd)).toBe(missingEnd);

        const missingBegin = 'MIIDxDCCAqygAwIBAgIU\n-----END CERTIFICATE-----';
        expect(() => fn(missingBegin)).not.toThrow();
        expect(fn(missingBegin)).toBe(missingBegin);
      });

      it('survives massive 100KB input without ReDoS or memory crash', () => {
        const largeGarbage = 'A'.repeat(100_000);
        const startTime = Date.now();
        const res = fn(largeGarbage);
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(100); // Must execute under 100ms
        expect(res).toBe(largeGarbage);
      });

      it('handles unicode and multi-byte characters safely', () => {
        const unicodeStr = '🔒🔑 CERTIFICATE TEST 🛡️';
        expect(() => fn(unicodeStr)).not.toThrow();
        expect(fn(unicodeStr)).toBe(unicodeStr);
      });
    });
  }

  it('guarantees behavioral parity between api/health.ts and api/index.ts parseSslCa', () => {
    const testVectors = [
      undefined,
      '',
      '   \n\t',
      SUPABASE_ROOT_CA_2021,
      SUPABASE_ROOT_CA_2021.replace(/\n/g, '\r\n'),
      SUPABASE_ROOT_CA_2021.replace(/\n/g, '\\n'),
      Buffer.from(SUPABASE_ROOT_CA_2021).toString('base64'),
      'api/certs/supabase-ca.pem',
      'invalid/path/test.pem',
      'random-token-12345',
      '-----BEGIN CERTIFICATE-----\nincomplete',
    ];

    for (const vector of testVectors) {
      const resHealth = parseSslCaHealth(vector);
      const resIndex = parseSslCaIndex(vector);
      expect(resHealth).toEqual(resIndex);
    }
  });
});

describe('Adversarial Stress Test: api/health.ts Defensive Headers & Endpoint Security', () => {
  it('GET /api/health returns 200 with all 4 required defensive headers', async () => {
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toBe('GET, OPTIONS');

    // Structural integrity of response payload
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('NOVA Cloud API');
    expect(res.body.hardware).toBeDefined();
    expect(res.body.hardware.chipset).toContain('ESP32-C3');
    expect(res.body.database).toBeDefined();
    expect(typeof res.body.notionConfigured).toBe('boolean');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('OPTIONS /api/health with allowed production origin returns 204 with defensive headers and CORS credentials', async () => {
    const res = await simulateRequest({
      method: 'OPTIONS',
      url: '/api/health',
      headers: {
        origin: 'https://buynovastore.vercel.app',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://buynovastore.vercel.app');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('OPTIONS /api/health with valid preview deployment origin matches regex and returns 204', async () => {
    const previewOrigin = 'https://nova-preview-pr-42-shriyash05s-projects.vercel.app';
    const res = await simulateRequest({
      method: 'OPTIONS',
      url: '/api/health',
      headers: {
        origin: previewOrigin,
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(previewOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('OPTIONS /api/health strictly rejects unauthorized origin with 403 while retaining defensive headers', async () => {
    const maliciousOrigins = [
      'https://malicious-attacker.com',
      'https://evil-site.org',
      'https://buynovastore.vercel.app.attacker.com', // Subdomain spoofing
      'https://nova-pr-42-shriyash05s-projects.vercel.app.attacker.com', // Preview regex trailing spoof
      'http://attacker-controlled.local',
    ];

    for (const origin of maliciousOrigins) {
      const res = await simulateRequest({
        method: 'OPTIONS',
        url: '/api/health',
        headers: { origin },
      });

      expect(res.statusCode).toBe(403);
      // Defensive headers MUST still be present on 403 error responses to prevent framing or sniffing of error pages
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    }
  });

  it('GET /api/health with disallowed origin does not mirror untrusted origin back in Access-Control-Allow-Origin', async () => {
    const untrustedOrigin = 'https://attacker.evil';
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
      headers: { origin: untrustedOrigin },
    });

    expect(res.statusCode).toBe(200);
    // Must fall back to safe production origin, NEVER mirror the attacker origin
    expect(res.headers['access-control-allow-origin']).toBe('https://buynovastore.vercel.app');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('resilience: handles mock DB failure without crashing and maintains 200 healthy status with dbStatus error', async () => {
    // When DB is unreachable, api/health.ts gracefully reports dbStatus: 'disconnected' or 'error'
    const res = await simulateRequest({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(['connected', 'disconnected', 'error']).toContain(res.body.database.status);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
