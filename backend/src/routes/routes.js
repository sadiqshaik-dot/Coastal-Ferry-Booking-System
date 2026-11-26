import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id,origin,destination,duration_minutes FROM routes WHERE active=1 ORDER BY origin,destination');
    res.json({ routes: rows });
  } catch (e) { next(e); }
});

router.get('/schedules', async (req, res, next) => {
  try {
    const routeId = Number(req.query.routeId);
    const date = String(req.query.date || '');
    if (!Number.isInteger(routeId) || routeId < 1 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'A valid routeId and date are required.' });
    }
    const [rows] = await pool.execute(
      `SELECT s.id,s.departure_date,s.departure_time,s.arrival_time,
        s.foot_capacity,s.two_wheeler_capacity,s.car_capacity,
        (SELECT COUNT(*) FROM bookings b WHERE b.schedule_id=s.id AND b.status IN ('pending','confirmed') AND b.ticket_type='foot') AS foot_booked,
        (SELECT COUNT(*) FROM bookings b WHERE b.schedule_id=s.id AND b.status IN ('pending','confirmed') AND b.ticket_type='two_wheeler') AS two_wheeler_booked,
        (SELECT COUNT(*) FROM bookings b WHERE b.schedule_id=s.id AND b.status IN ('pending','confirmed') AND b.ticket_type='car') AS car_booked
       FROM schedules s WHERE s.route_id=? AND s.departure_date=? AND s.active=1 ORDER BY s.departure_time`,
      [routeId, date]
    );
    res.json({ schedules: rows });
  } catch (e) { next(e); }
});

export default router;
