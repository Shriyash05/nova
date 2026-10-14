import type { IncomingMessage, ServerResponse } from 'http';
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;
function getPool(): pg.Pool | null {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (_req.method === 'OPTIONS') {
    res.statusCode = 200;
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
