// backend/routes/admin-settings.js — general settings, city settings, homescreen
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// ─────────────────────────────────────────────────────────────
// GENERAL SETTINGS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/settings/general
router.get('/general', requireAuth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM general_settings WHERE id = 1');
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/settings/general
router.put('/general', requireAuth, adminOnly, async (req, res) => {
  const { client_name, support_email, brand_logo_url, favicon_url, nearby_stops_count, max_nearby_distance } = req.body;
  try {
    await db.query(`
      INSERT INTO general_settings (id, client_name, support_email, brand_logo_url, favicon_url, nearby_stops_count, max_nearby_distance)
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        client_name          = VALUES(client_name),
        support_email        = VALUES(support_email),
        brand_logo_url       = VALUES(brand_logo_url),
        favicon_url          = VALUES(favicon_url),
        nearby_stops_count   = VALUES(nearby_stops_count),
        max_nearby_distance  = VALUES(max_nearby_distance)
    `, [client_name || null, support_email || null, brand_logo_url || null, favicon_url || null,
        nearby_stops_count || 3, max_nearby_distance || 500]);
    const [rows] = await db.query('SELECT * FROM general_settings WHERE id = 1');
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// CITY SETTINGS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/settings/city/:city_id
router.get('/city/:city_id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM city_settings WHERE city_id = ?', [req.params.city_id]);
    res.json(row || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/settings/city/:city_id
router.put('/city/:city_id', requireAuth, adminOnly, async (req, res) => {
  const { customer_support_number, driver_support_number, emergency_number, service_type } = req.body;
  const { city_id } = req.params;
  try {
    await db.query(`
      INSERT INTO city_settings (city_id, customer_support_number, driver_support_number, emergency_number, service_type)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_support_number = VALUES(customer_support_number),
        driver_support_number   = VALUES(driver_support_number),
        emergency_number        = VALUES(emergency_number),
        service_type            = VALUES(service_type)
    `, [city_id, customer_support_number || null, driver_support_number || null,
        emergency_number || null, service_type || 'both']);
    const [[row]] = await db.query('SELECT * FROM city_settings WHERE city_id = ?', [city_id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// HOMESCREEN SETTINGS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/settings/homescreen/:city_id
router.get('/homescreen/:city_id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM homescreen_items WHERE city_id = ? ORDER BY display_order ASC',
      [req.params.city_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/settings/homescreen
router.post('/homescreen', requireAuth, adminOnly, async (req, res) => {
  const { city_id, category, display_order, active, user_type, geofence_name } = req.body;
  if (!city_id || !category) return res.status(400).json({ error: 'city_id and category required' });
  try {
    const [r] = await db.query(
      `INSERT INTO homescreen_items (city_id, category, display_order, active, user_type, geofence_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [city_id, category, display_order || 1, active ? 1 : 0, user_type || 'customer', geofence_name || null]
    );
    const [[row]] = await db.query('SELECT * FROM homescreen_items WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/settings/homescreen/:id
router.put('/homescreen/:id', requireAuth, adminOnly, async (req, res) => {
  const { category, display_order, active, user_type, geofence_name } = req.body;
  try {
    await db.query(
      `UPDATE homescreen_items SET
        category      = COALESCE(?, category),
        display_order = COALESCE(?, display_order),
        active        = COALESCE(?, active),
        user_type     = COALESCE(?, user_type),
        geofence_name = COALESCE(?, geofence_name)
      WHERE id = ?`,
      [category, display_order, active !== undefined ? (active ? 1 : 0) : null, user_type, geofence_name, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM homescreen_items WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/settings/homescreen/:id
router.delete('/homescreen/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM homescreen_items WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
