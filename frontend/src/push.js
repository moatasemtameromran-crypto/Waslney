// Push notification registration (Capacitor + FCM). No-op on web.
import { Capacitor } from '@capacitor/core';
import { registerDevice } from './api.js';

let wired = false;

// Call once the user is logged in (so we attach the token to their account).
export async function initPush() {
  if (!Capacitor.isNativePlatform()) return;

  let PushNotifications;
  try {
    ({ PushNotifications } = await import('@capacitor/push-notifications'));
  } catch (e) {
    console.warn('Push plugin not available:', e?.message);
    return;
  }

  // Ask permission, then register with FCM.
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      console.log('Push permission not granted');
      return;
    }
  } catch (e) {
    console.warn('Push permission error:', e?.message);
    return;
  }

  // Attach listeners once.
  if (!wired) {
    wired = true;

    PushNotifications.addListener('registration', async (token) => {
      try {
        await registerDevice(token.value, Capacitor.getPlatform());
        console.log('Device registered for push');
      } catch (e) {
        console.warn('registerDevice failed:', e?.message);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration error:', JSON.stringify(err));
    });

    // Foreground notifications: the OS tray won't show them, so surface lightly.
    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      window.dispatchEvent(new CustomEvent('waslney:push', { detail: notif }));
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
  }
}
