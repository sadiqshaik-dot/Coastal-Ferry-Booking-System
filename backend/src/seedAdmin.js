import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from './db.js';

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 14) {
  throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and an ADMIN_PASSWORD of at least 14 characters in .env');
}
const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL.toLowerCase()]);
if (existing.length) {
  console.log('An account with that email already exists. No changes made.');
} else {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.execute(
    'INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
    [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hash, 'admin']
  );
  console.log('Administrator created. Remove the admin password from your shell history and keep .env private.');
}
await pool.end();
