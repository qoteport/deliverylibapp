// Browser Notification Manager for Web & Mobile (PWA)

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

export interface BrowserNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  vibrate?: number[];
}

export async function sendBrowserNotification(payload: BrowserNotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  if (Notification.permission !== 'granted') {
    // Attempt permission request if default
    if (Notification.permission === 'default') {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
    } else {
      return false;
    }
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || 'aura-order-alert',
    data: payload.data,
    silent: false,
  };

  // If service worker registration is available, use showNotification for rich background notifications on Android & mobile browsers
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, {
        ...options,
        // @ts-expect-error vibrate is standard in mobile service worker notifications
        vibrate: payload.vibrate || [200, 100, 200, 100, 200],
      });
      return true;
    } catch (e) {
      console.warn('Service worker showNotification notice, falling back to window Notification:', e);
    }
  }

  try {
    new Notification(payload.title, options);
    return true;
  } catch (err) {
    console.warn('Window notification dispatch notice:', err);
    return false;
  }
}
