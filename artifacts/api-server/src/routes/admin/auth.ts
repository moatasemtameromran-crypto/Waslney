import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../lib/db.js";
import { requireAdminAuth } from "../../lib/adminAuth.js";

const router = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "waslney_admin_secret_change_me";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, password, role, account_status FROM users WHERE email = ? AND role = 'admin'",
      [email]
    ) as any;
    if (!rows.length) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const user = rows[0];
    if (user.account_status !== "active") { res.status(403).json({ error: "Account is not active" }); return; }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Admin login error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, phone, role, account_status, created_at FROM users WHERE id = ?",
      [req.adminUser!.id]
    ) as any;
    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/change-password", requireAdminAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [req.adminUser!.id]) as any;
    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) { res.status(401).json({ error: "Current password is wrong" }); return; }
    const hashed = await bcrypt.hash(new_password, 12);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.adminUser!.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
