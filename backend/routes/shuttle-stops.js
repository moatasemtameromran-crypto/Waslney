// backend/routes/shuttle-stops.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/shuttle/stops
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE s.city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [rows] = await db.query(`
      SELECT s.*, c.name AS city_name
      FROM shuttle_stops s
      LEFT JOIN operational_cities c ON c.id = s.city_id
      ${where}
      ORDER BY s.created_at DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/stops/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT s.*, c.name AS city_name
      FROM shuttle_stops s
      LEFT JOIN operational_cities c ON c.id = s.city_id
      WHERE s.id = ?
    `, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Stop not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shuttle/stops
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { name, city_id, lat, lng, radius = 100, address } = req.body;
  if (!name || !lat || !lng) return res.status(400).json({ error: 'name, lat, lng required' });
  try {
    const [r] = await db.query(
      `INSERT INTO shuttle_stops (name, city_id, lat, lng, radius, address) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, city_id || null, lat, lng, radius, address || null]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_stops WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shuttle/stops/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, city_id, lat, lng, radius, address, status } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_stops SET
        name    = COALESCE(?, name),
        city_id = COALESCE(?, city_id),
        lat     = COALESCE(?, lat),
        lng     = COALESCE(?, lng),
        radius  = COALESCE(?, radius),
        address = COALESCE(?, address),
        status  = COALESCE(?, status)
      WHERE id = ?`,
      [name, city_id, lat, lng, radius, address, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_stops WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shuttle/stops/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM shuttle_stops WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
