import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cancellation_policies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT DEFAULT NULL,
      refund_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
      window_hours INT NOT NULL DEFAULT 24,
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS cancellation_reasons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reason VARCHAR(300) NOT NULL,
      user_type ENUM('passenger','driver','both') NOT NULL DEFAULT 'both',
      city VARCHAR(100) DEFAULT 'Cairo',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/policies", requireAdminAuth, async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query("SELECT * FROM cancellation_policies ORDER BY created_at DESC") as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/policies", requireAdminAuth, async (req, res) => {
  const { name, description, refund_percentage, window_hours, city, status } = req.body;
  try {
    await ensureTables();
    const [result] = await db.query(
      "INSERT INTO cancellation_policies (name, description, refund_percentage, window_hours, city, status) VALUES (?,?,?,?,?,?)",
      [name, description || null, refund_percentage || 100, window_hours || 24, city || "Cairo", status || "active"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/policies/:id", requireAdminAuth, async (req, res) => {
  const { name, description, refund_percentage, window_hours, status } = req.body;
  try {
    await db.query(
      `UPDATE cancellation_policies SET name=COALESCE(?,name), description=COALESCE(?,description),
       refund_percentage=COALESCE(?,refund_percentage), window_hours=COALESCE(?,window_hours),
       status=COALESCE(?,status) WHERE id=?`,
      [name, description, refund_percentage, window_hours, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/policies/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM cancellation_policies WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/reasons", requireAdminAuth, async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query("SELECT * FROM cancellation_reasons ORDER BY created_at DESC") as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/reasons", requireAdminAuth, async (req, res) => {
  const { reason, user_type, city, status } = req.body;
  try {
    await ensureTables();
    const [result] = await db.query(
      "INSERT INTO cancellation_reasons (reason, user_type, city, status) VALUES (?,?,?,?)",
      [reason, user_type || "both", city || "Cairo", status || "active"]
    ) as any;
    res.status(201).json({ id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/reasons/:id", requireAdminAuth, async (req, res) => {
  const { reason, user_type, status } = req.body;
  try {
    await db.query(
      "UPDATE cancellation_reasons SET reason=COALESCE(?,reason), user_type=COALESCE(?,user_type), status=COALESCE(?,status) WHERE id=?",
      [reason, user_type, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/reasons/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM cancellation_reasons WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
