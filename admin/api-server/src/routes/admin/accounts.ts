import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../../lib/db";
import { requireAdminAuth } from "../../lib/adminAuth";

const router = Router();

// POST /api/admin/accounts — admin creates any user type (no verification).
// Mirrors the main app's /auth/admin-create-user.
router.post("/", requireAdminAuth, async (req, res) => {
  const {
    name, phone, email, password, role,
    car, plate, profile_photo,
    car_license_photo, driver_license_photo, criminal_record_photo,
  } = req.body;

  if (!name || !phone || !password || !role) {
    res.status(400).json({ error: "Missing required fields (name, phone, password, role)" });
    return;
  }
  if (role === "driver" && (!car || !plate)) {
    res.status(400).json({ error: "Car model and plate required for drivers" });
    return;
  }

  try {
    const [existing] = await db.query("SELECT id FROM users WHERE phone = ?", [phone]) as any;
    if (existing.length) { res.status(400).json({ error: "Phone already registered" }); return; }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (name, phone, email, password, role, car, plate, profile_photo, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [name, phone, email || null, hash, role, car || null, plate || null, profile_photo || null]
    ) as any;
    const userId = result.insertId;

    if (role === "driver" && (car_license_photo || driver_license_photo || criminal_record_photo)) {
      await db.query(
        `INSERT INTO driver_documents (user_id, car_license_photo, driver_license_photo, criminal_record_photo)
         VALUES (?, ?, ?, ?)`,
        [userId, car_license_photo || null, driver_license_photo || null, criminal_record_photo || null]
      ).catch(() => {});
    }

    const [rows] = await db.query(
      `SELECT id, name, phone, email, role, car, plate, account_status, created_at FROM users WHERE id = ?`,
      [userId]
    ) as any;
    res.status(201).json({ ok: true, user: rows[0] });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Create account error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
