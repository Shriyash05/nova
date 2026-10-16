import { describe, it, expect } from 'vitest';
import { MockBackendServer } from '../fixtures/mockBackendServer';
import fs from 'fs';
import path from 'path';

describe('Tier 1: Feature Coverage — R5 Customer Experience & Modern Web Platform', () => {
  it('T1-R5-01: Verifies device pairing flow exchanges claim token for 30-day web pairing session', async () => {
    const server = new MockBackendServer();

    // Bootstrap hardware to generate claim token
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    expect(bootRes.status).toBe(200);
    const claimToken = bootRes.body.data.claimToken;

    // Web user redeems claim token
    const claimRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: { claimToken },
    });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.data.pairingSessionId).toMatch(/^sess_/);
    expect(claimRes.body.data.deviceId).toBe('nova-c3-5c20dc4239fca9ec');
  });

  it('T1-R5-02: Verifies Wi-Fi vault management allows adding profiles with deterministic voice slots', async () => {
    const server = new MockBackendServer();
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    const deviceKey = bootRes.body.data.deviceKey;

    // Add profile
    const addRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${deviceKey}` },
      body: {
        name: 'Home Studio',
        ssid: 'Home_Studio_2.4G',
        password: 'secure_wifi_password_123',
        isDefault: true,
      },
    });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.profile.voiceSlot).toBe('network one');
    expect(addRes.body.data.profile.slotNumber).toBe(1);
    expect(addRes.body.data.profile.hasPassword).toBe(true);
  });

  it('T1-R5-03: Verifies anti-slop rule: browser responses NEVER leak cleartext passwords', async () => {
    const server = new MockBackendServer();
    const bootRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/bootstrap',
      body: {
        deviceId: 'nova-c3-5c20dc4239fca9ec',
        macAddress: '48:F6:EE:17:34:D8',
        bootstrapSecret: 'factory_bootstrap_secret_12345',
      },
    });
    const claimRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/claim',
      body: { claimToken: bootRes.body.data.claimToken },
    });
    const sessionToken = claimRes.body.data.pairingSessionId;

    // Add a profile using session token
    await server.handleRequest({
      method: 'POST',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: {
        name: 'Office Workshop',
        ssid: 'Office_2.4G',
        password: 'ultra_secret_pass',
        isDefault: false,
      },
    });

    // Query vault with browser session
    const listRes = await server.handleRequest({
      method: 'GET',
      path: '/api/v1/devices/nova-c3-5c20dc4239fca9ec/wifi-profiles',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(listRes.status).toBe(200);
    const profile = listRes.body.data.profiles[0];
    expect(profile.hasPassword).toBe(true);
    expect(profile.password).toBeUndefined(); // Zero cleartext password to browser!
  });

  it('T1-R5-04: Verifies honest waitlist registration requires valid email and explicit consent', async () => {
    const server = new MockBackendServer();

    // Missing consent
    const noConsentRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/launch-signup',
      body: { email: 'user@example.com', consent: false },
    });
    expect(noConsentRes.status).toBe(400);
    expect(noConsentRes.body.error.code).toBe('CONSENT_REQUIRED');

    // Valid signup
    const validRes = await server.handleRequest({
      method: 'POST',
      path: '/api/v1/launch-signup',
      body: { email: 'developer@novavoice.io', consent: true },
    });
    expect(validRes.status).toBe(201);
    expect(validRes.body.success).toBe(true);
  });

  it('T1-R5-05: Verifies production SEO assets and markup exist in public repository directory', () => {
    const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
    const sitemapPath = path.resolve(process.cwd(), 'public/sitemap.xml');
    const indexHtmlPath = path.resolve(process.cwd(), 'index.html');

    expect(fs.existsSync(robotsPath)).toBe(true);
    expect(fs.existsSync(sitemapPath)).toBe(true);
    expect(fs.existsSync(indexHtmlPath)).toBe(true);

    const robotsContent = fs.readFileSync(robotsPath, 'utf8');
    expect(robotsContent).toContain('User-agent: *');
    expect(robotsContent).toContain('Allow: /');

    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(indexHtml).toContain('<title>');
    expect(indexHtml).toContain('viewport');
  });
});
