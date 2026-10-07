import React, { useState, useEffect } from 'react';
import { Store, Utensils, Clock, CheckCircle2, XCircle, FileText, Flame, Bike, Plus, ArrowLeft, Power, Phone, MapPin, DollarSign, X, Upload, Image as ImageIcon, Trash2, Edit2, MessageSquare, Bell, Volume2, VolumeX, Send, Sparkles, AlertCircle, Save, Navigation, ChevronLeft, ChevronRight, Star, ListPlus, Check, Layers, Tag, Users, Eye, ChefHat, Award } from 'lucide-react';
import { Restaurant, MenuItem, Order, Currency, USD_TO_LRD_RATE, LocationCoords, MONROVIA_NEIGHBORHOOD_COORDS, MONROVIA_NEIGHBORHOODS, AddonOption } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { playOrderAlertSound, primeAudioContext } from '../utils/audioAlert';
import { sendBrowserNotification } from '../utils/browserNotifications';
import { getWhatsAppDispatchUrl } from '../utils/twilio';
import { LocationPickerModal } from './LocationPickerModal';
import { CustomDropdown } from './CustomDropdown';
import { saveRestaurantToApi, saveMenuItemToApi, deleteMenuItemFromApi } from '../utils/apiSync';

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
  onDeleteMenuItem?: (itemId: string) => void;
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

const PRESET_DISH_CATEGORIES = [
  { id: 'liberian-favorites', label: 'Liberian Classics', icon: '🍲' },
  { id: 'hearth-mains', label: 'Suya & Grills', icon: '🥩' },
  { id: 'starters', label: 'Snacks & Kala', icon: '🍢' },
  { id: 'beverages', label: 'Wonjo & Drinks', icon: '🍹' },
  { id: 'pasta', label: 'Pastas', icon: '🍝' },
  { id: 'desserts', label: 'Desserts', icon: '🍰' },
];

const PRESET_PREP_TIMES = [
  { minutes: 10, label: '10 mins', note: 'Fast / Ready' },
  { minutes: 15, label: '15 mins', note: 'Standard' },
  { minutes: 20, label: '20 mins', note: 'Cook-to-order' },
  { minutes: 25, label: '25 mins', note: 'Grilling' },
  { minutes: 35, label: '35 mins', note: 'Slow simmer' },
  { minutes: 45, label: '45 mins', note: 'Special pot' },
];

const PRESET_SPICE_LEVELS = [
  { id: 'Mild', label: 'Mild', badge: '🌶️ Gentle' },
  { id: 'Medium', label: 'Medium', badge: '🌶️🌶️ Classic' },
  { id: 'Monrovia Hot', label: 'Monrovia Hot', badge: '🔥 Local Fire' },
  { id: 'Extreme Pepper', label: 'Extreme Pepper', badge: '💥 Fire' },
  { id: 'No Pepper', label: 'No Pepper', badge: '🥗 Zero Spice' },
];

const PRESET_ADDON_SUGGESTIONS = [
  { name: 'Fried Sweet Plantains (Dodo)', price: 1.50, description: 'Golden fried ripe plantains' },
  { name: 'Extra Monrovia Hot Pepper Sauce', price: 0.75, description: 'Authentic spicy glaze' },
  { name: 'Grilled Suya Beef Skewer', price: 2.50, description: 'Spiced with traditional yaji' },
  { name: 'Fried Kala Balls (2 pcs)', price: 1.00, description: 'Crispy fried dough' },
  { name: 'Chilled Fresh Wonjo Juice', price: 1.50, description: 'Ginger-infused hibiscus juice' },
  { name: 'Extra Portion of Jollof Rice', price: 2.00, description: 'Steaming seasoned rice' },
];

export const RestaurantPortal: React.FC<RestaurantPortalProps> = ({
  restaurant,
  menuItems,
  orders,
  onExitPortal,
  onUpdateOrderStatus,
  onAddMenuItem,
  onDeleteMenuItem,
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
  const [restAllowedPhonesList, setRestAllowedPhonesList] = useState<string[]>(() => {
    return restaurant?.allowedPhoneNumbers && restaurant.allowedPhoneNumbers.length > 0
      ? restaurant.allowedPhoneNumbers
      : (restaurant?.phone ? [restaurant.phone] : []);
  });
  const [newStaffPhoneInput, setNewStaffPhoneInput] = useState('');
  const [staffPhoneError, setStaffPhoneError] = useState('');
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
      setRestAllowedPhonesList(
        restaurant.allowedPhoneNumbers && restaurant.allowedPhoneNumbers.length > 0
          ? restaurant.allowedPhoneNumbers
          : (restaurant.phone ? [restaurant.phone] : [])
      );
      setRestDeliveryFee((restaurant.deliveryFeeUsd ?? 2.0).toString());
      setRestPrepTime((restaurant.deliveryTimeMinutes ?? 25).toString());
      setRestIsOpen(restaurant.isOpen ?? true);
    }
  }, [restaurant]);

  const handleAddStaffPhone = () => {
    const raw = newStaffPhoneInput.trim();
    if (!raw) return;
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length < 6) {
      setStaffPhoneError('Please enter a valid phone number (e.g. 0886 554 321)');
      return;
    }
    if (restAllowedPhonesList.includes(raw)) {
      setStaffPhoneError('This phone number has already been added');
      return;
    }
    setRestAllowedPhonesList((prev) => [...prev, raw]);
    setNewStaffPhoneInput('');
    setStaffPhoneError('');
  };

  const handleRemoveStaffPhone = (phoneToRemove: string) => {
    setRestAllowedPhonesList((prev) => prev.filter((p) => p !== phoneToRemove));
  };

  // Dish Form State (Add / Edit)
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('8.00');
  const [dishCategory, setDishCategory] = useState<string>('liberian-favorites');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [dishDescription, setDishDescription] = useState('');
  const [dishPrepTime, setDishPrepTime] = useState<number>(15);
  const [isCustomPrepTime, setIsCustomPrepTime] = useState(false);
  const [customPrepTimeText, setCustomPrepTimeText] = useState('');
  const [dishSpice, setDishSpice] = useState<string>('Monrovia Hot');
  const [isCustomSpice, setIsCustomSpice] = useState(false);
  const [customSpiceText, setCustomSpiceText] = useState('');
  const [dishAddons, setDishAddons] = useState<AddonOption[]>([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('1.50');
  const [newAddonDesc, setNewAddonDesc] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [orderFilterTab, setOrderFilterTab] = useState<'live' | 'delivered' | 'cancelled' | 'all'>('live');

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

  const liveOrders = restaurantOrders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );
  const deliveredOrders = restaurantOrders.filter(
    (o) => o.status === 'completed'
  );
  const cancelledOrders = restaurantOrders.filter(
    (o) => o.status === 'cancelled'
  );

  // Kitchen efficiency KPIs (based on recorded prep durations)
  const targetPrepMins = restaurant?.deliveryTimeMinutes || 25;
  const timedPrepOrders = restaurantOrders.filter(
    (o) => typeof o.actualPrepMinutes === 'number' && o.actualPrepMinutes > 0
  );
  const avgPrepTimeMins = timedPrepOrders.length > 0
    ? Math.round(
        timedPrepOrders.reduce((sum, o) => sum + (o.actualPrepMinutes || 0), 0) / timedPrepOrders.length
      )
    : 0;
  const onTimePercentage = timedPrepOrders.length > 0
    ? Math.round(
        (timedPrepOrders.filter((o) => (o.actualPrepMinutes || 0) <= targetPrepMins).length /
          timedPrepOrders.length) * 100
      )
    : 100;

  const displayedOrders =
    orderFilterTab === 'live' ? liveOrders :
    orderFilterTab === 'delivered' ? deliveredOrders :
    orderFilterTab === 'cancelled' ? cancelledOrders :
    restaurantOrders;

  useEffect(() => {
    const handlePrime = () => primeAudioContext();
    window.addEventListener('click', handlePrime, { once: true });
    return () => window.removeEventListener('click', handlePrime);
  }, []);

  // Play audio chime and dispatch browser notification when live orders count increases
  const [prevOrdersCount, setPrevOrdersCount] = useState(liveOrders.length);
  useEffect(() => {
    if (liveOrders.length > prevOrdersCount) {
      if (soundEnabled) {
        playOrderAlertSound();
      }
      const newestOrder = liveOrders[0];
      if (newestOrder) {
        sendBrowserNotification({
          title: `🔔 New Kitchen Order #${newestOrder.id}`,
          body: `${newestOrder.customerName} ordered ${newestOrder.items.length} items (${newestOrder.diningMode}) • ${(newestOrder.total || 0).toFixed(2)}`,
          tag: `kitchen-order-${newestOrder.id}`,
        });
      }
      setPrevOrdersCount(liveOrders.length);
    } else if (liveOrders.length < prevOrdersCount) {
      setPrevOrdersCount(liveOrders.length);
    }
  }, [liveOrders.length, prevOrdersCount, soundEnabled, liveOrders]);

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const resetDishForm = () => {
    setDishName('');
    setDishPrice('8.00');
    setDishCategory('liberian-favorites');
    setIsCustomCategory(false);
    setCustomCategoryText('');
    setDishDescription('');
    setDishPrepTime(15);
    setIsCustomPrepTime(false);
    setCustomPrepTimeText('');
    setDishSpice('Monrovia Hot');
    setIsCustomSpice(false);
    setCustomSpiceText('');
    setDishAddons([]);
    setNewAddonName('');
    setNewAddonPrice('1.50');
    setNewAddonDesc('');
    setUploadedImages([]);
    setImageUrlInput('');
    setEditingDish(null);
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

  const handleMoveImageLeft = (index: number) => {
    if (index <= 0) return;
    setUploadedImages((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveImageRight = (index: number) => {
    setUploadedImages((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMakePrimaryImage = (index: number) => {
    if (index === 0) return;
    setUploadedImages((prev) => {
      const target = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      return [target, ...remaining];
    });
  };

  const handleAddCustomAddon = () => {
    if (!newAddonName.trim()) return;
    const price = Math.max(0, parseFloat(newAddonPrice) || 0);
    const newAddon: AddonOption = {
      id: `addon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newAddonName.trim(),
      price,
      description: newAddonDesc.trim() || undefined,
    };
    setDishAddons((prev) => [...prev, newAddon]);
    setNewAddonName('');
    setNewAddonPrice('1.50');
    setNewAddonDesc('');
  };

  const handleRemoveAddon = (id: string) => {
    setDishAddons((prev) => prev.filter((a) => a.id !== id));
  };

  const handleQuickAddPresetAddon = (preset: { name: string; price: number; description?: string }) => {
    if (dishAddons.some((a) => a.name.toLowerCase() === preset.name.toLowerCase())) return;
    const newAddon: AddonOption = {
      id: `addon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      price: preset.price,
      description: preset.description,
    };
    setDishAddons((prev) => [...prev, newAddon]);
  };

  // Open Edit Dish Modal
  const handleOpenEditDish = (dish: MenuItem) => {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishPrice(dish.price.toString());

    // Check category
    const isStandardCat = PRESET_DISH_CATEGORIES.some((c) => c.id === dish.category);
    if (isStandardCat) {
      setDishCategory(dish.category);
      setIsCustomCategory(false);
      setCustomCategoryText('');
    } else {
      setDishCategory('custom');
      setIsCustomCategory(true);
      setCustomCategoryText(dish.category);
    }

    setDishDescription(dish.description || '');

    // Check prep time
    const isStandardTime = PRESET_PREP_TIMES.some((t) => t.minutes === dish.prepTimeMinutes);
    if (isStandardTime) {
      setDishPrepTime(dish.prepTimeMinutes);
      setIsCustomPrepTime(false);
      setCustomPrepTimeText('');
    } else {
      setDishPrepTime(dish.prepTimeMinutes || 15);
      setIsCustomPrepTime(true);
      setCustomPrepTimeText((dish.prepTimeMinutes || 15).toString());
    }

    // Check spice level
    const isStandardSpice = PRESET_SPICE_LEVELS.some((s) => s.id === dish.spiceLevel);
    if (isStandardSpice) {
      setDishSpice(dish.spiceLevel || 'Monrovia Hot');
      setIsCustomSpice(false);
      setCustomSpiceText('');
    } else if (dish.spiceLevel) {
      setDishSpice('custom');
      setIsCustomSpice(true);
      setCustomSpiceText(dish.spiceLevel);
    } else {
      setDishSpice('Monrovia Hot');
      setIsCustomSpice(false);
      setCustomSpiceText('');
    }

    // Set Addons
    setDishAddons(dish.availableAddons ? [...dish.availableAddons] : []);

    // Set images
    const images = dish.images && dish.images.length > 0 ? dish.images : dish.image ? [dish.image] : [];
    setUploadedImages(images);

    setIsAddDishOpen(true);
  };

  const handleCreateOrUpdateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;

    const priceNum = parseFloat(dishPrice) || 5.0;
    const dishId = editingDish ? editingDish.id : `dish-${restaurant.id}-${Date.now().toString().slice(-4)}`;

    const finalCategory = isCustomCategory && customCategoryText.trim()
      ? customCategoryText.trim()
      : dishCategory;

    const finalPrepTime = isCustomPrepTime && customPrepTimeText.trim()
      ? Math.max(1, parseInt(customPrepTimeText, 10) || 15)
      : (Number(dishPrepTime) || 15);

    const finalSpice = isCustomSpice && customSpiceText.trim()
      ? customSpiceText.trim()
      : dishSpice;

    const targetDish: MenuItem = {
      id: dishId,
      restaurantId: restaurant.id,
      name: dishName.trim(),
      subname: 'Freshly prepared specialty',
      category: finalCategory,
      description: dishDescription.trim() || 'Delicious Monrovia specialty prepared fresh to order.',
      price: priceNum,
      priceLrd: priceNum * USD_TO_LRD_RATE,
      calories: 500,
      prepTimeMinutes: finalPrepTime,
      dietary: ['Spicy'],
      ingredients: ['Local ingredients', 'Liberian spices'],
      provenance: restaurant.neighborhood,
      illustrationType: 'jollof',
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
      image: uploadedImages.length > 0 ? uploadedImages[0] : undefined,
      availableAddons: dishAddons.length > 0 ? dishAddons : undefined,
      spiceLevel: finalSpice,
      isAvailable: editingDish ? editingDish.isAvailable !== false : true,
    };

    onAddMenuItem(targetDish);

    // Save to Backend API Store
    try {
      await saveMenuItemToApi(targetDish);
    } catch (e) {
      console.warn('API dish sync notice:', e);
    }

    // Save to Firestore in Real Time (both 'menu' and 'menu_items' for compatibility)
    try {
      await setDoc(doc(db, 'menu', targetDish.id), targetDish);
      await setDoc(doc(db, 'menu_items', targetDish.id), targetDish);
      console.log('Dish successfully synced to Firestore:', targetDish.id);
    } catch (err) {
      console.warn('Firestore dish write notice:', err);
    }

    resetDishForm();
    setIsAddDishOpen(false);
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm('Are you sure you want to remove this dish from your menu?')) return;
    if (onDeleteMenuItem) {
      onDeleteMenuItem(dishId);
    }
    deleteMenuItemFromApi(dishId).catch(() => {});
    try {
      await deleteDoc(doc(db, 'menu', dishId));
      await deleteDoc(doc(db, 'menu_items', dishId));
    } catch (err) {
      console.warn('Firestore dish delete notice:', err);
    }
  };

  // Save Restaurant Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const phonesList = Array.from(
        new Set([
          ...restAllowedPhonesList.map((p) => p.trim()).filter(Boolean),
          restPhone.trim(),
        ].filter(Boolean))
      );

      const finalLocation = restLocation || MONROVIA_NEIGHBORHOOD_COORDS[restNeighborhood] || { lat: 6.2907, lng: -10.7818 };

      const updatedRestaurant: Restaurant = {
        ...restaurant,
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
      };

      // Save to Backend API Store
      await saveRestaurantToApi(updatedRestaurant).catch(() => {});

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
              Live Kitchen Orders ({liveOrders.length})
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
                resetDishForm();
                setIsAddDishOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-[#FF4B26]/20 hover:shadow-lg shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Dish</span>
            </button>
          )}
        </div>

        {/* TAB 1: KITCHEN DISPLAY SYSTEM (ORDERS) */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            
            {/* Kitchen Efficiency & Prep Time KPIs Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-xs space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Avg Kitchen Prep</div>
                <div className="text-base sm:text-lg font-black text-gray-900 font-mono flex items-center gap-1">
                  <Clock className="w-4 h-4 text-[#FF4B26]" />
                  <span>{avgPrepTimeMins} mins</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-xs space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">On-Time Prep Rate</div>
                <div className="text-base sm:text-lg font-black text-emerald-600 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{onTimePercentage}%</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-xs space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Active Live Orders</div>
                <div className="text-base sm:text-lg font-black text-[#FF4B26] font-mono flex items-center gap-1">
                  <Flame className="w-4 h-4 text-[#FF4B26]" />
                  <span>{liveOrders.length}</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-xs space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total Fulfilled</div>
                <div className="text-base sm:text-lg font-black text-[#048747] font-mono flex items-center gap-1">
                  <Award className="w-4 h-4 text-[#06C167]" />
                  <span>{deliveredOrders.length} orders</span>
                </div>
              </div>
            </div>

            {/* Live stream status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#FF4B26]" />
                <span>Live orders stream with instant WhatsApp/Call dispatch &amp; audio alerts</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 bg-orange-50 text-[#FF4B26] px-2.5 py-1 rounded-full border border-orange-100">
                  🔥 {liveOrders.length} Cooking &amp; Active
                </span>
              </div>
            </div>

            {/* Sub-Tabs: Live Orders, Delivered, Cancelled, All */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-2xl w-full sm:w-fit overflow-x-auto border border-gray-200/60">
              <button
                type="button"
                onClick={() => setOrderFilterTab('live')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  orderFilterTab === 'live'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${orderFilterTab === 'live' ? 'text-[#FF4B26]' : 'text-gray-400'}`} />
                <span>Live Orders</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  orderFilterTab === 'live' ? 'bg-orange-100 text-[#FF4B26]' : 'bg-gray-200 text-gray-600'
                }`}>
                  {liveOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderFilterTab('delivered')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  orderFilterTab === 'delivered'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${orderFilterTab === 'delivered' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>Delivered</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  orderFilterTab === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {deliveredOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderFilterTab('cancelled')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  orderFilterTab === 'cancelled'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <XCircle className={`w-3.5 h-3.5 ${orderFilterTab === 'cancelled' ? 'text-red-500' : 'text-gray-400'}`} />
                <span>Cancelled</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  orderFilterTab === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {cancelledOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderFilterTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  orderFilterTab === 'all'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${orderFilterTab === 'all' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>All Orders</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  orderFilterTab === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {restaurantOrders.length}
                </span>
              </button>
            </div>

            {displayedOrders.length === 0 ? (
              <div className="bg-white p-14 text-center rounded-3xl border border-gray-100 shadow-xs space-y-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  orderFilterTab === 'live' ? 'bg-orange-50 text-[#FF4B26]' :
                  orderFilterTab === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                  orderFilterTab === 'cancelled' ? 'bg-red-50 text-red-500' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {orderFilterTab === 'live' && <Flame className="w-7 h-7" />}
                  {orderFilterTab === 'delivered' && <CheckCircle2 className="w-7 h-7" />}
                  {orderFilterTab === 'cancelled' && <XCircle className="w-7 h-7" />}
                  {orderFilterTab === 'all' && <FileText className="w-7 h-7" />}
                </div>
                <h3 className="text-base font-extrabold text-[#111827]">
                  {orderFilterTab === 'live' && 'No live kitchen orders right now'}
                  {orderFilterTab === 'delivered' && 'No delivered orders yet'}
                  {orderFilterTab === 'cancelled' && 'No cancelled orders'}
                  {orderFilterTab === 'all' && 'No orders recorded yet'}
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {orderFilterTab === 'live' && 'When a customer orders from Monrovia, the kitchen chime will sound and the order slip will appear here in real time.'}
                  {orderFilterTab === 'delivered' && 'Orders completed and delivered will appear here for your kitchen records.'}
                  {orderFilterTab === 'cancelled' && 'Declined or customer-cancelled orders will be archived here.'}
                  {orderFilterTab === 'all' && 'All incoming orders for your kitchen will be logged here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedOrders.map((order) => {
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

                      {/* Kitchen Prep Time Alert & Metric Pill */}
                      {!isDone && order.status !== 'cancelled' && (() => {
                        const prepTargetMins = order.prepDurationMinutes || (order.diningMode === 'pickup' ? 15 : order.diningMode === 'dine-in' ? 12 : 25);
                        const orderStartTimestamp = order.confirmedAtTimestamp || order.createdAtTimestamp || Date.now();
                        const elapsedMinutes = Math.max(0, Math.floor((Date.now() - orderStartTimestamp) / 60000));
                        const isOverdue = elapsedMinutes > prepTargetMins;
                        const isNearTime = !isOverdue && elapsedMinutes >= Math.max(1, prepTargetMins - 5);

                        return (
                          <div className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                            isOverdue
                              ? 'bg-red-50 border border-red-200 text-red-900 animate-pulse'
                              : isNearTime
                              ? 'bg-amber-50 border border-amber-200 text-amber-900'
                              : 'bg-emerald-50/70 border border-emerald-200/60 text-emerald-900'
                          }`}>
                            <div className="flex items-center gap-1.5 font-bold">
                              <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-600 animate-spin' : isNearTime ? 'text-amber-600' : 'text-emerald-600'}`} />
                              <span>
                                {isOverdue
                                  ? `🚨 Prep Overdue by +${elapsedMinutes - prepTargetMins}m (${elapsedMinutes}m / ${prepTargetMins}m target)`
                                  : isNearTime
                                  ? `⚠️ Approaching Target Time (${prepTargetMins - elapsedMinutes}m left)`
                                  : `⏱️ Cooking Pace: ${elapsedMinutes}m elapsed (Target: ${prepTargetMins}m)`}
                              </span>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              isOverdue ? 'bg-red-600 text-white' : isNearTime ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                              {isOverdue ? 'URGENT' : isNearTime ? 'EXPEDITE' : 'ON TRACK'}
                            </span>
                          </div>
                        );
                      })()}

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

                      {/* Courier / Rider Assignment Info (For Delivery Orders) */}
                      {order.diningMode === 'delivery' && (
                        <div className="pt-2 border-t border-gray-100">
                          {order.assignedDriverName && (order.delegationStatus === 'accepted' || order.delegationStatus === 'heading_to_restaurant' || order.delegationStatus === 'at_restaurant' || order.delegationStatus === 'out_for_delivery' || order.status === 'en-route' || order.status === 'completed') ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-[#06C167] text-white flex items-center justify-center shadow-xs shrink-0">
                                  <Bike className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#048747]">
                                    Confirmed Courier for Pickup
                                  </div>
                                  <div className="text-xs font-black text-gray-900 flex items-center gap-1.5 truncate">
                                    <span className="truncate">{order.assignedDriverName}</span>
                                    {order.driverVehicle && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-emerald-800 font-bold border border-emerald-200 shrink-0">
                                        {order.driverVehicle}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-medium">
                                    {order.delegationStatus === 'heading_to_restaurant'
                                      ? '🛵 Heading to your kitchen now'
                                      : order.delegationStatus === 'at_restaurant'
                                      ? '📍 Arrived at your kitchen for pickup'
                                      : order.delegationStatus === 'out_for_delivery'
                                      ? '📦 En route to customer'
                                      : '✅ Accepted & Assigned'}
                                  </div>
                                </div>
                              </div>

                              {order.assignedDriverPhone && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <a
                                    href={`tel:${order.assignedDriverPhone}`}
                                    className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-[#048747] border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                                    title="Call Rider"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>Call Rider</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${order.assignedDriverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.assignedDriverName}, order #${order.id} is being prepared at ${restaurant.name}.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                                    title="WhatsApp Rider"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : order.assignedDriverName && order.delegationStatus === 'offered' ? (
                            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs">
                              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                                <Bike className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                                  Dispatching Courier...
                                </div>
                                <div className="text-xs font-bold text-amber-900">
                                  Offer sent to {order.assignedDriverName} (Awaiting acceptance)
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2 text-gray-500 text-[11px] font-semibold">
                              <Bike className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>Searching nearest Monrovia courier for pickup handover...</span>
                            </div>
                          )}
                        </div>
                      )}

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

                      {/* Interactive Non-Linear Order Timeline Stepper (1, 2, 3...) */}
                      {!isDone && order.status !== 'cancelled' && (
                        <div className="pt-2 border-t border-gray-100 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                              Order Timeline (Tap any step to update)
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold capitalize">
                              Current: {order.status === 'plating' ? (order.diningMode === 'delivery' ? 'Ready for Courier' : 'Ready / Plated') : order.status}
                            </span>
                          </div>

                          {/* Timeline Stepper Pills (Directly Clickable Without Strict Order) */}
                          <div className={`grid ${order.diningMode === 'delivery' ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5`}>
                            {(order.diningMode === 'delivery'
                              ? [
                                  { key: 'received', num: 1, label: 'Received', icon: Clock },
                                  { key: 'preparing', num: 2, label: 'Cooking', icon: Flame },
                                  { key: 'plating', num: 3, label: 'Ready', icon: ChefHat },
                                  { key: 'en-route', num: 4, label: 'En Route', icon: Bike },
                                  { key: 'completed', num: 5, label: 'Delivered', icon: CheckCircle2 },
                                ]
                              : [
                                  { key: 'received', num: 1, label: 'Received', icon: Clock },
                                  { key: 'preparing', num: 2, label: 'Cooking', icon: Flame },
                                  { key: 'plating', num: 3, label: 'Ready', icon: ChefHat },
                                  { key: 'completed', num: 4, label: order.diningMode === 'dine-in' ? 'Served' : 'Picked Up', icon: CheckCircle2 },
                                ]
                            ).map((step) => {
                              const StepIcon = step.icon;
                              const statusOrderList = order.diningMode === 'delivery'
                                ? ['received', 'preparing', 'plating', 'en-route', 'completed']
                                : ['received', 'preparing', 'plating', 'completed'];
                              const currentIdx = statusOrderList.indexOf(order.status);
                              const stepIdx = statusOrderList.indexOf(step.key);
                              const isCompleted = stepIdx < currentIdx;
                              const isCurrent = stepIdx === currentIdx;

                              return (
                                <button
                                  key={step.key}
                                  type="button"
                                  onClick={() => onUpdateOrderStatus(order.id, step.key as Order['status'])}
                                  className={`p-1.5 sm:p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                                    isCurrent
                                      ? 'bg-[#FF4B26] text-white border-[#FF4B26] shadow-sm ring-2 ring-[#FF4B26]/30'
                                      : isCompleted
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                  }`}
                                  title={`Tap to set order status to: ${step.label}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                                      isCurrent
                                        ? 'bg-white text-[#FF4B26]'
                                        : isCompleted
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-200 text-gray-700'
                                    }`}>
                                      {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.num}
                                    </span>
                                    <StepIcon className="w-3 h-3 shrink-0 hidden sm:inline-block" />
                                  </div>
                                  <span className="text-[10px] font-extrabold truncate max-w-full leading-tight">
                                    {step.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Actions Context Bar */}
                          {order.status === 'received' && (
                            <div className="space-y-2 pt-1">
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
                                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] hover:opacity-95 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
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
                              <ChefHat className="w-3.5 h-3.5" />
                              <span>Mark Food Ready &amp; Packed &rarr;</span>
                            </button>
                          )}

                          {order.status === 'plating' && (
                            <div className="space-y-1.5">
                              {order.diningMode === 'delivery' ? (
                                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <ChefHat className="w-4 h-4 text-amber-700 shrink-0" />
                                    <span className="font-bold">Meal is packed · Waiting for Courier pickup</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'en-route')}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-extrabold rounded-lg shrink-0 cursor-pointer shadow-2xs"
                                  >
                                    Handed to Courier &rarr;
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Mark {order.diningMode === 'dine-in' ? 'Served to Table' : 'Picked Up'} &rarr;</span>
                                </button>
                              )}
                            </div>
                          )}

                          {order.status === 'en-route' && (
                            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Bike className="w-4 h-4 text-blue-600 shrink-0 animate-bounce" />
                                <span className="font-bold truncate">
                                  Courier {order.assignedDriverName ? `(${order.assignedDriverName})` : ''} is en route to customer
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                                Live on GPS
                              </span>
                            </div>
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

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 mt-2">
                        <span className="capitalize font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                        <span className="text-[#FF4B26] font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                          ⏱️ {item.prepTimeMinutes}m
                        </span>
                        {item.spiceLevel && (
                          <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            🌶️ {item.spiceLevel}
                          </span>
                        )}
                        {item.availableAddons && item.availableAddons.length > 0 && (
                          <span className="font-bold text-[#048747] bg-[#E8F8EE] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                            +{item.availableAddons.length} Extras
                          </span>
                        )}
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
                        {item.isAvailable !== false ? '● Available' : '✕ Sold Out'}
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
                  <label className="font-bold text-gray-700 block text-xs mb-1">Monrovia Neighborhood *</label>
                  <CustomDropdown
                    options={MONROVIA_NEIGHBORHOODS}
                    value={restNeighborhood}
                    onChange={setRestNeighborhood}
                    placeholder="Select Monrovia Neighborhood..."
                    buttonClassName="bg-gray-50 border-gray-200 text-xs text-[#111827] font-semibold rounded-xl py-2.5 px-3.5"
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
                      {restLocation ? 'Update Location' : 'Open Map'}
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

                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#FF4B26]" />
                      <span>Authorized Staff Phone Numbers (Team Kitchen Login)</span>
                    </label>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {restAllowedPhonesList.length} staff {restAllowedPhonesList.length === 1 ? 'number' : 'numbers'}
                    </span>
                  </div>

                  {/* Add Input Row */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={newStaffPhoneInput}
                        onChange={(e) => {
                          setNewStaffPhoneInput(e.target.value);
                          setStaffPhoneError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddStaffPhone();
                          }
                        }}
                        placeholder="e.g. 0886 554 321 or 0777 990 123"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStaffPhone}
                      className="px-4 py-2.5 bg-[#06C167] hover:bg-[#048747] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Add</span>
                    </button>
                  </div>

                  {staffPhoneError && (
                    <p className="text-[11px] text-red-500 font-semibold">{staffPhoneError}</p>
                  )}

                  {/* Badges / Chips list of added phone numbers */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {restPhone.trim().length > 4 && !restAllowedPhonesList.includes(restPhone.trim()) && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-700">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span>{restPhone} (Main)</span>
                      </div>
                    )}
                    {restAllowedPhonesList.map((p) => (
                      <div
                        key={p}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F8EE] border border-emerald-200 rounded-xl text-xs font-mono font-bold text-[#048747] shadow-2xs animate-in fade-in duration-150"
                      >
                        <Phone className="w-3 h-3 text-[#06C167]" />
                        <span>{p}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStaffPhone(p)}
                          className="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title={`Remove ${p}`}
                          aria-label={`Remove phone ${p}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-gray-500">
                    Any kitchen manager or chef whose phone number is listed above can log into this kitchen display portal using the 6-digit PIN.
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
          <div className="bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-gray-100 p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#111827]">
                  {editingDish ? 'Edit Dish' : 'Add New Dish to Menu'}
                </h3>
                <p className="text-xs text-gray-500">
                  Upload food photos, configure sides/extras, custom prep time &amp; spice preference
                </p>
              </div>
              <button
                onClick={() => {
                  resetDishForm();
                  setIsAddDishOpen(false);
                }}
                className="p-1.5 text-gray-400 hover:text-black rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateDish} className="space-y-5 text-xs">
              
              {/* SECTION 1: NAME & PRICE */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 flex items-center justify-between">
                    <span>Dish Name *</span>
                    <span className="text-[10px] text-gray-400 font-normal">Title seen by customers</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="e.g. Grilled Snapper with Sweet Plantains"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span>Price ($ USD) *</span>
                      {dishPrice && (
                        <span className="text-[10px] font-mono text-[#06C167] font-bold">
                          ≈ L$ {Math.round((parseFloat(dishPrice) || 0) * USD_TO_LRD_RATE).toLocaleString()}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.25"
                        min="0.5"
                        required
                        value={dishPrice}
                        onChange={(e) => setDishPrice(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Appetizing Description</label>
                    <input
                      type="text"
                      value={dishDescription}
                      onChange={(e) => setDishDescription(e.target.value)}
                      placeholder="e.g. Served with spicy habanero glaze & fried dodo"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CUSTOM CATEGORY PICKER */}
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#FF4B26]" />
                    <span>Dish Category</span>
                  </label>
                  <span className="text-[10px] text-[#FF4B26] font-bold">
                    {isCustomCategory ? (customCategoryText || 'Custom') : (PRESET_DISH_CATEGORIES.find(c => c.id === dishCategory)?.label || dishCategory)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PRESET_DISH_CATEGORIES.map((cat) => {
                    const isSelected = !isCustomCategory && dishCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setDishCategory(cat.id);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#FF4B26] text-white border-[#FF4B26] shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(true);
                      setDishCategory('custom');
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCustomCategory
                        ? 'bg-[#FF4B26] text-white border-[#FF4B26] shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Custom Category</span>
                  </button>
                </div>

                {isCustomCategory && (
                  <div className="pt-1.5 animate-in fade-in slide-in-from-top-1">
                    <input
                      type="text"
                      required={isCustomCategory}
                      value={customCategoryText}
                      onChange={(e) => setCustomCategoryText(e.target.value)}
                      placeholder="Enter custom category name (e.g. Seafood Specials, Night Grills)..."
                      className="w-full px-3.5 py-2 bg-orange-50/50 border border-orange-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#FF4B26]"
                    />
                  </div>
                )}
              </div>

              {/* SECTION 3: CUSTOM PREP TIME PICKER */}
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#FF4B26]" />
                    <span>Kitchen Prep Time</span>
                  </label>
                  <span className="text-[10px] text-[#048747] font-bold bg-[#E8F8EE] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                    ⏱️ {isCustomPrepTime ? (customPrepTimeText ? `${customPrepTimeText} mins` : 'Custom') : `${dishPrepTime} mins`}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_PREP_TIMES.map((pt) => {
                    const isSelected = !isCustomPrepTime && dishPrepTime === pt.minutes;
                    return (
                      <button
                        key={pt.minutes}
                        type="button"
                        onClick={() => {
                          setIsCustomPrepTime(false);
                          setDishPrepTime(pt.minutes);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#E8F8EE] text-[#048747] border-[#06C167] ring-1 ring-[#06C167] shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-xs font-extrabold">{pt.label}</div>
                        <div className="text-[9px] text-gray-400 font-medium truncate">{pt.note}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPrepTime(!isCustomPrepTime);
                      if (!isCustomPrepTime && !customPrepTimeText) {
                        setCustomPrepTimeText(dishPrepTime.toString());
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      isCustomPrepTime ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {isCustomPrepTime ? '✓ Custom Time Active' : '+ Set Custom Minutes'}
                  </button>

                  {isCustomPrepTime && (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={customPrepTimeText}
                        onChange={(e) => setCustomPrepTimeText(e.target.value)}
                        placeholder="e.g. 18"
                        className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#FF4B26]"
                      />
                      <span className="text-xs text-gray-500 font-bold">minutes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: SPICE PREFERENCE */}
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-500" />
                    <span>Spice Preference &amp; Pepper Level</span>
                  </label>
                  <span className="text-[10px] font-bold text-red-600">
                    {isCustomSpice ? (customSpiceText || 'Custom') : dishSpice}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESET_SPICE_LEVELS.map((spice) => {
                    const isSelected = !isCustomSpice && dishSpice === spice.id;
                    return (
                      <button
                        key={spice.id}
                        type="button"
                        onClick={() => {
                          setIsCustomSpice(false);
                          setDishSpice(spice.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-red-50 border-red-400 text-red-800 ring-1 ring-red-400 shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-[10px] text-gray-500 font-semibold">{spice.badge}</span>
                        <span className="text-xs font-extrabold mt-0.5 truncate">{spice.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSpice(!isCustomSpice);
                      if (!isCustomSpice && !customSpiceText) {
                        setCustomSpiceText(dishSpice);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      isCustomSpice ? 'bg-red-600 text-white border-red-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {isCustomSpice ? '✓ Custom Spice Active' : '+ Custom Spice Note'}
                  </button>

                  {isCustomSpice && (
                    <input
                      type="text"
                      value={customSpiceText}
                      onChange={(e) => setCustomSpiceText(e.target.value)}
                      placeholder="e.g. Pepper on the side, Habanero dip..."
                      className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-red-500"
                    />
                  )}
                </div>
              </div>

              {/* SECTION 5: SIDE ITEMS & EXTRAS (ADDONS) WITH PRICES */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <ListPlus className="w-3.5 h-3.5 text-[#06C167]" />
                      <span>Side Items &amp; Extras ({dishAddons.length})</span>
                    </label>
                    <p className="text-[10px] text-gray-400">
                      Buyers can add these extra side portions and pay the specified amount
                    </p>
                  </div>
                </div>

                {/* Quick Add Preset Monrovia Addons */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Add Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ADDON_SUGGESTIONS.map((preset) => {
                      const alreadyAdded = dishAddons.some((a) => a.name.toLowerCase() === preset.name.toLowerCase());
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleQuickAddPresetAddon(preset)}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            alreadyAdded
                              ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-[#06C167] hover:text-[#048747] hover:bg-[#E8F8EE]/40'
                          }`}
                        >
                          + {preset.name} (${preset.price.toFixed(2)})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Currently Added Addons List */}
                {dishAddons.length > 0 && (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {dishAddons.map((addon, idx) => (
                      <div
                        key={addon.id || idx}
                        className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-[#E8F8EE] text-[#048747] text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 truncate block">{addon.name}</span>
                            {addon.description && (
                              <span className="text-[10px] text-gray-400 truncate block">{addon.description}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-black text-[#048747] bg-white px-2 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                            +${addon.price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAddon(addon.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Extra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form row to add custom Extra */}
                <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-[10px] font-bold text-gray-600 block">Add Custom Side / Extra:</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newAddonName}
                      onChange={(e) => setNewAddonName(e.target.value)}
                      placeholder="Extra Name (e.g. Extra Fried Plantains, Avocado Dip)..."
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                    />
                    <div className="flex items-center gap-2">
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={newAddonPrice}
                          onChange={(e) => setNewAddonPrice(e.target.value)}
                          placeholder="Price"
                          className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#06C167]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomAddon}
                        disabled={!newAddonName.trim()}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          newAddonName.trim()
                            ? 'bg-[#06C167] hover:bg-[#048747] text-white shadow-xs'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Extra</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: MULTIPLE FOOD PHOTOS & IMAGE ARRANGER */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#FF4B26]" />
                      <span>Food Photos &amp; Display Order ({uploadedImages.length})</span>
                    </label>
                    <p className="text-[10px] text-gray-400">
                      The 1st photo is used as the main cover on the menu. Use arrows to arrange order.
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-normal">PNG, JPG, WebP</span>
                </div>

                {/* Upload & Preset Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-gray-200 hover:border-[#FF4B26] hover:bg-orange-50/40 rounded-2xl cursor-pointer transition-all">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-gray-700">Choose images from device</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex flex-col justify-between gap-1.5">
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Or paste photo URL..."
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-3.5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors shrink-0"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {PRESET_FOOD_IMAGES.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setUploadedImages((prev) => [...prev, preset.url])}
                          className="text-[9px] font-semibold bg-gray-100 hover:bg-orange-100 hover:text-[#FF4B26] px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visual Image Arranger List */}
                {uploadedImages.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Uploaded Photos (Drag / Arrange Display Order):
                    </span>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative rounded-2xl overflow-hidden border-2 flex flex-col bg-gray-50 transition-all ${
                            idx === 0
                              ? 'border-[#06C167] ring-2 ring-[#06C167]/20 shadow-sm'
                              : 'border-gray-200'
                          }`}
                        >
                          {/* Image preview */}
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                            <img
                              src={img}
                              alt={`Dish photo ${idx + 1}`}
                              className="w-full h-full object-cover object-center"
                            />

                            {/* Badge */}
                            <div className="absolute top-1.5 left-1.5">
                              {idx === 0 ? (
                                <span className="px-2 py-0.5 bg-[#06C167] text-white text-[9px] font-black rounded-md shadow-sm flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                  <span>Cover (1st)</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold rounded-md">
                                  #{idx + 1}
                                </span>
                              )}
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                              title="Delete Photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Reordering Controls */}
                          <div className="p-1.5 bg-white border-t border-gray-100 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveImageLeft(idx)}
                              className={`p-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                                idx === 0
                                  ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                  : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                              }`}
                              title="Move Left / Earlier"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            {idx > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleMakePrimaryImage(idx)}
                                className="text-[9px] font-extrabold text-[#06C167] hover:underline cursor-pointer"
                                title="Set as primary cover"
                              >
                                Set Cover
                              </button>
                            ) : (
                              <span className="text-[9px] font-extrabold text-[#06C167]">Main</span>
                            )}

                            <button
                              type="button"
                              disabled={idx === uploadedImages.length - 1}
                              onClick={() => handleMoveImageRight(idx)}
                              className={`p-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                                idx === uploadedImages.length - 1
                                  ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                  : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                              }`}
                              title="Move Right / Later"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetDishForm();
                    setIsAddDishOpen(false);
                  }}
                  className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-2xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-2/3 py-3.5 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingDish ? 'Update Dish on Menu' : 'Publish Dish to Menu'}</span>
                </button>
              </div>

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
