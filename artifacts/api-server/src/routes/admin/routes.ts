import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shuttle_routes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      route_name VARCHAR(200) NOT NULL,
      from_loc VARCHAR(200) NOT NULL,
      to_loc VARCHAR(200) NOT NULL,
      pickup_lat DECIMAL(10,8) DEFAULT NULL,
      pickup_lng DECIMAL(11,8) DEFAULT NULL,
      dropoff_lat DECIMAL(10,8) DEFAULT NULL,
      dropoff_lng DECIMAL(11,8) DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city } = req.query as any;
    let query = "SELECT * FROM shuttle_routes WHERE 1=1";
    const params: any[] = [];
    if (city) { query += " AND city = ?"; params.push(city); }
    query += " ORDER BY created_at DESC";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  const { route_name, from_loc, to_loc, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, city, status } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO shuttle_routes (route_name, from_loc, to_loc, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, city, status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [route_name, from_loc, to_loc, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, city || "Cairo", status || "active"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { route_name, from_loc, to_loc, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_routes SET route_name=COALESCE(?,route_name), from_loc=COALESCE(?,from_loc),
       to_loc=COALESCE(?,to_loc), pickup_lat=COALESCE(?,pickup_lat), pickup_lng=COALESCE(?,pickup_lng),
       dropoff_lat=COALESCE(?,dropoff_lat), dropoff_lng=COALESCE(?,dropoff_lng),
       status=COALESCE(?,status) WHERE id=?`,
      [route_name, from_loc, to_loc, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM shuttle_routes WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
