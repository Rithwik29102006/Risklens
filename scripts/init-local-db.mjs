#!/usr/bin/env node
/**
 * Initialises the local Wrangler Miniflare D1 database with the RiskLens schema.
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 * The database path is derived from the placeholder database_id in vite.config.ts.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d1Dir = path.join(root, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const drizzleDir = path.join(root, 'drizzle');
let dbFile;
try {
  const files = readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && !f.includes('metadata'));
  if (!files.length) throw new Error('No D1 SQLite file found. Run `npm run dev` once first to let Wrangler create the database, then re-run this script.');
  dbFile = path.join(d1Dir, files[0]);
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error('D1 state directory not found. Run `npm run dev` once first to initialise Wrangler, then re-run this script.');
  } else {
    console.error(e.message);
  }
  process.exit(1);
}

const sqlFiles = readdirSync(drizzleDir).filter(f => f.endsWith('.sql')).sort();
for (const f of sqlFiles) {
  const rawSql = readFileSync(path.join(drizzleDir, f), 'utf8');
  const statements = rawSql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^--[^\n]*/gm, '').trim())
    .filter(Boolean)
    .map(s => s.replace(/CREATE TABLE(?! IF NOT EXISTS)/i, 'CREATE TABLE IF NOT EXISTS'));

  for (const stmt of statements) {
    execSync(`sqlite3 "${dbFile}"`, { input: stmt, stdio: ['pipe', 'inherit', 'inherit'] });
  }
  console.log(`Applied migration: ${f}`);
}

console.log(`✅ Local D1 schema applied to: ${path.relative(root, dbFile)}`);
