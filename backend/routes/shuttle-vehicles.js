// backend/routes/shuttle-vehicles.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/shuttle/vehicles
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE v.city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [rows] = await db.query(`
      SELECT v.*, vt.name AS vehicle_type_name, c.name AS city_name
      FROM shuttle_vehicles v
      LEFT JOIN shuttle_vehicle_types vt ON vt.id = v.vehicle_type_id
      LEFT JOIN operational_cities c ON c.id = v.city_id
      ${where}
      ORDER BY v.created_at DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/vehicles/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT v.*, vt.name AS vehicle_type_name
      FROM shuttle_vehicles v
      LEFT JOIN shuttle_vehicle_types vt ON vt.id = v.vehicle_type_id
      WHERE v.id = ?
    `, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shuttle/vehicles
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { city_id, vehicle_type_id, brand, model_name, vehicle_number, seats, doors, total_rows, total_columns, image_url, status = 'active' } = req.body;
  if (!model_name || !vehicle_number) return res.status(400).json({ error: 'model_name and vehicle_number required' });
  try {
    const [r] = await db.query(
      `INSERT INTO shuttle_vehicles (city_id, vehicle_type_id, brand, model_name, vehicle_number, seats, doors, total_rows, total_columns, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [city_id || null, vehicle_type_id || null, brand || null, model_name, vehicle_number, seats || null, doors || null, total_rows || null, total_columns || null, image_url || null, status]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_vehicles WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shuttle/vehicles/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { city_id, vehicle_type_id, brand, model_name, vehicle_number, seats, doors, total_rows, total_columns, image_url, status } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_vehicles SET
        city_id         = COALESCE(?, city_id),
        vehicle_type_id = COALESCE(?, vehicle_type_id),
        brand           = COALESCE(?, brand),
        model_name      = COALESCE(?, model_name),
        vehicle_number  = COALESCE(?, vehicle_number),
        seats           = COALESCE(?, seats),
        doors           = COALESCE(?, doors),
        total_rows      = COALESCE(?, total_rows),
        total_columns   = COALESCE(?, total_columns),
        image_url       = COALESCE(?, image_url),
        status          = COALESCE(?, status)
      WHERE id = ?`,
      [city_id, vehicle_type_id, brand, model_name, vehicle_number, seats, doors, total_rows, total_columns, image_url, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_vehicles WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shuttle/vehicles/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM shuttle_vehicles WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
