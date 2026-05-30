import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

router.get("/bookings", requireAdminAuth, async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query as any;
    let query = `SELECT b.id AS booking_id, u.name AS user, d.name AS driver,
                        t.status AS trip_status, t.id AS trip_id,
                        t.origin, t.destination, b.created_at AS booking_time,
                        t.price AS amount, b.status AS booking_status, b.seats
                 FROM bookings b JOIN trips t ON t.id = b.trip_id
                 JOIN users u ON u.id = b.passenger_id LEFT JOIN users d ON d.id = t.driver_id WHERE 1=1`;
    const params: any[] = [];
    if (from_date) { query += " AND DATE(b.created_at) >= ?"; params.push(from_date); }
    if (to_date) { query += " AND DATE(b.created_at) <= ?"; params.push(to_date); }
    if (status) { query += " AND b.status = ?"; params.push(status); }
    query += " ORDER BY b.created_at DESC LIMIT 500";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/driver-trips", requireAdminAuth, async (req, res) => {
  try {
    const { from_date, to_date } = req.query as any;
    let query = `SELECT t.id AS trip_id, u.name AS driver_name, u.phone AS driver_phone,
                        t.origin, t.destination, t.departure_time, t.status, t.price,
                        COUNT(b.id) AS passengers
                 FROM trips t LEFT JOIN users u ON u.id = t.driver_id
                 LEFT JOIN bookings b ON b.trip_id = t.id AND b.status = 'confirmed' WHERE 1=1`;
    const params: any[] = [];
    if (from_date) { query += " AND DATE(t.departure_time) >= ?"; params.push(from_date); }
    if (to_date) { query += " AND DATE(t.departure_time) <= ?"; params.push(to_date); }
    query += " GROUP BY t.id ORDER BY t.departure_time DESC LIMIT 500";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/stop-utilization", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ts.label AS stop_name, ts.type, COUNT(ts.id) AS usage_count, t.origin, t.destination
      FROM trip_stops ts JOIN trips t ON t.id = ts.trip_id
      GROUP BY ts.label, ts.type, t.origin, t.destination ORDER BY usage_count DESC LIMIT 50
    `).catch(() => [[]] as any);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/summary", requireAdminAuth, async (req, res) => {
  try {
    const { period } = req.query as any;
    const days = period === "month" ? 30 : period === "week" ? 7 : 1;
    const [[totals]] = await db.query(`
      SELECT COUNT(DISTINCT b.id) AS total_bookings,
             SUM(CASE WHEN b.status != 'cancelled' THEN t.price * b.seats ELSE 0 END) AS revenue,
             COUNT(DISTINCT t.id) AS total_trips,
             COUNT(DISTINCT b.passenger_id) AS unique_passengers
      FROM bookings b JOIN trips t ON t.id = b.trip_id
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]) as any;
    const [dailyRevenue] = await db.query(`
      SELECT DATE(b.created_at) AS date,
             SUM(CASE WHEN b.status != 'cancelled' THEN t.price * b.seats ELSE 0 END) AS revenue,
             COUNT(b.id) AS bookings
      FROM bookings b JOIN trips t ON t.id = b.trip_id
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(b.created_at) ORDER BY date ASC
    `, [days]) as any;
    res.json({ totals, dailyRevenue });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/ratings", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.id, r.score, r.comment, r.created_at,
             u.name AS passenger_name, d.name AS driver_name, t.origin, t.destination
      FROM ratings r JOIN users u ON u.id = r.passenger_id
      LEFT JOIN users d ON d.id = r.driver_id LEFT JOIN trips t ON t.id = r.trip_id
      ORDER BY r.created_at DESC LIMIT 200
    `) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
