// backend/routes/roles.js — RBAC roles and permissions
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/roles
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM roles ORDER BY id DESC');
    for (const row of rows) {
      const [perms] = await db.query('SELECT tab FROM role_permissions WHERE role_id = ?', [row.id]);
      row.permissions = perms.map(p => p.tab);
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/roles
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { name, permissions = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [r] = await db.query('INSERT INTO roles (name) VALUES (?)', [name]);
    const roleId = r.insertId;
    for (const tab of permissions) {
      await db.query('INSERT INTO role_permissions (role_id, tab) VALUES (?, ?)', [roleId, tab]);
    }
    const [[row]] = await db.query('SELECT * FROM roles WHERE id = ?', [roleId]);
    row.permissions = permissions;
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/roles/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, permissions } = req.body;
  try {
    if (name) await db.query('UPDATE roles SET name = ? WHERE id = ?', [name, req.params.id]);
    if (permissions) {
      await db.query('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
      for (const tab of permissions) {
        await db.query('INSERT INTO role_permissions (role_id, tab) VALUES (?, ?)', [req.params.id, tab]);
      }
    }
    const [[row]] = await db.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    const [perms] = await db.query('SELECT tab FROM role_permissions WHERE role_id = ?', [req.params.id]);
    row.permissions = perms.map(p => p.tab);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/roles/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
    await db.query('DELETE FROM roles WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
