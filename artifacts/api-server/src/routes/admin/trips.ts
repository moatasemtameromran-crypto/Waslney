import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const { status, date } = req.query as any;
    let query = `SELECT t.id, t.origin, t.destination, t.departure_time,
                        t.pickup_lat, t.pickup_lng, t.dropoff_lat, t.dropoff_lng,
                        t.price, t.seats, t.status, t.is_pool, t.created_at,
                        u.name AS driver_name, u.phone AS driver_phone, u.car AS driver_car, u.plate AS driver_plate,
                        (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id AND b.status='confirmed') AS confirmed_bookings
                 FROM trips t LEFT JOIN users u ON u.id = t.driver_id WHERE 1=1`;
    const params: any[] = [];
    if (status) { query += " AND t.status = ?"; params.push(status); }
    if (date) { query += " AND DATE(t.departure_time) = ?"; params.push(date); }
    query += " ORDER BY t.departure_time DESC";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    req.log.error({ err: err.message }, "Get trips error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const [trips] = await db.query(
      `SELECT t.*, u.name AS driver_name, u.phone AS driver_phone
       FROM trips t LEFT JOIN users u ON u.id = t.driver_id WHERE t.id = ?`,
      [req.params.id]
    ) as any;
    if (!trips.length) { res.status(404).json({ error: "Trip not found" }); return; }
    const [stops] = await db.query(
      "SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY stop_order", [req.params.id]
    ).catch(() => [[]] as any);
    const [bkings] = await db.query(
      `SELECT b.*, u.name AS passenger_name, u.phone AS passenger_phone
       FROM bookings b JOIN users u ON u.id = b.passenger_id
       WHERE b.trip_id = ? AND b.status != 'cancelled' ORDER BY b.created_at`,
      [req.params.id]
    ) as any;
    res.json({ ...trips[0], stops, bookings: bkings });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id/bookings", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.seats, b.status, b.created_at, u.name AS passenger_name, u.phone AS passenger_phone
       FROM bookings b JOIN users u ON u.id = b.passenger_id WHERE b.trip_id = ? ORDER BY b.created_at`,
      [req.params.id]
    ) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  const { origin, destination, departure_time, price, seats, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, is_pool } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO trips (origin, destination, departure_time, price, seats, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, is_pool)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [origin, destination, departure_time, price, seats || 16, driver_id || null, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, is_pool || 0]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { origin, destination, departure_time, price, seats, driver_id, status } = req.body;
  try {
    await db.query(
      `UPDATE trips SET origin=COALESCE(?,origin), destination=COALESCE(?,destination),
       departure_time=COALESCE(?,departure_time), price=COALESCE(?,price),
       seats=COALESCE(?,seats), driver_id=COALESCE(?,driver_id), status=COALESCE(?,status) WHERE id=?`,
      [origin, destination, departure_time, price, seats, driver_id, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/cancel", requireAdminAuth, async (req, res) => {
  try {
    await db.query("UPDATE trips SET status='cancelled' WHERE id=?", [req.params.id]);
    await db.query("UPDATE bookings SET status='cancelled' WHERE trip_id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("UPDATE trips SET status='cancelled' WHERE id=?", [req.params.id]);
    await db.query("UPDATE bookings SET status='cancelled' WHERE trip_id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
