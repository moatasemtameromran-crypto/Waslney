const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { sendPushToAll, sendPushToRole } = require('../push');

// POST /api/notifications/register-device  { token, platform }
// Saves (or moves) an FCM device token to the logged-in user.
router.post('/register-device', requireAuth, async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    await db.query(
      `INSERT INTO device_tokens (user_id, token, platform) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform)`,
      [req.user.id, token, platform || 'android']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('register-device error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notifications/unregister-device  { token }
router.post('/unregister-device', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    await db.query('DELETE FROM device_tokens WHERE token = ?', [token]);
    res.json({ ok: true });
  } catch (err) {
    console.error('unregister-device error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/notifications/mine
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notifications/broadcast  { message, title, audience }
// Admin-only. Composes a custom notification: stores an in-app row for every
// targeted user AND sends a push to their phones. audience = all|passenger|driver.
router.post('/broadcast', requireAuth, requireRole('admin'), async (req, res) => {
  const message  = (req.body.message  || '').trim();
  const title    = (req.body.title    || 'Waslney').trim();
  const audience = (req.body.audience || 'all').trim();
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!['all', 'passenger', 'driver'].includes(audience))
    return res.status(400).json({ error: 'invalid audience' });
  try {
    // Find recipients
    let sql = 'SELECT id FROM users';
    const params = [];
    if (audience !== 'all') { sql += ' WHERE role = ?'; params.push(audience); }
    const [users] = await db.query(sql, params);

    // Store the in-app notification for each recipient (bulk insert)
    if (users.length) {
      const values = users.map(u => [u.id, message]);
      await db.query('INSERT INTO notifications (user_id, message) VALUES ?', [values]);
    }

    // Send the push to phones
    const push = audience === 'all'
      ? await sendPushToAll(title, message, { type: 'broadcast' })
      : await sendPushToRole(audience, title, message, { type: 'broadcast' });

    res.json({ ok: true, recipients: users.length, push });
  } catch (err) {
    console.error('broadcast error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
