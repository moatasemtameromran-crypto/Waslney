// backend/routes/managers.js — admin manager user management
const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuth, requireRole } = require('../auth');

const JWT_SECRET = process.env.JWT_SECRET || 'waslney_secret_change_me';
const adminOnly = requireRole('admin');

// GET /api/managers
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? "WHERE m.status = ?" : '';
    const params = status ? [status] : [];
    const [rows] = await db.query(`
      SELECT m.id, m.name, m.email, m.status, m.role_id,
             r.name AS role_name, m.created_at
      FROM admin_managers m
      LEFT JOIN roles r ON r.id = m.role_id
      ${where}
      ORDER BY m.id DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/managers — add new manager
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { name, email, password, role_id, status = 'active' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  try {
    const [ex] = await db.query('SELECT id FROM admin_managers WHERE email = ?', [email]);
    if (ex.length) return res.status(409).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO admin_managers (name, email, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, role_id || null, status]
    );
    const [[row]] = await db.query(
      'SELECT id, name, email, status, role_id, created_at FROM admin_managers WHERE id = ?',
      [r.insertId]
    );
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/managers/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, email, role_id, status } = req.body;
  try {
    await db.query(
      `UPDATE admin_managers SET
        name    = COALESCE(?, name),
        email   = COALESCE(?, email),
        role_id = COALESCE(?, role_id),
        status  = COALESCE(?, status)
      WHERE id = ?`,
      [name, email, role_id, status, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT id, name, email, status, role_id, created_at FROM admin_managers WHERE id = ?',
      [req.params.id]
    );
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/managers/:id/reset-password
router.post('/:id/reset-password', requireAuth, adminOnly, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE admin_managers SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/managers/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM admin_managers WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/managers/login — manager login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const [[manager]] = await db.query(
      "SELECT * FROM admin_managers WHERE email = ? AND status = 'active'",
      [email]
    );
    if (!manager) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, manager.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: manager.id, email: manager.email, role: 'admin', manager_role_id: manager.role_id },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, manager: { id: manager.id, name: manager.name, email: manager.email, role_id: manager.role_id } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
