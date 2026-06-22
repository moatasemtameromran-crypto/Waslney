const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../auth');

// Refer & Earn — discount vouchers (no wallet/cash). Self-migrating.
const REFERRAL_REWARD_EGP = 25; // both referrer and referee get this off a future trip

let ready = false;
async function columnExists(table, col) {
  const [r] = await db.query(
    "SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
    [table, col]
  );
  return r[0].n > 0;
}
async function ensure() {
  if (ready) return;
  if (!(await columnExists('users', 'referral_code')))
    await db.query("ALTER TABLE users ADD COLUMN referral_code VARCHAR(12) DEFAULT NULL").catch(() => {});
  if (!(await columnExists('bookings', 'discount_amount')))
    await db.query("ALTER TABLE bookings ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0").catch(() => {});
  if (!(await columnExists('bookings', 'reward_id')))
    await db.query("ALTER TABLE bookings ADD COLUMN reward_id INT DEFAULT NULL").catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      referrer_id INT NOT NULL,
      referee_id  INT NOT NULL UNIQUE,
      code        VARCHAR(12) NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS rewards (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      kind        VARCHAR(30) NOT NULL DEFAULT 'referral',
      amount_egp  DECIMAL(10,2) NOT NULL,
      status      ENUM('active','used','expired') NOT NULL DEFAULT 'active',
      source      VARCHAR(120) DEFAULT NULL,
      booking_id  INT DEFAULT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at  DATE DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  ready = true;
}

function genCode(userId) {
  const base = Number(userId).toString(36).toUpperCase().padStart(3, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return ('WSL' + base + rand).slice(0, 12);
}

// Ensure a user has a referral code, return it.
async function ensureCode(userId) {
  await ensure();
  const [[u]] = await db.query('SELECT referral_code FROM users WHERE id=?', [userId]);
  if (u && u.referral_code) return u.referral_code;
  for (let i = 0; i < 6; i++) {
    const code = genCode(userId);
    try {
      await db.query('UPDATE users SET referral_code=? WHERE id=?', [code, userId]);
      const [[chk]] = await db.query('SELECT COUNT(*) n FROM users WHERE referral_code=?', [code]);
      if (chk.n === 1) return code;
    } catch { /* retry */ }
  }
  return null;
}

// Called from register: link referee to referrer by code, grant both a voucher.
async function applyReferralOnSignup(refereeId, code) {
  if (!code) return;
  await ensure();
  const [[referrer]] = await db.query('SELECT id FROM users WHERE referral_code=?', [String(code).trim().toUpperCase()]);
  if (!referrer || referrer.id === refereeId) return;
  const [existing] = await db.query('SELECT id FROM referrals WHERE referee_id=?', [refereeId]);
  if (existing.length) return;
  await db.query('INSERT INTO referrals (referrer_id, referee_id, code) VALUES (?,?,?)',
    [referrer.id, refereeId, String(code).trim().toUpperCase()]);
  await db.query('INSERT INTO rewards (user_id, kind, amount_egp, source) VALUES (?,?,?,?)',
    [referrer.id, 'referral', REFERRAL_REWARD_EGP, 'Friend joined with your code']);
  await db.query('INSERT INTO rewards (user_id, kind, amount_egp, source) VALUES (?,?,?,?)',
    [refereeId, 'referral', REFERRAL_REWARD_EGP, 'Welcome bonus (referral)']);
}

// Apply the best active voucher to a booking total. Returns discount applied.
async function applyBestReward(userId, total, bookingId) {
  await ensure();
  const [rows] = await db.query(
    "SELECT id, amount_egp FROM rewards WHERE user_id=? AND status='active' AND (expires_at IS NULL OR expires_at>=CURDATE()) ORDER BY amount_egp DESC LIMIT 1",
    [userId]
  );
  if (!rows.length) return { discount: 0, rewardId: null };
  const reward = rows[0];
  const discount = Math.min(Number(reward.amount_egp), Number(total));
  if (discount <= 0) return { discount: 0, rewardId: null };
  await db.query("UPDATE rewards SET status='used', booking_id=? WHERE id=?", [bookingId, reward.id]);
  return { discount, rewardId: reward.id };
}

// GET /api/referrals/me — my code + stats + vouchers
router.get('/me', requireAuth, async (req, res) => {
  try {
    const code = await ensureCode(req.user.id);
    const [[{ referred }]] = await db.query('SELECT COUNT(*) referred FROM referrals WHERE referrer_id=?', [req.user.id]);
    const [rewards] = await db.query(
      "SELECT id, kind, amount_egp, status, source, created_at, expires_at FROM rewards WHERE user_id=? ORDER BY (status='active') DESC, created_at DESC",
      [req.user.id]
    );
    const active = rewards.filter(r => r.status === 'active');
    const totalActive = active.reduce((s, r) => s + Number(r.amount_egp), 0);
    res.json({ code, referred_count: referred, reward_per_referral: REFERRAL_REWARD_EGP, active_discount_egp: totalActive, rewards });
  } catch (err) { console.error('referrals me:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/referrals/rewards — active vouchers only (Promotions screen)
router.get('/rewards', requireAuth, async (req, res) => {
  try {
    await ensure();
    const [rows] = await db.query(
      "SELECT id, kind, amount_egp, source, created_at, expires_at FROM rewards WHERE user_id=? AND status='active' AND (expires_at IS NULL OR expires_at>=CURDATE()) ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { console.error('rewards:', err.message); res.json([]); }
});

// POST /api/referrals/redeem — apply a code after signup (one-time)
router.post('/redeem', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  try {
    await ensure();
    const [existing] = await db.query('SELECT id FROM referrals WHERE referee_id=?', [req.user.id]);
    if (existing.length) return res.status(409).json({ error: 'You already used a referral code' });
    const [[me]] = await db.query('SELECT referral_code FROM users WHERE id=?', [req.user.id]);
    if (me && me.referral_code && String(code).trim().toUpperCase() === me.referral_code)
      return res.status(400).json({ error: 'You cannot use your own code' });
    await applyReferralOnSignup(req.user.id, code);
    const [chk] = await db.query('SELECT id FROM referrals WHERE referee_id=?', [req.user.id]);
    if (!chk.length) return res.status(404).json({ error: 'Invalid referral code' });
    res.json({ ok: true, reward_egp: REFERRAL_REWARD_EGP });
  } catch (err) { console.error('redeem:', err.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
module.exports.applyReferralOnSignup = applyReferralOnSignup;
module.exports.applyBestReward = applyBestReward;
module.exports.ensureCode = ensureCode;
