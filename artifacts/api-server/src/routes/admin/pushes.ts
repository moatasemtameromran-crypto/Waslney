import { Router } from "express";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS push_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(300) NOT NULL,
      message TEXT NOT NULL,
      image_url VARCHAR(500) DEFAULT NULL,
      target_type ENUM('all','passengers','drivers','country') NOT NULL DEFAULT 'all',
      target_value VARCHAR(200) DEFAULT NULL,
      city VARCHAR(100) DEFAULT 'Cairo',
      sent_count INT NOT NULL DEFAULT 0,
      status ENUM('sent','failed','draft') NOT NULL DEFAULT 'draft',
      sent_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureTable();
    const { city } = req.query as any;
    let query = "SELECT * FROM push_notifications WHERE 1=1";
    const params: any[] = [];
    if (city) { query += " AND city = ?"; params.push(city); }
    query += " ORDER BY created_at DESC LIMIT 100";
    const [rows] = await db.query(query, params) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM push_notifications WHERE id=?", [req.params.id]) as any;
    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/send", requireAdminAuth, async (req, res) => {
  const { title, message, image_url, target_type, target_value, city } = req.body;
  try {
    await ensureTable();
    let userQuery = "SELECT id FROM users WHERE 1=1";
    const userParams: any[] = [];
    if (target_type === "passengers") { userQuery += " AND role='passenger'"; }
    else if (target_type === "drivers") { userQuery += " AND role='driver'"; }
    const [users] = await db.query(userQuery, userParams) as any;
    const [result] = await db.query(
      `INSERT INTO push_notifications (title, message, image_url, target_type, target_value, city, sent_count, status, sent_at)
       VALUES (?,?,?,?,?,?,?,?,NOW())`,
      [title, message, image_url || null, target_type || "all", target_value || null, city || "Cairo", users.length, "sent"]
    ) as any;
    if (users.length > 0) {
      const notifValues = users.map((u: any) => [u.id, `📢 ${title}: ${message}`]);
      await db.query("INSERT INTO notifications (user_id, message) VALUES ?", [notifValues])
        .catch(() => null);
    }
    res.status(201).json({ id: result.insertId, sent_count: users.length });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Send push error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM push_notifications WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
