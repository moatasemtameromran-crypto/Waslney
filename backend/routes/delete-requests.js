// backend/routes/delete-requests.js — account deletion requests
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/delete-requests
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { user_type } = req.query;
    const conditions = ['dr.status != "processed"'];
    const params = [];
    if (user_type) { conditions.push('u.role = ?'); params.push(user_type); }
    const [rows] = await db.query(`
      SELECT dr.*, u.name AS user_name, u.phone, u.role AS user_role
      FROM delete_account_requests dr
      JOIN users u ON u.id = dr.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY dr.created_at DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/delete-requests — submitted from passenger/driver app
router.post('/', requireAuth, async (req, res) => {
  const { reason, feedback } = req.body;
  try {
    const [ex] = await db.query(
      "SELECT id FROM delete_account_requests WHERE user_id = ? AND status = 'pending'",
      [req.user.id]
    );
    if (ex.length) return res.status(409).json({ error: 'Delete request already pending' });
    const [r] = await db.query(
      'INSERT INTO delete_account_requests (user_id, reason, feedback) VALUES (?, ?, ?)',
      [req.user.id, reason || null, feedback || null]
    );
    const [[row]] = await db.query('SELECT * FROM delete_account_requests WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/delete-requests/:id/approve — admin approves (deletes user account)
router.put('/:id/approve', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[req_row]] = await db.query('SELECT * FROM delete_account_requests WHERE id = ?', [req.params.id]);
    if (!req_row) return res.status(404).json({ error: 'Request not found' });
    await db.query("UPDATE users SET account_status = 'deleted' WHERE id = ?", [req_row.user_id]);
    await db.query("UPDATE delete_account_requests SET status = 'approved', processed_at = NOW() WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/delete-requests/:id/reject
router.put('/:id/reject', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query(
      "UPDATE delete_account_requests SET status = 'rejected', processed_at = NOW() WHERE id = ?",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
