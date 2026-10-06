import { Order, DeliveryDriver, Restaurant, MenuItem } from '../types';

/**
 * Backend API Synchronization Client for Orders, Drivers, Restaurants, and Menu
 * Provides rock-solid, cross-device realtime synchronization even when Firestore permissions are restricted.
 */

export async function fetchOrdersFromApi(): Promise<Order[] | null> {
  try {
    const res = await fetch('/api/orders', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // Network or server error
  }
  return null;
}

export async function saveOrderToApi(order: Order): Promise<boolean> {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    return res.ok;
  } catch (e) {
    console.warn('API save order notice:', e);
    return false;
  }
}

export async function updateOrderStatusApi(
  orderId: string,
  status: Order['status'],
  cancelledBy?: 'restaurant' | 'customer' | 'admin',
  cancellationReason?: string,
  extra?: Partial<Order>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        cancelledBy,
        cancellationReason,
        ...extra,
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn('API update order status notice:', e);
    return false;
  }
}

export async function fetchDriversFromApi(): Promise<DeliveryDriver[] | null> {
  try {
    const res = await fetch('/api/drivers', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // Network or server error
  }
  return null;
}

export async function saveDriverToApi(driver: DeliveryDriver): Promise<boolean> {
  try {
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driver),
    });
    return res.ok;
  } catch (e) {
    console.warn('API save driver notice:', e);
    return false;
  }
}

export async function updateDriverApi(driverId: string, updates: Partial<DeliveryDriver>): Promise<boolean> {
  try {
    const res = await fetch(`/api/drivers/${driverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (e) {
    console.warn('API update driver notice:', e);
    return false;
  }
}

export async function fetchRestaurantsFromApi(): Promise<Restaurant[] | null> {
  try {
    const res = await fetch('/api/restaurants', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // Network or server error
  }
  return null;
}

export async function saveRestaurantToApi(restaurant: Restaurant): Promise<boolean> {
  try {
    const res = await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restaurant),
    });
    return res.ok;
  } catch (e) {
    console.warn('API save restaurant notice:', e);
    return false;
  }
}

export async function fetchMenuFromApi(): Promise<MenuItem[] | null> {
  try {
    const res = await fetch('/api/menu', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // Network or server error
  }
  return null;
}

export async function saveMenuItemToApi(item: MenuItem): Promise<boolean> {
  try {
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return res.ok;
  } catch (e) {
    console.warn('API save menu item notice:', e);
    return false;
  }
}
