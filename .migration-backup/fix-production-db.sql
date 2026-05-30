-- ============================================================
-- IMMEDIATE FIX for 500 errors on /api/trips, /api/users/drivers, /api/location/all
-- Run this directly on your MySQL database (Hostinger phpMyAdmin or Railway console)
-- Safe to run multiple times
-- ============================================================

-- Fix 1: Add account_status to users (required by /api/users/drivers)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) NOT NULL DEFAULT 'active';

-- Fix 2: Add rejection_note to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rejection_note TEXT DEFAULT NULL;

-- Fix 3: Add travel_date to bookings (required by /api/trips)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS travel_date DATE NULL;

-- Fix 4: Back-fill travel_date from trip date
UPDATE bookings b
JOIN trips t ON t.id = b.trip_id
SET b.travel_date = t.date
WHERE b.travel_date IS NULL;

-- Fix 5: Add effective_price and is_surge to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS effective_price DECIMAL(10,2) NULL;
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_surge TINYINT(1) NOT NULL DEFAULT 0;

-- Fix 6: Create driver_locations table (required by /api/location/all)
CREATE TABLE IF NOT EXISTS driver_locations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  driver_id  INT NOT NULL,
  trip_id    INT NOT NULL,
  lat        DECIMAL(10,8) NOT NULL,
  lng        DECIMAL(10,8) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_driver_trip (driver_id, trip_id),
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id)   REFERENCES trips(id) ON DELETE CASCADE
);

-- Fix 7: Add trips lat/lng columns
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lat  DECIMAL(10,8) NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lng  DECIMAL(10,8) NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropoff_lat DECIMAL(10,8) NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropoff_lng DECIMAL(10,8) NULL;

-- ============================================================
-- NOTE: If your MySQL version is 5.x and doesn't support
-- "IF NOT EXISTS" in ALTER TABLE, use these safer versions:
-- ============================================================

-- Safer version for MySQL 5.7 (run only if above fails):
/*
ALTER TABLE users ADD COLUMN account_status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN rejection_note TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN travel_date DATE NULL;
ALTER TABLE bookings ADD COLUMN effective_price DECIMAL(10,2) NULL;
ALTER TABLE bookings ADD COLUMN is_surge TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE trips ADD COLUMN pickup_lat DECIMAL(10,8) NULL;
ALTER TABLE trips ADD COLUMN pickup_lng DECIMAL(10,8) NULL;
ALTER TABLE trips ADD COLUMN dropoff_lat DECIMAL(10,8) NULL;
ALTER TABLE trips ADD COLUMN dropoff_lng DECIMAL(10,8) NULL;
*/
