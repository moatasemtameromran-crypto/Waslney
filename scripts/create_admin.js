#!/usr/bin/env node
/**
 * Create Admin Account Script
 * Run: node scripts/create_admin.js
 *
 * Requires environment variables:
 *   DB_HOST, DB_USER, DB_PASS, DB_NAME
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'waslney';
const DB_PORT = Number(process.env.DB_PORT || 3306);

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@waslney.com';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';
const ADMIN_PHONE    = process.env.ADMIN_PHONE    || '+201000000001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@Waslney2025';

async function main() {
  console.log('Connecting to MySQL…');
  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME, port: DB_PORT });

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await conn.query(
    `INSERT INTO users (name, email, phone, password, role, account_status)
     VALUES (?, ?, ?, ?, 'admin', 'active')
     ON DUPLICATE KEY UPDATE
       name           = VALUES(name),
       password       = VALUES(password),
       account_status = 'active',
       role           = 'admin'`,
    [ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, hashed]
  );

  console.log('\n✅ Admin account ready!');
  console.log('───────────────────────────────');
  console.log(`  Email   : ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('───────────────────────────────');
  console.log('Login at /admin on your Waslney app.\n');

  await conn.end();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
