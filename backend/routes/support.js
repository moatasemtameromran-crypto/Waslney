const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requireRole } = require('../auth');

// Help & Support tickets + passenger route suggestions. Self-migrating.
let ready = false;
async function ensureTables() {
  if (ready) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      subject    VARCHAR(160) NOT NULL,
      message    TEXT NOT NULL,
      status     ENUM('open','resolved') NOT NULL DEFAULT 'open',
      admin_reply TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS route_suggestions (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      from_label  VARCHAR(160) NOT NULL,
      to_label    VARCHAR(160) NOT NULL,
      note        VARCHAR(300) DEFAULT NULL,
      status      ENUM('new','reviewed') NOT NULL DEFAULT 'new',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  ready = true;
}

const FAQ = [
  { q: 'How do I book a trip?', a: 'On the Home tab, set your destination, tap "Find trips near me", pick a trip and confirm your seats.' },
  { q: 'How do I pay?', a: 'Fares are collected by the driver. Your receipt is available from each booking under "View receipt".' },
  { q: 'Can I cancel a booking?', a: 'Yes. Open the booking from the Trips tab and tap "Cancel booking". Cancel early so the seat can be reused.' },
  { q: 'What is Smart Pool?', a: 'Smart Pool matches you with nearby passengers heading the same way when no direct trip exists, then arranges a shared ride.' },
  { q: 'How do saved addresses work?', a: 'Save Home, Work and favourite places so you can fill your destination with one tap on the search screen.' },
  { q: 'I was not picked up. What now?', a: 'Open a support ticket from Help & Support with your trip details and our team will follow up.' },
];

// GET /api/support/faq — static FAQ (public)
router.get('/faq', (req, res) => res.json(FAQ));

// POST /api/support/ticket — open a support ticket
router.post('/ticket', requireAuth, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });
  try {
    await ensureTables();
    const [r] = await db.query(
      'INSERT INTO support_tickets (user_id, subject, message) VALUES (?,?,?)',
      [req.user.id, String(subject).slice(0, 160), String(message).slice(0, 4000)]
    );
    res.status(201).json({ id: r.insertId, status: 'open' });
  } catch (err) { console.error('support ticket:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/support/tickets — my tickets
router.get('/tickets', requireAuth, async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      'SELECT id, subject, message, status, admin_reply, created_at FROM support_tickets WHERE user_id=? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { console.error('support list:', err.message); res.json([]); }
});

// POST /api/support/suggest-route — suggest a new route
router.post('/suggest-route', requireAuth, async (req, res) => {
  const { from_label, to_label, note } = req.body;
  if (!from_label || !to_label) return res.status(400).json({ error: 'From and to required' });
  try {
    await ensureTables();
    const [r] = await db.query(
      'INSERT INTO route_suggestions (user_id, from_label, to_label, note) VALUES (?,?,?,?)',
      [req.user.id, String(from_label).slice(0, 160), String(to_label).slice(0, 160), note ? String(note).slice(0, 300) : null]
    );
    res.status(201).json({ id: r.insertId, status: 'new' });
  } catch (err) { console.error('suggest route:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// ── Admin views ───────────────────────────────────────────
router.get('/admin/tickets', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(`
      SELECT st.*, u.name AS user_name, u.phone AS user_phone
      FROM support_tickets st JOIN users u ON u.id = st.user_id
      ORDER BY st.status='open' DESC, st.created_at DESC`);
    res.json(rows);
  } catch (err) { console.error(err); res.json([]); }
});

router.put('/admin/tickets/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status, admin_reply } = req.body;
  try {
    await ensureTables();
    await db.query('UPDATE support_tickets SET status=COALESCE(?,status), admin_reply=COALESCE(?,admin_reply) WHERE id=?',
      [status || null, admin_reply || null, req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/admin/route-suggestions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(`
      SELECT rs.*, u.name AS user_name, u.phone AS user_phone
      FROM route_suggestions rs JOIN users u ON u.id = rs.user_id
      ORDER BY rs.status='new' DESC, rs.created_at DESC`);
    res.json(rows);
  } catch (err) { console.error(err); res.json([]); }
});

module.exports = router;
