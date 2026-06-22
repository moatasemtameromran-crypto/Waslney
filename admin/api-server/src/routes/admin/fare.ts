import { Router } from "express";
import db from "../../lib/db";
import { requireAdminAuth } from "../../lib/adminAuth";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS fare_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      route_id INT DEFAULT NULL,
      route_name VARCHAR(200) DEFAULT NULL,
      fare_type VARCHAR(50) NOT NULL DEFAULT 'fare_per_km',
      base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
      fare_per_stop DECIMAL(10,2) NOT NULL DEFAULT 0,
      fare_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
      surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
      surge_active TINYINT(1) NOT NULL DEFAULT 0,
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Self-migrate older tables. MySQL doesn't support "ADD COLUMN IF NOT EXISTS",
  // so check information_schema first, then ALTER only the missing columns.
  const wanted: Record<string, string> = {
    fare_type: "VARCHAR(50) NOT NULL DEFAULT 'fare_per_km'",
    fare_per_stop: "DECIMAL(10,2) NOT NULL DEFAULT 0",
    fare_per_km: "DECIMAL(10,2) NOT NULL DEFAULT 0",
  };
  try {
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fare_rules'"
    ) as any;
    const have = new Set(cols.map((c: any) => c.COLUMN_NAME));
    for (const [name, def] of Object.entries(wanted)) {
      if (!have.has(name)) {
        await db.query(`ALTER TABLE fare_rules ADD COLUMN ${name} ${def}`).catch(() => {});
      }
    }
  } catch (_) {}
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city } = req.query as any;
    let query = "SELECT * FROM fare_rules WHERE 1=1";
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
  const { route_id, route_name, fare_type, base_fare, fare_per_stop, fare_per_km, surge_multiplier, surge_active, city, status } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO fare_rules (route_id, route_name, fare_type, base_fare, fare_per_stop, fare_per_km, surge_multiplier, surge_active, city, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [route_id || null, route_name || null, fare_type || 'fare_per_km', base_fare || 0, fare_per_stop || 0, fare_per_km || 0, surge_multiplier || 1.0, surge_active ? 1 : 0, city || 'Cairo', status || 'active']
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { route_name, base_fare, surge_multiplier, surge_active, status } = req.body;
  try {
    await db.query(
      `UPDATE fare_rules SET route_name=COALESCE(?,route_name), base_fare=COALESCE(?,base_fare),
       surge_multiplier=COALESCE(?,surge_multiplier), surge_active=COALESCE(?,surge_active),
       status=COALESCE(?,status) WHERE id=?`,
      [route_name, base_fare, surge_multiplier, surge_active !== undefined ? (surge_active ? 1 : 0) : null, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM fare_rules WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
