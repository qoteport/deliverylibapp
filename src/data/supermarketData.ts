import { SupermarketStore, SupermarketItem } from '../types';

/**
 * Clean slate for verified Monrovia Supermarkets and Marts.
 * Real stores are loaded from Firestore 'supermarkets' collection
 * or registered via the Shopping Merchant Onboarding portal.
 */
export const SUPERMARKETS: SupermarketStore[] = [];

export const SUPERMARKET_CATEGORIES = [
  'All Items',
  'Pantry & Rice',
  'Dairy & Eggs',
  'Beverages & Soft Drinks',
  'Bakery & Bread',
  'Canned Goods',
  'Snacks',
  'Household & Cleaning',
  'Fresh Produce',
];

export const SUPERMARKET_ITEMS: SupermarketItem[] = [];
