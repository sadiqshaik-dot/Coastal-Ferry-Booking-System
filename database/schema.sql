CREATE DATABASE IF NOT EXISTS coastal_ferry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE coastal_ferry;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('passenger','admin') NOT NULL DEFAULT 'passenger',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  origin VARCHAR(120) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 45,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY route_pair (origin, destination)
);

CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  route_id BIGINT UNSIGNED NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  foot_capacity INT UNSIGNED NOT NULL DEFAULT 100,
  two_wheeler_capacity INT UNSIGNED NOT NULL DEFAULT 20,
  car_capacity INT UNSIGNED NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (route_id) REFERENCES routes(id),
  UNIQUE KEY unique_departure (route_id, departure_date, departure_time)
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(24) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  schedule_id BIGINT UNSIGNED NOT NULL,
  ticket_type ENUM('foot','two_wheeler','car') NOT NULL,
  passenger_count SMALLINT UNSIGNED NOT NULL,
  lead_passenger_name VARCHAR(120) NOT NULL,
  lead_passenger_phone VARCHAR(30) NOT NULL,
  vehicle_registration VARCHAR(30) NULL,
  fare_per_unit DECIMAL(10,2) NOT NULL,
  total_fare DECIMAL(10,2) NOT NULL,
  status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id),
  INDEX idx_booking_user (user_id),
  INDEX idx_booking_schedule (schedule_id)
);

-- Sample route. Replace with verified terminal and island names.
INSERT IGNORE INTO routes (origin, destination, duration_minutes)
VALUES ('Mainland Jetty', 'Paradise Island', 45);

-- Example 30-minute schedule slots for one sample date.
-- Generate/update operational dates with the admin schedule manager.
INSERT IGNORE INTO schedules
(route_id, departure_date, departure_time, arrival_time, foot_capacity, two_wheeler_capacity, car_capacity)
SELECT id, CURDATE(), slot_time, ADDTIME(slot_time, '00:45:00'), 100, 20, 10
FROM routes
CROSS JOIN (
  SELECT '06:00:00' AS slot_time UNION ALL SELECT '06:30:00' UNION ALL
  SELECT '07:00:00' UNION ALL SELECT '07:30:00' UNION ALL
  SELECT '08:00:00' UNION ALL SELECT '08:30:00' UNION ALL
  SELECT '09:00:00' UNION ALL SELECT '09:30:00' UNION ALL
  SELECT '10:00:00' UNION ALL SELECT '10:30:00' UNION ALL
  SELECT '11:00:00' UNION ALL SELECT '11:30:00' UNION ALL
  SELECT '12:00:00' UNION ALL SELECT '12:30:00' UNION ALL
  SELECT '13:00:00' UNION ALL SELECT '13:30:00' UNION ALL
  SELECT '14:00:00' UNION ALL SELECT '14:30:00' UNION ALL
  SELECT '15:00:00' UNION ALL SELECT '15:30:00' UNION ALL
  SELECT '16:00:00' UNION ALL SELECT '16:30:00' UNION ALL
  SELECT '17:00:00' UNION ALL SELECT '17:30:00' UNION ALL
  SELECT '18:00:00'
) slots
WHERE origin = 'Mainland Jetty' AND destination = 'Paradise Island';
