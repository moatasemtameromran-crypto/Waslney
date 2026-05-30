// backend/routes/shuttle-trips.js — new shuttle journey management
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/shuttle/trips
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id, day, status } = req.query;
    const conditions = ['1=1'];
    const params = [];
    if (city_id) { conditions.push('st.city_id = ?'); params.push(city_id); }
    if (day) { conditions.push('FIND_IN_SET(?, st.week_days)'); params.push(day); }
    if (status) { conditions.push('st.status = ?'); params.push(status); }

    const [rows] = await db.query(`
      SELECT st.*,
             sr.name AS route_name,
             sv.model_name AS vehicle_name, sv.vehicle_number,
             u.name AS driver_name,
             c.name AS city_name
      FROM shuttle_trips st
      LEFT JOIN shuttle_routes sr ON sr.id = st.route_id
      LEFT JOIN shuttle_vehicles sv ON sv.id = st.vehicle_id
      LEFT JOIN users u ON u.id = st.driver_id
      LEFT JOIN operational_cities c ON c.id = st.city_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY st.start_time ASC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/trips/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT st.*,
             sr.name AS route_name,
             sv.model_name AS vehicle_name,
             u.name AS driver_name
      FROM shuttle_trips st
      LEFT JOIN shuttle_routes sr ON sr.id = st.route_id
      LEFT JOIN shuttle_vehicles sv ON sv.id = st.vehicle_id
      LEFT JOIN users u ON u.id = st.driver_id
      WHERE st.id = ?
    `, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shuttle/trips
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const {
    city_id, route_id, start_time, vehicle_id, driver_id,
    week_days, cancellation_policy_id, pass_cancellation_policy_id,
    promotion_id, terms_link, terms_pointers, pass_terms_link,
    pass_terms_pointers, status = 'active'
  } = req.body;
  if (!route_id || !start_time) return res.status(400).json({ error: 'route_id and start_time required' });
  try {
    const weekDaysStr = Array.isArray(week_days) ? week_days.join(',') : (week_days || '');
    const [r] = await db.query(
      `INSERT INTO shuttle_trips
        (city_id, route_id, start_time, vehicle_id, driver_id, week_days,
         cancellation_policy_id, pass_cancellation_policy_id, promotion_id,
         terms_link, terms_pointers, pass_terms_link, pass_terms_pointers, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [city_id || null, route_id, start_time, vehicle_id || null, driver_id || null, weekDaysStr,
       cancellation_policy_id || null, pass_cancellation_policy_id || null, promotion_id || null,
       terms_link || null, terms_pointers || null, pass_terms_link || null, pass_terms_pointers || null, status]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_trips WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shuttle/trips/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const {
    route_id, start_time, vehicle_id, driver_id, week_days,
    cancellation_policy_id, pass_cancellation_policy_id,
    promotion_id, terms_link, terms_pointers, pass_terms_link,
    pass_terms_pointers, status
  } = req.body;
  try {
    const weekDaysStr = week_days
      ? (Array.isArray(week_days) ? week_days.join(',') : week_days)
      : null;
    await db.query(
      `UPDATE shuttle_trips SET
        route_id                    = COALESCE(?, route_id),
        start_time                  = COALESCE(?, start_time),
        vehicle_id                  = COALESCE(?, vehicle_id),
        driver_id                   = COALESCE(?, driver_id),
        week_days                   = COALESCE(?, week_days),
        cancellation_policy_id      = COALESCE(?, cancellation_policy_id),
        pass_cancellation_policy_id = COALESCE(?, pass_cancellation_policy_id),
        promotion_id                = COALESCE(?, promotion_id),
        terms_link                  = COALESCE(?, terms_link),
        terms_pointers              = COALESCE(?, terms_pointers),
        pass_terms_link             = COALESCE(?, pass_terms_link),
        pass_terms_pointers         = COALESCE(?, pass_terms_pointers),
        status                      = COALESCE(?, status)
      WHERE id = ?`,
      [route_id, start_time, vehicle_id, driver_id, weekDaysStr,
       cancellation_policy_id, pass_cancellation_policy_id, promotion_id,
       terms_link, terms_pointers, pass_terms_link, pass_terms_pointers, status,
       req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM shuttle_trips WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shuttle/trips/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM shuttle_trips WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shuttle/trips/:id/bookings
router.get('/:id/bookings', requireAuth, adminOnly, async (req, res) => {
  const { date } = req.query;
  try {
    const where = date ? 'AND b.travel_date = ?' : '';
    const params = date ? [req.params.id, date] : [req.params.id];
    const [rows] = await db.query(`
      SELECT b.*, u.name AS passenger_name, u.phone AS passenger_phone,
             u.email AS passenger_email,
             s1.name AS pickup_stop_name, s2.name AS dropoff_stop_name
      FROM shuttle_trip_bookings b
      JOIN users u ON u.id = b.passenger_id
      LEFT JOIN shuttle_stops s1 ON s1.id = b.pickup_stop_id
      LEFT JOIN shuttle_stops s2 ON s2.id = b.dropoff_stop_id
      WHERE b.trip_id = ? ${where}
      ORDER BY b.travel_date DESC, b.created_at DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
