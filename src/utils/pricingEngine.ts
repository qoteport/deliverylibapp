import { LocationCoords, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';

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

export interface DeliveryPricingParams {
  customerLocation?: LocationCoords;
  customerNeighborhood?: string;
  restaurantLocation?: LocationCoords;
  restaurantNeighborhood?: string;
  driverLocation?: LocationCoords;
  prepDurationMinutes?: number;
}

export interface DeliveryFeeBreakdown {
  baseFee: number;
  distanceKm: number;
  riderPickupDistanceKm: number;
  customerDropoffDistanceKm: number;
  estimatedTransitMinutes: number;
  estimatedWaitMinutes: number;
  rawFee: number;
  finalFee: number;
}

// Uber Eats / Bolt Food dynamic pricing parameters (capped for Monrovia market)
export const PRICING_CONFIG = {
  MIN_FEE: 0.50,           // Base minimum fee: $0.50 USD
  MAX_FEE: 3.00,           // Upper cap: $3.00 USD
  BASE_FARE: 0.50,         // Starting dispatch fare: $0.50 USD
  PER_KM_RATE: 0.18,       // $0.18 per km
  PER_MINUTE_RATE: 0.02,   // $0.02 per minute
  AVG_SPEED_KMH: 22,       // Motorbike transit speed in Monrovia (km/h)
  DEFAULT_RIDER_APPROACH_KM: 1.2, // Default average rider approach distance
  STEP_INCREMENT: 0.50,    // Quantization step: $0.50 (e.g. 0.50, 1.00, 1.50, 2.00, 2.50, 3.00)
};

/**
 * Quantizes any fee to strictly half-dollar increments ($0.50, $1.00, $1.50, $2.00, $2.50, $3.00)
 * and clamps between MIN_FEE ($0.50) and MAX_FEE ($3.00).
 */
export function quantizeAndCapFee(amount: number, config = PRICING_CONFIG): number {
  const step = config.STEP_INCREMENT || 0.50;
  const min = typeof config.MIN_FEE === 'number' ? config.MIN_FEE : 0.50;
  const max = typeof config.MAX_FEE === 'number' ? config.MAX_FEE : 3.00;
  
  // Round to nearest step increment
  const rounded = Math.round(amount / step) * step;
  // Clamp between min and max
  const clamped = Math.max(min, Math.min(max, rounded));
  // Return fixed 2-decimal rounded number
  return Math.round(clamped * 100) / 100;
}

/**
 * Calculates dynamic delivery fee based on:
 * 1. Distance between restaurant and customer (Dropoff Leg)
 * 2. Distance between rider and restaurant (Pickup Leg)
 * 3. Wait time (kitchen prep duration + transit time)
 * 
 * Result is strictly quantized in $0.50 increments and capped between $0.50 and $3.00 (or custom config).
 */
export function calculateDynamicDeliveryFee(
  params: DeliveryPricingParams,
  customConfig?: Partial<typeof PRICING_CONFIG>
): DeliveryFeeBreakdown {
  const cfg = { ...PRICING_CONFIG, ...customConfig };

  // 1. Resolve Restaurant Coords
  const restCoords: LocationCoords =
    params.restaurantLocation ||
    (params.restaurantNeighborhood ? MONROVIA_NEIGHBORHOOD_COORDS[params.restaurantNeighborhood] : undefined) ||
    MONROVIA_NEIGHBORHOOD_COORDS['Sinkor (Tubman Blvd)'] || { lat: 6.2907, lng: -10.7818 };

  // 2. Resolve Customer Coords
  const custCoords: LocationCoords =
    params.customerLocation ||
    (params.customerNeighborhood ? MONROVIA_NEIGHBORHOOD_COORDS[params.customerNeighborhood] : undefined) ||
    MONROVIA_NEIGHBORHOOD_COORDS['Congotown & Old Road'] || { lat: 6.2690, lng: -10.7480 };

  // 3. Dropoff distance (Restaurant -> Customer)
  const dropoffDistKm = calculateDistanceKm(restCoords, custCoords);

  // 4. Pickup distance (Rider -> Restaurant)
  const pickupDistKm = params.driverLocation
    ? calculateDistanceKm(params.driverLocation, restCoords)
    : (cfg.DEFAULT_RIDER_APPROACH_KM ?? 1.2);

  const totalDistanceKm = Math.round((dropoffDistKm + pickupDistKm) * 10) / 10;

  // 5. Time calculation (Transit + Kitchen Prep)
  const estimatedTransitMins = Math.max(
    3,
    Math.round((totalDistanceKm / (cfg.AVG_SPEED_KMH || 22)) * 60)
  );
  const prepMins = params.prepDurationMinutes ?? 20;
  const timeFactorMins = estimatedTransitMins + prepMins * 0.25;

  // 6. Uber / Bolt Dynamic Pricing Formula
  const rawFee =
    cfg.BASE_FARE +
    totalDistanceKm * cfg.PER_KM_RATE +
    timeFactorMins * cfg.PER_MINUTE_RATE;

  // 7. Quantize to step increments and clamp
  const finalFee = quantizeAndCapFee(rawFee, cfg);

  return {
    baseFee: cfg.BASE_FARE,
    distanceKm: totalDistanceKm,
    riderPickupDistanceKm: pickupDistKm,
    customerDropoffDistanceKm: dropoffDistKm,
    estimatedTransitMinutes: estimatedTransitMins,
    estimatedWaitMinutes: prepMins,
    rawFee: Math.round(rawFee * 100) / 100,
    finalFee,
  };
}
