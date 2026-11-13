import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Store, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { 
  SupermarketStore, 
  SupermarketItem, 
  Currency, 
  USD_TO_LRD_RATE, 
  Order 
} from '../types';
import { SUPERMARKETS, SUPERMARKET_CATEGORIES, SUPERMARKET_ITEMS } from '../data/supermarketData';
import { ShoppingCheckoutModal, ShoppingCartItem } from './ShoppingCheckoutModal';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

interface SupermarketAppProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  isPageMode?: boolean;
  onOrderPlaced?: (order: Order) => void;
  onOpenStorePortal?: (storeId: string) => void;
}

export const SupermarketApp: React.FC<SupermarketAppProps> = ({
  isOpen,
  onClose,
  currency,
  isPageMode = false,
  onOrderPlaced,
  onOpenStorePortal,
}) => {
  const [stores, setStores] = useState<SupermarketStore[]>(SUPERMARKETS);
  const [items, setItems] = useState<SupermarketItem[]>(SUPERMARKET_ITEMS);

  useEffect(() => {
    const unsubStores = onSnapshot(
      collection(db, 'supermarkets'),
      (snap) => {
        const fetched: SupermarketStore[] = [];
        snap.forEach((d) => fetched.push(d.data() as SupermarketStore));
        setStores(fetched);
      },
      (err) => console.warn('Supermarkets sync notice:', err)
    );

    const unsubItems = onSnapshot(
      collection(db, 'supermarket_items'),
      (snap) => {
        const fetched: SupermarketItem[] = [];
        snap.forEach((d) => fetched.push(d.data() as SupermarketItem));
        setItems(fetched);
      },
      (err) => console.warn('Supermarket items sync notice:', err)
    );

    return () => {
      unsubStores();
      unsubItems();
    };
  }, []);

  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  // Element refs for quick mobile navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const storesRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Dedicated Shopping Basket (completely decoupled from restaurant food cart)
  const [shoppingCart, setShoppingCart] = useState<ShoppingCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aura_shopping_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Sync shopping cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aura_shopping_cart', JSON.stringify(shoppingCart));
    } catch {}
  }, [shoppingCart]);

  const cartTotalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotalUsd = shoppingCart.reduce((sum, item) => sum + (item.item.priceUsd * item.quantity), 0);

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      const lrd = Math.round(usd * USD_TO_LRD_RATE);
      return `L$${lrd.toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  // Add item to shopping basket
  const handleAddToCart = (smItem: SupermarketItem) => {
    setShoppingCart((prev) => {
      const existing = prev.find((i) => i.item.id === smItem.id);
      if (existing) {
        return prev.map((i) => 
          i.item.id === smItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item: smItem, quantity: 1 }];
    });

    setAddedItemNotice(smItem.name);
    setTimeout(() => {
      setAddedItemNotice((prev) => (prev === smItem.name ? null : prev));
    }, 2000);
  };

  // Update item quantity in basket
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setShoppingCart((prev) => {
      return prev
        .map((i) => {
          if (i.item.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as ShoppingCartItem[];
    });
  };

  // Remove item from basket
  const handleRemoveItem = (itemId: string) => {
    setShoppingCart((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  // Filter items based on store, category, and search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedStoreId !== 'all' && item.supermarketId !== selectedStoreId) {
        return false;
      }
      if (selectedCategory !== 'All Items' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.supermarketName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedStoreId, selectedCategory, searchQuery, items]);

  if (!isOpen && !isPageMode) return null;

  const currentStore = stores.find((s) => s.id === selectedStoreId);

  // Main Browsing & Catalog Body
  const catalogBody = (
    <div className="flex-1 flex flex-col min-h-0">
      
      {/* Toast Notification when item added */}
      {addedItemNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2 border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-[#06C167]" />
          <span>Added "{addedItemNotice}" to shopping basket!</span>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search American rice, Dutch Lady milk, spaghetti, oils, snacks..."
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#06C167] shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Store Selector Carousel */}
        <div ref={storesRef} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#059669]" />
              <span>Choose Monrovia Supermarket</span>
            </div>
            {selectedStoreId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedStoreId('all')}
                className="text-xs font-bold text-[#06C167] hover:underline"
              >
                View All Stores
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedStoreId('all')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedStoreId === 'all'
                  ? 'border-[#06C167] bg-[#E8F8EE] shadow-xs ring-1 ring-[#06C167]'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-xs font-black text-gray-900">All Supermarkets</div>
              <div className="text-[10px] text-gray-500 mt-1">Cross-store shopping</div>
            </button>

            {stores.map((sm) => {
              const isSelected = selectedStoreId === sm.id;
              return (
                <button
                  key={sm.id}
                  type="button"
                  onClick={() => setSelectedStoreId(sm.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#06C167] bg-[#E8F8EE] shadow-xs ring-1 ring-[#06C167]'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black text-gray-900 line-clamp-1">{sm.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{sm.neighborhood}</div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-800">
                    <Clock className="w-3 h-3 text-[#059669]" />
                    <span>~{sm.deliveryTimeMinutes}m courier</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Store Banner */}
        {currentStore && (
          <div className="p-4 bg-gradient-to-r from-emerald-950 to-gray-900 rounded-2xl text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                <Store className="w-6 h-6 text-[#06C167]" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">{currentStore.name}</h4>
                <p className="text-xs text-gray-300">{currentStore.tagline} &bull; {currentStore.address}</p>
              </div>
            </div>
            {onOpenStorePortal && (
              <button
                type="button"
                onClick={() => onOpenStorePortal(currentStore.id)}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition"
              >
                <span>Store Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Category Pills Bar */}
        <div ref={categoriesRef} className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SUPERMARKET_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Catalog Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">
              {filteredItems.length} Products Found
            </span>
            <span className="text-xs text-gray-400 font-medium">Prices in USD &amp; LRD</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-white rounded-2xl border border-gray-200">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
              <div className="text-sm font-bold text-gray-700">No products found</div>
              <p className="text-xs text-gray-400">Try adjusting your store or category filter</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedStoreId('all');
                  setSelectedCategory('All Items');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredItems.map((item) => {
                const inBasket = shoppingCart.find((i) => i.item.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-gray-200/80 p-3 flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Product Image */}
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold rounded-md">
                          {item.unitWeight}
                        </span>
                      </div>

                      {/* Store Badge */}
                      <div className="text-[10px] font-bold text-[#059669] line-clamp-1 mb-1">
                        {item.supermarketName}
                      </div>

                      {/* Product Name & Description */}
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-1 group-hover:text-[#06C167] transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>

                    {/* Price & Quantity Controls */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-black text-xs sm:text-sm text-gray-900">
                          {formatPrice(item.priceUsd)}
                        </div>
                        <div className="text-[9px] text-gray-400">
                          {currency === 'USD' 
                            ? `~L$${Math.round(item.priceUsd * USD_TO_LRD_RATE)}` 
                            : `$${item.priceUsd.toFixed(2)} USD`}
                        </div>
                      </div>

                      {inBasket ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white text-emerald-800 flex items-center justify-center font-bold hover:bg-emerald-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-black text-xs text-emerald-900 px-1">
                            {inBasket.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-[#06C167] text-white flex items-center justify-center font-bold hover:brightness-105"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="py-1.5 px-3 bg-gradient-to-r from-[#06C167] to-[#048747] hover:brightness-105 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Merchant & Manager Footer Link */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-black text-gray-900">Are you a Supermarket or Mart Manager?</div>
            <p className="text-[11px] text-gray-500">Access your store inventory, prices, orders and daily settlements</p>
          </div>
          {onOpenStorePortal && (
            <button
              type="button"
              onClick={() => onOpenStorePortal('supermarket_stop_shop')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition shadow-xs whitespace-nowrap"
            >
              Open Shopping Manager Portal &rarr;
            </button>
          )}
        </div>

      </div>
    </div>
  );

  // Dedicated Shopping Basket Drawer
  const basketDrawer = isBasketOpen && (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in"
      onClick={() => setIsBasketOpen(false)}
    >
      <div 
        className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900">Shopping Basket</h3>
              <p className="text-[10px] text-gray-500">{cartTotalItems} items selected</p>
            </div>
          </div>
          <button
            onClick={() => setIsBasketOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {shoppingCart.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto" />
              <div className="text-sm font-bold text-gray-700">Your basket is empty</div>
              <p className="text-xs text-gray-400">Add grocery items from Monrovia supermarkets</p>
            </div>
          ) : (
            shoppingCart.map((cartItem) => (
              <div key={cartItem.item.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                <img
                  src={cartItem.item.image}
                  alt={cartItem.item.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-xs text-gray-900 truncate">{cartItem.item.name}</h5>
                  <div className="text-[10px] text-gray-500">{cartItem.item.unitWeight} &bull; {cartItem.item.supermarketName}</div>
                  <div className="font-mono font-bold text-xs text-gray-900 mt-1">
                    {formatPrice(cartItem.item.priceUsd * cartItem.quantity)}
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleUpdateQuantity(cartItem.item.id, -1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-bold text-xs px-1.5">{cartItem.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(cartItem.item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-[#06C167] text-white flex items-center justify-center hover:brightness-105"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveItem(cartItem.item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Dedicated Checkout CTA */}
        {shoppingCart.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">Grocery Subtotal</span>
              <div className="text-right">
                <div className="font-mono font-black text-base text-gray-900">{formatPrice(cartSubtotalUsd)}</div>
                <div className="text-[10px] text-gray-400">
                  {currency === 'USD' ? `~L$${Math.round(cartSubtotalUsd * USD_TO_LRD_RATE)}` : `$${cartSubtotalUsd.toFixed(2)} USD`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsBasketOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#059669] via-[#06C167] to-[#048747] hover:brightness-105 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-between cursor-pointer"
            >
              <span>Proceed to Grocery Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Dedicated Checkout Modal
  const checkoutModal = (
    <ShoppingCheckoutModal
      isOpen={isCheckoutOpen}
      onClose={() => setIsCheckoutOpen(false)}
      items={shoppingCart}
      currency={currency}
      onOrderPlaced={(order) => {
        setShoppingCart([]);
        try {
          localStorage.removeItem('aura_shopping_cart');
        } catch {}
        if (onOrderPlaced) onOrderPlaced(order);
      }}
    />
  );

  // Dedicated Mobile Bottom Navigation Bar & Floating Basket Bar
  const mobileBottomBar = (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-2xl safe-area-pb">
      {/* Floating Checkout Pill (Displays when basket has items) */}
      {cartTotalItems > 0 && (
        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={() => setIsBasketOpen(true)}
            className="w-full py-2.5 px-3.5 bg-gradient-to-r from-[#059669] via-[#06C167] to-[#048747] text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center justify-between active:scale-98 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-mono text-[11px] font-bold">
                {cartTotalItems}
              </div>
              <span>View Grocery Basket</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span>{formatPrice(cartSubtotalUsd)}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Navigation Tabs (Stores, Aisles, Search, Basket) */}
      <div className="grid grid-cols-4 py-1.5 px-2 text-center text-gray-500">
        <button
          type="button"
          onClick={() => {
            storesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer text-gray-600 hover:text-[#059669]"
        >
          <Store className="w-4 h-4" />
          <span className="text-[10px] font-bold">Stores</span>
        </button>

        <button
          type="button"
          onClick={() => {
            categoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer text-gray-600 hover:text-[#059669]"
        >
          <Filter className="w-4 h-4" />
          <span className="text-[10px] font-bold">Aisles</span>
        </button>

        <button
          type="button"
          onClick={() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer text-gray-600 hover:text-[#059669]"
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] font-bold">Search</span>
        </button>

        <button
          type="button"
          onClick={() => setIsBasketOpen(true)}
          className="py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer text-gray-600 hover:text-[#059669] relative"
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4" />
            {cartTotalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 bg-[#06C167] text-white rounded-full text-[9px] font-black flex items-center justify-center">
                {cartTotalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Basket</span>
        </button>
      </div>
    </div>
  );

  // FULL SCREEN PAGE MODE (Primary Experience)
  if (isPageMode) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans">
        {/* Decluttered sticky top navbar (Optimized for mobile & desktop) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-gray-900 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between border-b border-gray-200 shadow-xs">
          {/* Left: Compact back button + Store branding */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 sm:px-3 sm:py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
              title="Back to Apps"
              aria-label="Back to Apps"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Aura Apps</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#059669] to-[#10B981] text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-xs sm:text-base text-gray-900 tracking-tight truncate">
                    AURA Shopping
                  </h1>
                  <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 shrink-0">
                    Monrovia Marts
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                  {currentStore ? currentStore.name : 'Monrovia Groceries & Marts'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Search & Basket Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
              title="Search Groceries"
              aria-label="Search Groceries"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Basket Button */}
            <button
              onClick={() => setIsBasketOpen(true)}
              className="hidden sm:flex px-3.5 py-2 bg-gradient-to-r from-[#059669] to-[#06C167] hover:brightness-105 text-white text-xs font-bold rounded-xl transition items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Basket ({cartTotalItems})</span>
            </button>

            {/* Mobile Header Basket Icon (Compact with live badge) */}
            <button
              onClick={() => setIsBasketOpen(true)}
              className="sm:hidden relative p-2 bg-gradient-to-r from-[#059669] to-[#06C167] text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              title="Open Basket"
              aria-label="Open Basket"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartTotalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                  {cartTotalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content with bottom padding to clear the mobile bottom bar */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 pb-28 sm:pb-12 flex flex-col">
          <div className="bg-[#FAFAFA] rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
            {catalogBody}
          </div>
        </main>

        {mobileBottomBar}
        {basketDrawer}
        {checkoutModal}
      </div>
    );
  }

  // MODAL OVERLAY MODE (Fallback if invoked as overlay)
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative bg-[#FAFAFA] w-full max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-full sm:max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-gray-200 bg-white sticky top-0 z-20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-[#10B981] text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 leading-tight truncate">AURA Shopping</h3>
                <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">{currentStore ? currentStore.name : 'Monrovia Marts'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsBasketOpen(true)}
              className="relative px-2.5 sm:px-3 py-1.5 bg-[#06C167] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Basket</span>
              <span>({cartTotalItems})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 sm:pb-4 flex flex-col">
          {catalogBody}
        </div>

        {mobileBottomBar}
      </div>

      {basketDrawer}
      {checkoutModal}
    </div>
  );
};
