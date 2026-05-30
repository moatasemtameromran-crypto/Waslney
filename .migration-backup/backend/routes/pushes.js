// backend/routes/pushes.js — push notification management
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/pushes — list sent pushes
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [rows] = await db.query(`
      SELECT p.*, u.name AS sent_by_name
      FROM push_notifications p
      LEFT JOIN users u ON u.id = p.sent_by
      ${where}
      ORDER BY p.created_at DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/pushes/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM push_notifications WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Push not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pushes — create & send push notification
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { city_id, title, message, image_url, user_type = 'all', country_codes = [] } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });
  try {
    const countryCodes = Array.isArray(country_codes) ? country_codes.join(',') : country_codes;
    const [r] = await db.query(
      `INSERT INTO push_notifications (city_id, title, message, image_url, user_type, country_codes, sent_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [city_id || null, title, message, image_url || null, user_type, countryCodes || null, req.user.id]
    );

    // Insert into user notifications for targeted delivery
    // user_type: 'all', 'customer', 'driver'
    let roleFilter = '';
    if (user_type === 'customer') roleFilter = "AND role = 'passenger'";
    else if (user_type === 'driver') roleFilter = "AND role = 'driver'";

    const [users] = await db.query(
      `SELECT id FROM users WHERE account_status = 'active' ${roleFilter}`
    );
    if (users.length) {
      const vals = users.map(u => `(${u.id}, ${db.escape(message)}, 0, NOW())`).join(',');
      await db.query(
        `INSERT INTO notifications (user_id, message, is_read, created_at) VALUES ${vals}`
      );
    }

    const [[row]] = await db.query('SELECT * FROM push_notifications WHERE id = ?', [r.insertId]);
    res.status(201).json({ ...row, recipients: users.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/pushes/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM push_notifications WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
