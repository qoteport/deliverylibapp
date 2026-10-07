import { Order, DeliveryDriver, LocationCoords, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { sendBrowserNotification } from './browserNotifications';
import { sendTwilioOrderNotification, getSavedTwilioConfig } from './twilio';
import { saveOrderToApi } from './apiSync';

// Calculate Euclidean distance approximation between two lat/lng coords in km
export function calculateDistanceKm(from: LocationCoords, to: LocationCoords): number {
  const R = 6371; // Earth radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Find closest or best matched driver for a delivery order
export function findBestDriverForOrder(
  order: Order,
  drivers: DeliveryDriver[],
  restaurantCoords?: LocationCoords
): DeliveryDriver | null {
  const rejected = order.rejectedDriverIds || [];

  // Filter only online, available drivers who haven't rejected this order
  const availableDrivers = drivers.filter(
    (d) => d.isOnline && d.status === 'available' && !rejected.includes(d.id)
  );

  if (availableDrivers.length === 0) {
    return null;
  }

  // Target coordinates: Restaurant location or fallback neighborhood coords
  const targetLocation: LocationCoords =
    restaurantCoords ||
    MONROVIA_NEIGHBORHOOD_COORDS[order.deliveryArea || ''] || {
      lat: 6.2907,
      lng: -10.7818,
    };

  // Sort by closest distance to restaurant
  const sorted = [...availableDrivers].sort((a, b) => {
    const distA = calculateDistanceKm(a.currentLocation, targetLocation);
    const distB = calculateDistanceKm(b.currentLocation, targetLocation);
    return distA - distB;
  });

  return sorted[0] || null;
}

// Automatically delegate an unassigned order to the best driver
export async function delegateOrderToDriver(
  order: Order,
  drivers: DeliveryDriver[],
  restaurantCoords?: LocationCoords
): Promise<{ success: boolean; assignedDriver?: DeliveryDriver; updatedOrder?: Order }> {
  if (order.diningMode !== 'delivery') {
    return { success: false };
  }

  const bestDriver = findBestDriverForOrder(order, drivers, restaurantCoords);

  if (!bestDriver) {
    return { success: false };
  }

  const updatedOrder: Order = {
    ...order,
    assignedDriverId: bestDriver.id,
    assignedDriverName: bestDriver.name,
    assignedDriverPhone: bestDriver.phone,
    driverVehicle: bestDriver.vehicleType,
    driverLocation: bestDriver.currentLocation,
    delegationStatus: 'offered',
  };

  // Sync to Backend API store
  try {
    await saveOrderToApi(updatedOrder);
  } catch (e) {
    console.warn('API delegation sync notice:', e);
  }

  // Sync to Firestore
  try {
    await updateDoc(doc(db, 'orders', order.id), {
      assignedDriverId: bestDriver.id,
      assignedDriverName: bestDriver.name,
      assignedDriverPhone: bestDriver.phone,
      driverVehicle: bestDriver.vehicleType,
      driverLocation: bestDriver.currentLocation,
      delegationStatus: 'offered',
    });
  } catch (e) {
    console.warn('Firestore delegation sync notice:', e);
  }

  // Attempt Twilio SMS / WhatsApp notification if configured
  try {
    sendTwilioOrderNotification(
      updatedOrder,
      order.restaurantName || 'AURA Kitchen'
    ).catch(() => {});
  } catch {}

  return { success: true, assignedDriver: bestDriver, updatedOrder };
}
