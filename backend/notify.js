// Central notification helper: writes the in-app notification row AND sends a
// push to the user's devices. Never throws — notification failures must not
// break the action that triggered them.
const db = require('./db');
const { sendPushToUser } = require('./push');

async function notifyUser(userId, message, opts = {}) {
  if (!userId) return;
  try {
    await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [userId, message]);
  } catch (e) {
    console.error('notifyUser insert error:', e.message);
  }
  try {
    await sendPushToUser(userId, opts.title || 'Waslney', message, opts.data || {});
  } catch (e) {
    console.error('notifyUser push error:', e.message);
  }
}

module.exports = { notifyUser };
