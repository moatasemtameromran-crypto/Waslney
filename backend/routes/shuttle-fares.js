// backend/routes/shuttle-fares.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/shuttle/fares
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [rows] = await db.query(`SELECT * FROM shuttle_fares ${where} ORDER BY id DESC`, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/fares/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM shuttle_fares WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Fare not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shuttle/fares
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { city_id, fare_type = 'fare_per_km', base_fare = 0, fare_per_stop = 0, fare_per_km = 0, status = 'active' } = req.body;
  try {
    const [r] = await db.query(
      `INSERT INTO shuttle_fares (city_id, fare_type, base_fare, fare_per_stop, fare_per_km, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [city_id || null, fare_type, base_fare, fare_per_stop, fare_per_km, status]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_fares WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shuttle/fares/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { fare_type, base_fare, fare_per_stop, fare_per_km, status } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_fares SET
        fare_type    = COALESCE(?, fare_type),
        base_fare    = COALESCE(?, base_fare),
        fare_per_stop = COALESCE(?, fare_per_stop),
        fare_per_km  = COALESCE(?, fare_per_km),
        status       = COALESCE(?, status)
      WHERE id = ?`,
      [fare_type, base_fare, fare_per_stop, fare_per_km, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_fares WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shuttle/fares/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM shuttle_fares WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
