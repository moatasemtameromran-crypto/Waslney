// backend/routes/operational-cities.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/cities — list all operational cities
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM operational_cities ORDER BY id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/cities/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM operational_cities WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'City not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/cities
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { name, country, lat, lng, geofence_radius, geofence_coords, status = 'active' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [r] = await db.query(
      `INSERT INTO operational_cities (name, country, lat, lng, geofence_radius, geofence_coords, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, country || null, lat || null, lng || null, geofence_radius || null,
       geofence_coords ? JSON.stringify(geofence_coords) : null, status]
    );
    const [[row]] = await db.query('SELECT * FROM operational_cities WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/cities/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, country, lat, lng, geofence_radius, geofence_coords, status } = req.body;
  try {
    await db.query(
      `UPDATE operational_cities SET
        name            = COALESCE(?, name),
        country         = COALESCE(?, country),
        lat             = COALESCE(?, lat),
        lng             = COALESCE(?, lng),
        geofence_radius = COALESCE(?, geofence_radius),
        geofence_coords = COALESCE(?, geofence_coords),
        status          = COALESCE(?, status)
      WHERE id = ?`,
      [name, country, lat, lng, geofence_radius,
       geofence_coords ? JSON.stringify(geofence_coords) : null,
       status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM operational_cities WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/cities/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM operational_cities WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
