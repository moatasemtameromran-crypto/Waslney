import { Router } from "express";
import db from "../../lib/db";
import { requireAdminAuth } from "../../lib/adminAuth";

const router = Router();

// GET /api/admin/review/pending — drivers awaiting approval, with their documents.
router.get("/pending", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.phone, u.car, u.plate, u.profile_photo, u.created_at,
              d.car_license_photo, d.driver_license_photo, d.criminal_record_photo, d.submitted_at
       FROM users u
       LEFT JOIN driver_documents d ON d.user_id = u.id
       WHERE u.role = 'driver' AND u.account_status = 'pending_review'
       ORDER BY COALESCE(d.submitted_at, u.created_at) ASC`
    ) as any;
    res.json({ drivers: Array.isArray(rows) ? rows : [] });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Pending review error");
    res.json({ drivers: [] });
  }
});

// POST /api/admin/review/:id/approve
router.post("/:id/approve", requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [u] = await db.query("SELECT id, role FROM users WHERE id = ?", [id]) as any;
    if (!u.length) { res.status(404).json({ error: "User not found" }); return; }
    if (u[0].role !== "driver") { res.status(400).json({ error: "Only drivers can be approved" }); return; }

    await db.query("UPDATE users SET account_status='active', rejection_note=NULL WHERE id=?", [id]);
    await db.query("UPDATE driver_documents SET reviewed_at=NOW(), reviewed_by=? WHERE user_id=?",
      [req.adminUser!.id, id]).catch(() => {});
    await db.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)",
      [id, "✅ Your account has been approved! You can now log in and start accepting trips."]).catch(() => {});
    res.json({ ok: true });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Approve driver error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/review/:id/reject  { note }
router.post("/:id/reject", requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  const { note = "" } = req.body;
  try {
    const [u] = await db.query("SELECT id FROM users WHERE id = ?", [id]) as any;
    if (!u.length) { res.status(404).json({ error: "User not found" }); return; }

    await db.query("UPDATE users SET account_status='rejected', rejection_note=? WHERE id=?", [note, id]);
    await db.query("UPDATE driver_documents SET reviewed_at=NOW(), reviewed_by=? WHERE user_id=?",
      [req.adminUser!.id, id]).catch(() => {});
    const msg = note
      ? `❌ Your account was not approved. Reason: ${note}`
      : "❌ Your account was not approved. Please contact support.";
    await db.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [id, msg]).catch(() => {});
    res.json({ ok: true });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Reject driver error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
