import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

router.get("/stats", requireAdminAuth, async (req, res) => {
  try {
    const [[users]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(role='passenger') AS passengers, SUM(role='driver') AS drivers FROM users`
    ) as any;
    const [[trips]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(status='active') AS active, SUM(status='completed') AS completed,
              SUM(status='upcoming') AS upcoming, SUM(status='cancelled') AS cancelled FROM trips`
    ) as any;
    const [[bookings]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(status='confirmed') AS confirmed,
              SUM(status='cancelled') AS cancelled, SUM(status='completed') AS completed FROM bookings`
    ) as any;
    const [[revenue]] = await db.query(
      `SELECT COALESCE(SUM(b.seats * t.price), 0) AS total_revenue
       FROM bookings b JOIN trips t ON t.id = b.trip_id WHERE b.status != 'cancelled'`
    ) as any;
    const [recentBookings] = await db.query(
      `SELECT b.id, b.status, b.created_at, b.seats, u.name AS passenger_name,
              t.origin, t.destination, t.price
       FROM bookings b JOIN users u ON u.id = b.passenger_id JOIN trips t ON t.id = b.trip_id
       ORDER BY b.created_at DESC LIMIT 10`
    ) as any;
    const [recentTrips] = await db.query(
      `SELECT t.id, t.origin, t.destination, t.departure_time, t.status, t.price, u.name AS driver_name
       FROM trips t LEFT JOIN users u ON u.id = t.driver_id ORDER BY t.created_at DESC LIMIT 10`
    ) as any;
    res.json({ users, trips, bookings, revenue: revenue.total_revenue, recentBookings, recentTrips });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Dashboard stats error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
