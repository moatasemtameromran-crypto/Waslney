// Firebase Cloud Messaging (FCM) push sender.
// Safe to use even when Firebase isn't configured — it simply no-ops so the
// rest of the app keeps working. Configure by setting the Railway env var
// FIREBASE_SERVICE_ACCOUNT_JSON (raw service-account JSON, or base64 of it).
const db = require('./db');

let messaging = null;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.log('ℹ️  Push disabled (FIREBASE_SERVICE_ACCOUNT_JSON not set)');
    return;
  }
  try {
    const admin = require('firebase-admin');
    let creds = raw.trim();
    if (!creds.startsWith('{')) {
      creds = Buffer.from(creds, 'base64').toString('utf8'); // allow base64
    }
    const serviceAccount = JSON.parse(creds);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    console.log('✅  Firebase push initialized');
  } catch (e) {
    console.error('❌  Firebase push init failed:', e.message);
  }
}

async function sendToTokens(tokens, title, body, data = {}) {
  init();
  if (!messaging || !tokens || !tokens.length) return { sent: 0 };

  const message = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'waslney_default' },
    },
  };

  try {
    const res = await messaging.sendEachForMulticast(message);
    // Drop tokens FCM reports as dead so the table stays clean.
    res.responses.forEach((r, i) => {
      if (!r.success && r.error) {
        const code = String(r.error.code || '');
        if (code.includes('registration-token-not-registered') ||
            code.includes('invalid-argument')) {
          db.query('DELETE FROM device_tokens WHERE token=?', [tokens[i]]).catch(() => {});
        }
      }
    });
    return { sent: res.successCount, failed: res.failureCount };
  } catch (e) {
    console.error('push send error:', e.message);
    return { sent: 0, error: e.message };
  }
}

async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const [rows] = await db.query('SELECT token FROM device_tokens WHERE user_id=?', [userId]);
    const tokens = rows.map(r => r.token);
    if (!tokens.length) return { sent: 0 };
    return await sendToTokens(tokens, title, body, data);
  } catch (e) {
    console.error('sendPushToUser error:', e.message);
    return { sent: 0, error: e.message };
  }
}

async function sendPushToAll(title, body, data = {}) {
  try {
    const [rows] = await db.query('SELECT token FROM device_tokens');
    const tokens = rows.map(r => r.token);
    if (!tokens.length) return { sent: 0 };
    let sent = 0, failed = 0;
    for (let i = 0; i < tokens.length; i += 500) { // FCM multicast cap = 500
      const r = await sendToTokens(tokens.slice(i, i + 500), title, body, data);
      sent += r.sent || 0; failed += r.failed || 0;
    }
    return { sent, failed };
  } catch (e) {
    console.error('sendPushToAll error:', e.message);
    return { sent: 0, error: e.message };
  }
}

async function sendPushToRole(role, title, body, data = {}) {
  try {
    const [rows] = await db.query(
      'SELECT dt.token FROM device_tokens dt JOIN users u ON u.id = dt.user_id WHERE u.role = ?',
      [role]
    );
    const tokens = rows.map(r => r.token);
    if (!tokens.length) return { sent: 0 };
    let sent = 0, failed = 0;
    for (let i = 0; i < tokens.length; i += 500) {
      const r = await sendToTokens(tokens.slice(i, i + 500), title, body, data);
      sent += r.sent || 0; failed += r.failed || 0;
    }
    return { sent, failed };
  } catch (e) {
    console.error('sendPushToRole error:', e.message);
    return { sent: 0, error: e.message };
  }
}

module.exports = { sendPushToUser, sendPushToAll, sendPushToRole, sendToTokens };
