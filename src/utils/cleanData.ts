/**
 * Recursively removes `undefined` values from objects/arrays before sending to Firebase Firestore
 * to prevent "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object') {
      cleaned[key] = sanitizeForFirestore(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

export const DUMMY_DISH_PATTERNS = [
  'molten chocolate tart',
  'wild morel risotto',
  'truffle tagliolini',
  'creamy burrata salad',
  'blood orange spritz',
  'warm hearth sourdough',
];

/**
 * Checks if a given menu item is a legacy dummy / demo template dish from early prototypes
 */
export function isDummyMenuItem(item: any): boolean {
  if (!item) return false;
  const name = String(item.name || '').toLowerCase().trim();
  const id = String(item.id || '').toLowerCase().trim();

  // Explicit legacy template full dish name matches
  if (DUMMY_DISH_PATTERNS.some((pattern) => name === pattern || id === pattern)) {
    return true;
  }

  // Legacy demo ID prefixes from initial boilerplate
  if (
    id.startsWith('dish_living_') ||
    id.startsWith('dish_evelyn_') ||
    id.startsWith('dish_demo_') ||
    id.startsWith('demo_dish_') ||
    id.startsWith('dish-art-demo')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a given restaurant is a dummy / demo placeholder
 */
export function isDummyRestaurant(rest: any): boolean {
  if (!rest) return false;
  const name = String(rest.name || '').toLowerCase().trim();
  const id = String(rest.id || '').toLowerCase().trim();

  if (
    id.startsWith('rest_living') ||
    id.startsWith('rest_evelyn') ||
    id.startsWith('rest_demo') ||
    id.startsWith('demo_') ||
    id.startsWith('rest-art-')
  ) {
    return true;
  }

  if (name.includes('artisanal kitchen') || name.includes('demo kitchen') || name.includes('sample restaurant')) {
    return true;
  }

  return false;
}

export function cleanMenuList<T extends { id?: string; name?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isDummyMenuItem(item));
}

export function cleanRestaurantList<T extends { id?: string; name?: string }>(restaurants: T[]): T[] {
  if (!Array.isArray(restaurants)) return [];
  return restaurants.filter((rest) => !isDummyRestaurant(rest));
}
