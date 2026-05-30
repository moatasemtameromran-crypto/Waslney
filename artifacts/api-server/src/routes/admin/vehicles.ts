import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_type VARCHAR(100) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model_name VARCHAR(100) NOT NULL,
      vehicle_number VARCHAR(50) NOT NULL UNIQUE,
      number_of_seats INT NOT NULL DEFAULT 10,
      number_of_doors INT NOT NULL DEFAULT 2,
      total_rows INT NOT NULL DEFAULT 2,
      total_columns INT NOT NULL DEFAULT 2,
      image_url VARCHAR(500) DEFAULT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      city VARCHAR(100) DEFAULT 'Cairo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city } = req.query as any;
    let query = "SELECT * FROM admin_vehicles WHERE 1=1";
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
  const { vehicle_type, brand, model_name, vehicle_number, number_of_seats, number_of_doors, total_rows, total_columns, image_url, status, city } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO admin_vehicles (vehicle_type, brand, model_name, vehicle_number, number_of_seats, number_of_doors, total_rows, total_columns, image_url, status, city)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [vehicle_type, brand, model_name, vehicle_number, number_of_seats || 10, number_of_doors || 2, total_rows || 2, total_columns || 2, image_url || null, status || "active", city || "Cairo"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { vehicle_type, brand, model_name, vehicle_number, number_of_seats, number_of_doors, total_rows, total_columns, image_url, status } = req.body;
  try {
    await db.query(
      `UPDATE admin_vehicles SET vehicle_type=COALESCE(?,vehicle_type), brand=COALESCE(?,brand),
       model_name=COALESCE(?,model_name), vehicle_number=COALESCE(?,vehicle_number),
       number_of_seats=COALESCE(?,number_of_seats), number_of_doors=COALESCE(?,number_of_doors),
       total_rows=COALESCE(?,total_rows), total_columns=COALESCE(?,total_columns),
       image_url=COALESCE(?,image_url), status=COALESCE(?,status) WHERE id=?`,
      [vehicle_type, brand, model_name, vehicle_number, number_of_seats, number_of_doors, total_rows, total_columns, image_url, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM admin_vehicles WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
