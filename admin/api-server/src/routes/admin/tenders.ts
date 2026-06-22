import { Router } from "express";
import db from "../../lib/db";
import { requireAdminAuth } from "../../lib/adminAuth";

const router = Router();

// GET /api/admin/tenders — list tenders with lowest bid + bid count.
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT tn.*,
              t.from_loc, t.to_loc, t.date, t.pickup_time, t.total_seats,
              (SELECT MIN(b.amount) FROM bids b WHERE b.tender_id=tn.id) AS lowest_bid,
              (SELECT COUNT(*)      FROM bids b WHERE b.tender_id=tn.id) AS bid_count
       FROM tenders tn
       LEFT JOIN trips t ON t.id = tn.trip_id
       ORDER BY tn.ends_at ASC`
    ) as any;
    res.json(rows);
  } catch (err: any) {
    req.log.error({ err: err.message }, "List tenders error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/tenders/:id — single tender with bids (ranked) + trip stops.
router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const [tenders] = await db.query(
      `SELECT tn.*, t.from_loc, t.to_loc, t.date, t.pickup_time, t.dropoff_time, t.total_seats, t.price
       FROM tenders tn LEFT JOIN trips t ON t.id=tn.trip_id WHERE tn.id=?`,
      [req.params.id]
    ) as any;
    if (!tenders.length) { res.status(404).json({ error: "Not found" }); return; }

    const [bids] = await db.query(
      `SELECT b.id, b.amount, b.created_at, c.company_name
       FROM bids b LEFT JOIN companies c ON c.id = b.company_id
       WHERE b.tender_id=? ORDER BY b.amount ASC`,
      [req.params.id]
    ) as any;

    const [stops] = await db.query(
      "SELECT * FROM trip_stops WHERE trip_id=? ORDER BY stop_order ASC",
      [tenders[0].trip_id]
    ).catch(() => [[]] as any);

    res.json({ ...tenders[0], bids, stops });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Tender detail error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/tenders — open a tender for a trip.
router.post("/", requireAdminAuth, async (req, res) => {
  const { trip_id, duration_minutes = 60, description } = req.body;
  if (!trip_id) { res.status(400).json({ error: "trip_id required" }); return; }
  const ends_at = new Date(Date.now() + duration_minutes * 60 * 1000);
  try {
    const [r] = await db.query(
      "INSERT INTO tenders (trip_id, ends_at, status, description) VALUES (?,?,?,?)",
      [trip_id, ends_at, "open", description || null]
    ) as any;
    await db.query("UPDATE trips SET status='tendered' WHERE id=?", [trip_id]);
    const [rows] = await db.query("SELECT * FROM tenders WHERE id=?", [r.insertId]) as any;
    res.status(201).json(rows[0]);
  } catch (err: any) {
    req.log.error({ err: err.message }, "Open tender error");
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/admin/tenders/:id — cancel a tender.
router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("UPDATE tenders SET status='cancelled' WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
