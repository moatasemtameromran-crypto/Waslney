import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS suggested_routes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      pickup_address VARCHAR(500) NOT NULL,
      dropoff_address VARCHAR(500) NOT NULL,
      shift_description VARCHAR(300) DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('pending','reviewed','accepted','rejected') NOT NULL DEFAULT 'pending',
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
    if (city) { conditions.push("sr.city = ?"); params.push(city); }
    if (status) { conditions.push("sr.status = ?"); params.push(status); }
    const [rows] = await db.query(`
      SELECT sr.*, u.name AS user_name, u.phone AS user_phone
      FROM suggested_routes sr LEFT JOIN users u ON u.id = sr.user_id
      WHERE ${conditions.join(" AND ")} ORDER BY sr.created_at DESC
    `, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query("UPDATE suggested_routes SET status = ? WHERE id = ?", [status, req.params.id]);
    const [rows] = await db.query("SELECT * FROM suggested_routes WHERE id = ?", [req.params.id]) as any;
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM suggested_routes WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
