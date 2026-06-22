import { Router } from "express";
import db from "../../lib/db";
import { requireAdminAuth } from "../../lib/adminAuth";

const router = Router();

// GET /api/admin/trips
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const { status, date } = req.query as any;
    let query = `SELECT t.id, t.from_loc AS origin, t.to_loc AS destination,
                        t.pickup_time AS departure_time, t.date,
                        t.pickup_lat, t.pickup_lng, t.dropoff_lat, t.dropoff_lng,
                        t.price, t.total_seats AS seats, t.booked_seats,
                        t.status, t.is_pool, t.created_at,
                        u.name AS driver_name, u.phone AS driver_phone,
                        u.car AS driver_car, u.plate AS driver_plate,
                        (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id AND b.status='confirmed') AS confirmed_bookings
                 FROM trips t LEFT JOIN users u ON u.id = t.driver_id WHERE 1=1`;
    const params: any[] = [];
    if (status) { query += " AND t.status = ?"; params.push(status); }
    if (date) { query += " AND DATE(t.pickup_time) = ?"; params.push(date); }
    query += " ORDER BY t.pickup_time DESC";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    req.log.error({ err: err.message }, "Get trips error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/trips/:id
router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const [trips] = await db.query(
      `SELECT t.*, t.from_loc AS origin, t.to_loc AS destination,
              t.pickup_time AS departure_time, t.total_seats AS seats,
              u.name AS driver_name, u.phone AS driver_phone
       FROM trips t LEFT JOIN users u ON u.id = t.driver_id WHERE t.id = ?`,
      [req.params.id]
    ) as any;
    if (!trips.length) { res.status(404).json({ error: "Trip not found" }); return; }

    const [stops] = await db.query(
      "SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY stop_order",
      [req.params.id]
    ).catch(() => [[]] as any);

    const [bkings] = await db.query(
      `SELECT b.*, u.name AS passenger_name, u.phone AS passenger_phone
       FROM bookings b JOIN users u ON u.id = b.passenger_id
       WHERE b.trip_id = ? AND b.status != 'cancelled' ORDER BY b.created_at`,
      [req.params.id]
    ) as any;

    res.json({ ...trips[0], stops, bookings: bkings });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Get trip error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/trips/:id/bookings
router.get("/:id/bookings", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.seats, b.status, b.created_at,
              u.name AS passenger_name, u.phone AS passenger_phone
       FROM bookings b JOIN users u ON u.id = b.passenger_id
       WHERE b.trip_id = ? ORDER BY b.created_at`,
      [req.params.id]
    ) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/trips
router.post("/", requireAdminAuth, async (req, res) => {
  const { origin, destination, departure_time, date, price, seats, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, is_pool, stops } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO trips (from_loc, to_loc, pickup_time, date, price, total_seats, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, is_pool)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [origin, destination, departure_time, date || null, price, seats || 16, driver_id || null, pickup_lat || null, pickup_lng || null, dropoff_lat || null, dropoff_lng || null, is_pool || 0]
    ) as any;
    const tripId = result.insertId;

    // Save stops if provided
    if (Array.isArray(stops) && stops.length) {
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        await db.query(
          "INSERT INTO trip_stops (trip_id, type, label, lat, lng, stop_order) VALUES (?,?,?,?,?,?)",
          [tripId, s.type || "pickup", s.label || "", s.lat || null, s.lng || null, i]
        ).catch(() => {});
      }
    }

    // Notify assigned driver
    if (driver_id) {
      const asgMsg = `New trip assigned: ${origin} → ${destination}${date ? " on " + date : ""}`;
      await db.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [driver_id, asgMsg]).catch(() => {});
    }

    res.status(201).json({ id: tripId });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Create trip error");
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/admin/trips/:id
router.put("/:id", requireAdminAuth, async (req, res) => {
  const { origin, destination, departure_time, price, seats, driver_id, status } = req.body;
  try {
    await db.query(
      `UPDATE trips SET
        from_loc=COALESCE(?,from_loc), to_loc=COALESCE(?,to_loc),
        pickup_time=COALESCE(?,pickup_time), price=COALESCE(?,price),
        total_seats=COALESCE(?,total_seats), driver_id=COALESCE(?,driver_id),
        status=COALESCE(?,status) WHERE id=?`,
      [origin, destination, departure_time, price, seats, driver_id, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/admin/trips/:id/cancel
router.put("/:id/cancel", requireAdminAuth, async (req, res) => {
  try {
    await db.query("UPDATE trips SET status='cancelled' WHERE id=?", [req.params.id]);
    await db.query("UPDATE bookings SET status='cancelled' WHERE trip_id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/admin/trips/:id
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
