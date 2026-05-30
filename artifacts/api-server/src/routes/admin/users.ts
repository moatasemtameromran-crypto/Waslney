import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const { role, status, search } = req.query as any;
    let query = `SELECT id, name, phone, email, role, account_status, car, plate, profile_photo, created_at FROM users WHERE 1=1`;
    const params: any[] = [];
    if (role) { query += " AND role = ?"; params.push(role); }
    if (status) { query += " AND account_status = ?"; params.push(status); }
    if (search) { query += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += " ORDER BY created_at DESC";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    req.log.error({ err: err.message }, "Get users error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/customers", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.phone, u.email, u.account_status, u.created_at,
              COUNT(b.id) AS total_bookings, SUM(b.status = 'completed') AS completed_trips
       FROM users u LEFT JOIN bookings b ON b.passenger_id = u.id
       WHERE u.role = 'passenger' GROUP BY u.id ORDER BY u.created_at DESC`
    ) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/drivers", requireAdminAuth, async (req, res) => {
  try {
    const { status } = req.query as any;
    let query = `SELECT u.id, u.name, u.phone, u.email, u.car, u.plate, u.profile_photo,
                        u.account_status, u.rejection_note, u.created_at,
                        COALESCE(AVG(r.score), 0) AS avg_rating,
                        COUNT(DISTINCT t.id) AS total_trips,
                        SUM(t.status = 'completed') AS completed_trips
                 FROM users u LEFT JOIN trips t ON t.driver_id = u.id
                 LEFT JOIN ratings r ON r.driver_id = u.id WHERE u.role = 'driver'`;
    const params: any[] = [];
    if (status) { query += " AND u.account_status = ?"; params.push(status); }
    query += " GROUP BY u.id ORDER BY u.created_at DESC";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/delete-requests/list", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT dar.id, dar.user_id, dar.reason, dar.status, dar.created_at, u.name, u.phone, u.email
       FROM delete_account_requests dar LEFT JOIN users u ON u.id = dar.user_id
       ORDER BY dar.created_at DESC`
    ).catch(() => [[]] as any);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/delete-requests/:id", requireAdminAuth, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query("UPDATE delete_account_requests SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, phone, email, role, account_status, car, plate, profile_photo, created_at FROM users WHERE id = ?`,
      [req.params.id]
    ) as any;
    if (!rows.length) { res.status(404).json({ error: "User not found" }); return; }
    const [userTrips] = await db.query(
      `SELECT t.id, t.origin, t.destination, t.departure_time, t.status, t.price
       FROM trips t WHERE t.driver_id = ? ORDER BY t.created_at DESC LIMIT 20`,
      [req.params.id]
    ).catch(() => [[]] as any);
    const [userBookings] = await db.query(
      `SELECT b.id, b.seats, b.status, b.created_at, t.origin, t.destination, t.departure_time, t.price
       FROM bookings b JOIN trips t ON t.id = b.trip_id
       WHERE b.passenger_id = ? ORDER BY b.created_at DESC LIMIT 20`,
      [req.params.id]
    ).catch(() => [[]] as any);
    res.json({ ...rows[0], trips: userTrips, bookings: userBookings });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/status", requireAdminAuth, async (req, res) => {
  const { account_status, rejection_note } = req.body;
  try {
    await db.query("UPDATE users SET account_status = ?, rejection_note = ? WHERE id = ?",
      [account_status, rejection_note || null, req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { name, phone, email, account_status } = req.body;
  try {
    await db.query(
      "UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), email=COALESCE(?,email), account_status=COALESCE(?,account_status) WHERE id=?",
      [name, phone, email, account_status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
