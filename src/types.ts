export type DiningMode = 'delivery' | 'pickup' | 'dine-in';

export type Currency = 'USD' | 'LRD';

export const MONROVIA_NEIGHBORHOODS: string[] = [
  'Sinkor (Tubman Blvd)',
  'Mamba Point & Snapper Hill',
  'Congotown & Old Road',
  'Paynesville & ELWA',
  'Central Monrovia (Broad St)',
  'Bushrod Island & Freeport',
  'Airfield & Lakpazee',
];

export interface LocationCoords {
  lat: number;
  lng: number;
}

export const MONROVIA_NEIGHBORHOOD_COORDS: Record<string, LocationCoords> = {
  'Sinkor (Tubman Blvd)': { lat: 6.2907, lng: -10.7818 },
  'Mamba Point & Snapper Hill': { lat: 6.3182, lng: -10.8123 },
  'Congotown & Old Road': { lat: 6.2690, lng: -10.7480 },
  'Paynesville & ELWA': { lat: 6.2753, lng: -10.7100 },
  'Central Monrovia (Broad St)': { lat: 6.3130, lng: -10.8040 },
  'Bushrod Island & Freeport': { lat: 6.3450, lng: -10.7880 },
  'Airfield & Lakpazee': { lat: 6.2810, lng: -10.7680 },
};

export const USD_TO_LRD_RATE = 195;

export type Category = 'liberian-favorites' | 'starters' | 'pasta' | 'hearth-mains' | 'desserts' | 'beverages';

export type PaymentMethod = 'momo-mtn' | 'orange-money' | 'cod-usd' | 'cod-lrd' | 'card';

export type UserRole = 'super_admin' | 'restaurant_owner' | 'driver' | 'customer';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  restaurantId?: string;
  restaurantName?: string;
  driverId?: string;
  phone?: string;
  location?: string;
  address?: string;
}

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
  createdAt: string;
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
  spiceLevel?: 'Mild' | 'Medium' | 'Monrovia Hot' | 'Extreme Pepper';
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
  tagline: string;
  ownerId?: string;
  ownerEmail?: string;
  location?: LocationCoords;
  createdAt?: string;
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
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  subtotal: number;
  discount: number;
  tax: number;
  serviceFee: number;
  deliveryFee: number;
  tip: number;
  total: number;
  currency: Currency;
  estimatedDeliveryTime: string;
  createdAtTimestamp?: number;
  confirmedAtTimestamp?: number;
  targetEtaTimestamp?: number;
  prepDurationMinutes?: number;
  paymentMethod: PaymentMethod;
  paymentNumber?: string;
  // Driver & Delegation Fields
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  driverVehicle?: string;
  driverLocation?: LocationCoords;
  delegationStatus?: 'unassigned' | 'offered' | 'accepted' | 'rejected' | 'heading_to_restaurant' | 'at_restaurant' | 'out_for_delivery' | 'delivered';
  rejectedDriverIds?: string[];
}
