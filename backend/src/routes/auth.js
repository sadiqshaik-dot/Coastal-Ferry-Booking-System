import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db.js';
import { authenticate } from '../middleware.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(10).max(100)
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(100) });

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const [found] = await pool.execute('SELECT id FROM users WHERE email=?', [email]);
    if (found.length) return res.status(409).json({ message: 'An account with this email already exists.' });
    const hash = await bcrypt.hash(data.password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name,email,phone,password_hash,role) VALUES (?,?,?,?,?)',
      [data.name, email, data.phone || null, hash, 'passenger']
    );
    res.status(201).json({ token: signToken({ id: result.insertId, role: 'passenger' }), user: { id: result.insertId, name: data.name, email, role: 'passenger' } });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const [rows] = await pool.execute('SELECT id,name,email,password_hash,role FROM users WHERE email=?', [data.email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ token: signToken({ id: user.id, role: user.role }), user: safeUser });
  } catch (e) { next(e); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id,name,email,phone,role FROM users WHERE id=?', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Account not found.' });
    res.json({ user: rows[0] });
  } catch (e) { next(e); }
});

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}
export default router;
