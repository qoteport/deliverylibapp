import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  Smartphone,
  Laptop,
  SunMedium,
  Shirt,
  LayoutGrid,
  Footprints,
  Headphones,
  Check,
  CheckCircle2,
  X,
  Plus,
  Minus,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
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
  Star,
  Camera,
  Film,
  Send,
  Store,
  Package,
  RotateCcw
} from 'lucide-react';
import { MediaGalleryViewer } from './MediaGalleryViewer';
import { MediaUploadField } from './MediaUploadField';
import {
  LifestyleItem,
  LifestyleCategory,
  LifestyleCartItem,
  LifestyleOrder,
  LifestyleMessage
} from '../types';
import { INITIAL_LIFESTYLE_ITEMS } from '../data/lifestyleData';
import { db } from '../firebase/config';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
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
  { id: 'all', label: 'All Items', icon: LayoutGrid },
  { id: 'smartphones', label: 'Smartphones & Tablets', icon: Smartphone },
  { id: 'laptops', label: 'Laptops & Computers', icon: Laptop },
  { id: 'solar', label: 'Solar & Power Backup', icon: SunMedium },
  { id: 'clothing-men', label: "Men's Clothing", icon: Shirt },
  { id: 'clothing-women', label: "Women's Fashion", icon: Heart },
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
  const [activeBottomTab, setActiveBottomTab] = useState<'shop' | 'electronics' | 'fashion' | 'cart' | 'vendor_orders'>('shop');
  const [viewMode, setViewMode] = useState<'shop' | 'vendor_orders'>('shop');

  // Multi-vendor checkout step-through state
  interface VendorGroup {
    vendorName: string;
    vendorPhone: string;
    vendorLocation: string;
    items: LifestyleCartItem[];
    subtotalUsd: number;
  }
  const [activeVendorGroups, setActiveVendorGroups] = useState<VendorGroup[]>([]);
  const [currentVendorIndex, setCurrentVendorIndex] = useState(0);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');

  // Two-way messaging state
  const [messages, setMessages] = useState<LifestyleMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Vendor Portal / Orders state & chat modal
  const [vendorOrders, setVendorOrders] = useState<LifestyleOrder[]>([]);
  const [vendorOrderFilter, setVendorOrderFilter] = useState<'all' | 'pending' | 'fulfilled'>('all');
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<LifestyleOrder | null>(null);
  const [isVendorChatModalOpen, setIsVendorChatModalOpen] = useState(false);

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

  // Add Product State (Multiple Images + 1 Video)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<LifestyleCategory>('smartphones');
  const [newProductPriceUsd, setNewProductPriceUsd] = useState('');
  const [newProductCondition, setNewProductCondition] = useState<'Brand New' | 'Certified Used' | 'Handcrafted'>('Brand New');
  const [newProductWarranty, setNewProductWarranty] = useState('1 Year Warranty');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [newProductVideoUrl, setNewProductVideoUrl] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

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
                imageUrl: data.imageUrl || (Array.isArray(data.images) && data.images[0]) || '',
                images: Array.isArray(data.images) && data.images.length > 0 ? data.images : data.imageUrl ? [data.imageUrl] : [],
                videoUrl: data.videoUrl || undefined,
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

  // Real-time listener for lifestyle_orders
  useEffect(() => {
    try {
      const q = query(collection(db, 'lifestyle_orders'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: LifestyleOrder[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any)
          }));
          setVendorOrders(list);
        },
        (err) => console.warn('lifestyle_orders sync notice:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn('lifestyle_orders setup error:', e);
    }
  }, []);

  // Real-time listener for lifestyle_messages based on activeChatOrderId
  const activeChatOrderId = selectedOrderForChat?.id || currentOrderId;
  useEffect(() => {
    if (!activeChatOrderId) return;
    try {
      const q = query(collection(db, 'lifestyle_messages'), orderBy('createdAt', 'asc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: LifestyleMessage[] = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((m) => m.orderId === activeChatOrderId);
          setMessages(list);
        },
        (err) => console.warn('lifestyle_messages sync notice:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn('lifestyle_messages setup error:', e);
    }
  }, [activeChatOrderId]);

  // Filter vendor orders
  const filteredVendorOrders = useMemo(() => {
    if (vendorOrderFilter === 'all') return vendorOrders;
    return vendorOrders.filter((o) => o.status === vendorOrderFilter);
  }, [vendorOrders, vendorOrderFilter]);

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
      if (quickBrandFilter !== 'all' && String(item?.brand || '').toLowerCase() !== String(quickBrandFilter || '').toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = String(item?.name || '').toLowerCase().includes(q);
        const matchesBrand = String(item?.brand || '').toLowerCase().includes(q);
        const matchesDesc = String(item?.description || '').toLowerCase().includes(q);
        const matchesSub = String(item?.subcategory || '').toLowerCase().includes(q);
        const matchesTags = Array.isArray(item?.tags) && item.tags.some((t) => String(t || '').toLowerCase().includes(q));
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

  // Handle Add Product Submit (Multiple Photos + 1 Video)
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPriceUsd) return;

    setIsSavingProduct(true);
    const usd = Number(newProductPriceUsd) || 0;
    const lrd = Math.round(usd * 198);
    const fallback = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80';
    const finalImages = newProductImages.length > 0 ? newProductImages : [fallback];

    const newItemData: Omit<LifestyleItem, 'id'> = {
      name: newProductName.trim(),
      brand: newProductBrand.trim() || 'Monrovia Merchant',
      category: newProductCategory,
      priceUsd: usd,
      priceLrd: lrd,
      condition: newProductCondition,
      imageUrl: finalImages[0],
      images: finalImages,
      videoUrl: newProductVideoUrl.trim() || undefined,
      description: newProductDescription.trim() || `${newProductName} available for fast Monrovia delivery.`,
      specifications: { 'Condition': newProductCondition, 'Warranty': newProductWarranty },
      inStock: true,
      rating: 5.0,
      reviewsCount: 1,
      vendorName: 'Aura Verified Merchant',
      vendorLocation: 'Tubman Blvd, Sinkor',
      warranty: newProductWarranty
    };

    try {
      const docRef = await addDoc(collection(db, 'lifestyle_items'), {
        ...newItemData,
        createdAt: serverTimestamp()
      });
      setItems((prev) => [{ ...newItemData, id: docRef.id }, ...prev]);
    } catch {
      setItems((prev) => [{ ...newItemData, id: 'item-local-' + Date.now() }, ...prev]);
    } finally {
      setIsSavingProduct(false);
      setIsAddProductOpen(false);
      setNewProductName('');
      setNewProductBrand('');
      setNewProductPriceUsd('');
      setNewProductDescription('');
      setNewProductImages([]);
      setNewProductVideoUrl('');
    }
  };

  // Handle open item details modal
  const openItemDetails = (item: LifestyleItem) => {
    setSelectedItem(item);
    setSelectedSize(item.availableSizes?.[0]);
    setSelectedColor(item.availableColors?.[0]);
    setItemQuantity(1);
  };

  // Submit order to Firestore and open Vendor Contact popup
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress || cart.length === 0) return;

    setOrderSubmitting(true);
    try {
      // Group items by vendor
      const map = new Map<string, VendorGroup>();
      cart.forEach((ci) => {
        const vName = ci.item.vendorName || 'Monrovia Merchant';
        const vPhone = ci.item.vendorPhone || '0777 882 100';
        const vLoc = ci.item.vendorNeighborhood || ci.item.vendorLocation || 'Tubman Blvd, Sinkor';
        if (!map.has(vName)) {
          map.set(vName, {
            vendorName: vName,
            vendorPhone: vPhone,
            vendorLocation: vLoc,
            items: [],
            subtotalUsd: 0,
          });
        }
        const group = map.get(vName)!;
        group.items.push(ci);
        group.subtotalUsd += ci.item.priceUsd * ci.quantity;
      });
      const groups = Array.from(map.values());

      const orderRef = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const orderData: Omit<LifestyleOrder, 'id'> = {
        orderNumber: orderRef,
        items: cart,
        totalUsd: cartSubtotalUsd + deliveryFeeUsd,
        totalLrd: cartSubtotalLrd + deliveryFeeLrd,
        currency,
        customerName,
        customerPhone,
        deliveryAddress,
        status: 'pending',
        vendorName: groups.map(g => g.vendorName).join(', '),
        createdAt: new Date().toISOString()
      };

      let createdId = orderRef;
      try {
        const docRef = await addDoc(collection(db, 'lifestyle_orders'), {
          ...orderData,
          timestamp: serverTimestamp()
        });
        createdId = docRef.id;
      } catch (err) {
        console.warn('Fallback offline order creation:', err);
      }

      // Add starter inquiry message from customer to the first vendor
      try {
        const firstVendor = groups[0];
        const itemNames = firstVendor?.items.map(i => `${i.quantity}x ${i.item.name}`).join(', ');
        await addDoc(collection(db, 'lifestyle_messages'), {
          orderId: createdId,
          senderRole: 'customer',
          senderName: customerName,
          vendorName: firstVendor?.vendorName || 'Merchant',
          text: `Hello ${firstVendor?.vendorName || 'Merchant'}, I placed order #${orderRef} for ${itemNames}. Please confirm dispatch to ${deliveryAddress}.`,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.warn('Initial message write notice:', e);
      }

      setCurrentOrderId(createdId);
      setActiveVendorGroups(groups);
      setCurrentVendorIndex(0);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsVendorModalOpen(true);
    } catch (err) {
      console.error('Failed to submit lifestyle order:', err);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Two-way messaging handler
  const handleSendMessage = async (
    senderRole: 'customer' | 'vendor',
    senderName: string,
    vendorName: string
  ) => {
    if (!chatInputText.trim() || !activeChatOrderId) return;
    const textToSend = chatInputText.trim();
    setChatInputText('');
    setIsSendingMessage(true);
    try {
      await addDoc(collection(db, 'lifestyle_messages'), {
        orderId: activeChatOrderId,
        senderRole,
        senderName,
        vendorName,
        text: textToSend,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn('Error sending message:', e);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Vendor order fulfillment handler
  const handleUpdateOrderStatus = async (orderId: string, status: 'fulfilled' | 'pending') => {
    setVendorOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status, fulfilledAt: status === 'fulfilled' ? new Date().toISOString() : undefined } : o))
    );
    try {
      await updateDoc(doc(db, 'lifestyle_orders', orderId), {
        status,
        ...(status === 'fulfilled' ? { fulfilledAt: new Date().toISOString() } : {})
      });
    } catch (e) {
      console.warn('Firestore update order status notice:', e);
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

            {/* Vendor Orders / Shop Toggle */}
            <button
              onClick={() => {
                const nextMode = viewMode === 'shop' ? 'vendor_orders' : 'shop';
                setViewMode(nextMode);
                setActiveBottomTab(nextMode === 'vendor_orders' ? 'vendor_orders' : 'shop');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                viewMode === 'vendor_orders'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{viewMode === 'vendor_orders' ? 'Back to Shop' : 'Vendor Portal'}</span>
              {vendorOrders.filter(o => o.status === 'pending').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {vendorOrders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>

            {/* List Product Button */}
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List Product</span>
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
        {viewMode === 'vendor_orders' ? (
          <div className="space-y-4 mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Merchant & Vendor Orders
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Review customer orders, message buyers in real time, and mark orders fulfilled.
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setVendorOrderFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    vendorOrderFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({vendorOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVendorOrderFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    vendorOrderFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pending ({vendorOrders.filter(o => o.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setVendorOrderFilter('fulfilled')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    vendorOrderFilter === 'fulfilled'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Fulfilled ({vendorOrders.filter(o => o.status === 'fulfilled').length})
                </button>
              </div>
            </div>

            {/* Orders List */}
            {filteredVendorOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900">No Orders in this category</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Customer orders placed through Lifestyle & Tech will appear here.
                </p>
                <button
                  onClick={() => {
                    setViewMode('shop');
                    setActiveBottomTab('shop');
                  }}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
                >
                  Back to Store
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVendorOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs hover:border-purple-200 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                            #{order.orderNumber || order.id}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              order.status === 'fulfilled'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {order.status === 'fulfilled' ? 'Fulfilled ✓' : 'Pending Fulfillment'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>Placed: {new Date(order.createdAt).toLocaleString()}</span>
                          {order.fulfilledAt && (
                            <span className="text-emerald-600 font-bold ml-2">
                              • Fulfilled: {new Date(order.fulfilledAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-black text-gray-900">
                          ${order.totalUsd.toFixed(2)} USD
                        </div>
                        <div className="text-xs text-gray-500">
                          ≈ L${(order.totalLrd || Math.round(order.totalUsd * 198)).toLocaleString()} LRD
                        </div>
                      </div>
                    </div>

                    {/* Customer Contact & Delivery Destination */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Customer Details:</span>
                        <div className="font-extrabold text-sm text-gray-900">{order.customerName}</div>
                        <div className="text-gray-600 font-mono text-xs font-bold">{order.customerPhone}</div>
                        <div className="flex items-center gap-2 pt-1.5">
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-purple-600" />
                            <span>Call Buyer</span>
                          </a>
                          <a
                            href={`https://wa.me/${String(order.customerPhone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Delivery Destination:</span>
                        <div className="font-bold text-gray-900 text-xs flex items-start gap-1.5 mt-0.5">
                          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{order.deliveryAddress}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 pt-1">
                          Monrovia Doorstep Courier Delivery
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Items in this Order ({order.items?.length || 0})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {order.items?.map((ci, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-100 text-xs"
                          >
                            <img
                              src={ci.item.imageUrl || (ci.item as any).image}
                              alt={ci.item.name}
                              className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-100"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-gray-900 truncate">{ci.item.name}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Qty: <span className="font-bold text-gray-800">{ci.quantity}</span>
                                {ci.selectedSize ? ` • Size: ${ci.selectedSize}` : ''}
                                {ci.selectedColor ? ` • Color: ${ci.selectedColor}` : ''}
                              </div>
                            </div>
                            <div className="font-mono font-bold text-gray-900 shrink-0">
                              ${(ci.item.priceUsd * ci.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Bar: Check as Fulfilled & Two-Way Chat */}
                    <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForChat(order);
                          setIsVendorChatModalOpen(true);
                        }}
                        className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-purple-600" />
                        <span>Chat with Buyer (Two-Way Message)</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {order.status !== 'fulfilled' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'fulfilled')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Check as Fulfilled ✓</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'pending')}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Mark as Pending</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
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

        {/* Products Grid: 2 columns on mobile, 2 on sm, 3 on lg, 4 on xl */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 mb-8">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => openItemDetails(item)}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative aspect-square sm:aspect-auto sm:h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full">
                    {item.condition}
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 sm:gap-1.5 z-10">
                    {Array.isArray(item.images) && item.images.length > 1 && (
                      <span className="bg-black/70 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-0.5 sm:gap-1">
                        <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {item.images.length}
                      </span>
                    )}
                    {item.videoUrl && (
                      <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-0.5 sm:gap-1 shadow-xs">
                        <Film className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Video
                      </span>
                    )}
                  </div>
                  {item.warranty && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md">
                      {item.warranty}
                    </div>
                  )}
                </div>
                <div className="p-2.5 sm:p-4">
                  <div className="text-[10px] sm:text-xs font-semibold text-purple-600 uppercase tracking-wider truncate">
                    {item.brand}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 sm:mt-1 line-clamp-2 leading-snug group-hover:text-purple-600 transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-500">
                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-semibold text-gray-800">{item.rating}</span>
                    <span className="truncate">({item.reviewsCount})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                    <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{item.vendorLocation}</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-4 pt-0 flex items-center justify-between border-t border-gray-100 mt-1 sm:mt-2">
                <div className="min-w-0 pr-1">
                  <div className="text-sm sm:text-lg font-black text-gray-900 truncate">
                    {formatPrice(item.priceUsd, item.priceLrd)}
                  </div>
                  {currency === 'LRD' && (
                    <div className="text-[10px] sm:text-xs text-gray-500 truncate">${item.priceUsd} USD</div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(item, 1, item.availableSizes?.[0], item.availableColors?.[0]);
                  }}
                  className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors active:scale-95 shrink-0"
                  aria-label="Add to cart"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add</span>
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
              <MediaGalleryViewer
                images={
                  Array.isArray(selectedItem.images) && selectedItem.images.length > 0
                    ? selectedItem.images
                    : selectedItem.imageUrl
                    ? [selectedItem.imageUrl]
                    : []
                }
                videoUrl={selectedItem.videoUrl}
                title={selectedItem.name}
                heightClass="h-56 sm:h-64"
                badge={
                  <div className="flex items-center gap-1.5">
                    <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {selectedItem.condition}
                    </span>
                    {selectedItem.warranty && (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {selectedItem.warranty}
                      </span>
                    )}
                  </div>
                }
              />

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

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Order Total:</span>
                  <span className="text-purple-700">
                    {formatPrice(cartSubtotalUsd + deliveryFeeUsd, cartSubtotalLrd + deliveryFeeLrd)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Includes Monrovia express doorstep delivery. Payment is arranged directly with the merchant.</p>
              </div>

              <button
                type="submit"
                disabled={orderSubmitting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{orderSubmitting ? 'Processing Order...' : 'Proceed to Vendors'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR CONTACT & TWO-WAY MESSAGING POPUP (Shown after Checkout) */}
      {isVendorModalOpen && activeVendorGroups.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-purple-600">
                  {activeVendorGroups.length > 1
                    ? `Vendor ${currentVendorIndex + 1} of ${activeVendorGroups.length}`
                    : 'Contact Vendor to Complete Order'}
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {activeVendorGroups[currentVendorIndex]?.vendorName}
                </h3>
              </div>
              <button
                onClick={() => setIsVendorModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vendor Details Card */}
            <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-sm text-gray-900">
                    {activeVendorGroups[currentVendorIndex]?.vendorName}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{activeVendorGroups[currentVendorIndex]?.vendorLocation}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Verified Merchant
                </span>
              </div>

              {/* Call & WhatsApp Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${activeVendorGroups[currentVendorIndex]?.vendorPhone}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-800 shadow-2xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-purple-600" />
                  <span>Call {activeVendorGroups[currentVendorIndex]?.vendorPhone}</span>
                </a>
                <a
                  href={`https://wa.me/${String(activeVendorGroups[currentVendorIndex]?.vendorPhone || '').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Vendor</span>
                </a>
              </div>
            </div>

            {/* Items related to this Vendor */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Items from this Merchant ({activeVendorGroups[currentVendorIndex]?.items.length})</span>
                <span className="text-purple-700 font-mono font-bold">
                  ${activeVendorGroups[currentVendorIndex]?.subtotalUsd.toFixed(2)} USD
                </span>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {activeVendorGroups[currentVendorIndex]?.items.map((ci, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <img
                      src={ci.item.imageUrl || (ci.item as any).image}
                      alt={ci.item.name}
                      className="w-11 h-11 object-cover rounded-lg shrink-0 border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">{ci.item.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Qty: <span className="font-bold text-gray-800">{ci.quantity}</span>
                        {ci.selectedSize ? ` • Size: ${ci.selectedSize}` : ''}
                        {ci.selectedColor ? ` • Color: ${ci.selectedColor}` : ''}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-gray-900 shrink-0">
                      ${(ci.item.priceUsd * ci.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-Way Direct Messaging with Vendor */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-purple-600" />
                  <span>Two-Way Direct Chat with Vendor</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Sync
                </span>
              </div>

              {/* Message History */}
              <div className="h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    No messages yet. Send a message to coordinate dispatch or pickup.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.senderRole === 'customer' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-gray-500 font-medium mb-0.5">
                        {m.senderRole === 'customer' ? 'You (Buyer)' : m.senderName || 'Vendor'}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                          m.senderRole === 'customer'
                            ? 'bg-purple-600 text-white rounded-br-none shadow-2xs'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-2xs'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage('customer', customerName || 'Customer', activeVendorGroups[currentVendorIndex]?.vendorName);
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Type message to vendor..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !chatInputText.trim()}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Step to Next Vendor Navigation */}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
              {currentVendorIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentVendorIndex((prev) => prev - 1)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Vendor</span>
                </button>
              ) : (
                <div />
              )}

              {currentVendorIndex < activeVendorGroups.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentVendorIndex((prev) => prev + 1)}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Next Vendor ({currentVendorIndex + 2} of {activeVendorGroups.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsVendorModalOpen(false);
                    setActiveVendorGroups([]);
                    setCurrentVendorIndex(0);
                  }}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Done & Return to Store</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VENDOR CHAT MODAL (When Merchant clicks Chat with Buyer on Vendor Portal) */}
      {isVendorChatModalOpen && selectedOrderForChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  Buyer Live Chat • #{selectedOrderForChat.orderNumber || selectedOrderForChat.id}
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedOrderForChat.customerName} ({selectedOrderForChat.customerPhone})
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsVendorChatModalOpen(false);
                  setSelectedOrderForChat(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${selectedOrderForChat.customerPhone}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
              >
                <Phone className="w-3.5 h-3.5 text-purple-600" />
                <span>Call {selectedOrderForChat.customerPhone}</span>
              </a>
              <a
                href={`https://wa.me/${String(selectedOrderForChat.customerPhone || '').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Two-Way Chat Thread */}
            <div className="h-56 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No messages yet. Send a message to coordinate dispatch with the buyer.
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.senderRole === 'vendor' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-gray-500 font-medium mb-0.5">
                      {m.senderRole === 'vendor' ? 'You (Vendor)' : m.senderName || 'Buyer'}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                        m.senderRole === 'vendor'
                          ? 'bg-purple-600 text-white rounded-br-none shadow-2xs'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-2xs'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input for Vendor */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage('vendor', selectedOrderForChat.vendorName || 'Vendor Merchant', selectedOrderForChat.vendorName || 'Vendor');
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder="Type reply to customer..."
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
              />
              <button
                type="submit"
                disabled={isSendingMessage || !chatInputText.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal (Multiple Photos + 1 Video) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">List Tech or Fashion Product</h3>
                <p className="text-xs text-gray-500">Upload multiple photos and 1 product demo video</p>
              </div>
              <button onClick={() => setIsAddProductOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Apple iPhone 15 Pro Max or Handwoven Country Cloth Gown"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Brand / Maker</label>
                  <input
                    type="text"
                    value={newProductBrand}
                    onChange={(e) => setNewProductBrand(e.target.value)}
                    placeholder="e.g. Apple, Samsung, Liberian Heritage"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="smartphones">Smartphones & Tablets</option>
                    <option value="laptops">Laptops & Computers</option>
                    <option value="solar">Solar & Power Backup</option>
                    <option value="clothing-men">Men's Clothing</option>
                    <option value="clothing-women">Women's Fashion</option>
                    <option value="shoes">Footwear & Shoes</option>
                    <option value="audio-accessories">Audio & Tech Accessories</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Price in USD ($) *</label>
                  <input
                    type="number"
                    required
                    value={newProductPriceUsd}
                    onChange={(e) => setNewProductPriceUsd(e.target.value)}
                    placeholder="e.g. 1100"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Condition</label>
                  <select
                    value={newProductCondition}
                    onChange={(e) => setNewProductCondition(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Certified Used">Certified Used</option>
                    <option value="Handcrafted">Handcrafted</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Warranty</label>
                  <input
                    type="text"
                    value={newProductWarranty}
                    onChange={(e) => setNewProductWarranty(e.target.value)}
                    placeholder="e.g. 1 Year"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Multiple Images + 1 Video Upload Field */}
              <MediaUploadField
                images={newProductImages}
                onChangeImages={setNewProductImages}
                videoUrl={newProductVideoUrl}
                onChangeVideoUrl={setNewProductVideoUrl}
                label="Product Media (Upload Multiple Photos & 1 Video)"
              />

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={newProductDescription}
                  onChange={(e) => setNewProductDescription(e.target.value)}
                  placeholder="Specs, materials, what's in the box, sizing..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProduct}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {isSavingProduct ? 'Publishing...' : 'Publish Product to Store'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar with Active Highlighting */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => {
            setActiveBottomTab('shop');
            setViewMode('shop');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'shop' && viewMode === 'shop' ? 'text-purple-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">All Shop</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('electronics');
            setViewMode('shop');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'electronics' && viewMode === 'shop' ? 'text-purple-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[10px]">Electronics</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('fashion');
            setViewMode('shop');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'fashion' && viewMode === 'shop' ? 'text-purple-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Shirt className="w-5 h-5" />
          <span className="text-[10px]">Fashion</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('vendor_orders');
            setViewMode('vendor_orders');
          }}
          className={`relative flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'vendor_orders' || viewMode === 'vendor_orders' ? 'text-purple-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
          {vendorOrders.filter(o => o.status === 'pending').length > 0 && (
            <span className="absolute -top-1 right-2 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {vendorOrders.filter(o => o.status === 'pending').length}
            </span>
          )}
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
