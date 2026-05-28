// backend/routes/vehicle-types.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/vehicle-types
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id, status } = req.query;
    const conditions = [];
    const params = [];
    if (city_id) { conditions.push('vt.city_id = ?'); params.push(city_id); }
    if (status) { conditions.push('vt.status = ?'); params.push(status); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await db.query(`
      SELECT vt.*, c.name AS city_name
      FROM shuttle_vehicle_types vt
      LEFT JOIN operational_cities c ON c.id = vt.city_id
      ${where}
      ORDER BY vt.id DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/vehicle-types/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM shuttle_vehicle_types WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Vehicle type not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/vehicle-types
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { city_id, name, ride_type, vehicle_type, seats, image_url, status = 'active', documents = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [r] = await db.query(
      `INSERT INTO shuttle_vehicle_types (city_id, name, ride_type, vehicle_type, seats, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [city_id || null, name, ride_type || null, vehicle_type || null, seats || null, image_url || null, status]
    );
    const typeId = r.insertId;
    for (const doc of documents) {
      await db.query(
        `INSERT INTO vehicle_type_documents (vehicle_type_id, doc_name) VALUES (?, ?)`,
        [typeId, doc]
      );
    }
    const [[row]] = await db.query('SELECT * FROM shuttle_vehicle_types WHERE id = ?', [typeId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/vehicle-types/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { city_id, name, ride_type, vehicle_type, seats, image_url, status } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_vehicle_types SET
        city_id      = COALESCE(?, city_id),
        name         = COALESCE(?, name),
        ride_type    = COALESCE(?, ride_type),
        vehicle_type = COALESCE(?, vehicle_type),
        seats        = COALESCE(?, seats),
        image_url    = COALESCE(?, image_url),
        status       = COALESCE(?, status)
      WHERE id = ?`,
      [city_id, name, ride_type, vehicle_type, seats, image_url, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_vehicle_types WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/vehicle-types/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM shuttle_vehicle_types WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
