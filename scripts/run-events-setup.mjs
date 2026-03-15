#!/usr/bin/env node
/**
 * Run EVENTS_SETUP.sql against the remote Supabase database.
 *
 * Usage:
 *   node scripts/run-events-setup.mjs <DB_PASSWORD>
 *
 * Get your database password from:
 *   Supabase Dashboard → Settings → Database → Database password
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PASSWORD = process.argv[2];

if (!DB_PASSWORD) {
  console.error('❌  Missing database password.\n');
  console.error('Usage: node scripts/run-events-setup.mjs <DB_PASSWORD>');
  console.error('\nGet it from: Supabase Dashboard → Settings → Database → Database password');
  process.exit(1);
}

const sqlFile = path.join(__dirname, '..', 'EVENTS_SETUP.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

const client = new Client({
  connectionString: `postgresql://postgres.vlwppdpodavowfnyhtkh:${DB_PASSWORD}@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

console.log('🚀  Connecting to Supabase database...');
await client.connect();

console.log('⚡  Running EVENTS_SETUP.sql...');
await client.query(sql);

console.log('✅  Done! events table created successfully.');
await client.end();
