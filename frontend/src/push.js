// Push notification registration (Capacitor + FCM). No-op on web.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { registerDevice } from './api.js';

let wired = false;

// initPush(notify?) — notify is an optional (title, body, type) toast callback
// so the user can SEE what happens (permission, success, or the exact error).
export async function initPush(notify) {
  const say = (t, b, type) => { try { if (notify) notify(t, b, type); } catch (_) {} };

  if (!Capacitor.isNativePlatform()) return;

  // Ask permission, then register with FCM.
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      say('Notifications off', 'Turn on notifications in settings to get ride alerts.', 'error');
      return;
    }
  } catch (e) {
    console.warn('Push permission error:', e?.message);
    say('Push error', e?.message || 'Permission check failed.', 'error');
    return;
  }

  // Android 8+: notifications only pop as a heads-up banner (with sound) if they
  // belong to a HIGH-importance channel. Create it so pushes "drop down" even
  // when the app is closed. Matches the channelId the backend sends.
  if (Capacitor.getPlatform() === 'android') {
    try {
      await PushNotifications.createChannel({
        id: 'waslney_default',
        name: 'Waslney Alerts',
        description: 'Trip, booking and ride notifications',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
      });
    } catch (e) {
      console.warn('createChannel failed:', e?.message);
    }
  }

  // Attach listeners once.
  if (!wired) {
    wired = true;

    PushNotifications.addListener('registration', async (token) => {
      try {
        await registerDevice(token.value, Capacitor.getPlatform());
        console.log('Device registered for push');
        say('Notifications on', 'You will now receive ride alerts.', 'success');
      } catch (e) {
        console.warn('registerDevice failed:', e?.message);
        say('Push save failed', e?.message || 'Could not save device token.', 'error');
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      const m = err?.error || JSON.stringify(err);
      console.warn('Push registration error:', m);
      say('Push registration failed', String(m), 'error');
    });

    // Foreground notifications: the OS tray won't show them, so surface lightly.
    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      window.dispatchEvent(new CustomEvent('waslney:push', { detail: notif }));
      say(notif?.title || 'Waslney', notif?.body || '', 'default');
    });

    // User tapped a notification.
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      window.dispatchEvent(new CustomEvent('waslney:push:tap', { detail: action.notification }));
    });
  }

  try {
    await PushNotifications.register();
  } catch (e) {
    console.warn('Push register failed:', e?.message);
    say('Push error', e?.message || 'Registration failed.', 'error');
  }
}
