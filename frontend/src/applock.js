// Lightweight client-side app lock (PIN). Convenience privacy lock, not a
// cryptographic security boundary. PIN is stored as a SHA-256 hash in localStorage.
const KEY_HASH = 'waslney_pin_hash';
const KEY_ON   = 'waslney_lock_on';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function lockEnabled() {
  return localStorage.getItem(KEY_ON) === '1' && !!localStorage.getItem(KEY_HASH);
}

export function hasPin() {
  return !!localStorage.getItem(KEY_HASH);
}

export async function setupPin(pin) {
  const hash = await sha256(String(pin));
  localStorage.setItem(KEY_HASH, hash);
  localStorage.setItem(KEY_ON, '1');
  window.dispatchEvent(new Event('applock:changed'));
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(KEY_HASH);
  if (!stored) return false;
  return (await sha256(String(pin))) === stored;
}

export async function disableLock(pin) {
  if (!(await verifyPin(pin))) return false;
  localStorage.removeItem(KEY_HASH);
  localStorage.removeItem(KEY_ON);
  window.dispatchEvent(new Event('applock:changed'));
  return true;
}
