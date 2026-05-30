import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INT AUTO_INCREMENT PRIMARY KEY,
      holiday_date DATE NOT NULL,
      name VARCHAR(200) DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      no_service TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_date_city (holiday_date, city)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city, year, month } = req.query as any;
    let query = "SELECT * FROM holidays WHERE 1=1";
    const params: any[] = [];
    if (city) { query += " AND city = ?"; params.push(city); }
    if (year) { query += " AND YEAR(holiday_date) = ?"; params.push(year); }
    if (month) { query += " AND MONTH(holiday_date) = ?"; params.push(month); }
    query += " ORDER BY holiday_date ASC";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/bulk", requireAdminAuth, async (req, res) => {
  const { dates, city } = req.body;
  try {
    await ensureTable();
    if (!dates?.length) { res.status(400).json({ error: "dates required" }); return; }
    const values = dates.map((d: string) => [d, city || "Cairo"]);
    await db.query("INSERT IGNORE INTO holidays (holiday_date, city) VALUES ?", [values]);
    res.json({ ok: true, count: dates.length });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  const { holiday_date, name, city, no_service } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      "INSERT IGNORE INTO holidays (holiday_date, name, city, no_service) VALUES (?,?,?,?)",
      [holiday_date, name || null, city || "Cairo", no_service !== false ? 1 : 0]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM holidays WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
