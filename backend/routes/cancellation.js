// backend/routes/cancellation.js — policies + reasons
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// ─────────────────────────────────────────────────────────────
// CANCELLATION POLICIES
// ─────────────────────────────────────────────────────────────

// GET /api/cancellation/policies
router.get('/policies', requireAuth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cancellation_policies ORDER BY id DESC');
    for (const row of rows) {
      const [thresholds] = await db.query(
        'SELECT * FROM cancellation_thresholds WHERE policy_id = ? ORDER BY minutes_before ASC',
        [row.id]
      );
      row.thresholds = thresholds;
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/cancellation/policies/:id
router.get('/policies/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM cancellation_policies WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Policy not found' });
    const [thresholds] = await db.query(
      'SELECT * FROM cancellation_thresholds WHERE policy_id = ? ORDER BY minutes_before ASC',
      [row.id]
    );
    row.thresholds = thresholds;
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/cancellation/policies
router.post('/policies', requireAuth, adminOnly, async (req, res) => {
  const { name, status = 'active', applicable_for_pass = 0, thresholds = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [r] = await db.query(
      'INSERT INTO cancellation_policies (name, status, applicable_for_pass) VALUES (?, ?, ?)',
      [name, status, applicable_for_pass ? 1 : 0]
    );
    const policyId = r.insertId;
    for (const t of thresholds) {
      await db.query(
        'INSERT INTO cancellation_thresholds (policy_id, minutes_before, charge_percent) VALUES (?, ?, ?)',
        [policyId, t.minutes_before, t.charge_percent]
      );
    }
    const [[row]] = await db.query('SELECT * FROM cancellation_policies WHERE id = ?', [policyId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/cancellation/policies/:id
router.put('/policies/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, status, applicable_for_pass, thresholds } = req.body;
  try {
    await db.query(
      `UPDATE cancellation_policies SET
        name                = COALESCE(?, name),
        status              = COALESCE(?, status),
        applicable_for_pass = COALESCE(?, applicable_for_pass)
      WHERE id = ?`,
      [name, status, applicable_for_pass !== undefined ? (applicable_for_pass ? 1 : 0) : null, req.params.id]
    );
    if (thresholds) {
      await db.query('DELETE FROM cancellation_thresholds WHERE policy_id = ?', [req.params.id]);
      for (const t of thresholds) {
        await db.query(
          'INSERT INTO cancellation_thresholds (policy_id, minutes_before, charge_percent) VALUES (?, ?, ?)',
          [req.params.id, t.minutes_before, t.charge_percent]
        );
      }
    }
    const [[row]] = await db.query('SELECT * FROM cancellation_policies WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/cancellation/policies/:id
router.delete('/policies/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM cancellation_thresholds WHERE policy_id = ?', [req.params.id]);
    await db.query('DELETE FROM cancellation_policies WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// CANCELLATION REASONS
// ─────────────────────────────────────────────────────────────

// GET /api/cancellation/reasons
router.get('/reasons', requireAuth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cancellation_reasons ORDER BY id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/cancellation/reasons
router.post('/reasons', requireAuth, adminOnly, async (req, res) => {
  const { name, status = 'active' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [r] = await db.query('INSERT INTO cancellation_reasons (name, status) VALUES (?, ?)', [name, status]);
    const [[row]] = await db.query('SELECT * FROM cancellation_reasons WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/cancellation/reasons/:id
router.put('/reasons/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, status } = req.body;
  try {
    await db.query(
      'UPDATE cancellation_reasons SET name = COALESCE(?, name), status = COALESCE(?, status) WHERE id = ?',
      [name, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM cancellation_reasons WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/cancellation/reasons/:id
router.delete('/reasons/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM cancellation_reasons WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
