// backend/routes/promotions.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/promotions
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [rows] = await db.query(`SELECT * FROM promotions ${where} ORDER BY id DESC`, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/promotions/:id
router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM promotions WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Promotion not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/promotions
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const {
    city_id, title, promo_type, promo_code, discount_value,
    discount_percentage, max_discount, start_date, end_date,
    max_per_user, total_limit, status = 'active'
  } = req.body;
  if (!title || !promo_code) return res.status(400).json({ error: 'title and promo_code required' });
  try {
    const [ex] = await db.query('SELECT id FROM promotions WHERE promo_code = ?', [promo_code]);
    if (ex.length) return res.status(409).json({ error: 'Promo code already exists' });
    const [r] = await db.query(
      `INSERT INTO promotions
        (city_id, title, promo_type, promo_code, discount_value, discount_percentage,
         max_discount, start_date, end_date, max_per_user, total_limit, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [city_id || null, title, promo_type || 'flat', promo_code.toUpperCase(),
       discount_value || 0, discount_percentage || 0, max_discount || null,
       start_date || null, end_date || null, max_per_user || null, total_limit || null, status]
    );
    const [[row]] = await db.query('SELECT * FROM promotions WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/promotions/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const {
    title, promo_type, promo_code, discount_value, discount_percentage,
    max_discount, start_date, end_date, max_per_user, total_limit, status
  } = req.body;
  try {
    await db.query(
      `UPDATE promotions SET
        title               = COALESCE(?, title),
        promo_type          = COALESCE(?, promo_type),
        promo_code          = COALESCE(?, promo_code),
        discount_value      = COALESCE(?, discount_value),
        discount_percentage = COALESCE(?, discount_percentage),
        max_discount        = COALESCE(?, max_discount),
        start_date          = COALESCE(?, start_date),
        end_date            = COALESCE(?, end_date),
        max_per_user        = COALESCE(?, max_per_user),
        total_limit         = COALESCE(?, total_limit),
        status              = COALESCE(?, status)
      WHERE id = ?`,
      [title, promo_type, promo_code ? promo_code.toUpperCase() : null,
       discount_value, discount_percentage, max_discount,
       start_date, end_date, max_per_user, total_limit, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM promotions WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/promotions/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM promotions WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/promotions/validate — validate a promo code (passenger-facing)
router.post('/validate', requireAuth, async (req, res) => {
  const { promo_code, amount } = req.body;
  if (!promo_code) return res.status(400).json({ error: 'promo_code required' });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [[promo]] = await db.query(
      `SELECT * FROM promotions WHERE promo_code = ? AND status = 'active'
       AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)`,
      [promo_code.toUpperCase(), today, today]
    );
    if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' });

    if (promo.max_per_user) {
      const [[{ used }]] = await db.query(
        `SELECT COUNT(*) AS used FROM promo_usages WHERE promo_id = ? AND user_id = ?`,
        [promo.id, req.user.id]
      );
      if (parseInt(used) >= promo.max_per_user) return res.status(400).json({ error: 'Promo usage limit reached' });
    }

    let discount = 0;
    if (promo.promo_type === 'percentage' && amount) {
      discount = (amount * promo.discount_percentage) / 100;
      if (promo.max_discount) discount = Math.min(discount, promo.max_discount);
    } else {
      discount = promo.discount_value;
    }

    res.json({ valid: true, discount: Math.round(discount), promo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
