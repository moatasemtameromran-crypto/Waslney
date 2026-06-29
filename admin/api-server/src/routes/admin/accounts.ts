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

  // Companies live in their own `companies` table — the users.role enum only
  // allows passenger/driver/admin, so inserting role='company' into users throws
  // "Data truncated for column 'role'". Companies log in via the company portal
  // using company_name + password.
  if (role === "company") {
    const companyName = String(name).trim();
    const fleetNumber = String(req.body.fleet_number || "1").trim() || "1";
    try {
      const [dup] = await db.query("SELECT id FROM companies WHERE company_name = ?", [companyName]) as any;
      if (dup.length) { res.status(400).json({ error: "Company name already exists" }); return; }

      const companyHash = await bcrypt.hash(password, 10);
      let companyId: number;
      try {
        const [r] = await db.query(
          "INSERT INTO companies (company_name, fleet_number, password_hash, phone) VALUES (?, ?, ?, ?)",
          [companyName, fleetNumber, companyHash, phone || null]
        ) as any;
        companyId = r.insertId;
      } catch {
        // Older schema without a phone column — insert without it, then add the column.
        const [r] = await db.query(
          "INSERT INTO companies (company_name, fleet_number, password_hash) VALUES (?, ?, ?)",
          [companyName, fleetNumber, companyHash]
        ) as any;
        companyId = r.insertId;
        try { await db.query("ALTER TABLE companies ADD COLUMN phone VARCHAR(30) DEFAULT NULL"); } catch { /* ignore */ }
      }

      res.status(201).json({
        ok: true,
        user: {
          id: companyId,
          name: companyName,
          phone: phone || null,
          email: email || null,
          role: "company",
          account_status: "active",
        },
      });
      return;
    } catch (err: any) {
      req.log.error({ err: err.message }, "Create company error");
      res.status(500).json({ error: err.message || "Server error" });
      return;
    }
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
