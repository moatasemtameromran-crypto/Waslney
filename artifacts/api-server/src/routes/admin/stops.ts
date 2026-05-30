import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shuttle_stops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      lat DECIMAL(10,8) NOT NULL,
      lng DECIMAL(11,8) NOT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      address VARCHAR(300) DEFAULT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city } = req.query as any;
    let query = "SELECT * FROM shuttle_stops WHERE 1=1";
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
  const { name, lat, lng, city, address, status } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      "INSERT INTO shuttle_stops (name, lat, lng, city, address, status) VALUES (?,?,?,?,?,?)",
      [name, lat, lng, city || "Cairo", address || null, status || "active"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { name, lat, lng, address, status } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_stops SET name=COALESCE(?,name), lat=COALESCE(?,lat),
       lng=COALESCE(?,lng), address=COALESCE(?,address), status=COALESCE(?,status) WHERE id=?`,
      [name, lat, lng, address, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM shuttle_stops WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
