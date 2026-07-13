#!/usr/bin/env node
// ============================================================
// Script: init-turso-db.js
// Jalankan SEKALI untuk setup schema Turso sebelum deploy
// Usage: node init-turso-db.js
// ============================================================

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ TURSO_DATABASE_URL tidak ditemukan di .env.local');
  console.error('   Tambahkan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN ke file .env.local');
  process.exit(1);
}

const db = createClient({ url, authToken });

const schema = fs.readFileSync(path.join(__dirname, 'turso_schema.sql'), 'utf8');

async function main() {
  console.log('🔌 Connecting to Turso...');
  const stmts = schema.split(';').map(s => s.trim()).filter(Boolean);
  let done = 0;
  for (const stmt of stmts) {
    try {
      await db.execute(stmt);
      done++;
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('UNIQUE')) {
        console.warn(`⚠️  Skipped: ${stmt.slice(0, 60)}...`);
        console.warn(`   Reason: ${err.message}`);
      }
    }
  }
  console.log(`✅ Database schema initialized! (${done} statements executed)`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
