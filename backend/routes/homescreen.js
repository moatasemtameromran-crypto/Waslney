const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../auth');

// Make sure the content columns exist. The admin panel writes to this same
// table; these columns let admins attach real content (title/image/link) to a
// home-screen card. MySQL has no "ADD COLUMN IF NOT EXISTS", so we check first.
let migrated = false;
async function ensureColumns() {
  if (migrated) return;
  try {
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'homescreen_settings'"
    );
    const have = new Set(cols.map(c => c.COLUMN_NAME));
    const wanted = {
      title:     "VARCHAR(200) DEFAULT NULL",
      subtitle:  "VARCHAR(400) DEFAULT NULL",
      image_url: "VARCHAR(1000) DEFAULT NULL",
      link_url:  "VARCHAR(1000) DEFAULT NULL",
    };
    for (const [name, def] of Object.entries(wanted)) {
      if (!have.has(name)) {
        await db.query(`ALTER TABLE homescreen_settings ADD COLUMN ${name} ${def}`).catch(() => {});
      }
    }
    migrated = true;
  } catch (_) {}
}

// GET /api/homescreen  — active cards for the app home screen.
// Optional query: ?user_type=Customer|Driver  &city=Cairo
router.get('/', requireAuth, async (req, res) => {
  try {
    await ensureColumns();
    const userType = req.query.user_type || (req.user.role === 'driver' ? 'Driver' : 'Customer');
    const [rows] = await db.query(
      `SELECT id, category, title, subtitle, image_url, link_url, display_order, user_type, city
       FROM homescreen_settings
       WHERE active = 1 AND user_type = ?
       ORDER BY display_order ASC, id ASC`,
      [userType]
    );
    res.json(rows);
  } catch (err) {
    console.error('homescreen error:', err.message);
    res.json([]); // never break the home screen
  }
});

module.exports = router;
