// Robust Service Worker Registration & Auto-Update Manager

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  let refreshing = false;

  // Whenever a new service worker takes control (after code change), reload the app seamlessly
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('New AURA version activated — updating application...');
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('AURA Service Worker registered:', registration.scope);

      // Check if there is an updated worker waiting
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Detect newly installed service workers
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New code version found. Activating immediately...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Periodically check for code updates (every 2 minutes)
      setInterval(() => {
        registration.update().catch((err) => {
          console.warn('Service worker background update check notice:', err);
        });
      }, 1000 * 60 * 2);

      // Check for code updates when the user re-opens or switches back to the app tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}
