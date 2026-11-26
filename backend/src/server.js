import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import routeRoutes from './routes/routes.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured and at least 32 characters long.');
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Coastal Ferry API' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});
const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Coastal Ferry API listening on ${port}`));
