import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import pool from '../db.js';
import { authenticate } from '../middleware.js';

const router = Router();
router.use(authenticate);

const schema = z.object({
  scheduleId: z.number().int().positive(),
  ticketType: z.enum(['foot','two_wheeler','car']),
  passengerCount: z.number().int().min(1).max(12),
  leadPassengerName: z.string().trim().min(2).max(120),
  leadPassengerPhone: z.string().trim().min(7).max(30),
  vehicleRegistration: z.string().trim().max(30).optional().or(z.literal(''))
});

const fares = { foot: 250, two_wheeler: 450, car: 1200 };

router.get('/mine', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.*,r.origin,r.destination,s.departure_date,s.departure_time,s.arrival_time
       FROM bookings b JOIN schedules s ON s.id=b.schedule_id JOIN routes r ON r.id=s.route_id
       WHERE b.user_id=? ORDER BY b.created_at DESC`, [req.user.id]
    );
    res.json({ bookings: rows });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const data = schema.parse(req.body);
    if (data.ticketType !== 'foot' && !data.vehicleRegistration) {
      return res.status(400).json({ message: 'Vehicle registration is required for vehicle tickets.' });
    }
    await conn.beginTransaction();
    const [schedules] = await conn.execute('SELECT * FROM schedules WHERE id=? AND active=1 FOR UPDATE', [data.scheduleId]);
    const schedule = schedules[0];
    if (!schedule || new Date(`${schedule.departure_date.toISOString?.().slice(0,10) || schedule.departure_date}T${schedule.departure_time}`) < new Date()) {
      await conn.rollback();
      return res.status(400).json({ message: 'This departure is unavailable.' });
    }
    const [counts] = await conn.execute(
      `SELECT ticket_type, CASE WHEN ticket_type='foot' THEN SUM(passenger_count) ELSE COUNT(*) END AS booked
       FROM bookings WHERE schedule_id=? AND status IN ('pending','confirmed') GROUP BY ticket_type`,
      [data.scheduleId]
    );
    const used = Object.fromEntries(counts.map(x => [x.ticket_type, Number(x.booked || 0)]));
    const capacity = data.ticketType === 'foot' ? schedule.foot_capacity :
      data.ticketType === 'two_wheeler' ? schedule.two_wheeler_capacity : schedule.car_capacity;
    const units = data.ticketType === 'foot' ? data.passengerCount : 1;
    if ((used[data.ticketType] || 0) + units > capacity) {
      await conn.rollback();
      return res.status(409).json({ message: 'Not enough capacity remains for this ticket category.' });
    }
    const fare = fares[data.ticketType];
    const reference = `CF-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const [result] = await conn.execute(
      `INSERT INTO bookings
       (booking_reference,user_id,schedule_id,ticket_type,passenger_count,lead_passenger_name,lead_passenger_phone,vehicle_registration,fare_per_unit,total_fare,status)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'pending')`,
      [reference, req.user.id, data.scheduleId, data.ticketType, data.passengerCount,
       data.leadPassengerName, data.leadPassengerPhone, data.vehicleRegistration || null, fare,
       fare * (data.ticketType === 'foot' ? data.passengerCount : 1)]
    );
    await conn.commit();
    res.status(201).json({ booking: { id: result.insertId, booking_reference: reference, total_fare: fare * (data.ticketType === 'foot' ? data.passengerCount : 1), status: 'pending' } });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const [result] = await pool.execute(
      "UPDATE bookings SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'",
      [Number(req.params.id), req.user.id]
    );
    if (!result.affectedRows) return res.status(400).json({ message: 'Only pending bookings can be cancelled online. Contact the operator for confirmed bookings.' });
    res.json({ message: 'Booking cancelled.' });
  } catch (e) { next(e); }
});

export default router;
