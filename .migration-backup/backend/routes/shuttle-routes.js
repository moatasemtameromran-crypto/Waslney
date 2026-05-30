// backend/routes/shuttle-routes.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/shuttle/routes
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE r.city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [routes] = await db.query(`
      SELECT r.*,
             c.name AS city_name,
             COUNT(DISTINCT rs.stop_id) AS stop_count
      FROM shuttle_routes r
      LEFT JOIN operational_cities c ON c.id = r.city_id
      LEFT JOIN shuttle_route_stops rs ON rs.route_id = r.id
      ${where}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, params);

    for (const route of routes) {
      const [stops] = await db.query(`
        SELECT s.*, rs.stop_order
        FROM shuttle_route_stops rs
        JOIN shuttle_stops s ON s.id = rs.stop_id
        WHERE rs.route_id = ?
        ORDER BY rs.stop_order ASC
      `, [route.id]);
      route.stops = stops;
    }
    res.json(routes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/routes/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[route]] = await db.query(`
      SELECT r.*, c.name AS city_name
      FROM shuttle_routes r
      LEFT JOIN operational_cities c ON c.id = r.city_id
      WHERE r.id = ?
    `, [req.params.id]);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    const [stops] = await db.query(`
      SELECT s.*, rs.stop_order
      FROM shuttle_route_stops rs
      JOIN shuttle_stops s ON s.id = rs.stop_id
      WHERE rs.route_id = ?
      ORDER BY rs.stop_order ASC
    `, [route.id]);
    route.stops = stops;
    res.json(route);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shuttle/routes
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { name, city_id, customer_fare, driver_fare, status = 'active', stop_ids = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [r] = await db.query(
      `INSERT INTO shuttle_routes (name, city_id, customer_fare, driver_fare, status) VALUES (?, ?, ?, ?, ?)`,
      [name, city_id || null, customer_fare || 0, driver_fare || 0, status]
    );
    const routeId = r.insertId;

    for (let i = 0; i < stop_ids.length; i++) {
      await db.query(
        `INSERT INTO shuttle_route_stops (route_id, stop_id, stop_order) VALUES (?, ?, ?)`,
        [routeId, stop_ids[i], i]
      );
    }

    const [[row]] = await db.query('SELECT * FROM shuttle_routes WHERE id = ?', [routeId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shuttle/routes/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, city_id, customer_fare, driver_fare, status, stop_ids } = req.body;
  try {
    await db.query(
      `UPDATE shuttle_routes SET
        name          = COALESCE(?, name),
        city_id       = COALESCE(?, city_id),
        customer_fare = COALESCE(?, customer_fare),
        driver_fare   = COALESCE(?, driver_fare),
        status        = COALESCE(?, status)
      WHERE id = ?`,
      [name, city_id, customer_fare, driver_fare, status, req.params.id]
    );

    if (stop_ids) {
      await db.query('DELETE FROM shuttle_route_stops WHERE route_id = ?', [req.params.id]);
      for (let i = 0; i < stop_ids.length; i++) {
        await db.query(
          `INSERT INTO shuttle_route_stops (route_id, stop_id, stop_order) VALUES (?, ?, ?)`,
          [req.params.id, stop_ids[i], i]
        );
      }
    }

    const [[row]] = await db.query('SELECT * FROM shuttle_routes WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shuttle/routes/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM shuttle_route_stops WHERE route_id = ?', [req.params.id]);
    await db.query('DELETE FROM shuttle_routes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
