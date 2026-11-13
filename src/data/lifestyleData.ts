import { LifestyleItem } from '../types';

export const INITIAL_LIFESTYLE_ITEMS: LifestyleItem[] = [
  // --- Smartphones & Tablets ---
  {
    id: 'life-001',
    name: 'Apple iPhone 15 Pro Max (256GB, Natural Titanium)',
    category: 'Smartphones & Tablets',
    vendorName: 'Randall Street Tech Hub',
    vendorPhone: '0886 443 210',
    vendorNeighborhood: 'Central Monrovia',
    priceUsd: 1180,
    originalPriceUsd: 1250,
    condition: 'Brand New',
    rating: 4.9,
    reviewsCount: 38,
    description: 'Factory sealed US/Global unlocked Apple iPhone 15 Pro Max. Features A17 Pro Bionic chip, 5x optical telephoto lens, USB-C 3.0, and titanium alloy chassis. Includes 1-year Apple international warranty.',
    specifications: {
      'Storage': '256GB NVMe',
      'RAM': '8GB',
      'Battery Health': '100% Brand New',
      'Color': 'Natural Titanium',
      'Network': '5G / 4G LTE (Lonestar MTN & Orange SIM Ready)'
    },
    colors: ['Natural Titanium', 'Blue Titanium', 'Black Titanium'],
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80'
    ],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    inStock: true,
    featured: true,
  },
  {
    id: 'life-002',
    name: 'Samsung Galaxy S24 Ultra (512GB, Titanium Gray)',
    category: 'Smartphones & Tablets',
    vendorName: 'Monrovia Mobile Mart',
    vendorPhone: '0777 882 100',
    vendorNeighborhood: 'Sinkor',
    priceUsd: 1090,
    originalPriceUsd: 1190,
    condition: 'Brand New',
    rating: 4.8,
    reviewsCount: 29,
    description: 'Flagship Galaxy S24 Ultra featuring integrated S-Pen stylus, Galaxy AI live translate, Snapdragon 8 Gen 3 for Galaxy, and 200MP pro camera.',
    specifications: {
      'Storage': '512GB',
      'RAM': '12GB',
      'Display': '6.8" Dynamic AMOLED 2X 120Hz',
      'SIM': 'Dual Nano-SIM + eSIM'
    },
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80'
    ],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    inStock: true,
    featured: true,
  },

  // --- Laptops & Computers ---
  {
    id: 'life-003',
    name: 'HP Envy x360 2-in-1 Touchscreen Laptop (16GB RAM / 1TB SSD)',
    category: 'Laptops & Computers',
    vendorName: 'Prime Computing Liberia',
    vendorPhone: '0880 123 999',
    vendorNeighborhood: 'Sinkor (14th St)',
    priceUsd: 740,
    originalPriceUsd: 820,
    condition: 'Brand New',
    rating: 4.7,
    reviewsCount: 19,
    description: 'Convertible 15.6" Full HD touch-enabled workhorse laptop. Intel Core i7 13th Gen, backlit keyboard, long 10-hour battery life, and ultra-sleek aluminum body.',
    specifications: {
      'Processor': 'Intel Core i7-1355U (up to 5.0 GHz)',
      'RAM': '16GB DDR5 High-Speed',
      'Storage': '1TB PCIe NVMe M.2 SSD',
      'OS': 'Windows 11 Pro Genuine'
    },
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    featured: true,
  },

  // --- Solar & Backup Power ---
  {
    id: 'life-004',
    name: 'Felicity 5KVA Hybrid Solar Inverter & 48V Lithium Battery Kit',
    category: 'Solar & Backup Power',
    vendorName: 'SunPower Liberia Green Energy',
    vendorPhone: '0886 550 440',
    vendorNeighborhood: 'Bushrod Island',
    priceUsd: 1750,
    originalPriceUsd: 1950,
    condition: 'Brand New',
    rating: 5.0,
    reviewsCount: 42,
    description: 'Essential uninterrupted power system for Monrovia homes and businesses. Seamlessly powers fridges, freezers, TVs, lighting, and air conditioners during LEC outages. Zero generator fumes and silent operation.',
    specifications: {
      'Inverter Capacity': '5000 Watts (5KVA Pure Sine Wave)',
      'Battery Bank': '100Ah 48V LiFePO4 Lithium Iron (6000 cycles)',
      'Charging Source': 'Solar Panels or LEC Grid / Generator',
      'Warranty': '2 Years Replacement Guarantee'
    },
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    featured: true,
  },

  // --- Men's Clothing ---
  {
    id: 'life-005',
    name: 'Handwoven Liberian Country Cloth Agbada & Cap Set',
    category: 'Men\'s Clothing',
    vendorName: 'Waterside Heritage Artisans',
    vendorPhone: '0775 321 444',
    vendorNeighborhood: 'Waterside Market',
    priceUsd: 88,
    originalPriceUsd: 105,
    condition: 'Handcrafted',
    rating: 4.9,
    reviewsCount: 31,
    description: 'Authentic 100% natural cotton handwoven Liberian country cloth tailored into a regal 3-piece traditional outfit with embroidered collar and matching fez cap. Handcrafted in Nimba/Lofa style.',
    specifications: {
      'Fabric': 'Heavyweight Hand-spun Country Cloth',
      'Color Palette': 'Indigo Navy, White & Gold Stitching',
      'Origin': 'Made in Liberia'
    },
    sizes: ['M (38-40)', 'L (42-44)', 'XL (46-48)', 'Custom Tailored'],
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    featured: false,
  },

  // --- Women's Fashion ---
  {
    id: 'life-006',
    name: 'Vibrant West African Wax Print Peplum Dress & Headwrap',
    category: 'Women\'s Fashion',
    vendorName: 'Aura Monrovia Couture',
    vendorPhone: '0881 229 004',
    vendorNeighborhood: 'Sinkor (Tubman Blvd)',
    priceUsd: 65,
    originalPriceUsd: 75,
    condition: 'Brand New',
    rating: 4.8,
    reviewsCount: 22,
    description: 'Exquisite African wax print tailored gown featuring a fluted peplum hem, structured neckline, and generous matching gelee headwrap. Ideal for church services, weddings, and formal banquets.',
    specifications: {
      'Material': 'Super Wax 100% Cotton',
      'Closure': 'Concealed Back Zipper',
      'Care': 'Hand Wash or Dry Clean'
    },
    sizes: ['S (6-8)', 'M (10-12)', 'L (14-16)', 'XL (18-20)'],
    image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    featured: true,
  },

  // --- Footwear & Shoes ---
  {
    id: 'life-007',
    name: 'Nike Air Force 1 \'07 Low (Triple White)',
    category: 'Footwear & Shoes',
    vendorName: 'Red Light Sneaker Vault',
    vendorPhone: '0770 918 333',
    vendorNeighborhood: 'Paynesville',
    priceUsd: 95,
    originalPriceUsd: 110,
    condition: 'Brand New',
    rating: 4.9,
    reviewsCount: 54,
    description: 'The iconic streetwear sneaker in crisp all-white stitched leather. Features encapsulated Nike Air cushioning, perforated toe box, and durable rubber traction sole.',
    specifications: {
      'Upper': 'Genuine Full Grain Leather',
      'Sole': 'Non-marking Rubber Cupsole',
      'Gender': 'Unisex'
    },
    sizes: ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'],
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    featured: false,
  },

  // --- Audio & Accessories ---
  {
    id: 'life-008',
    name: 'Anker PowerCore 24,000mAh 65W Fast-Charging Power Bank',
    category: 'Audio & Accessories',
    vendorName: 'Randall Street Tech Hub',
    vendorPhone: '0886 443 210',
    vendorNeighborhood: 'Central Monrovia',
    priceUsd: 48,
    originalPriceUsd: 55,
    condition: 'Brand New',
    rating: 5.0,
    reviewsCount: 67,
    description: 'High-capacity rugged power bank capable of charging phones up to 6 times and fast-charging laptops via USB-C Power Delivery. Features digital smart LED percentage display.',
    specifications: {
      'Capacity': '24,000 mAh',
      'Max Output': '65W High-Speed PD',
      'Ports': '2x USB-C + 1x USB-A'
    },
    image: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    featured: false,
  },
];
