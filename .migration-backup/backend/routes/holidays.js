// backend/routes/holidays.js
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/holidays
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { year, month, city_id } = req.query;
    const conditions = ['1=1'];
    const params = [];
    if (year) { conditions.push('YEAR(holiday_date) = ?'); params.push(year); }
    if (month) { conditions.push('MONTH(holiday_date) = ?'); params.push(month); }
    if (city_id) { conditions.push('city_id = ?'); params.push(city_id); }
    const [rows] = await db.query(
      `SELECT * FROM holidays WHERE ${conditions.join(' AND ')} ORDER BY holiday_date ASC`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/holidays
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { city_id, holiday_date, name } = req.body;
  if (!holiday_date) return res.status(400).json({ error: 'holiday_date required' });
  try {
    const [existing] = await db.query(
      'SELECT id FROM holidays WHERE holiday_date = ? AND (city_id = ? OR city_id IS NULL)',
      [holiday_date, city_id || null]
    );
    if (existing.length) return res.status(409).json({ error: 'Holiday already exists for this date' });
    const [r] = await db.query(
      'INSERT INTO holidays (city_id, holiday_date, name) VALUES (?, ?, ?)',
      [city_id || null, holiday_date, name || null]
    );
    const [[row]] = await db.query('SELECT * FROM holidays WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/holidays/bulk — mark multiple days as holidays
router.post('/bulk', requireAuth, adminOnly, async (req, res) => {
  const { city_id, dates, name } = req.body;
  if (!dates || !Array.isArray(dates)) return res.status(400).json({ error: 'dates array required' });
  try {
    let added = 0;
    for (const date of dates) {
      const [ex] = await db.query(
        'SELECT id FROM holidays WHERE holiday_date = ? AND (city_id = ? OR city_id IS NULL)',
        [date, city_id || null]
      );
      if (!ex.length) {
        await db.query('INSERT INTO holidays (city_id, holiday_date, name) VALUES (?, ?, ?)',
          [city_id || null, date, name || null]);
        added++;
      }
    }
    res.json({ ok: true, added });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/holidays/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM holidays WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/holidays/date/:date
router.delete('/date/:date', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM holidays WHERE holiday_date = ?', [req.params.date]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
