import { Order, DeliveryDriver, LocationCoords, MONROVIA_NEIGHBORHOOD_COORDS, WeekDay, ActiveShiftSlot } from '../types';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { sendBrowserNotification } from './browserNotifications';
import { sendTwilioOrderNotification, getSavedTwilioConfig } from './twilio';
import { saveOrderToApi } from './apiSync';
import { calculateDynamicDeliveryFee } from './pricingEngine';

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

/**
 * Evaluates whether a driver is scheduled to work at a given date/time
 */
export function isDriverScheduledNow(driver: DeliveryDriver, date: Date = new Date()): {
  isDayActive: boolean;
  isTimeActive: boolean;
  isScheduledNow: boolean;
  scheduleScore: number;
} {
  const dayNames: WeekDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[date.getDay()];
  const currentHour = date.getHours();

  // 1. Check day of week
  const isDayActive =
    !driver.activeDays ||
    driver.activeDays.length === 0 ||
    driver.activeDays.includes(currentDay);

  // 2. Check time slots / hours
  let isTimeActive = true;

  if (driver.activeTimeSlots && driver.activeTimeSlots.length > 0) {
    isTimeActive = driver.activeTimeSlots.some((slot) => {
      if (slot === 'morning') return currentHour >= 6 && currentHour < 12;
      if (slot === 'afternoon') return currentHour >= 12 && currentHour < 17;
      if (slot === 'evening') return currentHour >= 17 && currentHour < 22;
      if (slot === 'night') return currentHour >= 22 || currentHour < 6;
      return true;
    });
  } else if (driver.activeHoursStart && driver.activeHoursEnd) {
    const startHour = parseInt(driver.activeHoursStart.split(':')[0], 10) || 0;
    const endHour = parseInt(driver.activeHoursEnd.split(':')[0], 10) || 24;
    if (startHour <= endHour) {
      isTimeActive = currentHour >= startHour && currentHour < endHour;
    } else {
      isTimeActive = currentHour >= startHour || currentHour < endHour;
    }
  }

  const isScheduledNow = isDayActive && isTimeActive;

  // Calculate schedule bonus score
  let scheduleScore = 0;
  if (isScheduledNow) {
    scheduleScore = 40; // High bonus for on-shift driver
  } else if (isDayActive) {
    scheduleScore = 15; // Partial bonus for on-day driver
  }

  return { isDayActive, isTimeActive, isScheduledNow, scheduleScore };
}

// Find closest or best matched driver for a delivery order
export function findBestDriverForOrder(
  order: Order,
  drivers: DeliveryDriver[],
  restaurantCoords?: LocationCoords
): DeliveryDriver | null {
  const rejected = order.rejectedDriverIds || [];

  // Filter only online, available drivers who are willing to deliver food/parcels ('delivery' or 'both')
  const availableDrivers = drivers.filter((d) => {
    if (!d.isOnline || d.status !== 'available' || rejected.includes(d.id)) {
      return false;
    }
    // Must support deliveries (defaults to true if unset for backward compatibility)
    const canDeliver = !d.serviceType || d.serviceType === 'delivery' || d.serviceType === 'both';
    return canDeliver;
  });

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

  const now = new Date();

  // Rank by combined score: Proximity + Active Schedule Bonus + Rating
  const scored = availableDrivers.map((driver) => {
    const distanceKm = calculateDistanceKm(driver.currentLocation, targetLocation);
    const { isScheduledNow, scheduleScore } = isDriverScheduledNow(driver, now);

    // Distance penalty: -15 per km
    // Schedule bonus: +40 if currently on shift
    // Rating bonus: +5 per rating star
    const score = scheduleScore + (driver.rating || 5.0) * 5 - distanceKm * 15;

    return {
      driver,
      distanceKm,
      isScheduledNow,
      score,
    };
  });

  // Sort descending by score (best match first)
  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.driver || null;
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

  const resolvedFee = (bestDriver.deliveryFeeUsd && bestDriver.deliveryFeeUsd > 0)
    ? bestDriver.deliveryFeeUsd
    : (order.deliveryFee && order.deliveryFee >= 0.5)
      ? order.deliveryFee
      : calculateDynamicDeliveryFee({
          customerNeighborhood: order.deliveryArea,
          customerLocation: order.deliveryArea ? MONROVIA_NEIGHBORHOOD_COORDS[order.deliveryArea] : undefined,
          restaurantLocation: restaurantCoords,
          driverLocation: bestDriver.currentLocation,
          driverDeliveryFee: bestDriver.deliveryFeeUsd,
          prepDurationMinutes: order.prepDurationMinutes || 20,
        }).finalFee;

  const updatedOrder: Order = {
    ...order,
    deliveryFee: resolvedFee,
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
      deliveryFee: resolvedFee,
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

/**
 * Ride matching algorithm:
 * Uses driver serviceType ('rides' | 'both'), active scheduled days/times,
 * vehicle type matching, and proximity to passenger coordinates.
 */
export function findBestDriverForRide(
  pickupCoords: LocationCoords,
  vehicleType: 'Motorbike' | 'Kekeh (Tricycle)' | 'Taxi (Car)',
  drivers: DeliveryDriver[]
): {
  driver: DeliveryDriver;
  distanceKm: number;
  etaMinutes: number;
  isScheduledNow: boolean;
} | null {
  if (!drivers || drivers.length === 0) return null;

  // 1. Filter drivers eligible for rides
  const eligible = drivers.filter((d) => {
    // If status is offline, skip
    if (d.isOnline === false || d.status === 'busy') return false;

    // Check service type (default to true for backward compatibility)
    const canDriveRiders = !d.serviceType || d.serviceType === 'rides' || d.serviceType === 'both';
    if (!canDriveRiders) return false;

    // Vehicle check
    if (vehicleType === 'Motorbike') {
      return d.vehicleType === 'Motorbike' || d.vehicleType === 'Bicycle' || !d.vehicleType;
    }
    if (vehicleType === 'Kekeh (Tricycle)') {
      const v = (d.vehicleType || '').toLowerCase();
      return v.includes('kekeh') || v.includes('tricycle') || v.includes('3-wheel');
    }
    if (vehicleType === 'Taxi (Car)') {
      const v = (d.vehicleType || '').toLowerCase();
      return v.includes('car') || v.includes('taxi') || v.includes('sedan');
    }
    return true;
  });

  const candidates = eligible.length > 0 ? eligible : drivers;
  const now = new Date();

  // Score each candidate
  const scored = candidates.map((driver) => {
    const loc = driver.currentLocation || { lat: 6.2907, lng: -10.7818 };
    const distanceKm = calculateDistanceKm(loc, pickupCoords);
    const { isScheduledNow, scheduleScore } = isDriverScheduledNow(driver, now);

    // Score calculation:
    // +40 for currently active scheduled shift (days & time slots)
    // +5 * rating
    // -12 * distanceKm
    // +20 if vehicle matches specifically
    const vehicleMatches = 
      (vehicleType === 'Motorbike' && (driver.vehicleType === 'Motorbike' || driver.vehicleType === 'Bicycle')) ||
      (vehicleType === 'Kekeh (Tricycle)' && driver.vehicleType?.toLowerCase().includes('kekeh')) ||
      (vehicleType === 'Taxi (Car)' && driver.vehicleType?.toLowerCase().includes('car'));

    const score = scheduleScore + (driver.rating || 4.8) * 5 - distanceKm * 12 + (vehicleMatches ? 20 : 0);
    const etaMinutes = Math.max(2, Math.round(distanceKm * 2.5 + 2));

    return {
      driver,
      distanceKm,
      etaMinutes,
      isScheduledNow,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return best ? {
    driver: best.driver,
    distanceKm: best.distanceKm,
    etaMinutes: best.etaMinutes,
    isScheduledNow: best.isScheduledNow,
  } : null;
}
