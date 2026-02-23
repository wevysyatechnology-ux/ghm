import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path = '.env') {
  const content = fs.readFileSync(path, 'utf8');
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const report = {
    project: supabaseUrl,
    connection: null,
    openapi: null,
    tableAccess: {},
    policyMetadata: null,
    policyMetadataPgCatalog: null,
    informationSchemaTables: null,
  };

  const conn = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  report.connection = conn.error
    ? { ok: false, error: conn.error.message, code: conn.error.code }
    : { ok: true, profiles_count: conn.count };

  const openapiRes = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: 'application/openapi+json',
    },
  });

  if (openapiRes.ok) {
    const openapi = await openapiRes.json();
    const schemaNames = Object.keys(openapi?.components?.schemas || {});
    report.openapi = {
      ok: true,
      schemaCount: schemaNames.length,
      schemas: schemaNames.sort(),
    };
  } else {
    report.openapi = {
      ok: false,
      status: openapiRes.status,
      statusText: openapiRes.statusText,
    };
  }

  const tablesToCheck = [
    'profiles',
    'houses',
    'members',
    'links',
    'deals',
    'i2we_events',
    'attendance',
  ];

  for (const table of tablesToCheck) {
    const r = await supabase.from(table).select('*', { count: 'exact', head: true });
    report.tableAccess[table] = r.error
      ? { ok: false, error: r.error.message, code: r.error.code }
      : { ok: true, count: r.count };
  }

  const policies = await supabase
    .from('pg_policies')
    .select('schemaname,tablename,policyname,roles,cmd,qual,with_check')
    .limit(50);

  report.policyMetadata = policies.error
    ? { ok: false, error: policies.error.message, code: policies.error.code }
    : { ok: true, rows: policies.data?.length ?? 0, sample: policies.data };

  const supabasePgCatalog = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'pg_catalog' },
  });

  const policiesPgCatalog = await supabasePgCatalog
    .from('pg_policies')
    .select('schemaname,tablename,policyname,roles,cmd,qual,with_check')
    .limit(50);

  report.policyMetadataPgCatalog = policiesPgCatalog.error
    ? {
        ok: false,
        error: policiesPgCatalog.error.message,
        code: policiesPgCatalog.error.code,
      }
    : { ok: true, rows: policiesPgCatalog.data?.length ?? 0, sample: policiesPgCatalog.data };

  const supabaseInfoSchema = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'information_schema' },
  });

  const tablesInfo = await supabaseInfoSchema
    .from('tables')
    .select('table_schema,table_name')
    .eq('table_schema', 'public')
    .limit(200);

  report.informationSchemaTables = tablesInfo.error
    ? { ok: false, error: tablesInfo.error.message, code: tablesInfo.error.code }
    : { ok: true, rows: tablesInfo.data?.length ?? 0, tables: tablesInfo.data };

  console.log(JSON.stringify(report, null, 2));
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
