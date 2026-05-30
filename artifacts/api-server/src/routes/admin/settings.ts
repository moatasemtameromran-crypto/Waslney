import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(200) NOT NULL,
      setting_value TEXT DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      category VARCHAR(100) DEFAULT 'general',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_key_city (setting_key, city)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city, category } = req.query as any;
    let query = "SELECT * FROM admin_settings WHERE 1=1";
    const params: any[] = [];
    if (city) { query += " AND (city = ? OR city IS NULL)"; params.push(city); }
    if (category) { query += " AND category = ?"; params.push(category); }
    const [rows] = await db.query(query, params) as any;
    const map: Record<string, string> = {};
    for (const row of rows) map[row.setting_key] = row.setting_value;
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/", requireAdminAuth, async (req, res) => {
  const { settings, city, category } = req.body;
  try {
    await ensureTable();
    for (const [key, value] of Object.entries(settings || {})) {
      await db.query(
        `INSERT INTO admin_settings (setting_key, setting_value, city, category) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value, city || null, category || "general"]
      );
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/city", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city } = req.query as any;
    const [rows] = await db.query(
      "SELECT * FROM admin_settings WHERE category = 'city' AND (city = ? OR city IS NULL)",
      [city || "Cairo"]
    ) as any;
    const map: Record<string, string> = {};
    for (const row of rows) map[row.setting_key] = row.setting_value;
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/city", requireAdminAuth, async (req, res) => {
  const { city, customer_support_number, driver_support_number, emergency_number, service_type } = req.body;
  try {
    await ensureTable();
    const settings: Record<string, string> = {
      customer_support_number: customer_support_number || "",
      driver_support_number: driver_support_number || "",
      emergency_number: emergency_number || "",
      service_type: service_type || "On-Demand and Scheduled",
    };
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO admin_settings (setting_key, setting_value, city, category) VALUES (?,?,?,'city')
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value, city || "Cairo"]
      );
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/general", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await db.query("SELECT * FROM admin_settings WHERE category = 'general'") as any;
    const map: Record<string, string> = {};
    for (const row of rows) map[row.setting_key] = row.setting_value;
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/general", requireAdminAuth, async (req, res) => {
  const { client_name, support_email, brand_logo, favicon, nearby_stops_count, nearby_stops_distance } = req.body;
  try {
    await ensureTable();
    const settings: Record<string, string> = {};
    if (client_name !== undefined) settings.client_name = client_name;
    if (support_email !== undefined) settings.support_email = support_email;
    if (brand_logo !== undefined) settings.brand_logo = brand_logo;
    if (favicon !== undefined) settings.favicon = favicon;
    if (nearby_stops_count !== undefined) settings.nearby_stops_count = String(nearby_stops_count);
    if (nearby_stops_distance !== undefined) settings.nearby_stops_distance = String(nearby_stops_distance);
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO admin_settings (setting_key, setting_value, city, category) VALUES (?,?,NULL,'general')
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
