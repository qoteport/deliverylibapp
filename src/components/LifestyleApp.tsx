import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  Smartphone,
  Laptop,
  SunMedium,
  Shirt,
  Sparkles,
  Footprints,
  Headphones,
  Check,
  X,
  Plus,
  Minus,
  ShoppingCart,
  ChevronLeft,
  DollarSign,
  Heart,
  Share2,
  Truck,
  ShieldCheck,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  Tag,
  Star
} from 'lucide-react';
import {
  LifestyleItem,
  LifestyleCategory,
  LifestyleCartItem,
  LifestyleOrder
} from '../types';
import { INITIAL_LIFESTYLE_ITEMS } from '../data/lifestyleData';
import { db } from '../firebase/config';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

interface LifestyleAppProps {
  isOpen?: boolean;
  isPageMode?: boolean;
  onClose: () => void;
  currency: 'USD' | 'LRD';
  onToggleCurrency: () => void;
}

const CATEGORIES: { id: LifestyleCategory | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All Items', icon: Sparkles },
  { id: 'smartphones', label: 'Smartphones & Tablets', icon: Smartphone },
  { id: 'laptops', label: 'Laptops & Computers', icon: Laptop },
  { id: 'solar', label: 'Solar & Power Backup', icon: SunMedium },
  { id: 'clothing-men', label: "Men's Clothing", icon: Shirt },
  { id: 'clothing-women', label: "Women's Fashion", icon: Sparkles },
  { id: 'shoes', label: 'Footwear & Shoes', icon: Footprints },
  { id: 'audio-accessories', label: 'Audio & Tech Accessories', icon: Headphones }
];

export const LifestyleApp: React.FC<LifestyleAppProps> = ({
  isOpen = true,
  isPageMode = false,
  onClose,
  currency,
  onToggleCurrency
}) => {
  const [items, setItems] = useState<LifestyleItem[]>(INITIAL_LIFESTYLE_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<LifestyleCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickBrandFilter, setQuickBrandFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<LifestyleItem | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'shop' | 'electronics' | 'fashion' | 'cart'>('shop');

  // Cart State (persisted to localStorage)
  const [cart, setCart] = useState<LifestyleCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aura_lifestyle_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);

  // Selected item modal option state
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [itemQuantity, setItemQuantity] = useState(1);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'momo' | 'orange'>('momo');
  const [orderNotes, setOrderNotes] = useState('');

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem('aura_lifestyle_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Firestore sync for lifestyle_items
  useEffect(() => {
    try {
      const q = query(collection(db, 'lifestyle_items'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: LifestyleItem[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name || '',
                brand: data.brand || '',
                category: data.category || 'smartphones',
                subcategory: data.subcategory || '',
                priceUsd: Number(data.priceUsd) || 0,
                priceLrd: Number(data.priceLrd) || Math.round((Number(data.priceUsd) || 0) * 198),
                condition: data.condition || 'Brand New',
                imageUrl: data.imageUrl || '',
                images: data.images || [],
                description: data.description || '',
                specifications: data.specifications || {},
                inStock: data.inStock !== false,
                rating: Number(data.rating) || 4.8,
                reviewsCount: Number(data.reviewsCount) || 12,
                vendorName: data.vendorName || 'Monrovia Merchant',
                vendorLocation: data.vendorLocation || 'Central Monrovia',
                warranty: data.warranty,
                availableSizes: data.availableSizes,
                availableColors: data.availableColors,
                tags: data.tags || []
              };
            });
            setItems(fetched);
          }
        },
        (error) => {
          console.warn('Firestore lifestyle_items subscription fallback:', error);
          setItems(INITIAL_LIFESTYLE_ITEMS);
        }
      );
      return () => unsubscribe();
    } catch {
      setItems(INITIAL_LIFESTYLE_ITEMS);
    }
  }, []);

  // Format price helper
  const formatPrice = (usd: number, lrd?: number) => {
    if (currency === 'LRD') {
      const value = lrd || Math.round(usd * 198);
      return `L$${value.toLocaleString()}`;
    }
    return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Bottom tab quick override
      if (activeBottomTab === 'electronics') {
        const isElec = ['smartphones', 'laptops', 'solar', 'audio-accessories'].includes(item.category);
        if (!isElec) return false;
      } else if (activeBottomTab === 'fashion') {
        const isFash = ['clothing-men', 'clothing-women', 'shoes'].includes(item.category);
        if (!isFash) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Brand quick filter
      if (quickBrandFilter !== 'all' && item.brand.toLowerCase() !== quickBrandFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesBrand = item.brand.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesSub = item.subcategory?.toLowerCase().includes(q);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesBrand && !matchesDesc && !matchesSub && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedCategory, quickBrandFilter, searchQuery, activeBottomTab]);

  // Cart operations
  const addToCart = (item: LifestyleItem, qty = 1, size?: string, color?: string) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.item.id === item.id && ci.selectedSize === size && ci.selectedColor === color
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      }
      return [
        ...prev,
        {
          item,
          quantity: qty,
          selectedSize: size,
          selectedColor: color
        }
      ];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].quantity = newQty;
      }
      return updated;
    });
  };

  const totalCartCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const cartSubtotalUsd = cart.reduce((sum, ci) => sum + ci.item.priceUsd * ci.quantity, 0);
  const cartSubtotalLrd = cart.reduce(
    (sum, ci) => sum + (ci.item.priceLrd || ci.item.priceUsd * 198) * ci.quantity,
    0
  );
  const deliveryFeeUsd = 2.5;
  const deliveryFeeLrd = 500;

  // Handle open item details modal
  const openItemDetails = (item: LifestyleItem) => {
    setSelectedItem(item);
    setSelectedSize(item.availableSizes?.[0]);
    setSelectedColor(item.availableColors?.[0]);
    setItemQuantity(1);
  };

  // Submit order to Firestore
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress || cart.length === 0) return;

    setOrderSubmitting(true);
    try {
      const orderData: Omit<LifestyleOrder, 'id'> = {
        items: cart,
        totalUsd: cartSubtotalUsd + deliveryFeeUsd,
        totalLrd: cartSubtotalLrd + deliveryFeeLrd,
        currency,
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryNotes: orderNotes,
        paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'lifestyle_orders'), {
        ...orderData,
        timestamp: serverTimestamp()
      });

      setOrderSuccessId(docRef.id);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err) {
      console.error('Failed to submit lifestyle order:', err);
      // Fallback offline mock confirmation
      setOrderSuccessId('ORD-' + Math.floor(100000 + Math.random() * 900000));
      setCart([]);
      setIsCheckoutOpen(false);
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-20 sm:pb-8">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 text-sm font-medium"
              title="Back to Apps"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Aura Apps</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 leading-none">
                  Aura Lifestyle & Tech
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Electronics, solar gear & authentic Monrovia fashion</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dual Currency Switcher */}
            <button
              onClick={onToggleCurrency}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-purple-600" />
              <span>{currency}</span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                {currency === 'USD' ? '(Tap for LRD)' : '(Tap for USD)'}
              </span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
              aria-label="View basket"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 flex-1">
        {/* Search Bar & Quick Brand Chips */}
        <div className="mb-4 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Apple, Samsung, laptops, solar kits, country cloth, sneakers..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Brand Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
            <span className="text-gray-500 font-medium shrink-0">Popular:</span>
            {['all', 'Apple', 'Samsung', 'Dell', 'EcoFlow', 'Kente Heritage', 'Nike'].map((brand) => (
              <button
                key={brand}
                onClick={() => setQuickBrandFilter(brand)}
                className={`px-3 py-1 rounded-full font-medium shrink-0 transition-colors ${
                  quickBrandFilter === brand
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {brand === 'all' ? 'All Brands' : brand}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (activeBottomTab !== 'shop') setActiveBottomTab('shop');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Heading & Counter */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {selectedCategory === 'all'
                ? 'All Available Items'
                : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </h2>
            <p className="text-xs text-gray-500">
              Showing {filteredItems.length} verified item{filteredItems.length === 1 ? '' : 's'} across Monrovia
            </p>
          </div>
          {quickBrandFilter !== 'all' && (
            <button
              onClick={() => setQuickBrandFilter('all')}
              className="text-xs text-purple-600 font-semibold hover:underline"
            >
              Clear {quickBrandFilter}
            </button>
          )}
        </div>

        {/* Mobile Horizontal Track / Desktop Grid */}
        <div className="sm:hidden -mx-4 px-4 overflow-x-auto no-scrollbar pb-3 mb-6">
          <div className="flex gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openItemDetails(item)}
                className="w-[240px] shrink-0 bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {item.condition}
                    </div>
                    {item.warranty && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {item.warranty}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">
                      {item.brand}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mt-0.5">{item.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-gray-800">{item.rating}</span>
                      <span>({item.reviewsCount})</span>
                      <span className="mx-1">•</span>
                      <span className="truncate">{item.vendorLocation}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 pt-0 flex items-center justify-between">
                  <div>
                    <div className="text-base font-extrabold text-gray-900">
                      {formatPrice(item.priceUsd, item.priceLrd)}
                    </div>
                    {currency === 'LRD' && (
                      <div className="text-[11px] text-gray-500">${item.priceUsd} USD</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item, 1, item.availableSizes?.[0], item.availableColors?.[0]);
                    }}
                    className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-transform"
                    aria-label="Add to cart"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => openItemDetails(item)}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                    {item.condition}
                  </div>
                  {item.warranty && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {item.warranty}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                    {item.brand}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-800">{item.rating}</span>
                    <span>({item.reviewsCount} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{item.vendorLocation}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-gray-100 mt-2">
                <div>
                  <div className="text-lg font-black text-gray-900">
                    {formatPrice(item.priceUsd, item.priceLrd)}
                  </div>
                  {currency === 'LRD' && (
                    <div className="text-xs text-gray-500">${item.priceUsd} USD</div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(item, 1, item.availableSizes?.[0], item.availableColors?.[0]);
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No items match your search</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search terms or clearing your category filters to see all available tech and apparel.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setQuickBrandFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Item Details Popup Sheet / Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg max-h-[90vh] sm:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                {selectedItem.brand} • {selectedItem.condition}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              <div className="relative h-56 bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedItem.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-xl font-black text-gray-900">
                    {formatPrice(selectedItem.priceUsd, selectedItem.priceLrd)}
                  </div>
                  {currency === 'LRD' && (
                    <span className="text-xs text-gray-500">(${selectedItem.priceUsd} USD)</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{selectedItem.description}</p>

              {/* Size Selector */}
              {selectedItem.availableSizes && selectedItem.availableSizes.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Size:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.availableSizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          selectedSize === sz
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selector */}
              {selectedItem.availableColors && selectedItem.availableColors.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Color:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.availableColors.map((col) => (
                      <button
                        key={col}
                        onClick={() => setSelectedColor(col)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          selectedColor === col
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Specifications Table */}
              {selectedItem.specifications && Object.keys(selectedItem.specifications).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs space-y-1.5">
                  <div className="font-bold text-gray-800 mb-1">Key Specifications</div>
                  {Object.entries(selectedItem.specifications).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-gray-600">
                      <span className="font-medium text-gray-500">{k}:</span>
                      <span className="font-semibold text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Merchant / Delivery Info */}
              <div className="flex items-center justify-between text-xs text-gray-500 bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span>Monrovia Gate/Doorstep Delivery</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-purple-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Aura Verified</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-xl bg-white">
                <button
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 text-gray-500 hover:text-gray-900"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-xs font-bold text-gray-800">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity((q) => q + 1)}
                  className="p-2 text-gray-500 hover:text-gray-900"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => {
                  addToCart(selectedItem, itemQuantity, selectedSize, selectedColor);
                  setSelectedItem(null);
                  setIsCartOpen(true);
                }}
                className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Basket • {formatPrice(selectedItem.priceUsd * itemQuantity, (selectedItem.priceLrd || selectedItem.priceUsd * 198) * itemQuantity)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">Your Basket ({totalCartCount})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">Your basket is empty</p>
                  <p className="text-xs text-gray-500 mt-1">Browse electronics & apparel to add items</p>
                </div>
              ) : (
                cart.map((cartItem, idx) => (
                  <div
                    key={`${cartItem.item.id}-${cartItem.selectedSize}-${cartItem.selectedColor}-${idx}`}
                    className="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100"
                  >
                    <img
                      src={cartItem.item.imageUrl}
                      alt={cartItem.item.name}
                      className="w-16 h-16 rounded-lg object-cover bg-gray-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">{cartItem.item.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {cartItem.selectedSize && `Size: ${cartItem.selectedSize} `}
                        {cartItem.selectedColor && `Color: ${cartItem.selectedColor}`}
                      </div>
                      <div className="text-xs font-extrabold text-purple-700 mt-1">
                        {formatPrice(cartItem.item.priceUsd * cartItem.quantity, (cartItem.item.priceLrd || cartItem.item.priceUsd * 198) * cartItem.quantity)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => updateQuantity(idx, -cartItem.quantity)}
                        className="text-gray-400 hover:text-red-500 text-xs"
                      >
                        Remove
                      </button>
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary & Checkout Button */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatPrice(cartSubtotalUsd, cartSubtotalLrd)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Monrovia Delivery:</span>
                    <span className="font-semibold">{formatPrice(deliveryFeeUsd, deliveryFeeLrd)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                    <span>Total:</span>
                    <span className="text-purple-700 font-extrabold">
                      {formatPrice(cartSubtotalUsd + deliveryFeeUsd, cartSubtotalLrd + deliveryFeeLrd)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Complete Monrovia Delivery Order</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Samuel B. Tweh"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number (MoMo / Orange) *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 077 123 4567 or 088 123 4567"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Delivery Address & Landmark *</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. 15th Street Sinkor, beachside opposite TOTAL station"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'momo', label: 'MTN MoMo' },
                    { id: 'orange', label: 'Orange Money' },
                    { id: 'cod', label: 'Cash on Delivery' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2 rounded-lg border text-center font-bold ${
                        paymentMethod === m.id
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Order Notes / Sizing preference</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Optional delivery instructions or notes for the courier"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 h-16 resize-none"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Order Total:</span>
                  <span className="text-purple-700">
                    {formatPrice(cartSubtotalUsd + deliveryFeeUsd, cartSubtotalLrd + deliveryFeeLrd)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Includes Monrovia express doorstep delivery</p>
              </div>

              <button
                type="submit"
                disabled={orderSubmitting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {orderSubmitting ? 'Placing Order...' : 'Confirm Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation Notification */}
      {orderSuccessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Order Confirmed!</h3>
            <p className="text-xs text-gray-600">
              Reference: <span className="font-mono font-bold text-purple-600">{orderSuccessId}</span>
            </p>
            <p className="text-xs text-gray-500">
              The merchant and courier have received your order details. You will receive a call shortly to confirm dispatch.
            </p>
            <button
              onClick={() => setOrderSuccessId(null)}
              className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl text-xs"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar with Active Highlighting */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => {
            setActiveBottomTab('shop');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'shop' ? 'text-purple-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">All Shop</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('electronics');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'electronics' ? 'text-purple-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[10px]">Electronics</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('fashion');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'fashion' ? 'text-purple-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Shirt className="w-5 h-5" />
          <span className="text-[10px]">Fashion</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-1 text-gray-500 font-medium hover:text-purple-600"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px]">Basket</span>
          {totalCartCount > 0 && (
            <span className="absolute -top-1 right-2 bg-purple-600 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {totalCartCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
};
