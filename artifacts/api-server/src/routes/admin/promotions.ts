import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      description TEXT DEFAULT NULL,
      discount_type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
      discount_value DECIMAL(10,2) NOT NULL,
      min_fare DECIMAL(10,2) DEFAULT 0,
      max_discount DECIMAL(10,2) DEFAULT NULL,
      usage_limit INT DEFAULT NULL,
      used_count INT NOT NULL DEFAULT 0,
      valid_from DATE DEFAULT NULL,
      valid_to DATE DEFAULT NULL,
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
    let query = "SELECT * FROM promotions WHERE 1=1";
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
  const { code, description, discount_type, discount_value, min_fare, max_discount, usage_limit, valid_from, valid_to, city, status } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO promotions (code, description, discount_type, discount_value, min_fare, max_discount, usage_limit, valid_from, valid_to, city, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [code, description, discount_type || "percentage", discount_value, min_fare || 0, max_discount || null, usage_limit || null, valid_from || null, valid_to || null, city || "Cairo", status || "active"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { code, description, discount_type, discount_value, min_fare, max_discount, usage_limit, valid_from, valid_to, status } = req.body;
  try {
    await db.query(
      `UPDATE promotions SET code=COALESCE(?,code), description=COALESCE(?,description),
       discount_type=COALESCE(?,discount_type), discount_value=COALESCE(?,discount_value),
       min_fare=COALESCE(?,min_fare), max_discount=COALESCE(?,max_discount),
       usage_limit=COALESCE(?,usage_limit), valid_from=COALESCE(?,valid_from),
       valid_to=COALESCE(?,valid_to), status=COALESCE(?,status) WHERE id=?`,
      [code, description, discount_type, discount_value, min_fare, max_discount, usage_limit, valid_from, valid_to, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM promotions WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
