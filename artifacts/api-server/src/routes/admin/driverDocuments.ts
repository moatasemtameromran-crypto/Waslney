import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS driver_document_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      document_name VARCHAR(200) NOT NULL,
      document_category VARCHAR(100) NOT NULL DEFAULT 'identity',
      document_type VARCHAR(100) NOT NULL DEFAULT 'image',
      number_of_images INT NOT NULL DEFAULT 1,
      gallery_restricted TINYINT(1) NOT NULL DEFAULT 0,
      doc_required TINYINT(1) NOT NULL DEFAULT 1,
      doc_no_required TINYINT(1) NOT NULL DEFAULT 0,
      doc_expiry_required TINYINT(1) NOT NULL DEFAULT 0,
      expired_action ENUM('block','warn') NOT NULL DEFAULT 'block',
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city, status } = req.query as any;
    let query = "SELECT * FROM driver_document_types WHERE 1=1";
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

router.post("/", requireAdminAuth, async (req, res) => {
  const { document_name, document_category, document_type, number_of_images, gallery_restricted, doc_required, doc_no_required, doc_expiry_required, expired_action, city, status } = req.body;
  try {
    await ensureTable();
    const [result] = await db.query(
      `INSERT INTO driver_document_types (document_name, document_category, document_type, number_of_images, gallery_restricted, doc_required, doc_no_required, doc_expiry_required, expired_action, city, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [document_name, document_category || "identity", document_type || "image", number_of_images || 1, gallery_restricted ? 1 : 0, doc_required !== false ? 1 : 0, doc_no_required ? 1 : 0, doc_expiry_required ? 1 : 0, expired_action || "block", city || "Cairo", status || "active"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAdminAuth, async (req, res) => {
  const { document_name, document_category, number_of_images, gallery_restricted, doc_required, doc_no_required, doc_expiry_required, status } = req.body;
  try {
    await db.query(
      `UPDATE driver_document_types SET document_name=COALESCE(?,document_name),
       document_category=COALESCE(?,document_category), number_of_images=COALESCE(?,number_of_images),
       gallery_restricted=COALESCE(?,gallery_restricted), doc_required=COALESCE(?,doc_required),
       doc_no_required=COALESCE(?,doc_no_required), doc_expiry_required=COALESCE(?,doc_expiry_required),
       status=COALESCE(?,status) WHERE id=?`,
      [document_name, document_category, number_of_images,
       gallery_restricted !== undefined ? (gallery_restricted ? 1 : 0) : null,
       doc_required !== undefined ? (doc_required ? 1 : 0) : null,
       doc_no_required !== undefined ? (doc_no_required ? 1 : 0) : null,
       doc_expiry_required !== undefined ? (doc_expiry_required ? 1 : 0) : null,
       status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM driver_document_types WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
