import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS vehicle_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_name VARCHAR(100) NOT NULL,
      ride_type VARCHAR(100) NOT NULL DEFAULT 'Shuttle',
      vehicle_type VARCHAR(100) NOT NULL DEFAULT 'Shuttle',
      seats INT NOT NULL DEFAULT 4,
      image_url VARCHAR(500) DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS vehicle_type_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_type_id INT NOT NULL,
      doc_name VARCHAR(200) NOT NULL,
      doc_type VARCHAR(100) NOT NULL DEFAULT 'image',
      number_of_images INT NOT NULL DEFAULT 1,
      expired_action ENUM('block','warn') NOT NULL DEFAULT 'block',
      doc_no_required TINYINT(1) NOT NULL DEFAULT 0,
      doc_required TINYINT(1) NOT NULL DEFAULT 1,
      doc_expiry_required TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city, status } = req.query as any;
    let query = "SELECT * FROM vehicle_types WHERE 1=1";
    const params: any[] = [];
    if (city) { query += " AND city = ?"; params.push(city); }
    if (status) { query += " AND status = ?"; params.push(status); }
    query += " ORDER BY created_at DESC";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const [types] = await db.query("SELECT * FROM vehicle_types WHERE id=?", [req.params.id]) as any;
    if (!types.length) { res.status(404).json({ error: "Not found" }); return; }
    const [docs] = await db.query("SELECT * FROM vehicle_type_documents WHERE vehicle_type_id=?", [req.params.id]) as any;
    res.json({ ...types[0], documents: docs });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  const { vehicle_name, ride_type, vehicle_type, seats, image_url, city, status, documents } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO vehicle_types (vehicle_name, ride_type, vehicle_type, seats, image_url, city, status)
       VALUES (?,?,?,?,?,?,?)`,
      [vehicle_name, ride_type || "Shuttle", vehicle_type || "Shuttle", seats || 4, image_url || null, city || "Cairo", status || "active"]
    ) as any;
    const typeId = result.insertId;
    if (documents?.length) {
      for (const doc of documents) {
        await db.query(
          `INSERT INTO vehicle_type_documents (vehicle_type_id, doc_name, doc_type, number_of_images, expired_action, doc_no_required, doc_required, doc_expiry_required)
           VALUES (?,?,?,?,?,?,?,?)`,
          [typeId, doc.doc_name, doc.doc_type || "image", doc.number_of_images || 1, doc.expired_action || "block", doc.doc_no_required ? 1 : 0, doc.doc_required !== false ? 1 : 0, doc.doc_expiry_required ? 1 : 0]
        );
      }
    }
    res.status(201).json({ id: typeId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { vehicle_name, ride_type, vehicle_type, seats, image_url, status } = req.body;
  try {
    await db.query(
      `UPDATE vehicle_types SET vehicle_name=COALESCE(?,vehicle_name), ride_type=COALESCE(?,ride_type),
       vehicle_type=COALESCE(?,vehicle_type), seats=COALESCE(?,seats),
       image_url=COALESCE(?,image_url), status=COALESCE(?,status) WHERE id=?`,
      [vehicle_name, ride_type, vehicle_type, seats, image_url, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM vehicle_types WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
