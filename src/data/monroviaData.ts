import { Restaurant, MenuItem, Category } from '../types';

export const MONROVIA_NEIGHBORHOODS = [
  'Sinkor (Tubman Blvd)',
  'Mamba Point & Snapper Hill',
  'Congotown & Old Road',
  'Paynesville & ELWA',
  'Central Monrovia (Broad St)',
  'Bushrod Island & Freeport',
  'Airfield & Lakpazee',
];

export const INITIAL_RESTAURANTS: Restaurant[] = [];

export const INITIAL_MENU_ITEMS: MenuItem[] = [];

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'liberian-favorites', label: 'Liberian Classics' },
  { id: 'hearth-mains', label: 'Suya & Grills' },
  { id: 'starters', label: 'Snacks & Kala' },
  { id: 'beverages', label: 'Wonjo & Drinks' },
  { id: 'pasta', label: 'Pastas' },
  { id: 'desserts', label: 'Desserts' },
];
