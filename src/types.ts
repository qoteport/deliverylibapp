export type DiningMode = 'delivery' | 'pickup' | 'dine-in';

export type Currency = 'USD' | 'LRD';

export const MONROVIA_MAJOR_ZONES: string[] = [
  'Sinkor (Tubman Blvd)',
  'Central Monrovia (Broad St)',
  'Mamba Point & Snapper Hill',
  'Congotown & Old Road',
  'Paynesville & ELWA',
  'Bushrod Island & Freeport',
  'Airfield & Lakpazee',
];

export const MONROVIA_SINKOR_STREETS: string[] = [
  '1st Street Sinkor',
  '2nd Street Sinkor',
  '3rd Street Sinkor',
  '4th Street Sinkor',
  '5th Street Sinkor',
  '6th Street Sinkor',
  '7th Street Sinkor',
  '8th Street Sinkor',
  '9th Street Sinkor',
  '10th Street Sinkor',
  '11th Street Sinkor',
  '12th Street Sinkor',
  '13th Street Sinkor',
  '14th Street Sinkor',
  '15th Street Sinkor',
  '16th Street Sinkor',
  '17th Street Sinkor',
  '18th Street Sinkor',
  '19th Street Sinkor',
  '20th Street Sinkor',
  '21st Street Sinkor',
  '22nd Street Sinkor',
  '23rd Street Sinkor',
  '24th Street Sinkor',
];

export const MONROVIA_KEY_STREETS: string[] = [
  'Broad Street, Central Monrovia',
  'Randall Street, Central Monrovia',
  'Carey Street, Central Monrovia',
  'Center Street, Central Monrovia',
  'Benson Street, Central Monrovia',
  'UN Drive, Mamba Point',
  'Russell Avenue, Sinkor',
  'Sekou Toure Avenue, Sinkor',
  'Old Road & Key Hole, Congotown',
  'Boulevard & Back Road, Congotown',
  'ELWA Junction, Paynesville',
  'Red Light Market, Paynesville',
  'Duport Road, Paynesville',
  'SKD Boulevard, Paynesville',
  'Freeport, Bushrod Island',
  'Clara Town, Bushrod Island',
  'Duala Market, Bushrod Island',
  'Airfield Matadi & Lakpazee',
];

export const MONROVIA_NEIGHBORHOODS: string[] = [
  ...MONROVIA_MAJOR_ZONES,
  ...MONROVIA_SINKOR_STREETS,
  ...MONROVIA_KEY_STREETS,
];

export interface LocationCoords {
  lat: number;
  lng: number;
}

export const MONROVIA_NEIGHBORHOOD_COORDS: Record<string, LocationCoords> = {
  // Major Districts
  'Sinkor (Tubman Blvd)': { lat: 6.2907, lng: -10.7818 },
  'Mamba Point & Snapper Hill': { lat: 6.3182, lng: -10.8123 },
  'Congotown & Old Road': { lat: 6.2690, lng: -10.7480 },
  'Paynesville & ELWA': { lat: 6.2753, lng: -10.7100 },
  'Central Monrovia (Broad St)': { lat: 6.3130, lng: -10.8040 },
  'Bushrod Island & Freeport': { lat: 6.3450, lng: -10.7880 },
  'Airfield & Lakpazee': { lat: 6.2810, lng: -10.7680 },

  // Sinkor 1st through 24th Streets with high precision
  '1st Street Sinkor': { lat: 6.3055, lng: -10.7975 },
  '2nd Street Sinkor': { lat: 6.3040, lng: -10.7960 },
  '3rd Street Sinkor': { lat: 6.3025, lng: -10.7945 },
  '4th Street Sinkor': { lat: 6.3010, lng: -10.7930 },
  '5th Street Sinkor': { lat: 6.2995, lng: -10.7915 },
  '6th Street Sinkor': { lat: 6.2980, lng: -10.7900 },
  '7th Street Sinkor': { lat: 6.2965, lng: -10.7885 },
  '8th Street Sinkor': { lat: 6.2950, lng: -10.7870 },
  '9th Street Sinkor': { lat: 6.2935, lng: -10.7855 },
  '10th Street Sinkor': { lat: 6.2920, lng: -10.7840 },
  '11th Street Sinkor': { lat: 6.2905, lng: -10.7825 },
  '12th Street Sinkor': { lat: 6.2890, lng: -10.7810 },
  '13th Street Sinkor': { lat: 6.2875, lng: -10.7795 },
  '14th Street Sinkor': { lat: 6.2860, lng: -10.7780 },
  '15th Street Sinkor': { lat: 6.2845, lng: -10.7765 },
  '16th Street Sinkor': { lat: 6.2830, lng: -10.7750 },
  '17th Street Sinkor': { lat: 6.2815, lng: -10.7735 },
  '18th Street Sinkor': { lat: 6.2800, lng: -10.7720 },
  '19th Street Sinkor': { lat: 6.2785, lng: -10.7705 },
  '20th Street Sinkor': { lat: 6.2770, lng: -10.7690 },
  '21st Street Sinkor': { lat: 6.2755, lng: -10.7675 },
  '22nd Street Sinkor': { lat: 6.2740, lng: -10.7660 },
  '23rd Street Sinkor': { lat: 6.2725, lng: -10.7645 },
  '24th Street Sinkor': { lat: 6.2710, lng: -10.7630 },

  // Key Monrovia Thoroughfares & Landmarks
  'Broad Street, Central Monrovia': { lat: 6.3130, lng: -10.8040 },
  'Randall Street, Central Monrovia': { lat: 6.3145, lng: -10.8060 },
  'Carey Street, Central Monrovia': { lat: 6.3115, lng: -10.8020 },
  'Center Street, Central Monrovia': { lat: 6.3125, lng: -10.8035 },
  'Benson Street, Central Monrovia': { lat: 6.3105, lng: -10.8010 },
  'UN Drive, Mamba Point': { lat: 6.3190, lng: -10.8140 },
  'Russell Avenue, Sinkor': { lat: 6.2940, lng: -10.7840 },
  'Sekou Toure Avenue, Sinkor': { lat: 6.2960, lng: -10.7860 },
  'Old Road & Key Hole, Congotown': { lat: 6.2790, lng: -10.7600 },
  'Boulevard & Back Road, Congotown': { lat: 6.2690, lng: -10.7480 },
  'ELWA Junction, Paynesville': { lat: 6.2753, lng: -10.7100 },
  'Red Light Market, Paynesville': { lat: 6.2650, lng: -10.6850 },
  'Duport Road, Paynesville': { lat: 6.2720, lng: -10.7020 },
  'SKD Boulevard, Paynesville': { lat: 6.2780, lng: -10.7250 },
  'Freeport, Bushrod Island': { lat: 6.3450, lng: -10.7880 },
  'Clara Town, Bushrod Island': { lat: 6.3320, lng: -10.7930 },
  'Duala Market, Bushrod Island': { lat: 6.3600, lng: -10.7780 },
  'Airfield Matadi & Lakpazee': { lat: 6.2810, lng: -10.7680 },
};

export const USD_TO_LRD_RATE = 195;

export type Category = 'liberian-favorites' | 'starters' | 'pasta' | 'hearth-mains' | 'desserts' | 'beverages' | string;

export type PaymentMethod = 'momo-mtn' | 'orange-money' | 'cod-usd' | 'cod-lrd' | 'card';

export type UserRole = 'super_admin' | 'admin' | 'restaurant_owner' | 'supermarket_owner' | 'driver' | 'customer';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  restaurantId?: string;
  restaurantName?: string;
  supermarketId?: string;
  supermarketName?: string;
  driverId?: string;
  phone?: string;
  location?: string;
  address?: string;
}

export type DriverServiceType = 'delivery' | 'rides' | 'both';
export type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type ActiveShiftSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export const ALL_WEEK_DAYS: WeekDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const SHIFT_SLOT_DEFINITIONS: Record<ActiveShiftSlot, { label: string; timeRange: string; startHour: number; endHour: number; iconDesc: string }> = {
  morning: { label: 'Morning Rush', timeRange: '6:00 AM – 12:00 PM', startHour: 6, endHour: 12, iconDesc: '🌅' },
  afternoon: { label: 'Afternoon', timeRange: '12:00 PM – 5:00 PM', startHour: 12, endHour: 17, iconDesc: '☀️' },
  evening: { label: 'Evening Rush', timeRange: '5:00 PM – 10:00 PM', startHour: 17, endHour: 22, iconDesc: '🌆' },
  night: { label: 'Late Night', timeRange: '10:00 PM – 6:00 AM', startHour: 22, endHour: 6, iconDesc: '🌙' },
};

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  vehicleType: 'Motorbike' | 'Kekeh (Tricycle)' | 'Bicycle' | 'Car';
  plateNumber?: string;
  momoNumber: string;
  momoProvider: 'mtn' | 'orange' | 'both';
  baseZone: string;
  isOnline: boolean;
  status: 'available' | 'busy' | 'offline';
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  currentLocation: LocationCoords;
  rating: number;
  totalDeliveries: number;
  earningsTodayUsd: number;
  activeOrderId?: string;
  driverPin?: string; // 4 to 6 digit security PIN for login
  deliveryFeeUsd?: number; // Custom delivery fee set by courier driver (USD)
  serviceType?: DriverServiceType; // 'delivery' | 'rides' | 'both'
  activeDays?: WeekDay[]; // e.g. ['Monday', 'Tuesday', ...]
  activeTimeSlots?: ActiveShiftSlot[]; // e.g. ['morning', 'afternoon', 'evening']
  activeHoursStart?: string; // e.g. "06:00"
  activeHoursEnd?: string; // e.g. "22:00"
  avatar?: string; // Driver selfie/face photo
  driverPhoto?: string;
  vehiclePhoto?: string; // Vehicle/car photo
  createdAt?: string;
}

export interface AddonOption {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface MenuItem {
  id: string;
  restaurantId?: string;
  name: string;
  subname: string;
  category: Category;
  description: string;
  price: number; // in USD
  priceLrd?: number;
  calories: number;
  prepTimeMinutes: number;
  isChefSpecial?: boolean;
  dietary: ('Vegetarian' | 'Gluten-Free' | 'Dairy-Free' | 'Pescatarian' | 'Vegan' | 'Spicy' | 'Halal')[];
  ingredients: string[];
  provenance: string;
  illustrationType: 'jollof' | 'peppersoup' | 'palmbutter' | 'cassavaleaf' | 'suya' | 'snapper' | 'kala' | 'wonjo' | 'pasta' | 'steak' | 'burrata' | 'branzino' | 'risotto' | 'sourdough' | 'dessert' | 'cocktail';
  images?: string[]; // Multiple photos uploaded for the dish
  image?: string; // Primary photo URL or base64
  availableAddons?: AddonOption[];
  cookingTemperatures?: string[];
  spiceLevel?: 'Mild' | 'Medium' | 'Monrovia Hot' | 'Extreme Pepper' | 'No Pepper' | string;
  availableSpiceLevels?: string[];
  isAvailable?: boolean;
}

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedAddons: SelectedAddon[];
  specialInstructions?: string;
  selectedTemperature?: string;
  selectedSpiceLevel?: string;
  itemTotal: number;
}

export interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  cuisine: string;
  phone: string;
  momoNumber?: string;
  momoProvider?: 'mtn' | 'orange' | 'both';
  rating: number;
  reviewCount: number;
  deliveryTimeMinutes: number;
  deliveryFeeUsd: number;
  minOrderUsd: number;
  isOpen: boolean;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  allowedPhoneNumbers?: string[];
  kitchenPin?: string;
  hasOwnDelivery?: boolean;
  tagline: string;
  ownerId?: string;
  ownerEmail?: string;
  location?: LocationCoords;
  createdAt?: string;
  // Operating Schedule
  operatingDays?: string[];
  is24Hours?: boolean;
  openingTime?: string;
  closingTime?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: 'received' | 'preparing' | 'plating' | 'en-route' | 'completed' | 'cancelled';
  items: CartItem[];
  diningMode: DiningMode;
  restaurantId?: string;
  restaurantName?: string;
  deliveryArea?: string;
  deliveryAddress?: string;
  deliveryCoords?: LocationCoords;
  tableNumber?: string;
  specialInstructions?: string;
  orderType?: 'food' | 'supermarket' | 'ride';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  subtotal: number;
  discount?: number;
  tax?: number;
  serviceFee?: number;
  deliveryFee: number;
  tip?: number;
  total: number;
  currency: Currency;
  estimatedDeliveryTime?: string;
  createdAtTimestamp?: number;
  confirmedAtTimestamp?: number;
  targetEtaTimestamp?: number;
  readyAtTimestamp?: number;
  enRouteAtTimestamp?: number;
  deliveredAtTimestamp?: number;
  prepDurationMinutes?: number;
  actualPrepMinutes?: number;
  actualDeliveryMinutes?: number;
  totalFulfillmentMinutes?: number;
  paymentMethod: PaymentMethod;
  paymentNumber?: string;
  paymentStatus?: 'pending' | 'paid';
  // Driver & Delegation Fields
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  driverVehicle?: string;
  driverLocation?: LocationCoords;
  delegationStatus?: 'unassigned' | 'offered' | 'accepted' | 'rejected' | 'heading_to_restaurant' | 'at_restaurant' | 'out_for_delivery' | 'delivered';
  rejectedDriverIds?: string[];
  priceOverridden?: boolean;
  originalPrice?: number;
  // Cancellation Fields
  cancelledBy?: 'customer' | 'restaurant' | 'admin';
  cancellationReason?: string;
  // Offline Support Field
  isOfflineOrder?: boolean;
}

// =============================================================================
// AURA RIDES ECOSYSTEM TYPES
// =============================================================================
export type RideStatus = 
  | 'idle' 
  | 'selecting_destination' 
  | 'finding_driver' 
  | 'searching'
  | 'driver_matched' 
  | 'pinging_driver' 
  | 'accepted' 
  | 'arriving' 
  | 'in_transit' 
  | 'completed' 
  | 'cancelled'
  | 'no_driver_found';

export type RideVehicleType = 'Motorbike' | 'Kekeh (Tricycle)' | 'Taxi (Car)';

export interface RideRequest {
  id: string;
  createdAt: string;
  createdAtTimestamp: number;
  status: RideStatus;
  customerName: string;
  customerPhone: string;
  pickupArea: string;
  pickupAddress: string;
  pickupCoords: LocationCoords;
  destinationArea: string;
  destinationAddress: string;
  destinationCoords: LocationCoords;
  vehiclePreference: RideVehicleType;
  fareUsd?: number;
  fareLrd?: number;
  priceOverridden?: boolean;
  originalFareUsd?: number;
  originalFareLrd?: number;
  customPriceSetByDriver?: boolean;
  nearbyDriversFound?: number;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  driverPhoto?: string;
  vehiclePhoto?: string;
  driverVehicle?: string;
  driverPlate?: string;
  driverRating?: number;
  driverLocation?: LocationCoords;
  driverEtaMinutes?: number;
  contactMethod?: 'direct_call' | 'ping_alert';
  acceptedAtTimestamp?: number;
  arrivedAtTimestamp?: number;
  startedAtTimestamp?: number;
  completedAtTimestamp?: number;
  cancelledAtTimestamp?: number;
  cancellationReason?: string;
}

// =============================================================================
// AURA SUPERMARKETS & GROCERY ECOMMERCE TYPES
// =============================================================================
export interface SupermarketStore {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  deliveryTimeMinutes: number;
  tagline: string;
  image: string;
  accentColor: string;
  categories: string[];
  momoNumber?: string;
  managerPin?: string;
  allowedPhoneNumbers?: string[];
}

export interface SupermarketItem {
  id: string;
  supermarketId: string;
  supermarketName: string;
  name: string;
  category: string;
  unitWeight: string; // e.g. "25kg", "500g", "1L", "Can"
  priceUsd: number;
  description: string;
  image: string;
  inStock: boolean;
  featured?: boolean;
}

// ============================================================================
// REAL ESTATE (MONROVIA APARTMENTS, RENTALS, HOUSES & LAND)
// ============================================================================
export type PropertyDealType = 'rent' | 'buy' | 'short_stay';
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land';

export interface RealEstateProperty {
  id: string;
  title: string;
  dealType: PropertyDealType;
  propertyType: PropertyType;
  priceUsd: number;
  pricePeriod?: 'month' | 'year' | 'day' | 'total';
  neighborhood: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqm?: number;
  features: string[];
  description: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  agentName: string;
  agentPhone: string;
  agentWhatsapp?: string;
  isVerified: boolean;
  featured?: boolean;
  createdAt?: string;
}

export interface PropertyInquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  clientName: string;
  clientPhone: string;
  inquiryType: 'viewing' | 'question' | 'offer';
  preferredDate?: string;
  notes?: string;
  status: 'pending' | 'contacted' | 'completed';
  createdAt: string;
}

// ============================================================================
// ELECTRONICS, APPARELS & CLOTHING (LIFESTYLE & FASHION)
// ============================================================================
export type LifestyleCategory = 
  | 'All Items'
  | 'Smartphones & Tablets'
  | 'Laptops & Computers'
  | 'Solar & Backup Power'
  | 'Men\'s Clothing'
  | 'Women\'s Fashion'
  | 'Footwear & Shoes'
  | 'Audio & Accessories';

export interface LifestyleItem {
  id: string;
  name: string;
  category: LifestyleCategory;
  vendorName: string;
  vendorPhone: string;
  vendorNeighborhood: string;
  priceUsd: number;
  originalPriceUsd?: number;
  condition: 'Brand New' | 'Certified Used' | 'Handcrafted';
  rating: number;
  reviewsCount: number;
  description: string;
  specifications: Record<string, string>;
  sizes?: string[];
  colors?: string[];
  image?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  inStock: boolean;
  featured?: boolean;
}

export interface LifestyleCartItem {
  item: LifestyleItem;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

// ============================================================================
// MOTORS, CAR RENTALS & AUTO PARTS
// ============================================================================
export type MotorListingType = 'sale' | 'rental' | 'part';

export interface MotorListing {
  id: string;
  title: string;
  listingType?: MotorListingType;
  type?: MotorListingType;
  make: string;
  model: string;
  year: number;
  priceUsd: number;
  priceLrd?: number;
  priceUnit?: string;
  rentalPeriod?: 'day' | 'week' | 'month';
  condition: 'Brand New' | 'Clean Monrovia Used' | 'Foreign Used' | 'OEM Genuine Part';
  mileageKm?: number;
  mileage?: string;
  transmission?: 'Automatic' | 'Manual';
  fuelType?: 'Gasoline' | 'Diesel' | 'Hybrid';
  location: string;
  dealerName: string;
  dealerPhone: string;
  dealerWhatsapp?: string;
  dealerWhatsApp?: string;
  description: string;
  features: string[];
  image?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  isAvailable?: boolean;
  featured?: boolean;
  verified?: boolean;
}

export interface MotorInquiry {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType: MotorListingType;
  clientName: string;
  clientPhone: string;
  inquiryType: 'buy' | 'rental_booking' | 'test_drive' | 'parts_order';
  rentalDays?: number;
  notes?: string;
  status: 'pending' | 'contacted' | 'completed';
  createdAt: string;
}

