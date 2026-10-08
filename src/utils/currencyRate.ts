import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export const DEFAULT_USD_TO_LRD_RATE = 195;

let cachedRate: number = (() => {
  try {
    const saved = localStorage.getItem('aura_usd_to_lrd_rate');
    if (saved) {
      const num = parseFloat(saved);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {}
  return DEFAULT_USD_TO_LRD_RATE;
})();

/**
 * Returns the current active exchange rate for 1 USD to LRD.
 */
export function getUsdToLrdRate(): number {
  return cachedRate;
}

/**
 * Updates the exchange rate across local cache, memory, and Firebase Firestore.
 */
export async function setUsdToLrdRate(rate: number): Promise<void> {
  if (isNaN(rate) || rate <= 0) return;
  cachedRate = rate;
  try {
    localStorage.setItem('aura_usd_to_lrd_rate', rate.toString());
    window.dispatchEvent(new CustomEvent('aura_usd_lrd_rate_changed', { detail: { rate } }));
  } catch {}

  // Sync to Firestore system_config
  try {
    await setDoc(
      doc(db, 'system_config', 'currency'),
      {
        usdToLrdRate: rate,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Firestore rate save notice:', e);
  }
}

/**
 * Subscribes to real-time changes of the USD to LRD exchange rate.
 */
export function subscribeToUsdToLrdRate(callback: (rate: number) => void): () => void {
  // Initial fire with cached value
  callback(cachedRate);

  // Local window event listener
  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail?.rate) {
      cachedRate = custom.detail.rate;
      callback(cachedRate);
    }
  };
  window.addEventListener('aura_usd_lrd_rate_changed', handleLocalUpdate);

  // Realtime Firestore listener
  const unsubFirestore = onSnapshot(
    doc(db, 'system_config', 'currency'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.usdToLrdRate && typeof data.usdToLrdRate === 'number' && data.usdToLrdRate > 0) {
          cachedRate = data.usdToLrdRate;
          try {
            localStorage.setItem('aura_usd_to_lrd_rate', data.usdToLrdRate.toString());
          } catch {}
          callback(data.usdToLrdRate);
        }
      }
    },
    () => {}
  );

  return () => {
    window.removeEventListener('aura_usd_lrd_rate_changed', handleLocalUpdate);
    unsubFirestore();
  };
}
