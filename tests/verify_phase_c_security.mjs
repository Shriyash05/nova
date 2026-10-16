/**
 * Comprehensive Empirical Verification Script for Phase C Security Hardening
 * 
 * Usage:
 *   node tests/verify_phase_c_security.mjs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

// 1. Load database credentials from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let dbUrl = '';
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*['"]?(.*?)['"]?\s*$/);
    if (match) dbUrl = match[1].trim();
  }
}

if (!dbUrl) {
  console.error('[FAIL] DATABASE_URL not found in .env.local');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 5000,
});

async function main() {
  console.log('================================================================');
  console.log('       PHASE C SECURITY EMPIRICAL VERIFICATION HARNESS          ');
  console.log('================================================================\n');

  const client = await pool.connect();
  try {
    // -------------------------------------------------------------------------
    // V1. Live Database Table Ownership & RLS Policy State
    // -------------------------------------------------------------------------
    console.log('--- V1. Live Database Table Ownership & RLS State ---');
    const tableRes = await client.query(`
      SELECT tablename, tableowner, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    console.log('Public tables and owners:');
    console.table(tableRes.rows);

    const policyRes = await client.query(`
      SELECT tablename, policyname, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public';
    `);
    console.log(`Active RLS policies in pg_policies: ${policyRes.rows.length}`);
    if (policyRes.rows.length === 0) {
      console.log('  -> DEFECT: 0 policies exist in pg_policies on the live database.\n');
    }

    // -------------------------------------------------------------------------
    // V2. Attempt to Apply schema.sql with Application Connection (DATABASE_URL)
    // -------------------------------------------------------------------------
    console.log('--- V2. Verification of schema.sql Apply via DATABASE_URL ---');
    const schemaSql = fs.readFileSync('schema.sql', 'utf8');
    await client.query('BEGIN');
    let schemaApplied = false;
    let schemaErrMsg = '';
    try {
      await client.query(schemaSql);
      schemaApplied = true;
    } catch (err) {
      schemaErrMsg = err.message;
    } finally {
      await client.query('ROLLBACK');
    }
    console.log(`schema.sql apply result: ${schemaApplied ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  -> Error: ${schemaErrMsg}\n`);

    // -------------------------------------------------------------------------
    // V3. Attempt to Apply schema_rollback.sql with Application Connection
    // -------------------------------------------------------------------------
    console.log('--- V3. Verification of schema_rollback.sql Apply via DATABASE_URL ---');
    const rollbackSql = fs.readFileSync('schema_rollback.sql', 'utf8');
    await client.query('BEGIN');
    let rollbackApplied = false;
    let rollbackErrMsg = '';
    try {
      await client.query(rollbackSql);
      rollbackApplied = true;
    } catch (err) {
      rollbackErrMsg = err.message;
    } finally {
      await client.query('ROLLBACK');
    }
    console.log(`schema_rollback.sql apply result: ${rollbackApplied ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  -> Error: ${rollbackErrMsg}\n`);

    // -------------------------------------------------------------------------
    // V4. Database SSL Pool Enforcement in api/index.ts
    // -------------------------------------------------------------------------
    console.log('--- V4. DB Connection Pool SSL Strict Verification Check ---');
    const poolStrict = new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: true },
      connectionTimeoutMillis: 5000,
    });
    let sslFailedWithExpectedCode = false;
    let sslErrMsg = '';
    try {
      await poolStrict.query('SELECT 1');
    } catch (err) {
      sslFailedWithExpectedCode = err.code === 'SELF_SIGNED_CERT_IN_CHAIN';
      sslErrMsg = `${err.message} (${err.code})`;
    } finally {
      await poolStrict.end();
    }
    console.log(`Strict TLS query without root CA: ${sslErrMsg}`);
    console.log(`  -> Demonstrates: In production (VERCEL=1), rejectUnauthorized: true will crash without DATABASE_SSL_CA.`);

    // Verify strict TLS with bundled root CA
    const bundledCaPath = path.resolve(process.cwd(), 'api/certs/supabase-ca.pem');
    let bundledCaPass = false;
    if (fs.existsSync(bundledCaPath)) {
      const caContent = fs.readFileSync(bundledCaPath, 'utf8');
      const poolWithCa = new pg.Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: true, ca: caContent },
        connectionTimeoutMillis: 5000,
      });
      try {
        await poolWithCa.query('SELECT 1');
        bundledCaPass = true;
      } catch (err) {
        console.log(`Pool with CA query failed: ${err.message}`);
      } finally {
        await poolWithCa.end();
      }
    }
    console.log(`Strict TLS query WITH bundled root CA: ${bundledCaPass ? 'SUCCESS (Certificate verified!)' : 'FAILED'}\n`);

    // -------------------------------------------------------------------------
    // V5. Static Contract Analysis of RLS IDOR Vulnerability in schema.sql
    // -------------------------------------------------------------------------
    console.log('--- V5. Analysis of user_devices RLS Policy in schema.sql ---');
    const lines = schemaSql.split('\n');
    const grantLine = lines.find(l => l.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated'));
    const policyWithCheck = schemaSql.includes('authenticated_insert_own_user_devices');
    console.log(`Grant on user_devices to authenticated: ${Boolean(grantLine)}`);
    console.log(`Policy authenticated_insert_own_user_devices exists: ${policyWithCheck}`);
    if (!grantLine && !policyWithCheck) {
      console.log('  -> REMEDIATED: Arbitrary PostgREST device claiming is BLOCKED. Linking is strictly service_role.\n');
    } else {
      console.log('  -> DEFECT: authenticated users can directly INSERT into user_devices associating ANY device_id.');
      console.log('  -> Blast radius: attacker inherits read access to victim device, wifi_profiles, notion_authorizations, and action queue.\n');
    }

    // -------------------------------------------------------------------------
    // V6. Verification of Defensive HTTP Headers in api/index.ts
    // -------------------------------------------------------------------------
    console.log('--- V6. Defensive HTTP Security Headers Check in api/index.ts ---');
    const apiIndex = fs.readFileSync('api/index.ts', 'utf8');
    const headers = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ];
    for (const h of headers) {
      const found = apiIndex.includes(h);
      console.log(`Header [${h}]: ${found ? 'CONFIGURED' : 'MISSING'}`);
    }

    // -------------------------------------------------------------------------
    // V7. Verification of Cryptographic Hash Shielding on devices table
    // -------------------------------------------------------------------------
    console.log('\n--- V7. Cryptographic Hash Shielding Check on devices ---');
    const rawSelectGranted = lines.some(l => l.match(/^\s*GRANT\s+SELECT\s+ON\s+devices\s+TO\s+authenticated\s*;/i));
    const selectRevoked = lines.some(l => l.match(/^\s*REVOKE\s+SELECT\s+ON\s+devices\s+FROM\s+authenticated\s*;/i));
    const viewExists = schemaSql.includes('user_visible_devices');
    console.log(`Raw SELECT on devices granted to authenticated: ${rawSelectGranted}`);
    console.log(`Raw SELECT on devices revoked from authenticated: ${selectRevoked}`);
    console.log(`Safe view user_visible_devices declared: ${viewExists}`);
    if (!rawSelectGranted && selectRevoked && viewExists) {
      console.log('  -> REMEDIATED: device_secret and bootstrap_hash shielded from authenticated PostgREST queries.\n');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
