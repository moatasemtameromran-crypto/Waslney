// backend/routes/shuttle-passes.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/shuttle/passes
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM shuttle_passes ORDER BY id DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/passes/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM shuttle_passes WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Pass not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shuttle/passes
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const {
    name, pass_type, morning_evening_fare, fare_discount,
    validity_days, per_user_cancellation_limit,
    total_pass_limit, per_user_pass_limit,
    benefits, status = 'active', recommended = 0
  } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [r] = await db.query(
      `INSERT INTO shuttle_passes
        (name, pass_type, morning_evening_fare, fare_discount,
         validity_days, per_user_cancellation_limit,
         total_pass_limit, per_user_pass_limit,
         benefits, status, recommended)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, pass_type || null, morning_evening_fare || null, fare_discount || 0,
       validity_days || 30, per_user_cancellation_limit || null,
       total_pass_limit || null, per_user_pass_limit || 1,
       benefits ? JSON.stringify(benefits) : null, status, recommended ? 1 : 0]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_passes WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shuttle/passes/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const {
    name, pass_type, morning_evening_fare, fare_discount,
    validity_days, per_user_cancellation_limit,
    total_pass_limit, per_user_pass_limit,
    benefits, status, recommended
  } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_passes SET
        name                       = COALESCE(?, name),
        pass_type                  = COALESCE(?, pass_type),
        morning_evening_fare       = COALESCE(?, morning_evening_fare),
        fare_discount              = COALESCE(?, fare_discount),
        validity_days              = COALESCE(?, validity_days),
        per_user_cancellation_limit = COALESCE(?, per_user_cancellation_limit),
        total_pass_limit           = COALESCE(?, total_pass_limit),
        per_user_pass_limit        = COALESCE(?, per_user_pass_limit),
        benefits                   = COALESCE(?, benefits),
        status                     = COALESCE(?, status),
        recommended                = COALESCE(?, recommended)
      WHERE id = ?`,
      [name, pass_type, morning_evening_fare, fare_discount,
       validity_days, per_user_cancellation_limit, total_pass_limit,
       per_user_pass_limit,
       benefits ? JSON.stringify(benefits) : null,
       status, recommended !== undefined ? (recommended ? 1 : 0) : null,
       req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_passes WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shuttle/passes/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM shuttle_passes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/passes/stats — pass usage stats
router.get('/stats/summary', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM shuttle_passes');
    const [[{ active }]] = await db.query("SELECT COUNT(*) AS active FROM shuttle_passes WHERE status = 'active'");
    res.json({ total, active });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
