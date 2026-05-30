import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shuttle_passes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT DEFAULT NULL,
      duration_days INT NOT NULL DEFAULT 30,
      trip_limit INT DEFAULT NULL,
      price DECIMAL(10,2) NOT NULL,
      route_id INT DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      terms_link VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city } = req.query as any;
    let query = "SELECT * FROM shuttle_passes WHERE 1=1";
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
  const { name, description, duration_days, trip_limit, price, route_id, city, status, terms_link } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO shuttle_passes (name, description, duration_days, trip_limit, price, route_id, city, status, terms_link)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, description || null, duration_days || 30, trip_limit || null, price, route_id || null, city || "Cairo", status || "active", terms_link || null]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { name, description, duration_days, trip_limit, price, status, terms_link } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_passes SET name=COALESCE(?,name), description=COALESCE(?,description),
       duration_days=COALESCE(?,duration_days), trip_limit=COALESCE(?,trip_limit),
       price=COALESCE(?,price), status=COALESCE(?,status), terms_link=COALESCE(?,terms_link) WHERE id=?`,
      [name, description, duration_days, trip_limit, price, status, terms_link, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM shuttle_passes WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
