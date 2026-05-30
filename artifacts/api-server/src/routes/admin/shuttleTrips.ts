import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shuttle_trips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      route_id INT NOT NULL,
      vehicle_id INT DEFAULT NULL,
      driver_id INT DEFAULT NULL,
      start_time TIME NOT NULL,
      week_days VARCHAR(100) DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive','cancelled') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    const { city, status } = req.query as any;
    if (city) { conditions.push("st.city = ?"); params.push(city); }
    if (status) { conditions.push("st.status = ?"); params.push(status); }
    const [rows] = await db.query(`
      SELECT st.*, sr.route_name AS route_name, u.name AS driver_name, u.phone AS driver_phone
      FROM shuttle_trips st
      LEFT JOIN shuttle_routes sr ON sr.id = st.route_id
      LEFT JOIN users u ON u.id = st.driver_id
      WHERE ${conditions.join(" AND ")} ORDER BY st.start_time ASC
    `, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT st.*, sr.route_name AS route_name, u.name AS driver_name
      FROM shuttle_trips st LEFT JOIN shuttle_routes sr ON sr.id = st.route_id
      LEFT JOIN users u ON u.id = st.driver_id WHERE st.id = ?
    `, [req.params.id]) as any;
    if (!rows[0]) { res.status(404).json({ error: "Trip not found" }); return; }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  const { route_id, vehicle_id, driver_id, start_time, week_days, city, status } = req.body;
  if (!route_id || !start_time) { res.status(400).json({ error: "route_id and start_time required" }); return; }
  try {
    await ensureTable();
    const weekStr = Array.isArray(week_days) ? week_days.join(",") : (week_days || "");
    const [r] = await db.query(
      `INSERT INTO shuttle_trips (route_id, vehicle_id, driver_id, start_time, week_days, city, status)
       VALUES (?,?,?,?,?,?,?)`,
      [route_id, vehicle_id || null, driver_id || null, start_time, weekStr, city || "Cairo", status || "active"]
    ) as any;
    const [rows] = await db.query("SELECT * FROM shuttle_trips WHERE id = ?", [r.insertId]) as any;
    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { route_id, vehicle_id, driver_id, start_time, week_days, status } = req.body;
  try {
    const weekStr = week_days ? (Array.isArray(week_days) ? week_days.join(",") : week_days) : null;
    await db.query(
      `UPDATE shuttle_trips SET route_id=COALESCE(?,route_id), vehicle_id=COALESCE(?,vehicle_id),
       driver_id=COALESCE(?,driver_id), start_time=COALESCE(?,start_time),
       week_days=COALESCE(?,week_days), status=COALESCE(?,status) WHERE id=?`,
      [route_id, vehicle_id, driver_id, start_time, weekStr, status, req.params.id]
    );
    const [rows] = await db.query("SELECT * FROM shuttle_trips WHERE id = ?", [req.params.id]) as any;
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM shuttle_trips WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
