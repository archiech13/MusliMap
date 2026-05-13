/**
 * Run pending migrations against Supabase.
 * Requires DATABASE_URL in .env.local:
 *   postgres://postgres:[YOUR-PASSWORD]@db.yqufqiuybwyvsxdhtgzc.supabase.co:5432/postgres
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate.mjs
 */

import pg from 'pg';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = `
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';

UPDATE profiles
  SET genres = ARRAY[genre]
  WHERE genre IS NOT NULL AND genre != '' AND genres = '{}';

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';

UPDATE gigs
  SET genres = ARRAY[genre]
  WHERE genre IS NOT NULL AND genre != '' AND genres = '{}';
`;

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('✓  Connected to database');
  await client.query(sql);
  console.log('✓  Migration 002_genres_array applied successfully');
} catch (err) {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
