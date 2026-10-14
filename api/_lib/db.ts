import type {
  DeviceRecord,
  ClaimTokenRecord,
  PairingSessionRecord,
  NotionAuthRecord,
  DeviceActionRecord,
} from './types.ts';
import pg from 'pg';

const { Pool } = pg;

// Global connection pool if DATABASE_URL is set
let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

// In-memory persistent fallback store (used when DATABASE_URL is not yet provisioned)
class MemoryStore {
  public devices = new Map<string, DeviceRecord>();
  public claimTokens = new Map<string, ClaimTokenRecord>();
  public pairingSessions = new Map<string, PairingSessionRecord>();
  public notionAuths = new Map<string, NotionAuthRecord>();
  public deviceActions = new Map<string, DeviceActionRecord>();

  constructor() {
    this.seedDefaultHardware();
  }

  public seedDefaultHardware() {
    // Seed real ESP32-C3 hardware identity
    const defaultDevice: DeviceRecord = {
      id: 'nova_c3_84f3eba1',
      serial_number: 'NOVA-C3-84F3EBA1',
      mac_address: '84:F3:EB:A1:0C:4A',
      hardware_model: 'ESP32-C3 Super Mini',
      firmware_version: 'v1.0.0',
      status: 'offline', // Starts offline until firmware heartbeat is received
      ip_address: null,
      wifi_ssid: null,
      wifi_rssi: null,
      last_heartbeat: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.devices.set(defaultDevice.id, defaultDevice);

    // Seed default 15-minute claim token shown on OLED screen
    const defaultClaim: ClaimTokenRecord = {
      token: 'clm_live_9f82d1c74a0e',
      device_id: defaultDevice.id,
      short_code: 'NOV-84F3',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      is_redeemed: false,
      redeemed_at: null,
      created_at: new Date().toISOString(),
    };
    this.claimTokens.set(defaultClaim.token, defaultClaim);
  }
}

const memoryStore = new MemoryStore();

export const db = {
  async getDevice(deviceId: string): Promise<DeviceRecord | null> {
    if (pool) {
      const res = await pool.query('SELECT * FROM devices WHERE id = $1', [deviceId]);
      return res.rows[0] || null;
    }
    return memoryStore.devices.get(deviceId) || null;
  },

  async getDeviceBySerial(serial: string): Promise<DeviceRecord | null> {
    if (pool) {
      const res = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial]);
      return res.rows[0] || null;
    }
    for (const d of memoryStore.devices.values()) {
      if (d.serial_number.toUpperCase() === serial.toUpperCase()) return d;
    }
    return null;
  },

  async createOrUpdateDevice(device: Partial<DeviceRecord> & { id: string; serial_number: string }): Promise<DeviceRecord> {
    const now = new Date().toISOString();
    if (pool) {
      const query = `
        INSERT INTO devices (id, serial_number, mac_address, hardware_model, firmware_version, status, ip_address, wifi_ssid, wifi_rssi, last_heartbeat, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          hardware_model = EXCLUDED.hardware_model,
          firmware_version = EXCLUDED.firmware_version,
          status = EXCLUDED.status,
          ip_address = EXCLUDED.ip_address,
          wifi_ssid = EXCLUDED.wifi_ssid,
          wifi_rssi = EXCLUDED.wifi_rssi,
          last_heartbeat = EXCLUDED.last_heartbeat,
          updated_at = NOW()
        RETURNING *;
      `;
      const res = await pool.query(query, [
        device.id,
        device.serial_number,
        device.mac_address || '84:F3:EB:A1:0C:4A',
        device.hardware_model || 'ESP32-C3 Super Mini',
        device.firmware_version || 'v1.0.0',
        device.status || 'offline',
        device.ip_address || null,
        device.wifi_ssid || null,
        device.wifi_rssi || null,
        device.last_heartbeat || null,
        now,
        now,
      ]);
      return res.rows[0];
    }

    const existing = memoryStore.devices.get(device.id);
    const updated: DeviceRecord = {
      id: device.id,
      serial_number: device.serial_number,
      mac_address: device.mac_address || existing?.mac_address || '84:F3:EB:A1:0C:4A',
      hardware_model: device.hardware_model || existing?.hardware_model || 'ESP32-C3 Super Mini',
      firmware_version: device.firmware_version || existing?.firmware_version || 'v1.0.0',
      status: device.status || existing?.status || 'offline',
      ip_address: device.ip_address !== undefined ? device.ip_address : existing?.ip_address || null,
      wifi_ssid: device.wifi_ssid !== undefined ? device.wifi_ssid : existing?.wifi_ssid || null,
      wifi_rssi: device.wifi_rssi !== undefined ? device.wifi_rssi : existing?.wifi_rssi || null,
      last_heartbeat: device.last_heartbeat !== undefined ? device.last_heartbeat : existing?.last_heartbeat || null,
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    memoryStore.devices.set(device.id, updated);
    return updated;
  },

  async redeemClaimToken(tokenOrShortCode: string): Promise<{ success: boolean; error?: string; device?: DeviceRecord; claimToken?: ClaimTokenRecord }> {
    const cleanInput = tokenOrShortCode.trim();
    const now = new Date();

    if (pool) {
      const findQuery = `
        SELECT ct.*, d.serial_number, d.hardware_model
        FROM claim_tokens ct
        JOIN devices d ON d.id = ct.device_id
        WHERE ct.token = $1 OR ct.short_code = $1;
      `;
      const res = await pool.query(findQuery, [cleanInput]);
      if (res.rows.length === 0) {
        return { success: false, error: 'INVALID_CLAIM_CODE: No claim record matches this token or short code.' };
      }

      const claim = res.rows[0];
      if (claim.is_redeemed) {
        return { success: false, error: 'CLAIM_TOKEN_ALREADY_REDEEMED: This claim token has already been claimed.' };
      }

      if (new Date(claim.expires_at) < now) {
        return { success: false, error: 'CLAIM_TOKEN_EXPIRED: Claim token has expired (15-minute lifespan). Refresh the QR code on your NOVA OLED.' };
      }

      // Mark redeemed
      await pool.query('UPDATE claim_tokens SET is_redeemed = TRUE, redeemed_at = NOW() WHERE token = $1', [claim.token]);
      const device = await this.getDevice(claim.device_id);
      return { success: true, device: device || undefined, claimToken: claim };
    }

    // Memory Store lookup
    let matchedClaim: ClaimTokenRecord | null = null;
    for (const c of memoryStore.claimTokens.values()) {
      if (c.token === cleanInput || c.short_code.toUpperCase() === cleanInput.toUpperCase()) {
        matchedClaim = c;
        break;
      }
    }

    if (!matchedClaim) {
      return { success: false, error: 'INVALID_CLAIM_CODE: No claim record matches this token or short code.' };
    }

    if (matchedClaim.is_redeemed) {
      return { success: false, error: 'CLAIM_TOKEN_ALREADY_REDEEMED: This claim token has already been claimed.' };
    }

    if (new Date(matchedClaim.expires_at) < now) {
      return { success: false, error: 'CLAIM_TOKEN_EXPIRED: Claim token has expired (15-minute lifespan). Refresh the QR code on your NOVA OLED.' };
    }

    matchedClaim.is_redeemed = true;
    matchedClaim.redeemed_at = now.toISOString();
    const device = memoryStore.devices.get(matchedClaim.device_id);

    return { success: true, device, claimToken: matchedClaim };
  },

  async createClaimToken(deviceId: string, token: string, shortCode: string, expiresInMinutes = 15): Promise<ClaimTokenRecord> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    if (pool) {
      const query = `
        INSERT INTO claim_tokens (token, device_id, short_code, expires_at, is_redeemed, created_at)
        VALUES ($1, $2, $3, $4, FALSE, $5)
        RETURNING *;
      `;
      const res = await pool.query(query, [token, deviceId, shortCode, expiresAt, now]);
      return res.rows[0];
    }

    const claim: ClaimTokenRecord = {
      token,
      device_id: deviceId,
      short_code: shortCode,
      expires_at: expiresAt,
      is_redeemed: false,
      redeemed_at: null,
      created_at: now,
    };
    memoryStore.claimTokens.set(token, claim);
    return claim;
  },

  async createPairingSession(deviceId: string, claimToken: string): Promise<PairingSessionRecord> {
    const sessionId = `sess_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h web session
    const now = new Date().toISOString();

    if (pool) {
      const query = `
        INSERT INTO pairing_sessions (id, device_id, claim_token, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const res = await pool.query(query, [sessionId, deviceId, claimToken, expiresAt, now]);
      return res.rows[0];
    }

    const session: PairingSessionRecord = {
      id: sessionId,
      device_id: deviceId,
      claim_token: claimToken,
      expires_at: expiresAt,
      created_at: now,
    };
    memoryStore.pairingSessions.set(sessionId, session);
    return session;
  },

  async getPairingSession(sessionId: string): Promise<PairingSessionRecord | null> {
    if (pool) {
      const res = await pool.query('SELECT * FROM pairing_sessions WHERE id = $1 AND expires_at > NOW()', [sessionId]);
      return res.rows[0] || null;
    }
    const session = memoryStore.pairingSessions.get(sessionId);
    if (session && new Date(session.expires_at) > new Date()) {
      return session;
    }
    return null;
  },

  async getNotionAuth(deviceId: string): Promise<NotionAuthRecord | null> {
    if (pool) {
      const res = await pool.query('SELECT * FROM notion_authorizations WHERE device_id = $1', [deviceId]);
      return res.rows[0] || null;
    }
    return memoryStore.notionAuths.get(deviceId) || null;
  },

  async saveNotionAuth(auth: NotionAuthRecord): Promise<void> {
    const now = new Date().toISOString();
    if (pool) {
      const query = `
        INSERT INTO notion_authorizations (
          device_id, workspace_id, workspace_name, workspace_icon, bot_id,
          encrypted_access_token, target_database_id, target_database_name,
          owner_email, last_sync_at, connected_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (device_id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          workspace_name = EXCLUDED.workspace_name,
          workspace_icon = EXCLUDED.workspace_icon,
          bot_id = EXCLUDED.bot_id,
          encrypted_access_token = EXCLUDED.encrypted_access_token,
          target_database_id = EXCLUDED.target_database_id,
          target_database_name = EXCLUDED.target_database_name,
          owner_email = EXCLUDED.owner_email,
          last_sync_at = EXCLUDED.last_sync_at,
          updated_at = NOW();
      `;
      await pool.query(query, [
        auth.device_id,
        auth.workspace_id,
        auth.workspace_name,
        auth.workspace_icon,
        auth.bot_id,
        auth.encrypted_access_token,
        auth.target_database_id,
        auth.target_database_name,
        auth.owner_email,
        auth.last_sync_at || null,
        auth.connected_at || now,
        now,
      ]);
      return;
    }
    memoryStore.notionAuths.set(auth.device_id, {
      ...auth,
      updated_at: now,
    });
  },

  async deleteNotionAuth(deviceId: string): Promise<boolean> {
    if (pool) {
      const res = await pool.query('DELETE FROM notion_authorizations WHERE device_id = $1', [deviceId]);
      return (res.rowCount ?? 0) > 0;
    }
    return memoryStore.notionAuths.delete(deviceId);
  },

  async recordDeviceAction(action: {
    deviceId: string;
    actionType: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<{ isDuplicate: boolean; action: DeviceActionRecord }> {
    const now = new Date().toISOString();
    const actionId = `act_${Math.random().toString(36).substring(2, 10)}`;

    if (pool) {
      // Check existing idempotency key
      const existing = await pool.query('SELECT * FROM device_actions WHERE idempotency_key = $1', [action.idempotencyKey]);
      if (existing.rows.length > 0) {
        return { isDuplicate: true, action: existing.rows[0] };
      }

      const insertQuery = `
        INSERT INTO device_actions (id, device_id, action_type, idempotency_key, payload_json, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6)
        RETURNING *;
      `;
      const res = await pool.query(insertQuery, [
        actionId,
        action.deviceId,
        action.actionType,
        action.idempotencyKey,
        JSON.stringify(action.payload),
        now,
      ]);
      return { isDuplicate: false, action: res.rows[0] };
    }

    // Memory Store check
    for (const a of memoryStore.deviceActions.values()) {
      if (a.idempotency_key === action.idempotencyKey) {
        return { isDuplicate: true, action: a };
      }
    }

    const newAction: DeviceActionRecord = {
      id: actionId,
      device_id: action.deviceId,
      action_type: action.actionType,
      idempotency_key: action.idempotencyKey,
      payload_json: action.payload,
      status: 'pending',
      response_json: null,
      created_at: now,
      acknowledged_at: null,
    };
    memoryStore.deviceActions.set(actionId, newAction);
    return { isDuplicate: false, action: newAction };
  },

  async acknowledgeDeviceAction(actionId: string, response: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    if (pool) {
      await pool.query(
        'UPDATE device_actions SET status = $1, response_json = $2, acknowledged_at = $3 WHERE id = $4',
        ['acknowledged', JSON.stringify(response), now, actionId]
      );
      return;
    }
    const a = memoryStore.deviceActions.get(actionId);
    if (a) {
      a.status = 'acknowledged';
      a.response_json = response;
      a.acknowledged_at = now;
    }
  },

  async getPendingActionCount(deviceId: string): Promise<number> {
    if (pool) {
      const res = await pool.query(
        "SELECT COUNT(*) as count FROM device_actions WHERE device_id = $1 AND status = 'pending'",
        [deviceId]
      );
      return parseInt(res.rows[0].count, 10);
    }
    let count = 0;
    for (const a of memoryStore.deviceActions.values()) {
      if (a.device_id === deviceId && a.status === 'pending') count++;
    }
    return count;
  },
};
