// backend/routes/admin.js — API for the Replit-built Admin Panel (mounted at /api/admin)
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'waslney_secret_change_me';

// ── Admin auth middleware ────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Ensure auxiliary tables used by the admin panel exist ────────────────────
async function ensureTables() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS admin_stops (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, lat DECIMAL(10,7) DEFAULT NULL, lng DECIMAL(10,7) DEFAULT NULL, city VARCHAR(100) DEFAULT NULL, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_routes (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, from_stop VARCHAR(150) DEFAULT NULL, to_stop VARCHAR(150) DEFAULT NULL, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_vehicles (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, plate VARCHAR(50) DEFAULT NULL, capacity INT DEFAULT 0, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_fares (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, base_fare DECIMAL(10,2) DEFAULT 0, per_km DECIMAL(10,2) DEFAULT 0, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_shuttle_trips (id INT AUTO_INCREMENT PRIMARY KEY, route VARCHAR(150) DEFAULT NULL, trip_time VARCHAR(20) DEFAULT NULL, trip_date DATE DEFAULT NULL, status VARCHAR(30) DEFAULT 'scheduled', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_shuttle_pass (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, price DECIMAL(10,2) DEFAULT 0, days INT DEFAULT 30, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_suggested_routes (id INT AUTO_INCREMENT PRIMARY KEY, from_loc VARCHAR(150) DEFAULT NULL, to_loc VARCHAR(150) DEFAULT NULL, status VARCHAR(30) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_holidays (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, date DATE DEFAULT NULL, surge_multiplier DECIMAL(5,2) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_vehicle_types (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, capacity INT DEFAULT 0, base_fare DECIMAL(10,2) DEFAULT 0, per_km_rate DECIMAL(10,2) DEFAULT 0, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_cancel_reasons (id INT AUTO_INCREMENT PRIMARY KEY, reason VARCHAR(255) NOT NULL, role VARCHAR(30) DEFAULT 'passenger', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_cancel_policies (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, hours_before INT DEFAULT 0, refund_percent INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_cities (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_homescreen (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) DEFAULT NULL, type VARCHAR(50) DEFAULT 'banner', city VARCHAR(100) DEFAULT NULL, image TEXT DEFAULT NULL, sort_order INT DEFAULT 0, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_pushes (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) DEFAULT NULL, body TEXT DEFAULT NULL, audience VARCHAR(50) DEFAULT 'all', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_doc_types (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, required TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_settings (skey VARCHAR(100) PRIMARY KEY, svalue TEXT DEFAULT NULL)`,
    `CREATE TABLE IF NOT EXISTS delete_requests (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reason TEXT DEFAULT NULL, status VARCHAR(30) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
  ];
  for (const s of stmts) { try { await db.query(s); } catch (e) { /* ignore */ } }
}
ensureTables();

// ═══════════════════════════ AUTH ═══════════════════════════
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const [[user]] = await db.query(
      "SELECT * FROM users WHERE email = ? AND role = 'admin' LIMIT 1", [email]
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/auth/me', requireAdmin, async (req, res) => {
  try {
    const [[user]] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// All routes below require admin
router.use(requireAdmin);

// ═══════════════════════════ DASHBOARD ═══════════════════════════
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [[u]]  = await db.query(`SELECT
      COUNT(*) AS total,
      SUM(role='passenger') AS passengers,
      SUM(role='driver') AS drivers FROM users`);
    const [[t]]  = await db.query(`SELECT
      COUNT(*) AS total,
      SUM(status='active') AS active,
      SUM(status='completed') AS completed,
      SUM(status='upcoming') AS upcoming,
      SUM(status='cancelled') AS cancelled FROM trips`);
    const [[b]]  = await db.query(`SELECT
      COUNT(*) AS total,
      SUM(status='confirmed') AS confirmed,
      SUM(status='cancelled') AS cancelled,
      SUM(status='completed') AS completed FROM bookings`);
    const [[rev]] = await db.query(`SELECT COALESCE(SUM(COALESCE(b.effective_price, t.price) * b.seats),0) AS revenue
      FROM bookings b JOIN trips t ON t.id = b.trip_id WHERE b.status='completed'`);
    const [recentBookings] = await db.query(`SELECT b.id, b.status, b.created_at, b.seats,
        u.name AS passenger_name, t.from_loc AS origin, t.to_loc AS destination,
        COALESCE(b.effective_price, t.price) AS price
      FROM bookings b JOIN users u ON u.id=b.passenger_id JOIN trips t ON t.id=b.trip_id
      ORDER BY b.created_at DESC LIMIT 8`);
    const [recentTrips] = await db.query(`SELECT t.id, t.from_loc AS origin, t.to_loc AS destination,
        CONCAT(t.date,' ',t.pickup_time) AS departure_time, t.price, t.total_seats AS seats,
        t.status, t.is_pool, u.name AS driver_name, u.phone AS driver_phone,
        (SELECT COUNT(*) FROM bookings bb WHERE bb.trip_id=t.id AND bb.status='confirmed') AS confirmed_bookings,
        t.created_at
      FROM trips t LEFT JOIN users u ON u.id=t.driver_id ORDER BY t.created_at DESC LIMIT 5`);
    res.json({
      users:    { total: +u.total||0, passengers: +u.passengers||0, drivers: +u.drivers||0 },
      trips:    { total: +t.total||0, active: +t.active||0, completed: +t.completed||0, upcoming: +t.upcoming||0, cancelled: +t.cancelled||0 },
      bookings: { total: +b.total||0, confirmed: +b.confirmed||0, cancelled: +b.cancelled||0, completed: +b.completed||0 },
      revenue:  Number(rev.revenue).toFixed(2),
      recentBookings, recentTrips,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════ USERS ═══════════════════════════
router.get('/users/customers', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, name, phone, email, role, account_status, car, plate, profile_photo, created_at
      FROM users WHERE role='passenger' ORDER BY created_at DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/drivers', async (req, res) => {
  try {
    const { status } = req.query;
    let where = "u.role='driver'";
    const params = [];
    if (status) { where += ' AND u.account_status = ?'; params.push(status); }
    const [rows] = await db.query(`SELECT u.id, u.name, u.phone, u.email, u.role, u.account_status,
        u.car, u.plate, u.profile_photo, u.created_at, u.rejection_note,
        COALESCE((SELECT AVG(stars) FROM ratings r WHERE r.driver_id=u.id),0) AS avg_rating,
        (SELECT COUNT(*) FROM trips t WHERE t.driver_id=u.id) AS total_trips,
        (SELECT COUNT(*) FROM trips t WHERE t.driver_id=u.id AND t.status='completed') AS completed_trips
      FROM users u WHERE ${where} ORDER BY u.created_at DESC`, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/companies', async (req, res) => {
  try {
    const [companies] = await db.query(
      'SELECT id, company_name, fleet_number, phone, created_at FROM companies ORDER BY created_at DESC'
    );
    if (!companies.length) return res.json([]);

    const companyIds = companies.map(c => c.id);
    const placeholders = companyIds.map(() => '?').join(',');

    let drivers = [];
    let cars = [];
    try {
      const [driverRows] = await db.query(
        `SELECT id, company_id, name, phone, license_number
         FROM company_drivers
         WHERE company_id IN (${placeholders})
         ORDER BY name ASC`,
        companyIds
      );
      drivers = driverRows;
    } catch (_) {}

    try {
      const [carRows] = await db.query(
        `SELECT id, company_id, plate, model, capacity
         FROM company_cars
         WHERE company_id IN (${placeholders})
         ORDER BY plate ASC`,
        companyIds
      );
      cars = carRows;
    } catch (_) {}

    const driversByCompany = new Map();
    const carsByCompany = new Map();
    drivers.forEach(d => {
      if (!driversByCompany.has(d.company_id)) driversByCompany.set(d.company_id, []);
      driversByCompany.get(d.company_id).push(d);
    });
    cars.forEach(c => {
      if (!carsByCompany.has(c.company_id)) carsByCompany.set(c.company_id, []);
      carsByCompany.get(c.company_id).push(c);
    });

    const rows = companies.map(c => {
      const companyDrivers = driversByCompany.get(c.id) || [];
      const companyCars = carsByCompany.get(c.id) || [];
      return {
        ...c,
        driver_count: companyDrivers.length,
        car_count: companyCars.length,
        drivers: companyDrivers,
        cars: companyCars,
      };
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { account_status, rejection_note } = req.body;
    await db.query('UPDATE users SET account_status = ?, rejection_note = ? WHERE id = ?',
      [account_status, rejection_note || null, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/delete-requests/list', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT d.id, d.user_id, d.reason, d.status, d.created_at,
        u.name, u.phone, u.email FROM delete_requests d JOIN users u ON u.id=d.user_id
      ORDER BY d.created_at DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/delete-requests/:id', async (req, res) => {
  try {
    await db.query('UPDATE delete_requests SET status = ? WHERE id = ?',
      [req.body.status || 'approved', req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════ TRIPS ═══════════════════════════
router.get('/trips', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT t.id, t.from_loc AS origin, t.to_loc AS destination,
        CONCAT(t.date,' ',t.pickup_time) AS departure_time, t.price, t.total_seats AS seats,
        t.status, t.is_pool, u.name AS driver_name, u.phone AS driver_phone,
        (SELECT COUNT(*) FROM bookings b WHERE b.trip_id=t.id AND b.status='confirmed') AS confirmed_bookings,
        t.created_at
      FROM trips t LEFT JOIN users u ON u.id=t.driver_id ORDER BY t.created_at DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/trips/:id/cancel', async (req, res) => {
  try {
    await db.query("UPDATE trips SET status='cancelled' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════ ANALYTICS ═══════════════════════════
router.get('/analytics/summary', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const [[totals]] = await db.query(`SELECT
        COUNT(*) AS total_bookings,
        COALESCE(SUM(COALESCE(b.effective_price, t.price) * b.seats),0) AS revenue,
        COUNT(DISTINCT b.trip_id) AS total_trips,
        COUNT(DISTINCT b.passenger_id) AS unique_passengers
      FROM bookings b JOIN trips t ON t.id=b.trip_id
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
    const [dailyRevenue] = await db.query(`SELECT DATE(b.created_at) AS date,
        COALESCE(SUM(COALESCE(b.effective_price, t.price) * b.seats),0) AS revenue,
        COUNT(*) AS bookings
      FROM bookings b JOIN trips t ON t.id=b.trip_id
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(b.created_at) ORDER BY date ASC`, [days]);
    res.json({
      totals: {
        total_bookings: +totals.total_bookings||0,
        revenue: Number(totals.revenue)||0,
        total_trips: +totals.total_trips||0,
        unique_passengers: +totals.unique_passengers||0,
      },
      dailyRevenue,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════ SETTINGS ═══════════════════════════
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT skey, svalue FROM admin_settings');
    const obj = {};
    rows.forEach(r => { obj[r.skey] = r.svalue; });
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = req.body.settings || {};
    for (const [k, v] of Object.entries(settings)) {
      await db.query('INSERT INTO admin_settings (skey, svalue) VALUES (?, ?) ON DUPLICATE KEY UPDATE svalue = ?',
        [k, String(v), String(v)]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════ GENERIC CRUD FACTORY ═══════════════════════
function crud(path, table, columns) {
  // LIST
  router.get(path, async (req, res) => {
    try { const [rows] = await db.query(`SELECT * FROM ${table} ORDER BY id DESC`); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });
  // CREATE
  router.post(path, async (req, res) => {
    try {
      const cols = columns.filter(c => req.body[c] !== undefined);
      if (!cols.length) return res.status(400).json({ error: 'No fields provided' });
      const vals = cols.map(c => req.body[c]);
      const ph = cols.map(() => '?').join(',');
      const [r] = await db.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph})`, vals);
      res.json({ ok: true, id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // UPDATE
  router.put(`${path}/:id`, async (req, res) => {
    try {
      const cols = columns.filter(c => req.body[c] !== undefined);
      if (!cols.length) return res.json({ ok: true });
      const set = cols.map(c => `${c} = ?`).join(',');
      const vals = cols.map(c => req.body[c]);
      vals.push(req.params.id);
      await db.query(`UPDATE ${table} SET ${set} WHERE id = ?`, vals);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // DELETE
  router.delete(`${path}/:id`, async (req, res) => {
    try { await db.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });
}

crud('/stops',           'admin_stops',           ['name','lat','lng','city','is_active']);
crud('/routes',          'admin_routes',          ['name','from_stop','to_stop','is_active']);
crud('/vehicles',        'admin_vehicles',        ['name','plate','capacity','is_active']);
crud('/fare',            'admin_fares',           ['name','base_fare','per_km','is_active']);
crud('/shuttle-trips',   'admin_shuttle_trips',   ['route','trip_time','trip_date','status']);
crud('/shuttle-pass',    'admin_shuttle_pass',    ['name','price','days','is_active']);
crud('/holidays',        'admin_holidays',        ['name','date','surge_multiplier']);
crud('/vehicle-types',   'admin_vehicle_types',   ['name','capacity','base_fare','per_km_rate','is_active']);
crud('/cities',          'admin_cities',          ['name','is_active']);
crud('/homescreen',      'admin_homescreen',      ['title','type','city','image','sort_order','is_active']);
crud('/driver-documents','admin_doc_types',       ['name','required']);

// Suggested routes (custom: status update only + delete + list)
router.get('/suggested-routes', async (req, res) => {
  try { const [rows] = await db.query('SELECT * FROM admin_suggested_routes ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/suggested-routes/:id', async (req, res) => {
  try { await db.query('UPDATE admin_suggested_routes SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/suggested-routes/:id', async (req, res) => {
  try { await db.query('DELETE FROM admin_suggested_routes WHERE id = ?', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Cancellation (policies + reasons)
router.get('/cancellation/policies', async (req, res) => {
  try { const [rows] = await db.query('SELECT * FROM admin_cancel_policies ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/cancellation/reasons', async (req, res) => {
  try { const [rows] = await db.query('SELECT * FROM admin_cancel_reasons ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/cancellation/reasons', async (req, res) => {
  try { const [r] = await db.query('INSERT INTO admin_cancel_reasons (reason, role) VALUES (?, ?)', [req.body.reason, req.body.role || 'passenger']); res.json({ ok: true, id: r.insertId }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/cancellation/reasons/:id', async (req, res) => {
  try { await db.query('DELETE FROM admin_cancel_reasons WHERE id = ?', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Promotions — backed by a dedicated table (created on demand here)
db.query(`CREATE TABLE IF NOT EXISTS admin_promotions (
  id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) NOT NULL, discount_type VARCHAR(20) DEFAULT 'percent',
  discount_value DECIMAL(10,2) DEFAULT 0, min_fare DECIMAL(10,2) DEFAULT 0, max_uses INT DEFAULT 0,
  used_count INT DEFAULT 0, valid_from DATE DEFAULT NULL, valid_until DATE DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`).catch(()=>{});
crud('/promotions', 'admin_promotions', ['code','discount_type','discount_value','min_fare','max_uses','valid_from','valid_until','is_active']);

// Push notifications (list + send)
router.get('/pushes', async (req, res) => {
  try { const [rows] = await db.query('SELECT * FROM admin_pushes ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/pushes', async (req, res) => {
  try {
    const { title, body, audience } = req.body;
    const aud = audience || 'all';
    const [r] = await db.query('INSERT INTO admin_pushes (title, body, audience) VALUES (?, ?, ?)',
      [title || '', body || '', aud]);

    // Actually deliver the push to devices.
    const { sendPushToAll, sendPushToRole } = require('../push');
    let result;
    if (aud === 'all' || aud === 'everyone') {
      result = await sendPushToAll(title || 'Waslney', body || '');
    } else {
      result = await sendPushToRole(aud, title || 'Waslney', body || ''); // 'passenger' | 'driver'
    }
    res.json({ ok: true, id: r.insertId, delivered: result.sent || 0, failed: result.failed || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
