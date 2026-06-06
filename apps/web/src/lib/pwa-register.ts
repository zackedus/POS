/** Register service worker for POS PWA shell (client-only). Skipped in dev to avoid stale chunk cache. */

const SW_PATH = '/sw.js';

export async function registerPosServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    return registration;
  } catch {
    return null;
  }
}
