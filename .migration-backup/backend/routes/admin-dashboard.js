// backend/routes/admin-dashboard.js — dashboard stats and analytics
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/admin/dashboard?city_id=X&period=today|7d|30d
router.get('/', requireAuth, adminOnly, async (req, res) => {
  const { city_id, period = 'today' } = req.query;

  let dateFilter;
  if (period === 'today') {
    dateFilter = 'DATE(b.created_at) = CURDATE()';
  } else if (period === '7d') {
    dateFilter = 'b.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  } else {
    dateFilter = 'b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  }

  try {
    // Total bookings in period
    const [[{ total_bookings }]] = await db.query(
      `SELECT COUNT(*) AS total_bookings FROM bookings b WHERE ${dateFilter}`
    );
    const [[{ booked_bookings }]] = await db.query(
      `SELECT COUNT(*) AS booked_bookings FROM bookings b WHERE ${dateFilter} AND b.status = 'confirmed'`
    );
    const [[{ cancelled_bookings }]] = await db.query(
      `SELECT COUNT(*) AS cancelled_bookings FROM bookings b WHERE ${dateFilter} AND b.status = 'cancelled'`
    );
    const [[{ completed_bookings }]] = await db.query(
      `SELECT COUNT(*) AS completed_bookings FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       WHERE ${dateFilter} AND t.status = 'completed'`
    );

    // New users in period
    let newUsersFilter = period === 'today'
      ? 'DATE(created_at) = CURDATE()'
      : period === '7d'
        ? 'created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
        : 'created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';

    const [[{ new_users }]] = await db.query(
      `SELECT COUNT(*) AS new_users FROM users WHERE ${newUsersFilter} AND role IN ('passenger','driver')`
    );

    // Total earnings
    const [[{ total_earning }]] = await db.query(
      `SELECT COALESCE(SUM(b.effective_price), 0) AS total_earning FROM bookings b WHERE ${dateFilter} AND b.status = 'confirmed'`
    );

    // Revenue chart — last 7 days
    const [revenue_chart] = await db.query(`
      SELECT DATE(b.created_at) AS date,
             COALESCE(SUM(b.effective_price), 0) AS revenue,
             COUNT(DISTINCT b.passenger_id) AS new_users
      FROM bookings b
      WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC
    `);

    // Active trips
    const [[{ active_trips }]] = await db.query(
      "SELECT COUNT(*) AS active_trips FROM trips WHERE status IN ('active','upcoming')"
    );

    // Shuttle trips stats if table exists
    let shuttle_stats = null;
    try {
      const [[ss]] = await db.query(`
        SELECT COUNT(*) AS total_routes FROM shuttle_routes WHERE status = 'active'
      `);
      shuttle_stats = ss;
    } catch(_) {}

    res.json({
      total_bookings: parseInt(total_bookings),
      booked_bookings: parseInt(booked_bookings),
      cancelled_bookings: parseInt(cancelled_bookings),
      completed_bookings: parseInt(completed_bookings),
      missed_bookings: parseInt(total_bookings) - parseInt(booked_bookings),
      active_bookings: parseInt(total_bookings) - parseInt(cancelled_bookings) - parseInt(completed_bookings),
      new_users: parseInt(new_users),
      total_earning: parseFloat(total_earning),
      active_trips: parseInt(active_trips),
      revenue_chart,
      shuttle_stats,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/dashboard/bookings — booking analytics
router.get('/bookings', requireAuth, adminOnly, async (req, res) => {
  const { city_id, start_date, end_date, trip_id } = req.query;
  try {
    const conditions = ['1=1'];
    const params = [];
    if (start_date) { conditions.push('b.travel_date >= ?'); params.push(start_date); }
    if (end_date)   { conditions.push('b.travel_date <= ?'); params.push(end_date); }
    if (trip_id)    { conditions.push('b.trip_id = ?'); params.push(trip_id); }

    const [rows] = await db.query(`
      SELECT b.id AS booking_id, b.travel_date, b.created_at, b.status,
             b.seats, b.effective_price, b.pickup_note,
             u.name AS passenger_name, u.phone AS passenger_phone,
             t.from_loc, t.to_loc, t.pickup_time,
             d.name AS driver_name
      FROM bookings b
      JOIN users u ON u.id = b.passenger_id
      JOIN trips t ON t.id = b.trip_id
      LEFT JOIN users d ON d.id = t.driver_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.travel_date DESC, b.created_at DESC
      LIMIT 500
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/dashboard/stop-utilization — how many bookings per stop
router.get('/stop-utilization', requireAuth, adminOnly, async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    const conditions = ["b.status = 'confirmed'"];
    const params = [];
    if (start_date) { conditions.push('b.travel_date >= ?'); params.push(start_date); }
    if (end_date)   { conditions.push('b.travel_date <= ?'); params.push(end_date); }

    // Try new shuttle booking table first, fall back to legacy bookings
    try {
      const [rows] = await db.query(`
        SELECT ss.name AS stop_name, ss.address,
               COUNT(stb.id) AS booking_count,
               SUM(stb.seats) AS total_seats
        FROM shuttle_trip_bookings stb
        JOIN shuttle_stops ss ON ss.id = stb.pickup_stop_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY stb.pickup_stop_id
        ORDER BY booking_count DESC
      `, params);
      res.json(rows);
    } catch(_) {
      // Fall back to legacy trip stops
      const [rows] = await db.query(`
        SELECT ts.label AS stop_name, ts.type,
               COUNT(b.id) AS booking_count
        FROM bookings b
        JOIN trips t ON t.id = b.trip_id
        JOIN trip_stops ts ON ts.trip_id = t.id AND ts.type = 'pickup'
        WHERE ${conditions.join(' AND ')}
        GROUP BY ts.id
        ORDER BY booking_count DESC
        LIMIT 50
      `, params);
      res.json(rows);
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
