// backend/routes/suggested-routes.js — user-suggested routes
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/suggested-routes
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE sr.city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [rows] = await db.query(`
      SELECT sr.*,
             u.name AS user_name, u.phone AS user_phone
      FROM suggested_routes sr
      LEFT JOIN users u ON u.id = sr.user_id
      ${where}
      ORDER BY sr.created_at DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/suggested-routes — submitted by passenger app
router.post('/', requireAuth, async (req, res) => {
  const { city_id, pickup_address, dropoff_address, shift_description } = req.body;
  if (!pickup_address || !dropoff_address) return res.status(400).json({ error: 'pickup and dropoff addresses required' });
  try {
    const [r] = await db.query(
      `INSERT INTO suggested_routes (user_id, city_id, pickup_address, dropoff_address, shift_description)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, city_id || null, pickup_address, dropoff_address, shift_description || null]
    );
    const [[row]] = await db.query('SELECT * FROM suggested_routes WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/suggested-routes/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM suggested_routes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
