// backend/routes/driver-doc-types.js — configure required driver document types
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const adminOnly = requireRole('admin');

// GET /api/driver-doc-types
router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const { city_id } = req.query;
    const where = city_id ? 'WHERE city_id = ?' : '';
    const params = city_id ? [city_id] : [];
    const [rows] = await db.query(`SELECT * FROM driver_doc_types ${where} ORDER BY id DESC`, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/driver-doc-types
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const {
    city_id, doc_name, doc_type, num_images = 1,
    gallery_restricted = 0, doc_required = 1,
    doc_number_required = 0, expiry_required = 0,
    expired_action = 'none', status = 'active'
  } = req.body;
  if (!doc_name) return res.status(400).json({ error: 'doc_name required' });
  try {
    const [r] = await db.query(
      `INSERT INTO driver_doc_types
        (city_id, doc_name, doc_type, num_images, gallery_restricted, doc_required,
         doc_number_required, expiry_required, expired_action, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [city_id || null, doc_name, doc_type || 'image', num_images,
       gallery_restricted ? 1 : 0, doc_required ? 1 : 0,
       doc_number_required ? 1 : 0, expiry_required ? 1 : 0, expired_action, status]
    );
    const [[row]] = await db.query('SELECT * FROM driver_doc_types WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/driver-doc-types/:id
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const {
    doc_name, doc_type, num_images, gallery_restricted,
    doc_required, doc_number_required, expiry_required, expired_action, status
  } = req.body;
  try {
    await db.query(
      `UPDATE driver_doc_types SET
        doc_name            = COALESCE(?, doc_name),
        doc_type            = COALESCE(?, doc_type),
        num_images          = COALESCE(?, num_images),
        gallery_restricted  = COALESCE(?, gallery_restricted),
        doc_required        = COALESCE(?, doc_required),
        doc_number_required = COALESCE(?, doc_number_required),
        expiry_required     = COALESCE(?, expiry_required),
        expired_action      = COALESCE(?, expired_action),
        status              = COALESCE(?, status)
      WHERE id = ?`,
      [doc_name, doc_type, num_images,
       gallery_restricted !== undefined ? (gallery_restricted ? 1 : 0) : null,
       doc_required !== undefined ? (doc_required ? 1 : 0) : null,
       doc_number_required !== undefined ? (doc_number_required ? 1 : 0) : null,
       expiry_required !== undefined ? (expiry_required ? 1 : 0) : null,
       expired_action, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM driver_doc_types WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/driver-doc-types/:id
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM driver_doc_types WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
