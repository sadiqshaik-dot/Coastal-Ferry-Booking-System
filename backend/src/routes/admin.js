import { Router } from 'express';
import { z } from 'zod';
import pool from '../db.js';
import { authenticate, adminOnly } from '../middleware.js';

const router = Router();
router.use(authenticate, adminOnly);

router.get('/overview', async (_req, res, next) => {
  try {
    const [[users]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE role="passenger"');
    const [[bookings]] = await pool.query('SELECT COUNT(*) AS count FROM bookings');
    const [[pending]] = await pool.query('SELECT COUNT(*) AS count FROM bookings WHERE status="pending"');
    const [[revenue]] = await pool.query('SELECT COALESCE(SUM(total_fare),0) AS total FROM bookings WHERE status="confirmed"');
    res.json({ users: users.count, bookings: bookings.count, pending: pending.count, confirmedRevenue: revenue.total });
  } catch (e) { next(e); }
});

router.get('/bookings', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.*,u.name AS account_name,u.email,r.origin,r.destination,s.departure_date,s.departure_time
       FROM bookings b JOIN users u ON u.id=b.user_id JOIN schedules s ON s.id=b.schedule_id JOIN routes r ON r.id=s.route_id
       ORDER BY b.created_at DESC LIMIT 500`
    );
    res.json({ bookings: rows });
  } catch (e) { next(e); }
});

router.patch('/bookings/:id/status', async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['pending','confirmed','cancelled']) }).parse(req.body);
    const [result] = await pool.execute('UPDATE bookings SET status=? WHERE id=?', [status, Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Booking status updated.' });
  } catch (e) { next(e); }
});

router.get('/users', async (_req, res, next) => {
  try {
    const [users] = await pool.execute('SELECT id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC LIMIT 500');
    res.json({ users });
  } catch (e) { next(e); }
});

router.post('/routes', async (req, res, next) => {
  try {
    const data = z.object({
      origin: z.string().trim().min(2).max(120),
      destination: z.string().trim().min(2).max(120),
      durationMinutes: z.number().int().min(1).max(600)
    }).parse(req.body);
    const [result] = await pool.execute(
      'INSERT INTO routes (origin,destination,duration_minutes) VALUES (?,?,?)',
      [data.origin,data.destination,data.durationMinutes]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) { next(e); }
});

router.patch('/routes/:id', async (req, res, next) => {
  try {
    const data = z.object({
      origin: z.string().trim().min(2).max(120),
      destination: z.string().trim().min(2).max(120),
      durationMinutes: z.number().int().min(1).max(600),
      active: z.boolean()
    }).parse(req.body);
    await pool.execute('UPDATE routes SET origin=?,destination=?,duration_minutes=?,active=? WHERE id=?',
      [data.origin,data.destination,data.durationMinutes,data.active,Number(req.params.id)]);
    res.json({ message: 'Route updated.' });
  } catch (e) { next(e); }
});

router.post('/schedules', async (req, res, next) => {
  try {
    const data = z.object({
      routeId: z.number().int().positive(),
      departureDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
      departureTime: z.string().regex(/^\\d{2}:\\d{2}$/),
      arrivalTime: z.string().regex(/^\\d{2}:\\d{2}$/),
      footCapacity: z.number().int().min(1).max(10000),
      twoWheelerCapacity: z.number().int().min(0).max(1000),
      carCapacity: z.number().int().min(0).max(1000)
    }).parse(req.body);
    const [result] = await pool.execute(
      `INSERT INTO schedules (route_id,departure_date,departure_time,arrival_time,foot_capacity,two_wheeler_capacity,car_capacity)
       VALUES (?,?,?,?,?,?,?)`,
      [data.routeId,data.departureDate,data.departureTime,data.arrivalTime,data.footCapacity,data.twoWheelerCapacity,data.carCapacity]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) { next(e); }
});

export default router;
