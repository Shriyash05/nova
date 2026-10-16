/**
 * Hermetic, In-Memory HTTP Backend Server implementing API_CONTRACT.md
 * Provides isolated state per test instance to prevent cross-test contamination.
 */

import crypto from 'crypto';

export interface DeviceRecord {
  id: string;
  serialNumber: string;
  macAddress: string;
  hardwareModel: string;
  firmwareVersion: string;
  status: 'online' | 'offline';
  deviceSecretHash: string;
  bootstrapHash: string;
  ipAddress: string | null;
  wifiConnected: boolean;
  wifiSsid: string | null;
  wifiRssi: number | null;
  wifiVaultVersion: number;
  oledState: string;
  queueCount: number;
  lastHeartbeat: Date | null;
}

export interface WifiProfileRecord {
  id: string;
  deviceId: string;
  name: string;
  voiceSlot: string;
  slotNumber: number;
  ssid: string;
  encryptedPassword: string; // iv:authTag:ciphertext
  cleartextPassword?: string;
  isDefault: boolean;
  version: number;
  lastConnectionResult: string;
  lastAttemptedAt: Date | null;
  lastRssi: number | null;
}

export interface ClaimTokenRecord {
  token: string;
  deviceId: string;
  shortCode: string;
  expiresAt: Date;
  isRedeemed: boolean;
  redeemedAt: Date | null;
}

export interface PairingSessionRecord {
  id: string;
  deviceId: string;
  claimToken: string;
  expiresAt: Date;
}

export interface NotionAuthRecord {
  deviceId: string;
  workspaceId: string | null;
  workspaceName: string | null;
  encryptedAccessToken: string;
  targetDatabaseId: string | null;
  targetDatabaseName: string | null;
  connectedAt: Date;
}

export class MockBackendServer {
  public devices = new Map<string, DeviceRecord>();
  public bootstrapCredentials = new Map<string, { hash: string; isUsed: boolean }>();
  public activeDeviceKeys = new Map<string, string>(); // deviceId -> cleartext deviceKey
  public claimTokens = new Map<string, ClaimTokenRecord>();
  public pairingSessions = new Map<string, PairingSessionRecord>();
  public wifiProfiles = new Map<string, WifiProfileRecord[]>(); // deviceId -> profiles[]
  public notionAuths = new Map<string, NotionAuthRecord>();
  public waitlistSignups = new Map<string, { email: string; consent: boolean; createdAt: Date }>();

  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = crypto.createHash('sha256').update('test_aes_256_gcm_encryption_key').digest();
    this.seedDefaultHardware();
  }

  public seedDefaultHardware(): void {
    const defaultDeviceId = 'nova-c3-5c20dc4239fca9ec';
    const defaultSecret = 'factory_bootstrap_secret_12345';
    const bootstrapHash = crypto.createHash('sha256').update(defaultSecret).digest('hex');

    this.bootstrapCredentials.set(defaultDeviceId, { hash: bootstrapHash, isUsed: false });
  }

  // Helper: Encrypt at rest with AES-256-GCM
  public encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${ciphertext}`;
  }

  // Helper: Decrypt from AES-256-GCM
  public decrypt(encryptedString: string): string {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('MALFORMED_CIPHERTEXT');
    }
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Authenticate bearer token: returns { authenticated: boolean, deviceId?: string, isDeviceKey?: boolean, isSession?: boolean }
  public authenticateBearer(authHeader?: string, targetDeviceId?: string): {
    authenticated: boolean;
    deviceId?: string;
    isDeviceKey?: boolean;
    isSession?: boolean;
    errorStatus?: number;
    errorCode?: string;
  } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, errorStatus: 401, errorCode: 'UNAUTHORIZED' };
    }
    const token = authHeader.replace('Bearer ', '').trim();

    // Check deviceKey
    for (const [devId, key] of this.activeDeviceKeys.entries()) {
      if (token === key) {
        if (targetDeviceId && targetDeviceId !== devId) {
          return { authenticated: false, errorStatus: 403, errorCode: 'CROSS_DEVICE_FORBIDDEN' };
        }
        return { authenticated: true, deviceId: devId, isDeviceKey: true };
      }
    }

    // Check pairingSession
    const session = this.pairingSessions.get(token);
    if (session) {
      if (new Date() > session.expiresAt) {
        return { authenticated: false, errorStatus: 401, errorCode: 'SESSION_EXPIRED' };
      }
      if (targetDeviceId && targetDeviceId !== session.deviceId) {
        return { authenticated: false, errorStatus: 403, errorCode: 'FORBIDDEN' };
      }
      return { authenticated: true, deviceId: session.deviceId, isSession: true };
    }

    return { authenticated: false, errorStatus: 401, errorCode: 'INVALID_TOKEN' };
  }

  // Core HTTP Simulator
  public async handleRequest(req: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }): Promise<{ status: number; headers: Record<string, string>; body: any }> {
    const url = new URL(req.path, 'https://buynovastore.vercel.app');
    const pathname = url.pathname;
    const rawHeaders = req.headers || {};
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      headers[k.toLowerCase()] = v;
    }
    const resHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

    // GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          status: 'ok',
          database: { connected: true, pool: 'active' },
          hardware: { target: 'ESP32-C3 Super Mini', oled: 'SSD1306 128x64', mic: 'MAX4466 GPIO1' },
          timestamp: new Date().toISOString(),
        },
      };
    }

    // POST /api/v1/devices/bootstrap
    if (req.method === 'POST' && pathname === '/api/v1/devices/bootstrap') {
      const { deviceId, macAddress, bootstrapSecret } = req.body || {};
      if (!deviceId || !macAddress || !bootstrapSecret) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'INVALID_REQUEST', message: 'Missing parameters' } },
        };
      }

      const cred = this.bootstrapCredentials.get(deviceId);
      if (!cred) {
        return {
          status: 404,
          headers: resHeaders,
          body: { success: false, error: { code: 'DEVICE_NOT_FOUND', message: 'Device not pre-enrolled' } },
        };
      }

      const inputHash = crypto.createHash('sha256').update(bootstrapSecret).digest('hex');
      if (inputHash !== cred.hash) {
        return {
          status: 401,
          headers: resHeaders,
          body: { success: false, error: { code: 'INVALID_BOOTSTRAP_SECRET', message: 'Secret hash mismatch' } },
        };
      }

      if (cred.isUsed) {
        return {
          status: 409,
          headers: resHeaders,
          body: { success: false, error: { code: 'BOOTSTRAP_ALREADY_USED', message: 'Single-use credential already used' } },
        };
      }

      cred.isUsed = true;
      const deviceKey = `dkey_${crypto.randomBytes(16).toString('hex')}`;
      const deviceSecretHash = crypto.createHash('sha256').update(deviceKey).digest('hex');
      this.activeDeviceKeys.set(deviceId, deviceKey);

      const deviceRec: DeviceRecord = {
        id: deviceId,
        serialNumber: `NOVA-C3-${deviceId.replace('nova-c3-', '').toUpperCase()}`,
        macAddress,
        hardwareModel: 'ESP32-C3 Super Mini',
        firmwareVersion: 'v1.0.0-c3',
        status: 'online',
        deviceSecretHash,
        bootstrapHash: cred.hash,
        ipAddress: '192.168.1.100',
        wifiConnected: true,
        wifiSsid: 'Home_Wifi',
        wifiRssi: -52,
        wifiVaultVersion: 1,
        oledState: 'idle',
        queueCount: 0,
        lastHeartbeat: new Date(),
      };
      this.devices.set(deviceId, deviceRec);

      // Issue initial 15-minute claim token for OLED QR
      const claimToken = `clm_live_${crypto.randomBytes(4).toString('hex')}`;
      const shortCode = `NOV-${claimToken.slice(-4).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      this.claimTokens.set(claimToken, {
        token: claimToken,
        deviceId,
        shortCode,
        expiresAt,
        isRedeemed: false,
        redeemedAt: null,
      });

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            deviceId,
            deviceKey,
            claimToken,
            shortCode,
            portalUrl: `https://buynovastore.vercel.app/?token=${claimToken}`,
            expiresInSeconds: 900,
          },
        },
      };
    }

    // POST /api/v1/devices/claim
    if (req.method === 'POST' && pathname === '/api/v1/devices/claim') {
      const { claimToken } = req.body || {};
      if (!claimToken) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'MISSING_CLAIM_TOKEN', message: 'Claim token is required' } },
        };
      }

      const tokenRec = this.claimTokens.get(claimToken);
      if (!tokenRec) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'INVALID_CLAIM_TOKEN', message: 'Token not recognized' } },
        };
      }

      if (tokenRec.isRedeemed) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'CLAIM_TOKEN_ALREADY_USED', message: 'Token already redeemed' } },
        };
      }

      if (new Date() > tokenRec.expiresAt) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'CLAIM_TOKEN_EXPIRED', message: 'Token has expired' } },
        };
      }

      tokenRec.isRedeemed = true;
      tokenRec.redeemedAt = new Date();

      const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      this.pairingSessions.set(sessionId, {
        id: sessionId,
        deviceId: tokenRec.deviceId,
        claimToken,
        expiresAt: sessionExpiresAt,
      });

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            pairingSessionId: sessionId,
            deviceId: tokenRec.deviceId,
            expiresAt: sessionExpiresAt.toISOString(),
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/device-key/rotate
    const rotateMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/device-key\/rotate$/);
    if (req.method === 'POST' && rotateMatch) {
      const targetDeviceId = rotateMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const newKey = `dkey_${crypto.randomBytes(16).toString('hex')}`;
      this.activeDeviceKeys.set(targetDeviceId, newKey);
      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            deviceId: targetDeviceId,
            deviceKey: newKey,
            rotatedAt: new Date().toISOString(),
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/claim-token
    const claimTokenMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/claim-token$/);
    if (req.method === 'POST' && claimTokenMatch) {
      const targetDeviceId = claimTokenMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const token = `clm_live_${crypto.randomBytes(4).toString('hex')}`;
      const shortCode = `NOV-${token.slice(-4).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      this.claimTokens.set(token, {
        token,
        deviceId: targetDeviceId,
        shortCode,
        expiresAt,
        isRedeemed: false,
        redeemedAt: null,
      });

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            deviceId: targetDeviceId,
            claimToken: token,
            shortCode,
            expiresAt: expiresAt.toISOString(),
            expiresInSeconds: 900,
            portalUrl: `https://buynovastore.vercel.app/?token=${token}`,
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/heartbeat & /api/v1/devices/heartbeat
    const heartbeatMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/heartbeat$/);
    const isDirectHeartbeat = pathname === '/api/v1/devices/heartbeat';
    if (req.method === 'POST' && (heartbeatMatch || isDirectHeartbeat)) {
      const targetDeviceId = heartbeatMatch ? heartbeatMatch[1] : (headers['x-nova-device-id'] || req.body?.deviceId || '');
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      // Security check: Zero password in heartbeat telemetry
      if (req.body && (req.body.password || req.body.wifiPassword)) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'INVALID_TELEMETRY', message: 'Telemetry must not include passwords' } },
        };
      }

      // Truth-in-Hardware: validate power telemetry if provided
      const rawPowerSource = req.body?.power_source ?? req.body?.powerSource ?? req.body?.powerStatus;
      if (rawPowerSource !== undefined && rawPowerSource !== null) {
        const normalizedPower = String(rawPowerSource).trim().toLowerCase();
        const validSources = ['usb_5v', 'usb-c_5v', 'usb_c_5v', 'power_line_usb_5v', 'usb-c 5v bus'];
        if (!validSources.includes(normalizedPower)) {
          return {
            status: 400,
            headers: resHeaders,
            body: { success: false, error: { code: 'INVALID_POWER_TELEMETRY', message: 'Invalid power source. Expected usb_5v or usb-c_5v.' } },
          };
        }
      }

      // Reject fake battery percentage or non-null battery voltage
      if (
        (req.body?.batteryPercent !== undefined && req.body?.batteryPercent !== null) ||
        (req.body?.battery_percent !== undefined && req.body?.battery_percent !== null) ||
        (req.body?.batteryMv !== undefined && req.body?.batteryMv !== null) ||
        (req.body?.battery_mv !== undefined && req.body?.battery_mv !== null)
      ) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'INVALID_POWER_TELEMETRY', message: 'Battery telemetry is prohibited. Hardware is USB-C 5V powered.' } },
        };
      }

      const dev = this.devices.get(targetDeviceId);
      if (dev) {
        dev.lastHeartbeat = new Date();
        dev.status = 'online';
        if (req.body?.rssi !== undefined) dev.wifiRssi = req.body.rssi;
        if (req.body?.ipAddress !== undefined) dev.ipAddress = req.body.ipAddress;
        if (req.body?.oledState !== undefined) dev.oledState = req.body.oledState;
      }

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            acknowledged: true,
            deviceId: targetDeviceId,
            serverTime: new Date().toISOString(),
            powerSource: 'usb_5v',
          },
        },
      };
    }

    // GET /api/v1/devices/:deviceId/status
    const statusMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/status$/);
    if (req.method === 'GET' && statusMatch) {
      const targetDeviceId = statusMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const dev = this.devices.get(targetDeviceId);
      if (!dev) {
        return {
          status: 404,
          headers: resHeaders,
          body: { success: false, error: { code: 'DEVICE_NOT_FOUND', message: 'Device not found' } },
        };
      }

      // Stale telemetry check: If heartbeat > 90 seconds old, mark offline and scrub transient IP/RSSI
      const isOnline = dev.lastHeartbeat ? (Date.now() - dev.lastHeartbeat.getTime()) < 90000 : false;
      const effectiveStatus = isOnline ? 'online' : 'offline';
      const effectiveIp = isOnline ? dev.ipAddress : null;
      const effectiveRssi = isOnline ? dev.wifiRssi : null;

      const notion = this.notionAuths.get(targetDeviceId);

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            id: dev.id,
            serialNumber: dev.serialNumber,
            macAddress: dev.macAddress,
            hardwareModel: dev.hardwareModel,
            status: effectiveStatus,
            online: isOnline,
            wifi: {
              connected: isOnline && dev.wifiConnected,
              ssid: dev.wifiSsid,
              rssi: effectiveRssi,
              ipAddress: effectiveIp,
            },
            notion: {
              connected: !!notion,
              workspaceName: notion?.workspaceName || null,
              targetDatabaseName: notion?.targetDatabaseName || null,
            },
            lastHeartbeat: dev.lastHeartbeat?.toISOString() || null,
          },
        },
      };
    }

    // GET /api/v1/devices/:deviceId/wifi-profiles
    const wifiGetMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles$/);
    if (req.method === 'GET' && wifiGetMatch) {
      const targetDeviceId = wifiGetMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const dev = this.devices.get(targetDeviceId);
      const vaultVersion = dev ? dev.wifiVaultVersion : 1;
      const etag = `W/"vault-${targetDeviceId}-v${vaultVersion}"`;

      if (headers['if-none-match'] === etag) {
        return { status: 304, headers: { ETag: etag }, body: null };
      }

      const profiles = this.wifiProfiles.get(targetDeviceId) || [];
      const transformedProfiles = profiles.map(p => {
        const item: any = {
          id: p.id,
          name: p.name,
          voiceSlot: p.voiceSlot,
          slotNumber: p.slotNumber,
          ssid: p.ssid,
          isDefault: p.isDefault,
          version: p.version,
          lastConnectionResult: p.lastConnectionResult,
          lastAttemptedAt: p.lastAttemptedAt?.toISOString() || null,
          lastRssi: p.lastRssi,
          hasPassword: true,
        };
        // ESP32 firmware calling with deviceKey gets decrypted cleartext password over TLS
        if (auth.isDeviceKey) {
          item.password = p.cleartextPassword || this.decrypt(p.encryptedPassword);
        }
        return item;
      });

      resHeaders['ETag'] = etag;
      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            deviceId: targetDeviceId,
            vaultVersion,
            profileCount: profiles.length,
            maxProfiles: 5,
            profiles: transformedProfiles,
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/wifi-profiles
    const wifiPostMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles$/);
    if (req.method === 'POST' && wifiPostMatch) {
      const targetDeviceId = wifiPostMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const { name, ssid, password, isDefault } = req.body || {};
      const trimmedSsid = typeof ssid === 'string' ? ssid.trim() : '';
      if (!trimmedSsid) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'SSID_REQUIRED', message: 'A 2.4GHz Wi-Fi SSID is required.' } },
        };
      }

      const profiles = this.wifiProfiles.get(targetDeviceId) || [];
      if (profiles.length >= 5) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'VAULT_LIMIT_REACHED', message: 'Maximum 5 profiles allowed per device' } },
        };
      }

      const slotNumber = profiles.length + 1;
      const voiceSlots = ['network one', 'network two', 'network three', 'network four', 'network five'];
      const voiceSlot = voiceSlots[slotNumber - 1];

      // If isDefault is true, clear isDefault on others
      if (isDefault) {
        profiles.forEach(p => (p.isDefault = false));
      }

      const profileName = typeof name === 'string' && name.trim() ? name.trim() : `Network ${profiles.length + 1}`;
      const finalPassword = typeof password === 'string' ? password : '';
      const profileId = `prof_${crypto.randomBytes(6).toString('hex')}`;
      const encryptedPassword = finalPassword ? this.encrypt(finalPassword) : '';

      const newProfile: WifiProfileRecord = {
        id: profileId,
        deviceId: targetDeviceId,
        name: profileName,
        voiceSlot,
        slotNumber,
        ssid: trimmedSsid,
        encryptedPassword,
        cleartextPassword: finalPassword,
        isDefault: !!isDefault,
        version: 1,
        lastConnectionResult: 'pending',
        lastAttemptedAt: null,
        lastRssi: null,
      };

      profiles.push(newProfile);
      this.wifiProfiles.set(targetDeviceId, profiles);

      const dev = this.devices.get(targetDeviceId);
      if (dev) dev.wifiVaultVersion++;

      return {
        status: 201,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            profile: {
              id: profileId,
              name: profileName,
              voiceSlot,
              slotNumber,
              ssid: trimmedSsid,
              hasPassword: !!finalPassword,
              isDefault: !!isDefault,
              version: 1,
              lastConnectionResult: 'pending',
              lastAttemptedAt: null,
              lastRssi: null,
            },
            vaultVersion: dev ? dev.wifiVaultVersion : 2,
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/wifi-profiles/:profileId/make-default
    const makeDefaultMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles\/([^/]+)\/make-default$/);
    if (req.method === 'POST' && makeDefaultMatch) {
      const targetDeviceId = makeDefaultMatch[1];
      const targetProfileId = makeDefaultMatch[2];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const profiles = this.wifiProfiles.get(targetDeviceId) || [];
      const profile = profiles.find(p => p.id === targetProfileId);
      if (!profile) {
        return {
          status: 404,
          headers: resHeaders,
          body: { success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Wi-Fi profile not found' } },
        };
      }

      profiles.forEach(p => (p.isDefault = (p.id === targetProfileId)));
      const dev = this.devices.get(targetDeviceId);
      if (dev) dev.wifiVaultVersion++;

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            profileId: targetProfileId,
            isDefault: true,
            vaultVersion: dev ? dev.wifiVaultVersion : 1,
          },
        },
      };
    }

    // DELETE /api/v1/devices/:deviceId/wifi-profiles/:profileId
    const deleteProfileMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles\/([^/]+)$/);
    if (req.method === 'DELETE' && deleteProfileMatch) {
      const targetDeviceId = deleteProfileMatch[1];
      const targetProfileId = deleteProfileMatch[2];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const profiles = this.wifiProfiles.get(targetDeviceId) || [];
      const idx = profiles.findIndex(p => p.id === targetProfileId);
      if (idx === -1) {
        return {
          status: 404,
          headers: resHeaders,
          body: { success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        };
      }

      profiles.splice(idx, 1);
      // Recompact voice slots (1..N)
      const voiceSlots = ['network one', 'network two', 'network three', 'network four', 'network five'];
      profiles.forEach((p, index) => {
        p.slotNumber = index + 1;
        p.voiceSlot = voiceSlots[index];
      });

      const dev = this.devices.get(targetDeviceId);
      if (dev) dev.wifiVaultVersion++;

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            deleted: true,
            profileId: targetProfileId,
            vaultVersion: dev ? dev.wifiVaultVersion : 1,
          },
        },
      };
    }

    // GET /api/v1/devices/:deviceId/wifi-profiles/boot
    const bootMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profiles\/boot$/);
    if (req.method === 'GET' && bootMatch) {
      const targetDeviceId = bootMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated || !auth.isDeviceKey) {
        return {
          status: auth.authenticated ? 403 : (auth.errorStatus || 401),
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode || 'FIRMWARE_AUTH_REQUIRED', message: 'Firmware deviceKey auth required' } },
        };
      }

      const profiles = this.wifiProfiles.get(targetDeviceId) || [];
      const def = profiles.find(p => p.isDefault);
      const dev = this.devices.get(targetDeviceId);

      if (def) {
        return {
          status: 200,
          headers: resHeaders,
          body: {
            success: true,
            data: {
              deviceId: targetDeviceId,
              vaultVersion: dev ? dev.wifiVaultVersion : 1,
              hasDefault: true,
              defaultProfile: {
                id: def.id,
                name: def.name,
                voiceSlot: def.voiceSlot,
                slotNumber: def.slotNumber,
                ssid: def.ssid,
                isDefault: true,
                version: def.version,
                password: def.cleartextPassword || this.decrypt(def.encryptedPassword),
                hasPassword: true,
              },
            },
          },
        };
      } else {
        return {
          status: 200,
          headers: resHeaders,
          body: {
            success: true,
            data: {
              deviceId: targetDeviceId,
              vaultVersion: dev ? dev.wifiVaultVersion : 1,
              hasDefault: false,
              defaultProfile: null,
              message: 'No default boot profile configured for device.',
            },
          },
        };
      }
    }

    // POST /api/v1/devices/:deviceId/wifi-profile-result
    const resultMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi-profile-result$/);
    if (req.method === 'POST' && resultMatch) {
      const targetDeviceId = resultMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated || !auth.isDeviceKey) {
        return {
          status: auth.authenticated ? 403 : (auth.errorStatus || 401),
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode || 'FIRMWARE_AUTH_REQUIRED', message: 'Firmware auth required' } },
        };
      }

      const { profileId, result, rssi, appliedVersion } = req.body || {};
      const profiles = this.wifiProfiles.get(targetDeviceId) || [];
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        profile.lastConnectionResult = result || 'connected';
        profile.lastAttemptedAt = new Date();
        if (rssi !== undefined) profile.lastRssi = rssi;
      }

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            acknowledged: true,
            deviceId: targetDeviceId,
            profileId,
            result: result || 'connected',
            appliedVersion: appliedVersion || 1,
            serverTime: new Date().toISOString(),
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/wifi/provision (Cloud Provision Guard)
    const provisionGuardMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/wifi\/provision$/);
    if (req.method === 'POST' && provisionGuardMatch) {
      return {
        status: 400,
        headers: resHeaders,
        body: {
          success: false,
          error: {
            code: 'LOCAL_PROVISIONING_REQUIRED',
            message: 'Wi-Fi credentials must be provisioned locally over SoftAP (http://192.168.4.1), never through cloud servers.',
          },
        },
      };
    }

    // POST /api/v1/auth/notion/authorize
    if (req.method === 'POST' && pathname === '/api/v1/auth/notion/authorize') {
      const stateToken = `st_${crypto.randomBytes(16).toString('hex')}`;
      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            authorizationUrl: `https://api.notion.com/v1/oauth/authorize?client_id=mock_client&response_type=code&state=${stateToken}`,
            stateToken,
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/notion/disconnect
    const disconnectMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/notion\/disconnect$/);
    if (req.method === 'POST' && disconnectMatch) {
      const targetDeviceId = disconnectMatch[1];
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      this.notionAuths.delete(targetDeviceId);
      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            deviceId: targetDeviceId,
            disconnected: true,
            revokedAt: new Date().toISOString(),
          },
        },
      };
    }

    // POST /api/v1/devices/:deviceId/sync/test & /api/v1/devices/actions/sync
    const syncTestMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/sync\/test$/);
    const actionSyncMatch = pathname.match(/^\/api\/v1\/devices\/([^/]+)\/actions\/sync$/);
    const isDirectActionSync = pathname === '/api/v1/devices/actions/sync';
    if (req.method === 'POST' && (syncTestMatch || actionSyncMatch || isDirectActionSync)) {
      const targetDeviceId = syncTestMatch
        ? syncTestMatch[1]
        : actionSyncMatch
          ? actionSyncMatch[1]
          : (headers['x-nova-device-id'] || req.body?.deviceId || '');
      const auth = this.authenticateBearer(headers['authorization'], targetDeviceId);
      if (!auth.authenticated) {
        return {
          status: auth.errorStatus || 401,
          headers: resHeaders,
          body: { success: false, error: { code: auth.errorCode, message: 'Authentication failed' } },
        };
      }

      const notion = this.notionAuths.get(targetDeviceId);
      if (!notion) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'NOTION_NOT_CONNECTED', message: 'Notion integration not authorized for this device' } },
        };
      }

      return {
        status: 200,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            pageId: `page_${crypto.randomBytes(8).toString('hex')}`,
            databaseId: notion.targetDatabaseId || 'db_mock',
            syncedAt: new Date().toISOString(),
          },
        },
      };
    }

    // POST /api/v1/launch-signup
    if (req.method === 'POST' && pathname === '/api/v1/launch-signup') {
      const { email, consent } = req.body || {};
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'INVALID_EMAIL', message: 'Valid email address is required' } },
        };
      }
      if (!consent) {
        return {
          status: 400,
          headers: resHeaders,
          body: { success: false, error: { code: 'CONSENT_REQUIRED', message: 'Explicit consent required under DPDP Act 2023' } },
        };
      }

      this.waitlistSignups.set(email.toLowerCase(), { email: email.toLowerCase(), consent, createdAt: new Date() });
      return {
        status: 201,
        headers: resHeaders,
        body: {
          success: true,
          data: {
            message: 'Signed up successfully for NOVA release updates.',
            email: email.toLowerCase(),
          },
        },
      };
    }

    return {
      status: 404,
      headers: resHeaders,
      body: { success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${pathname} not found` } },
    };
  }
}
