import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS homescreen_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(100) NOT NULL,
      display_order INT NOT NULL DEFAULT 1,
      active TINYINT(1) NOT NULL DEFAULT 1,
      user_type ENUM('Customer','Driver') NOT NULL DEFAULT 'Customer',
      geofence_name VARCHAR(200) DEFAULT 'Default',
      video_url VARCHAR(500) DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS homescreen_greetings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      greeting_text VARCHAR(500) NOT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city, user_type } = req.query as any;
    let query = "SELECT * FROM homescreen_settings WHERE 1=1";
    const params: any[] = [];
    if (city) { query += " AND city = ?"; params.push(city); }
    if (user_type) { query += " AND user_type = ?"; params.push(user_type); }
    query += " ORDER BY display_order ASC";
    const [rows] = await db.query(query, params) as any;
    const [greetings] = await db.query(
      "SELECT * FROM homescreen_greetings WHERE city = ? AND active = 1 ORDER BY id",
      [city || "Cairo"]
    ) as any;
    res.json({ items: rows, greetings });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  const { category, display_order, active, user_type, geofence_name, video_url, city } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO homescreen_settings (category, display_order, active, user_type, geofence_name, video_url, city)
       VALUES (?,?,?,?,?,?,?)`,
      [category, display_order || 1, active !== false ? 1 : 0, user_type || "Customer", geofence_name || "Default", video_url || null, city || "Cairo"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { category, display_order, active, user_type, geofence_name, video_url } = req.body;
  try {
    await db.query(
      `UPDATE homescreen_settings SET category=COALESCE(?,category), display_order=COALESCE(?,display_order),
       active=COALESCE(?,active), user_type=COALESCE(?,user_type),
       geofence_name=COALESCE(?,geofence_name), video_url=COALESCE(?,video_url) WHERE id=?`,
      [category, display_order, active !== undefined ? (active ? 1 : 0) : null, user_type, geofence_name, video_url, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM homescreen_settings WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/greetings", requireAdminAuth, async (req, res) => {
  const { greeting_text, city } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      "INSERT INTO homescreen_greetings (greeting_text, city) VALUES (?,?)",
      [greeting_text, city || "Cairo"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/greetings/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM homescreen_greetings WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
