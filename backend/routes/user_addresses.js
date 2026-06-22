const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../auth');

// Personal saved addresses (Home / Work / custom) per user. Distinct from the
// admin-managed global `saved_points`. Self-migrating so it works on any DB.
let ready = false;
async function ensureTable() {
  if (ready) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      label      VARCHAR(60) NOT NULL,
      kind       ENUM('home','work','other') NOT NULL DEFAULT 'other',
      address    VARCHAR(300) DEFAULT NULL,
      lat        DECIMAL(10,7) NOT NULL,
      lng        DECIMAL(10,7) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  ready = true;
}

// GET /api/addresses — the logged-in user's saved addresses
router.get('/', requireAuth, async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await db.query(
      `SELECT id, label, kind, address, lat, lng, created_at
       FROM user_addresses WHERE user_id=?
       ORDER BY FIELD(kind,'home','work','other'), created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('addresses get:', err.message);
    res.json([]);
  }
});

// POST /api/addresses — add/replace. Home/Work are unique per user (upsert).
router.post('/', requireAuth, async (req, res) => {
  const { label, kind = 'other', address, lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  const finalLabel = (label || (kind === 'home' ? 'Home' : kind === 'work' ? 'Work' : 'Saved')).trim();
  try {
    await ensureTable();
    // For home/work, replace the existing one so a user has a single Home/Work.
    if (kind === 'home' || kind === 'work') {
      await db.query('DELETE FROM user_addresses WHERE user_id=? AND kind=?', [req.user.id, kind]);
    }
    const [r] = await db.query(
      'INSERT INTO user_addresses (user_id, label, kind, address, lat, lng) VALUES (?,?,?,?,?,?)',
      [req.user.id, finalLabel, kind, address || null, parseFloat(lat), parseFloat(lng)]
    );
    const [rows] = await db.query('SELECT id,label,kind,address,lat,lng FROM user_addresses WHERE id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('addresses post:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/addresses/:id — only own rows
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await ensureTable();
    await db.query('DELETE FROM user_addresses WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('addresses delete:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
