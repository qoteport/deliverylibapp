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

/**
 * Blacklist of known dummy/placeholder food items from early fine-dining demo templates
 */
export const DUMMY_DISH_PATTERNS = [
  'molten chocolate tart',
  'wild morel risotto',
  'truffle tagliolini',
  'creamy burrata salad',
  'blood orange spritz',
  'warm hearth sourdough',
  'burrata salad',
  'morel risotto',
  'truffle tagliolini',
  'blood orange',
  'hearth sourdough',
  'chocolate tart',
  'tagliolini',
  'risotto',
  'burrata',
];

/**
 * Checks if a given menu item is a dummy / legacy demo template dish
 */
export function isDummyMenuItem(item: any): boolean {
  if (!item) return false;
  const name = String(item.name || '').toLowerCase().trim();
  const id = String(item.id || '').toLowerCase().trim();
  const desc = String(item.description || '').toLowerCase();

  // Explicit dummy dish pattern checks
  if (DUMMY_DISH_PATTERNS.some((pattern) => name.includes(pattern) || id.includes(pattern))) {
    return true;
  }

  // Legacy demo ID prefixes
  if (
    id.startsWith('dish_living') ||
    id.startsWith('dish_evelyn') ||
    id.startsWith('dish_demo') ||
    id.startsWith('demo_') ||
    id.startsWith('dish-art-')
  ) {
    return true;
  }

  // Check specific fine-dining keywords
  if (name.includes('tart') && (desc.includes('gelato') || desc.includes('vanilla') || name.includes('molten'))) return true;
  if (name.includes('risotto') || name.includes('morel')) return true;
  if (name.includes('tagliolini') || name.includes('burrata')) return true;
  if (name.includes('sourdough') && (name.includes('hearth') || desc.includes('honey-salted'))) return true;
  if (name.includes('spritz') && (name.includes('blood orange') || desc.includes('sicilian'))) return true;

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
