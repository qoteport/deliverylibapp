import React, { useState, useEffect } from 'react';
import { Store, Utensils, Clock, CheckCircle2, Flame, Bike, Plus, ArrowLeft, Power, Phone, MapPin, DollarSign, X, Upload, Image as ImageIcon, Trash2, Edit2, MessageSquare, Bell, Volume2, VolumeX, Send, Sparkles, AlertCircle, Save, Navigation } from 'lucide-react';
import { Restaurant, MenuItem, Order, Currency, USD_TO_LRD_RATE, LocationCoords, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { playOrderAlertSound, primeAudioContext } from '../utils/audioAlert';
import { sendBrowserNotification } from '../utils/browserNotifications';
import { getWhatsAppDispatchUrl } from '../utils/twilio';
import { LocationPickerModal } from './LocationPickerModal';

interface RestaurantPortalProps {
  restaurant: Restaurant;
  menuItems: MenuItem[];
  orders: Order[];
  onExitPortal: () => void;
  onUpdateOrderStatus: (
    orderId: string, 
    status: Order['status'], 
    cancelledBy?: 'customer' | 'restaurant' | 'admin', 
    cancellationReason?: string
  ) => void;
  onAddMenuItem: (item: MenuItem) => void;
  onToggleItemAvailability: (itemId: string) => void;
  currency: Currency;
  onToggleCurrency: () => void;
}

const PRESET_FOOD_IMAGES = [
  { label: 'Jollof & Chicken', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80' },
  { label: 'Grilled Suya / Beef', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80' },
  { label: 'Fried Fish & Plantains', url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80' },
  { label: 'Rich Pepper Soup', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80' },
  { label: 'Snacks & Kala', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80' },
  { label: 'Wonjo & Fresh Juices', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80' },
];

export const RestaurantPortal: React.FC<RestaurantPortalProps> = ({
  restaurant,
  menuItems,
  orders,
  onExitPortal,
  onUpdateOrderStatus,
  onAddMenuItem,
  onToggleItemAvailability,
  currency,
  onToggleCurrency,
}) => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'profile'>('orders');
  const [decliningOrderId, setDecliningOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Kitchen at capacity / Items out of stock');
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);

  // Audio State
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Restaurant Profile Edit State
  const [restName, setRestName] = useState(restaurant?.name || '');
  const [restNeighborhood, setRestNeighborhood] = useState(restaurant?.neighborhood || 'Sinkor');
  const [restAddress, setRestAddress] = useState(restaurant?.address || '');
  const [restLocation, setRestLocation] = useState<LocationCoords | null>(restaurant?.location || null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [restPhone, setRestPhone] = useState(restaurant?.phone || '');
  const [restMomoNumber, setRestMomoNumber] = useState(restaurant?.momoNumber || restaurant?.phone || '');
  const [restAllowedPhones, setRestAllowedPhones] = useState(
    restaurant?.allowedPhoneNumbers?.join(', ') || restaurant?.phone || ''
  );
  const [restDeliveryFee, setRestDeliveryFee] = useState((restaurant?.deliveryFeeUsd ?? 2.0).toString());
  const [restPrepTime, setRestPrepTime] = useState((restaurant?.deliveryTimeMinutes ?? 25).toString());
  const [restIsOpen, setRestIsOpen] = useState(restaurant?.isOpen ?? true);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setRestName(restaurant.name || '');
      setRestNeighborhood(restaurant.neighborhood || 'Sinkor');
      setRestAddress(restaurant.address || '');
      setRestLocation(restaurant.location || null);
      setRestPhone(restaurant.phone || '');
      setRestMomoNumber(restaurant.momoNumber || restaurant.phone || '');
      setRestAllowedPhones(restaurant.allowedPhoneNumbers?.join(', ') || restaurant.phone || '');
      setRestDeliveryFee((restaurant.deliveryFeeUsd ?? 2.0).toString());
      setRestPrepTime((restaurant.deliveryTimeMinutes ?? 25).toString());
      setRestIsOpen(restaurant.isOpen ?? true);
    }
  }, [restaurant]);

  // Dish Form State (Add / Edit)
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('8.00');
  const [dishCategory, setDishCategory] = useState<MenuItem['category']>('liberian-favorites');
  const [dishDescription, setDishDescription] = useState('');
  const [dishPrepTime, setDishPrepTime] = useState(15);
  const [dishSpice, setDishSpice] = useState<MenuItem['spiceLevel']>('Monrovia Hot');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const restaurantOrders = orders.filter((o) => {
    if (!restaurant) return false;
    const currentRestId = (restaurant.id || '').trim().toLowerCase();
    const currentRestName = (restaurant.name || '').trim().toLowerCase();

    if (o.restaurantId && o.restaurantId.trim().toLowerCase() === currentRestId) return true;
    if (o.restaurantName && o.restaurantName.trim().toLowerCase() === currentRestName) return true;
    if (o.items?.some((i) => i.menuItem?.restaurantId && i.menuItem.restaurantId.trim().toLowerCase() === currentRestId)) return true;
    if (o.items?.some((i) => i.menuItem?.provenance && i.menuItem.provenance.trim().toLowerCase() === currentRestName)) return true;
    return false;
  });
  const activeOrders = restaurantOrders.filter((o) => o.status !== 'completed');

  useEffect(() => {
    const handlePrime = () => primeAudioContext();
    window.addEventListener('click', handlePrime, { once: true });
    return () => window.removeEventListener('click', handlePrime);
  }, []);

  // Play audio chime and dispatch browser notification when orders count increases
  const [prevOrdersCount, setPrevOrdersCount] = useState(restaurantOrders.length);
  useEffect(() => {
    if (restaurantOrders.length > prevOrdersCount) {
      if (soundEnabled) {
        playOrderAlertSound();
      }
      const newestOrder = restaurantOrders[0];
      if (newestOrder) {
        sendBrowserNotification({
          title: `🔔 New Kitchen Order #${newestOrder.id}`,
          body: `${newestOrder.customerName} ordered ${newestOrder.items.length} items (${newestOrder.diningMode}) • $${newestOrder.total.toFixed(2)}`,
          tag: `kitchen-order-${newestOrder.id}`,
        });
      }
      setPrevOrdersCount(restaurantOrders.length);
    }
  }, [restaurantOrders.length, prevOrdersCount, soundEnabled, restaurantOrders]);

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setUploadedImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setUploadedImages((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Open Edit Dish Modal
  const handleOpenEditDish = (dish: MenuItem) => {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishPrice(dish.price.toString());
    setDishCategory(dish.category);
    setDishDescription(dish.description);
    setDishPrepTime(dish.prepTimeMinutes);
    setDishSpice(dish.spiceLevel || 'Monrovia Hot');
    const images = dish.images && dish.images.length > 0 ? dish.images : dish.image ? [dish.image] : [];
    setUploadedImages(images);
    setIsAddDishOpen(true);
  };

  const handleCreateOrUpdateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;

    const priceNum = parseFloat(dishPrice) || 5.0;
    const dishId = editingDish ? editingDish.id : `dish-${restaurant.id}-${Date.now().toString().slice(-4)}`;

    const targetDish: MenuItem = {
      id: dishId,
      restaurantId: restaurant.id,
      name: dishName.trim(),
      subname: 'Freshly prepared specialty',
      category: dishCategory,
      description: dishDescription.trim() || 'Delicious Monrovia specialty prepared fresh to order.',
      price: priceNum,
      priceLrd: priceNum * USD_TO_LRD_RATE,
      calories: 500,
      prepTimeMinutes: Number(dishPrepTime) || 15,
      dietary: ['Spicy'],
      ingredients: ['Local ingredients', 'Liberian spices'],
      provenance: restaurant.neighborhood,
      illustrationType: 'jollof',
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
      image: uploadedImages.length > 0 ? uploadedImages[0] : undefined,
      spiceLevel: dishSpice,
      isAvailable: editingDish ? editingDish.isAvailable !== false : true,
    };

    onAddMenuItem(targetDish);

    // Save to Firestore in Real Time
    try {
      await setDoc(doc(db, 'menu_items', targetDish.id), {
        id: targetDish.id,
        restaurantId: targetDish.restaurantId,
        name: targetDish.name,
        subname: targetDish.subname,
        category: targetDish.category,
        description: targetDish.description,
        priceUsd: targetDish.price,
        priceLrd: targetDish.priceLrd,
        prepTimeMinutes: targetDish.prepTimeMinutes,
        spiceLevel: targetDish.spiceLevel,
        images: targetDish.images || [],
        image: targetDish.image || '',
        isAvailable: targetDish.isAvailable,
        updatedAt: new Date().toISOString(),
      });
      console.log('Dish successfully synced to Firestore:', targetDish.id);
    } catch (err) {
      console.warn('Firestore dish write notice:', err);
    }

    setIsAddDishOpen(false);
    setEditingDish(null);
    setDishName('');
    setDishDescription('');
    setUploadedImages([]);
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm('Are you sure you want to remove this dish from your menu?')) return;
    try {
      await deleteDoc(doc(db, 'menu_items', dishId));
    } catch {}
  };

  // Save Restaurant Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const phonesList = restAllowedPhones
        .split(/[,;\n]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const finalLocation = restLocation || MONROVIA_NEIGHBORHOOD_COORDS[restNeighborhood] || { lat: 6.2907, lng: -10.7818 };

      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        name: restName,
        neighborhood: restNeighborhood,
        address: restAddress,
        phone: restPhone,
        momoNumber: restMomoNumber,
        deliveryFeeUsd: parseFloat(restDeliveryFee) || 2.0,
        deliveryTimeMinutes: parseInt(restPrepTime) || 25,
        isOpen: restIsOpen,
        allowedPhoneNumbers: phonesList,
        location: finalLocation,
      });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (e) {
      console.warn('Firestore profile update notice:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans">
      
      {/* Modern White Kitchen Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs py-4 sm:py-5 flex items-center">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] flex items-center justify-center text-white shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[#111827] truncate max-w-[200px] sm:max-w-none">
                  {restaurant.name}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[#FF4B26] text-[10px] font-extrabold uppercase tracking-wider">
                  Kitchen KDS
                </span>
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                <span>{restaurant.neighborhood}</span>
                <span>•</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  KDS Active · /restaurant-management/{restaurant.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Chime Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playOrderAlertSound();
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                soundEnabled ? 'bg-orange-50 border-orange-200 text-[#FF4B26]' : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}
              title={soundEnabled ? 'Audio alerts ON' : 'Audio alerts MUTED'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleCurrency}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-mono font-bold text-gray-800 cursor-pointer"
            >
              {currency}
            </button>

            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* Verification Warning Alert Banner if unverified */}
      {restaurant.isVerified === false && (
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 lg:px-10 pt-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <div className="font-extrabold text-amber-800 text-sm">
                Kitchen Pending Verification
              </div>
              <p className="text-amber-700 mt-0.5">
                Your kitchen profile and menu are currently under review. You can configure your menu, dishes, and staff access right now. Once approved, your kitchen will immediately be live to customers across Monrovia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 lg:px-10 py-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2 overflow-x-auto gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white shadow-md shadow-[#FF4B26]/20'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Live Kitchen Orders ({activeOrders.length})
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'menu'
                  ? 'bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white shadow-md shadow-[#FF4B26]/20'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Menu & Dishes ({menuItems.length})
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white shadow-md shadow-[#FF4B26]/20'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Restaurant Profile & MoMo
            </button>
          </div>

          {activeTab === 'menu' && (
            <button
              onClick={() => {
                setEditingDish(null);
                setDishName('');
                setDishPrice('8.00');
                setDishDescription('');
                setUploadedImages([]);
                setIsAddDishOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-[#FF4B26]/20 hover:shadow-lg shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Dish</span>
            </button>
          )}
        </div>

        {/* TAB 1: KITCHEN DISPLAY SYSTEM (ORDERS) */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#FF4B26]" />
                <span>Live orders stream with instant WhatsApp/Call dispatch &amp; audio alerts</span>
              </span>
              <span className="font-bold text-gray-900">{activeOrders.length} orders cooking</span>
            </div>

            {restaurantOrders.length === 0 ? (
              <div className="bg-white p-16 text-center rounded-3xl border border-gray-100 shadow-xs space-y-2">
                <div className="w-14 h-14 rounded-full bg-orange-50 text-[#FF4B26] flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-[#111827]">No active orders right now</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  When a customer orders from Monrovia, the kitchen chime will sound and the order slip will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restaurantOrders.map((order) => {
                  const isDone = order.status === 'completed';
                  const waUrl = getWhatsAppDispatchUrl(
                    order.customerPhone,
                    order,
                    restaurant.name
                  );

                  return (
                    <div
                      key={order.id}
                      className={`p-5 rounded-3xl border shadow-xs space-y-3 transition-all ${
                        isDone ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
                      }`}
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-900">
                              {order.id}
                            </span>
                            <span className="text-xs text-gray-400">
                              {order.createdAt}
                            </span>
                          </div>
                          <div className="text-xs font-extrabold text-gray-900 mt-0.5">
                            {order.customerName} ({order.customerPhone})
                          </div>
                          <div className="text-[11px] text-[#FF4B26] font-semibold">
                            {order.deliveryArea || order.diningMode}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-base font-black text-gray-900 tabular-nums block">
                            {formatPrice(order.total)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-50 text-[#FF4B26]">
                            {order.status}
                          </span>
                        </div>
                      </div>

                      {/* Items List with Dish Images */}
                      <div className="space-y-2">
                        {order.items.map((i) => {
                          const dishImg = i.menuItem?.image || i.menuItem?.images?.[0];

                          return (
                            <div
                              key={i.cartItemId}
                              className="p-2.5 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {dishImg ? (
                                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                    <img
                                      src={dishImg}
                                      alt={i.menuItem?.name || 'Dish'}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF4B26] flex items-center justify-center shrink-0 border border-orange-100">
                                    <Utensils className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-extrabold text-gray-900 truncate">
                                    <span className="text-[#FF4B26] font-black">{i.quantity}x</span> {i.menuItem?.name}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    {i.selectedSpiceLevel && (
                                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                                        🌶️ {i.selectedSpiceLevel}
                                      </span>
                                    )}
                                    {i.selectedTemperature && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                                        🥩 {i.selectedTemperature}
                                      </span>
                                    )}
                                  </div>
                                  {i.selectedAddons && i.selectedAddons.length > 0 && (
                                    <div className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                                      +{i.selectedAddons.map((a) => a.name).join(', ')}
                                    </div>
                                  )}
                                  {i.specialInstructions && (
                                    <div className="text-[10px] italic text-[#FF4B26] font-semibold truncate mt-0.5">
                                      Note: "{i.specialInstructions}"
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span className="font-mono text-xs font-bold text-gray-900 shrink-0 tabular-nums">
                                {formatPrice(i.itemTotal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Payment, Direct Call & WhatsApp Dispatch */}
                      <div className="p-3 bg-gray-50 rounded-2xl text-[11px] text-gray-600 flex flex-wrap items-center justify-between gap-2.5">
                        <div>
                          <span>Payment: <strong className="text-gray-900">{order.paymentMethod}</strong></span>
                          {order.paymentNumber && <span className="font-mono font-bold block text-gray-700">MoMo: {order.paymentNumber}</span>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForModal(order)}
                            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-95"
                            title="Open large order slip & details"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#FF4B26]" />
                            <span>View Ticket</span>
                          </button>

                          {/* Call Customer Button */}
                          {order.customerPhone && (
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#048747] border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-95"
                              title="Call customer directly"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#06C167]" />
                              <span>Call</span>
                            </a>
                          )}

                          {/* WhatsApp Dispatch Link */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
                            title="Open WhatsApp order slip"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {/* Order Action Progression & Decline Buttons */}
                      {!isDone && order.status !== 'cancelled' && (
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          {order.status === 'received' && (
                            <div className="space-y-2">
                              {decliningOrderId === order.id ? (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-2 animate-in fade-in">
                                  <div className="text-xs font-bold text-red-900 flex items-center justify-between">
                                    <span>Select Reason to Decline Order:</span>
                                    <button
                                      type="button"
                                      onClick={() => setDecliningOrderId(null)}
                                      className="text-[10px] text-gray-500 hover:text-black font-semibold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <select
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-red-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-red-500"
                                  >
                                    <option value="Items out of stock">Items out of stock</option>
                                    <option value="Kitchen at full capacity">Kitchen at full capacity</option>
                                    <option value="Kitchen closing soon">Kitchen closing soon</option>
                                    <option value="Delivery address outside operational zone">Delivery address outside operational zone</option>
                                  </select>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateOrderStatus(order.id, 'cancelled', 'restaurant', declineReason);
                                        setDecliningOrderId(null);
                                      }}
                                      className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                    >
                                      Confirm Decline Order
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDecliningOrderId(null)}
                                      className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                    >
                                      Back
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                  >
                                    <Flame className="w-3.5 h-3.5 fill-white" />
                                    <span>Accept & Start Cooking</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDecliningOrderId(order.id)}
                                    className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Decline</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'plating')}
                              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                            >
                              <span>Pack in Thermal Bag &rarr;</span>
                            </button>
                          )}

                          {order.status === 'plating' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'en-route')}
                              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                            >
                              <Bike className="w-3.5 h-3.5" />
                              <span>Hand to Courier / Serve &rarr;</span>
                            </button>
                          )}

                          {order.status === 'en-route' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Delivered & Paid &rarr;</span>
                            </button>
                          )}
                        </div>
                      )}

                      {order.status === 'cancelled' && (
                        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                          order.cancelledBy === 'customer'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}>
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <div>
                            <div>
                              {order.cancelledBy === 'customer'
                                ? '⚠️ Customer Cancelled Order'
                                : order.cancelledBy === 'restaurant'
                                  ? '❌ Declined by Kitchen'
                                  : '❌ Order Cancelled by Admin'}
                            </div>
                            <div className="text-[10px] font-normal mt-0.5">
                              {order.cancelledBy === 'customer'
                                ? 'The customer cancelled this order prior to cooking start.'
                                : (order.cancellationReason ? `Reason: "${order.cancellationReason}"` : 'Order was declined.')}
                            </div>
                          </div>
                        </div>
                      )}

                      {isDone && (
                        <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Delivered & Completed</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MENU & DISHES MANAGER (FULL CRUD) */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => {
                const primaryImg = item.image || item.images?.[0];
                const imageCount = item.images?.length || (item.image ? 1 : 0);

                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {primaryImg && (
                        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mb-3 bg-gray-100">
                          <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" />
                          {imageCount > 1 && (
                            <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {imageCount} photos
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-extrabold text-[#111827]">
                          {item.name}
                        </h4>
                        <span className="font-mono text-base font-black text-gray-900">
                          {formatPrice(item.price)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-2">
                        <span className="capitalize">{item.category}</span>
                        <span>•</span>
                        <span className="text-[#FF4B26] font-bold">{item.prepTimeMinutes}m prep time</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onToggleItemAvailability(item.id)}
                        className={`text-xs font-extrabold px-3 py-1 rounded-xl transition-colors ${
                          item.isAvailable !== false
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {item.isAvailable !== false ? '● In Stock' : '✕ Sold Out'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditDish(item)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDish(item.id)}
                          className="p-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-xl transition-colors"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: RESTAURANT PROFILE & SETTINGS */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6 max-w-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#111827]">
                  Restaurant Profile & Payout Settings
                </h3>
                <p className="text-xs text-gray-500">Manage business details and delivery parameters</p>
              </div>
              {profileSaveSuccess && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-gray-700">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={restName}
                    onChange={(e) => setRestName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Neighborhood</label>
                  <input
                    type="text"
                    required
                    value={restNeighborhood}
                    onChange={(e) => setRestNeighborhood(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-gray-700">Street Address</label>
                  <input
                    type="text"
                    required
                    value={restAddress}
                    onChange={(e) => setRestAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827]"
                  />
                </div>

                {/* Map Pinpoint Location Selector */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-gray-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#06C167]" />
                      <span>Exact GPS Coordinates &amp; Pinpoint on Monrovia Map</span>
                    </span>
                    {restLocation && (
                      <span className="text-[10px] font-mono font-bold text-[#048747] bg-[#E8F8EE] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                        ✓ {restLocation.lat.toFixed(4)}, {restLocation.lng.toFixed(4)}
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      restLocation
                        ? 'border-[#06C167] bg-[#E8F8EE]/50 text-gray-900'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        restLocation ? 'bg-[#06C167] text-white shadow-xs' : 'bg-white text-gray-500 border border-gray-200'
                      }`}>
                        <Navigation className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-gray-900">
                          {restLocation ? 'Coordinates Defined' : 'Pin Exact Location on Map'}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {restLocation
                            ? `Lat: ${restLocation.lat.toFixed(5)}, Lng: ${restLocation.lng.toFixed(5)}`
                            : 'Click to drag marker and pinpoint your kitchen location'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 rounded-lg text-gray-800 shadow-2xs">
                      {restLocation ? 'Change Pin' : 'Open Map'}
                    </span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={restPhone}
                    onChange={(e) => setRestPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Mobile Money Number (MoMo / Orange)</label>
                  <input
                    type="tel"
                    required
                    value={restMomoNumber}
                    onChange={(e) => setRestMomoNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#FF4B26]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-gray-700 flex items-center justify-between">
                    <span>Authorized Staff Phone Numbers (Team Login)</span>
                    <span className="text-[10px] text-gray-400 font-normal">Separate with commas</span>
                  </label>
                  <input
                    type="text"
                    value={restAllowedPhones}
                    onChange={(e) => setRestAllowedPhones(e.target.value)}
                    placeholder="e.g. 0886 554 321, 0777 990 123, +231 881 223 456"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-[#111827]"
                  />
                  <p className="text-[10px] text-gray-500">
                    Any kitchen manager or chef whose phone number is listed above can log into this kitchen display portal without complex passwords.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Delivery Fee ($ USD)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={restDeliveryFee}
                    onChange={(e) => setRestDeliveryFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Avg Prep / Delivery Time (mins)</label>
                  <input
                    type="number"
                    required
                    value={restPrepTime}
                    onChange={(e) => setRestPrepTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={restIsOpen}
                    onChange={(e) => setRestIsOpen(e.target.checked)}
                    className="w-4 h-4 accent-[#FF4B26] rounded"
                  />
                  <span>Kitchen is currently Open for Orders</span>
                </label>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* Add / Edit Dish Modal */}
      {isAddDishOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-gray-100 p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#111827]">
                  {editingDish ? 'Edit Dish' : 'Add New Dish to Menu'}
                </h3>
                <p className="text-xs text-gray-500">Upload multiple food photos & set prep time</p>
              </div>
              <button onClick={() => setIsAddDishOpen(false)} className="p-1 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateDish} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Dish Name *</label>
                <input
                  type="text"
                  required
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="e.g. Grilled Snapper with Sweet Plantains"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Price ($ USD) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Category</label>
                  <select
                    value={dishCategory}
                    onChange={(e) => setDishCategory(e.target.value as MenuItem['category'])}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  >
                    <option value="liberian-favorites">Liberian Classics</option>
                    <option value="hearth-mains">Suya & Grills</option>
                    <option value="starters">Snacks & Kala</option>
                    <option value="beverages">Wonjo & Drinks</option>
                    <option value="pasta">Pastas</option>
                    <option value="desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#FF4B26]" />
                    <span>Prep Time (Minutes) *</span>
                  </label>
                  <select
                    value={dishPrepTime}
                    onChange={(e) => setDishPrepTime(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  >
                    <option value={10}>10 minutes (Fast Snack)</option>
                    <option value={15}>15 minutes (Standard)</option>
                    <option value={20}>20 minutes (Cooked-to-Order)</option>
                    <option value={25}>25 minutes (Deep Grilling)</option>
                    <option value={35}>35 minutes (Slow Simmer)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Spice Level</label>
                  <select
                    value={dishSpice}
                    onChange={(e) => setDishSpice(e.target.value as MenuItem['spiceLevel'])}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Medium">Medium</option>
                    <option value="Monrovia Hot">Monrovia Hot</option>
                    <option value="Extreme Pepper">Extreme Pepper</option>
                  </select>
                </div>
              </div>

              {/* Multiple Image Upload */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="font-bold text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-[#FF4B26]" />
                    <span>Multiple Dish Images ({uploadedImages.length})</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">PNG, JPG, WebP</span>
                </label>

                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 hover:border-[#FF4B26] hover:bg-orange-50/40 rounded-2xl cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs font-bold text-gray-700">Choose images from device</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_FOOD_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setUploadedImages((prev) => [...prev, preset.url])}
                      className="text-[10px] font-semibold bg-gray-100 hover:bg-orange-100 hover:text-[#FF4B26] px-2.5 py-1 rounded-lg transition-colors"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-2 border-t border-gray-100">
                <label className="font-bold text-gray-700">Description</label>
                <input
                  type="text"
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  placeholder="Short appetizing note..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-md hover:shadow-lg transition-all mt-2"
              >
                {editingDish ? 'Update Dish' : 'Publish Dish to Menu'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Monrovia Map Pinpoint Picker Modal */}
      <LocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialCoords={restLocation || MONROVIA_NEIGHBORHOOD_COORDS[restNeighborhood]}
        initialArea={restNeighborhood}
        initialAddress={restAddress}
        onConfirmLocation={(data) => {
          setRestLocation(data.coords);
          if (data.address) setRestAddress(data.address);
          if (data.area) setRestNeighborhood(data.area);
          setIsMapPickerOpen(false);
        }}
      />

    </div>
  );
};
