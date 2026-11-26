# Coastal Ferry Booking System

A full-stack starter application for coastal passenger ferry and island cruise bookings.

## Stack
- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: MySQL 8
- Authentication: JWT + bcrypt password hashing
- Authorization: passenger/admin role checks

## Features
- Public registration and login
- Passenger dashboard and booking history
- Route search and ticket category selection
- 30-minute departure slots from sunrise to sunset (sample schedule data)
- Passenger and vehicle registration details
- Booking creation, cancellation request, and admin status management
- Admin dashboard for routes, schedules, bookings, and users
- Server-side fare calculation and capacity checks

## Quick start

### 1. Requirements
Node.js 20+, MySQL 8+.

### 2. Database
Create a database and import the schema:

```bash
mysql -u root -p < database/schema.sql
```

### 3. Backend
```bash
cd backend
cp .env.example .env
npm install
```
Edit `.env` with your MySQL credentials and a long random `JWT_SECRET`.
Create the initial administrator using the one-time local seed script:

```bash
npm run seed:admin
npm run dev
```

The seed script reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from `.env`.
Do not commit `.env` or share the admin password.

Backend runs at `http://localhost:5000`.

### 4. Frontend
In another terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

## Demo flow
1. Register a passenger account.
2. Sign in and open **Book a ferry**.
3. Choose a route, date, ticket category, and departure.
4. Enter passenger details. Vehicle registration is required for vehicle tickets.
5. Submit the booking. It appears in **My bookings**.
6. Sign in with the seeded administrator account to manage routes, schedules, users, and bookings.

## Important production checklist
This is a runnable project foundation, not a deployed or audited ticketing service.
- Use HTTPS and strong unique secrets.
- Configure production CORS to your exact frontend origin.
- Add email/SMS verification and password reset.
- Integrate a compliant payment provider before collecting money.
- Add operational rules for refunds, boarding, manifests, taxes, and local maritime regulations.
- Review capacity rules and fare policy with the ferry operator.
- Add rate limiting, security monitoring, backups, and database migrations.
- Replace sample route/schedule/fare data with verified operational information.
- Do not use sample schedules as real departure promises.
