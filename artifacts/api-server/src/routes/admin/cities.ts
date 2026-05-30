import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS operational_cities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      country VARCHAR(100) DEFAULT 'Egypt',
      lat DECIMAL(10,8) DEFAULT NULL,
      lng DECIMAL(11,8) DEFAULT NULL,
      geofence_radius INT DEFAULT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await db.query("SELECT * FROM operational_cities ORDER BY id DESC") as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM operational_cities WHERE id = ?", [req.params.id]) as any;
    if (!rows[0]) { res.status(404).json({ error: "City not found" }); return; }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  const { name, country, lat, lng, geofence_radius, status } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  try {
    await ensureTable();
    const [r] = await db.query(
      `INSERT INTO operational_cities (name, country, lat, lng, geofence_radius, status) VALUES (?,?,?,?,?,?)`,
      [name, country || "Egypt", lat || null, lng || null, geofence_radius || null, status || "active"]
    ) as any;
    const [rows] = await db.query("SELECT * FROM operational_cities WHERE id = ?", [r.insertId]) as any;
    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { name, country, lat, lng, geofence_radius, status } = req.body;
  try {
    await db.query(
      `UPDATE operational_cities SET name=COALESCE(?,name), country=COALESCE(?,country),
       lat=COALESCE(?,lat), lng=COALESCE(?,lng), geofence_radius=COALESCE(?,geofence_radius),
       status=COALESCE(?,status) WHERE id=?`,
      [name, country, lat, lng, geofence_radius, status, req.params.id]
    );
    const [rows] = await db.query("SELECT * FROM operational_cities WHERE id = ?", [req.params.id]) as any;
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM operational_cities WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
