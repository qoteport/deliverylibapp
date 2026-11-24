import { command } from './utils/commandApi';
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MenuSection } from './components/MenuSection';
import { DishModal } from './components/DishModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { DiningModeModal } from './components/DiningModeModal';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';

import { AdminPortal } from './components/AdminPortal';
import { AdminAuthGuard } from './components/AdminAuthGuard';
import { RestaurantPortal } from './components/RestaurantPortal';
import { DriverPortal } from './components/DriverPortal';
import { DriverJoinModal } from './components/DriverJoinModal';
import { RestaurantOnboardingModal } from './components/RestaurantOnboardingModal';
import { RestaurantBar } from './components/RestaurantBar';
import { PopularHorizontalBar } from './components/PopularHorizontalBar';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { LoginModal } from './components/LoginModal';
import { AccountModal } from './components/AccountModal';
import { FloatingOrderTrackerFab } from './components/FloatingOrderTrackerFab';
import { AppsHubModal } from './components/AppsHubModal';
import { AppsPage } from './components/AppsPage';
import { RidesPortal } from './components/RidesPortal';
import { SupermarketApp } from './components/SupermarketApp';
import { SupermarketPortal } from './components/SupermarketPortal';
import { SupermarketOnboardingModal } from './components/SupermarketOnboardingModal';
import { RealEstateApp } from './components/RealEstateApp';
import { LifestyleApp } from './components/LifestyleApp';
import { MotorsApp } from './components/MotorsApp';
import { UnifiedPortalHub } from './components/UnifiedPortalHub';
import { RealEstatePortal } from './components/RealEstatePortal';
import { MotorsPortal } from './components/MotorsPortal';
import { MenuItem, CartItem, Order, DiningMode, Currency, Restaurant, DeliveryDriver, SupermarketStore, MONROVIA_NEIGHBORHOOD_COORDS } from './types';
import { MENU_ITEMS } from './data/menuData';
import { INITIAL_RESTAURANTS } from './data/demoRestaurants';
import { INITIAL_DRIVERS } from './data/demoDrivers';
import { SUPERMARKETS } from './data/supermarketData';
import { db } from './firebase/config';
import { collection, query, where, limit, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from './context/AuthContext';
import { parseRoute, navigateTo, AppRoute } from './utils/navigation';
import { sendBrowserNotification, requestNotificationPermission } from './utils/browserNotifications';
import { delegateOrderToDriver } from './utils/dispatchEngine';
import { sanitizeForFirestore, isDummyMenuItem, isDummyRestaurant, cleanMenuList, cleanRestaurantList } from './utils/cleanData';
import {
  fetchOrdersFromApi,
  saveOrderToApi,
  updateOrderStatusApi,
  fetchDriversFromApi,
  saveDriverToApi,
  deleteDriverFromApi,
  fetchRestaurantsFromApi,
  saveRestaurantToApi,
  deleteRestaurantFromApi,
  fetchMenuFromApi,
  saveMenuItemToApi,
  deleteMenuItemFromApi,
  bulkDeleteMenuItemsFromApi,
} from './utils/apiSync';
import { subscribeToUsdToLrdRate } from './utils/currencyRate';
import { Check, Store, Bike } from 'lucide-react';

export default function App() {
  const { user } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => 
    parseRoute(window.location.pathname, window.location.hash)
  );

  const [diningMode, setDiningMode] = useState<DiningMode>('delivery');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<'menu' | 'apps' | 'favorites' | 'orders'>('menu');

  // Modal Visibilities
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDriverJoinOpen, setIsDriverJoinOpen] = useState(false);
  const [selectedDishForModal, setSelectedDishForModal] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isDiningModeOpen, setIsDiningModeOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState(false);
  const [isAppsHubOpen, setIsAppsHubOpen] = useState(false);
  const [isRidesPortalOpen, setIsRidesPortalOpen] = useState(false);
  const [isSupermarketOpen, setIsSupermarketOpen] = useState(false);

  // Restaurants & Menu Items (Clean state synced with Firestore)
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const saved = localStorage.getItem('aura_monrovia_restaurants');
      if (saved) {
        const parsed = JSON.parse(saved);
        return cleanRestaurantList(parsed);
      }
    } catch {}
    return [];
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('aura_monrovia_menu');
      if (saved) {
        const parsed = JSON.parse(saved);
        return cleanMenuList(parsed);
      }
    } catch {}
    return [];
  });

  // Drivers Fleet State
  const [drivers, setDrivers] = useState<DeliveryDriver[]>(() => {
    try {
      const saved = localStorage.getItem('aura_monrovia_drivers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Supermarkets & Stores State
  const [supermarkets, setSupermarkets] = useState<SupermarketStore[]>(() => {
    try {
      const saved = localStorage.getItem('aura_monrovia_supermarkets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SUPERMARKETS;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aura_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aura_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>([]);

  const [checkoutTotals, setCheckoutTotals] = useState({
    subtotal: 0,
    discount: 0,
    serviceFee: 0,
    deliveryFee: 0,
    tax: 0,
    tip: 0,
    total: 0,
    promoCode: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2400);
  };

  // Listen to browser navigation popstate events
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(parseRoute(window.location.pathname, window.location.hash));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Prompt browser notification permissions on app mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission().catch(() => {});
    }
  }, []);

  // Realtime Firestore Sync: Currency Exchange Rate (USD to LRD)
  useEffect(() => {
    const unsub = subscribeToUsdToLrdRate((rate) => {
      // Rates updated across all components in real-time
    });
    return () => unsub();
  }, []);


  // Handle URL route changes for Rides and Supermarket
  useEffect(() => {
    if (currentRoute.name === 'rides') {
      setIsRidesPortalOpen(true);
    } else if (currentRoute.name === 'supermarket') {
      setIsSupermarketOpen(true);
    }
  }, [currentRoute]);

  // 1. Realtime Firestore Sync: Restaurants
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      query(collection(db, 'public_catalog', 'restaurants', 'items'), where('published', '==', true), limit(100)),
      (snapshot) => {
        const remoteList: Restaurant[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Restaurant;
          const rest = { ...data, id: data.id || docSnap.id };
          if (isDummyRestaurant(rest)) {
            // Guest discovery never mutates source records.
            return;
          }
          if (rest && rest.name) {
            remoteList.push(rest);
          }
        });
        const cleanList = cleanRestaurantList(remoteList);
        setRestaurants(cleanList);
        try {
          localStorage.setItem('aura_monrovia_restaurants', JSON.stringify(cleanList));
        } catch {}

      },
      (error) => {
        console.warn('Firestore restaurants snapshot notice:', error);
      }
    );
    return () => unsub();
  }, []);

  // Menu is authoritative; an empty catalog never triggers browser writes.
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'public_catalog', 'menu', 'items'), where('published', '==', true), limit(100)), snapshot => {
      const records = snapshot.docs.map(record => ({ ...record.data(), id: record.id } as MenuItem));
      setMenuItems(cleanMenuList(records));
    }, () => setMenuItems([]));
    return () => unsub();
  }, []);

  // 3. Realtime Firestore Sync: Drivers Fleet
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'drivers'),
      (snapshot) => {
        const remoteDrivers: DeliveryDriver[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DeliveryDriver;
          if (data) {
            remoteDrivers.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });

        if (remoteDrivers.length > 0) {
          setDrivers(remoteDrivers);
          remoteDrivers.forEach((d) => saveDriverToApi(d).catch(() => {}));
          try {
            localStorage.setItem('aura_monrovia_drivers', JSON.stringify(remoteDrivers));
          } catch (e) {
            console.warn('LocalStorage drivers cache error:', e);
          }
        }
      },
      (error) => {
        console.warn('Firestore drivers snapshot notice:', error);
      }
    );
    return () => unsub();
  }, []);

  // The command API returns only the verified actor's scoped orders.
  useEffect(() => {
    let cancelled = false;
    setOrders([]); setActiveTrackingOrder(null);
    if (!user) return;
    const scope = user.role === 'driver' ? 'driver'
      : ['restaurant_owner', 'supermarket_owner'].includes(user.role) ? 'merchant' : 'customer';
    const load = async () => {
      try {
        const result = await command(`/v1/orders?scope=${scope}`);
        if (!cancelled) setOrders(result.orders);
      } catch { if (!cancelled) setOrders([]); }
    };
    void load();
    const timer = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [user?.uid, user?.role]);

  // 4b. Realtime Firestore Sync: Supermarkets Feed
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      query(collection(db, 'public_catalog', 'supermarkets', 'items'), where('published', '==', true), limit(100)),
      (snapshot) => {
        const remoteSm: SupermarketStore[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SupermarketStore;
          if (data && data.name) {
            remoteSm.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
        if (remoteSm.length > 0) {
          setSupermarkets(remoteSm);
          try {
            localStorage.setItem('aura_monrovia_supermarkets', JSON.stringify(remoteSm));
          } catch {}
        }
      },
      (error) => {
        console.warn('Firestore supermarkets snapshot notice:', error);
      }
    );
    return () => unsub();
  }, []);

  const handleSupermarketCreated = (newSm: SupermarketStore) => {
    setSupermarkets((prev) => {
      const updated = [newSm, ...prev.filter((s) => s.id !== newSm.id)];
      try {
        localStorage.setItem('aura_monrovia_supermarkets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`Supermarket ${newSm.name} registered successfully!`);
  };

  // 5. Continuous Dual Realtime Sync with Backend API Store (Zero-Config, High Availability)
  useEffect(() => {
    let isMounted = true;

    const syncWithApi = async () => {
      // 1. Sync Orders
      const apiOrders = await fetchOrdersFromApi();
      if (apiOrders && isMounted && apiOrders.length > 0) {
        setOrders((prev) => {
          const idMap = new Map(prev.map((o) => [o.id, o]));
          apiOrders.forEach((o) => idMap.set(o.id, { ...idMap.get(o.id), ...o }));
          return Array.from(idMap.values()).sort(
            (a, b) => (b.createdAtTimestamp || new Date(b.createdAt).getTime() || 0) - (a.createdAtTimestamp || new Date(a.createdAt).getTime() || 0)
          );
        });
      }

      // 2. Sync Drivers
      const apiDrivers = await fetchDriversFromApi();
      if (apiDrivers && isMounted && apiDrivers.length > 0) {
        setDrivers((prev) => {
          const idMap = new Map(prev.map((d) => [d.id, d]));
          apiDrivers.forEach((d) => idMap.set(d.id, { ...idMap.get(d.id), ...d }));
          return Array.from(idMap.values());
        });
      }

      // 3. Sync Restaurants
      const apiRestaurants = await fetchRestaurantsFromApi();
      if (apiRestaurants && isMounted && apiRestaurants.length > 0) {
        setRestaurants((prev) => {
          const idMap = new Map(prev.map((r) => [r.id, r]));
          apiRestaurants.forEach((r) => idMap.set(r.id, { ...idMap.get(r.id), ...r }));
          return Array.from(idMap.values());
        });
      }

      // 4. Sync Menu
      const apiMenu = await fetchMenuFromApi();
      if (apiMenu && isMounted && apiMenu.length > 0) {
        setMenuItems((prev) => {
          const idMap = new Map(prev.map((m) => [m.id, m]));
          apiMenu.forEach((m) => idMap.set(m.id, { ...idMap.get(m.id), ...m }));
          return Array.from(idMap.values());
        });
      }
    };

    syncWithApi();
    const interval = setInterval(syncWithApi, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Persist local state backups
  useEffect(() => {
    try {
      localStorage.setItem('aura_monrovia_restaurants', JSON.stringify(restaurants));
    } catch {}
  }, [restaurants]);

  useEffect(() => {
    try {
      localStorage.setItem('aura_monrovia_menu', JSON.stringify(menuItems));
    } catch {}
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem('aura_monrovia_drivers', JSON.stringify(drivers));
    } catch {}
  }, [drivers]);

  useEffect(() => {
    try {
      localStorage.setItem('aura_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('aura_favorites', JSON.stringify(favoriteIds));
    } catch {}
  }, [favoriteIds]);

  useEffect(() => {
    try {
      localStorage.setItem('aura_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Keep active tracking order in sync with incoming Firestore updates, API syncs, and driver acceptance
  useEffect(() => {
    if (activeTrackingOrder) {
      const freshOrder = orders.find((o) => o.id === activeTrackingOrder.id);
      if (freshOrder && JSON.stringify(freshOrder) !== JSON.stringify(activeTrackingOrder)) {
        setActiveTrackingOrder(freshOrder);
      }
    }
  }, [orders, activeTrackingOrder]);

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const favoriteDishes = menuItems.filter((item) => favoriteIds.includes(item.id));
  const activeOrders = orders.filter((o) => o.status !== 'completed');

  // Currency toggle
  const handleToggleCurrency = () => {
    setCurrency((prev) => {
      const next = prev === 'USD' ? 'LRD' : 'USD';
      showToast(`Switched currency to ${next === 'USD' ? 'US Dollars ($)' : 'Liberian Dollars (L$)'}`);
      return next;
    });
  };

  // Cart operations
  const handleAddToCart = (newItem: Omit<CartItem, 'cartItemId' | 'itemTotal'>) => {
    const addonsPrice = newItem.selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const itemTotal = (newItem.menuItem.price + addonsPrice) * newItem.quantity;
    const cartItemId = `${newItem.menuItem.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    setCartItems((prev) => [
      ...prev,
      {
        ...newItem,
        cartItemId,
        itemTotal,
      },
    ]);

    showToast(`Added ${newItem.quantity}x ${newItem.menuItem.name}`);
  };

  const handleQuickAddToCart = (dish: MenuItem) => {
    const cartItemId = `${dish.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setCartItems((prev) => [
      ...prev,
      {
        cartItemId,
        menuItem: dish,
        quantity: 1,
        selectedAddons: [],
        itemTotal: dish.price,
      },
    ]);
    showToast(`Added 1x ${dish.name}`);
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const addonsPrice = item.selectedAddons.reduce((sum, a) => sum + a.price, 0);
          const itemTotal = (item.menuItem.price + addonsPrice) * newQty;
          return { ...item, quantity: newQty, itemTotal };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleToggleFavorite = (dishId: string) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(dishId);
      if (exists) {
        showToast('Removed from saved');
        return prev.filter((id) => id !== dishId);
      } else {
        showToast('Saved to Monrovia favorites');
        return [...prev, dishId];
      }
    });
  };

  const handleProceedToCheckout = (totals: typeof checkoutTotals) => {
    setCheckoutTotals(totals);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderPlaced = async (newOrder: Order) => {
    // Already committed and priced by the command API: never dual-write it.
    setOrders(previous => [newOrder, ...previous.filter(order => order.id !== newOrder.id)]);
    setCartItems([]); setIsCheckoutOpen(false);
    setActiveTrackingOrder(newOrder); setIsOrderTrackerOpen(true);
    showToast(`Order ${newOrder.id} received. Awaiting merchant confirmation.`);
  };

  const handleDriverRejectOrder = async (orderId: string, driverId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const updatedRejected = [...(targetOrder.rejectedDriverIds || []), driverId];
    const orderWithRejected: Order = {
      ...targetOrder,
      rejectedDriverIds: updatedRejected,
      assignedDriverId: undefined,
      assignedDriverName: undefined,
      delegationStatus: 'unassigned',
    };

    // Re-run Delegation Engine to find next best driver
    const orderRestaurant = restaurants.find(
      (r) => r.id === orderWithRejected.restaurantId || r.name.toLowerCase() === orderWithRejected.restaurantName?.toLowerCase()
    );
    const restNeighborhood = orderRestaurant?.neighborhood || 'Sinkor (Tubman Blvd)';
    const restCoords = orderRestaurant?.location || MONROVIA_NEIGHBORHOOD_COORDS[restNeighborhood] || MONROVIA_NEIGHBORHOOD_COORDS['Sinkor (Tubman Blvd)'];
    const res = await delegateOrderToDriver(orderWithRejected, drivers, restCoords);

    if (res.success && res.updatedOrder) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? res.updatedOrder! : o))
      );
      showToast('Delivery re-delegated to next available Monrovia rider');
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? orderWithRejected : o))
      );
      showToast('No additional riders available currently');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status'],
      cancelledBy?: 'customer' | 'restaurant' | 'admin', cancellationReason?: string, extra?: Partial<Order>) => {
    const current = orders.find(order => order.id === orderId) || activeTrackingOrder;
    if (!current || current.id !== orderId) return;
    try {
      const result = await command(`/v1/orders/${orderId}/transition`, {
        status, expectedVersion: (current as any).version,
      });
      setOrders(previous => previous.map(order => order.id === orderId ? result.order : order));
      if (activeTrackingOrder?.id === orderId) setActiveTrackingOrder(result.order);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Status update failed.'); }
  };

  const handleReorder = (order: Order) => {
    const newItems: CartItem[] = order.items.map((item) => ({
      ...item,
      cartItemId: `${item.menuItem.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    }));
    setCartItems((prev) => [...prev, ...newItems]);
    setIsCartOpen(true);
    showToast('Reorder items added to bag');
  };

  const handleRestaurantCreated = async (newRest: Restaurant) => {
    setRestaurants((prev) => [newRest, ...prev]);
    showToast(`Restaurant "${newRest.name}" registered successfully!`);
    saveRestaurantToApi(newRest).catch((e) => console.warn('API save restaurant notice:', e));
    try {
      await setDoc(doc(db, 'restaurants', newRest.id), sanitizeForFirestore(newRest), { merge: true });
    } catch (e) {
      console.warn('Firestore setDoc restaurant notice:', e);
    }
  };

  const handleUpdateRestaurant = async (updatedRest: Restaurant) => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === updatedRest.id ? updatedRest : r))
    );
    saveRestaurantToApi(updatedRest).catch((e) => console.warn('API update restaurant notice:', e));
    try {
      await setDoc(doc(db, 'restaurants', updatedRest.id), sanitizeForFirestore(updatedRest), { merge: true });
    } catch (e) {
      console.warn('Firestore setDoc restaurant notice:', e);
    }
  };

  const handleToggleRestaurantStatus = async (restaurantId: string) => {
    const target = restaurants.find((r) => r.id === restaurantId);
    if (!target) return;
    const newStatus = !target.isOpen;

    setRestaurants((prev) =>
      prev.map((r) => (r.id === restaurantId ? { ...r, isOpen: newStatus } : r))
    );

    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), { isOpen: newStatus });
      showToast(`${target.name} is now ${newStatus ? 'OPEN' : 'CLOSED'}`);
    } catch (e) {
      console.warn('Firestore updateDoc restaurant status notice:', e);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string) => {
    setRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
    setMenuItems((prev) => prev.filter((m) => m.restaurantId !== restaurantId));
    deleteRestaurantFromApi(restaurantId).catch(() => {});

    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId));
      showToast('Restaurant removed from Monrovia network');
    } catch (e) {
      console.warn('Firestore deleteDoc restaurant notice:', e);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== driverId));
    deleteDriverFromApi(driverId).catch(() => {});
    try {
      await deleteDoc(doc(db, 'drivers', driverId));
    } catch (e) {
      console.warn('Firestore delete driver notice:', e);
    }
  };

  const handleDeleteOrders = (ids: string[]) => {
    setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
  };

  const handleDeleteDrivers = (ids: string[]) => {
    setDrivers((prev) => prev.filter((d) => !ids.includes(d.id)));
  };

  const handleDeleteRestaurants = (ids: string[]) => {
    setRestaurants((prev) => prev.filter((r) => !ids.includes(r.id)));
    setMenuItems((prev) => prev.filter((m) => !ids.includes(m.restaurantId || '')));
  };

  const handleUpdateDriver = async (updatedDriver: DeliveryDriver) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === updatedDriver.id ? updatedDriver : d))
    );
    saveDriverToApi(updatedDriver).catch((e) => console.warn('API driver update notice:', e));
    try {
      await setDoc(doc(db, 'drivers', updatedDriver.id), updatedDriver, { merge: true });
    } catch (e) {
      console.warn('Firestore driver update notice:', e);
    }
  };

  const handleDriverRegistered = async (newDriver: DeliveryDriver) => {
    setDrivers((prev) => {
      const exists = prev.some((d) => d.id === newDriver.id);
      const updated = exists ? prev.map((d) => (d.id === newDriver.id ? newDriver : d)) : [newDriver, ...prev];
      try {
        localStorage.setItem('aura_monrovia_drivers', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage driver cache notice:', e);
      }
      return updated;
    });
    showToast(`Welcome ${newDriver.name}! Driver profile created.`);
    saveDriverToApi(newDriver).catch((e) => console.warn('API driver register notice:', e));
    try {
      await setDoc(doc(db, 'drivers', newDriver.id), sanitizeForFirestore(newDriver), { merge: true });
    } catch (e) {
      console.warn('Firestore driver write notice:', e);
    }
  };

  const handleAddMenuItem = async (item: MenuItem) => {
    setMenuItems((prev) => {
      const exists = prev.some((m) => m.id === item.id);
      const updated = exists ? prev.map((m) => (m.id === item.id ? item : m)) : [item, ...prev];
      try {
        localStorage.setItem('aura_monrovia_menu', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage menu write notice:', e);
      }
      return updated;
    });
    showToast(`Saved "${item.name}"`);
    saveMenuItemToApi(item).catch((e) => console.warn('API save menu notice:', e));
    try {
      const sanitized = sanitizeForFirestore(item);
      await setDoc(doc(db, 'menu', item.id), sanitized);
    } catch (e) {
      console.warn('Firestore setDoc menu notice:', e);
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    setMenuItems((prev) => {
      const updated = prev.filter((m) => m.id !== itemId);
      try {
        localStorage.setItem('aura_monrovia_menu', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage menu write notice:', e);
      }
      return updated;
    });
    showToast('Dish removed from menu');
    deleteMenuItemFromApi(itemId).catch((e) => console.warn('API delete menu notice:', e));
    try {
      await deleteDoc(doc(db, 'menu', itemId));
    } catch (e) {
      console.warn('Firestore deleteDoc menu notice:', e);
    }
  };

  const handleBulkDeleteMenuItems = async (ids: string[]) => {
    setMenuItems((prev) => {
      const updated = prev.filter((m) => !ids.includes(m.id));
      try {
        localStorage.setItem('aura_monrovia_menu', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage menu write notice:', e);
      }
      return updated;
    });
    showToast(`Removed ${ids.length} dishes from menu`);
    bulkDeleteMenuItemsFromApi(ids).catch(() => {});
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => {
        batch.delete(doc(db, 'menu', id));
      });
      await batch.commit();
    } catch (e) {
      console.warn('Firestore bulk delete menu notice:', e);
    }
  };

  const handleToggleItemAvailability = async (itemId: string) => {
    let updatedItem: MenuItem | undefined;
    setMenuItems((prev) => {
      const updated = prev.map((m) => {
        if (m.id === itemId) {
          const toggled = { ...m, isAvailable: m.isAvailable !== false ? false : true };
          updatedItem = toggled;
          return toggled;
        }
        return m;
      });
      try {
        localStorage.setItem('aura_monrovia_menu', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage menu write notice:', e);
      }
      return updated;
    });
    showToast('Updated item stock availability in real time');
    if (updatedItem) {
      saveMenuItemToApi(updatedItem).catch(() => {});
      try {
        const sanitized = sanitizeForFirestore(updatedItem);
        await setDoc(doc(db, 'menu', itemId), sanitized, { merge: true });
      } catch (e) {
        console.warn('Firestore toggle availability notice:', e);
      }
    }
  };

  const handlePurgeAllDemoData = async () => {
    const confirmPurge = window.confirm(
      'Are you sure you want to drop ALL restaurants, menu dishes, drivers, and orders from Firestore and localStorage to start completely clean in production?'
    );
    if (!confirmPurge) return;

    showToast('Dropping all Firestore documents & resetting app...');

    // Clear local storage
    localStorage.removeItem('aura_monrovia_restaurants');
    localStorage.removeItem('aura_monrovia_menu');
    localStorage.removeItem('aura_monrovia_drivers');
    localStorage.removeItem('aura_orders');
    localStorage.removeItem('aura_cart');
    localStorage.removeItem('aura_favorites');
    localStorage.removeItem('aura_active_tracking_order_id');
    localStorage.setItem('aura_prod_full_wipe_2026', 'true');

    setRestaurants([]);
    setMenuItems([]);
    setDrivers([]);
    setOrders([]);
    setCartItems([]);
    setFavoriteIds([]);
    setActiveTrackingOrder(null);

    // Delete all documents across all collections from Firestore
    try {
      const collectionsToDrop = ['restaurants', 'menu', 'menu_items', 'drivers', 'orders'];
      for (const colName of collectionsToDrop) {
        const snap = await getDocs(collection(db, colName));
        const deletions = snap.docs.map((docSnap) => deleteDoc(docSnap.ref).catch(() => {}));
        await Promise.all(deletions);
      }
      showToast('All data dropped cleanly from Firestore. Ready for live production!');
    } catch (e) {
      console.warn('Drop error:', e);
      showToast('Local state wiped. Clean production mode active.');
    }
  };

  const handleFocusSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  // Only verified restaurants & their dishes are shown to public customers!
  const verifiedRestaurants = restaurants.filter(
    (r) => r.isVerified !== false && r.verificationStatus !== 'pending' && r.verificationStatus !== 'rejected'
  );
  const verifiedRestaurantIds = new Set(verifiedRestaurants.map((r) => r.id));
  const verifiedMenuItems = menuItems.filter(
    (m) => !m.restaurantId || verifiedRestaurantIds.has(m.restaurantId)
  );

  const LoadingFallback = (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-12 h-12 border-4 border-orange-500/30 border-t-[#FF4B26] rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-400">Loading portal...</p>
    </div>
  );

  // ==========================================
  // DISTINCT UI 1: SUPER ADMIN PORTAL (/admin)
  // ==========================================
  if (currentRoute.name === 'admin') {
    return (
      <ErrorBoundary>
        <AdminAuthGuard onReturnHome={() => navigateTo({ name: 'portal' })}>
          <AdminPortal
            restaurants={restaurants}
            orders={orders}
            drivers={drivers}
            menuItems={menuItems}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onExitAdmin={() => navigateTo({ name: 'portal' })}
            onOpenRestaurantPortal={(restaurantId) => navigateTo({ name: 'restaurant', restaurantId })}
            onToggleRestaurantStatus={handleToggleRestaurantStatus}
            onUpdateRestaurant={handleUpdateRestaurant}
            onDeleteRestaurant={handleDeleteRestaurant}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateDriver={handleUpdateDriver}
            onDeleteDriver={handleDeleteDriver}
            onDeleteOrders={handleDeleteOrders}
            onDeleteDrivers={handleDeleteDrivers}
            onDeleteRestaurants={handleDeleteRestaurants}
            onDeleteMenuItem={handleDeleteMenuItem}
            onDeleteMenuItems={handleBulkDeleteMenuItems}
            onToggleItemAvailability={handleToggleItemAvailability}
            onPurgeDemoData={handlePurgeAllDemoData}
            currency={currency}
            onToggleCurrency={handleToggleCurrency}
          />
        </AdminAuthGuard>
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 2: RESTAURANT MANAGEMENT PORTAL (/restaurant-management/:id)
  // =========================================================================
  if (currentRoute.name === 'restaurant') {
    const currentRestaurant =
      restaurants.find((r) => r.id === currentRoute.restaurantId) ||
      restaurants[0];

    if (!currentRestaurant) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#FF4B26] flex items-center justify-center mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Kitchen Not Found</h2>
          <p className="text-xs text-gray-500 max-w-sm my-2">
            This kitchen profile is not registered or has been removed from the network.
          </p>
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="mt-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      );
    }

    const restaurantDishes = menuItems.filter(
      (m) => m.restaurantId === currentRestaurant.id
    );

    return (
      <ErrorBoundary>
        <RestaurantPortal
          restaurant={currentRestaurant}
          menuItems={restaurantDishes}
          orders={orders}
          onExitPortal={() => navigateTo({ name: 'portal' })}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onAddMenuItem={handleAddMenuItem}
          onDeleteMenuItem={handleDeleteMenuItem}
          onToggleItemAvailability={handleToggleItemAvailability}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 3: DELIVERY DRIVER PORTAL (/driver)
  // =========================================================================
  if (currentRoute.name === 'driver') {
    const currentDriver =
      drivers.find((d) => d.id === currentRoute.driverId) ||
      drivers[0];

    if (!currentDriver) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <Bike className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Courier Profile Not Found</h2>
          <p className="text-xs text-gray-500 max-w-sm my-2">
            This courier profile is not registered or has been removed from the fleet roster.
          </p>
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="mt-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        <DriverPortal
          driver={currentDriver}
          orders={orders}
          onExitPortal={() => navigateTo({ name: 'portal' })}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateDriver={handleUpdateDriver}
          onDriverRejectOrder={handleDriverRejectOrder}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
          restaurants={restaurants}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 4: APPS HUB PAGE (/apps)
  // =========================================================================
  if (currentRoute.name === 'apps') {
    return (
      <ErrorBoundary>
        <AppsPage
          onBackToStorefront={() => navigateTo({ name: 'home' })}
          onOpenRides={() => navigateTo({ name: 'rides' })}
          onOpenSupermarket={() => navigateTo({ name: 'supermarket' })}
          onOpenRealEstate={() => navigateTo({ name: 'real-estate' })}
          onOpenLifestyle={() => navigateTo({ name: 'lifestyle' })}
          onOpenMotors={() => navigateTo({ name: 'motors' })}
          onOpenPortal={() => navigateTo({ name: 'portal' })}
          onOpenSupermarketOnboarding={() => navigateTo({ name: 'supermarket-onboarding' })}
          onOpenKitchenOnboarding={() => setIsOnboardingOpen(true)}
          onOpenLogin={() => {
            setAuthModalMode('login');
            setIsLoginOpen(true);
          }}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 5: AURA RIDES PORTAL PAGE (/rides)
  // =========================================================================
  if (currentRoute.name === 'rides') {
    return (
      <ErrorBoundary>
        <RidesPortal
          isOpen={true}
          isPageMode={true}
          onClose={() => navigateTo({ name: 'apps' })}
          availableDrivers={drivers}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 6: SUPERMARKET ECOMMERCE APP PAGE (/supermarket)
  // =========================================================================
  if (currentRoute.name === 'supermarket') {
    return (
      <ErrorBoundary>
        <SupermarketApp
          isOpen={true}
          isPageMode={true}
          onClose={() => navigateTo({ name: 'apps' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
          onOrderPlaced={(order) => {
            setOrders((prev) => [order, ...prev]);
            setActiveTrackingOrder(order);
            setIsOrderTrackerOpen(true);
          }}
          onOpenStorePortal={(storeId) => {
            navigateTo({ name: 'supermarket-management', supermarketId: storeId });
          }}
          onOpenSupermarketOnboarding={() => {
            navigateTo({ name: 'supermarket-onboarding' });
          }}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI: AURA REAL ESTATE APP PAGE (/real-estate)
  // =========================================================================
  if (currentRoute.name === 'real-estate') {
    return (
      <ErrorBoundary>
        <RealEstateApp
          isOpen={true}
          isPageMode={true}
          onClose={() => navigateTo({ name: 'apps' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI: AURA LIFESTYLE & TECH APP PAGE (/lifestyle)
  // =========================================================================
  if (currentRoute.name === 'lifestyle') {
    return (
      <ErrorBoundary>
        <LifestyleApp
          isOpen={true}
          isPageMode={true}
          onClose={() => navigateTo({ name: 'apps' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI: AURA MOTORS & RENTALS APP PAGE (/motors)
  // =========================================================================
  if (currentRoute.name === 'motors') {
    return (
      <ErrorBoundary>
        <MotorsApp
          isOpen={true}
          isPageMode={true}
          onClose={() => navigateTo({ name: 'apps' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 7: SUPERMARKET ONBOARDING & REGISTRATION (/supermarket-onboarding)
  // =========================================================================
  if (currentRoute.name === 'supermarket-onboarding') {
    return (
      <ErrorBoundary>
        <SupermarketOnboardingModal
          isOpen={true}
          isFullPage={true}
          onClose={() => navigateTo({ name: 'apps' })}
          onSupermarketCreated={handleSupermarketCreated}
          onOpenSupermarketPortal={(smId) => navigateTo({ name: 'supermarket-management', supermarketId: smId })}
          isSuperAdminMode={user?.role === 'super_admin'}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 8: SUPERMARKET MANAGEMENT PORTAL (/supermarket-management/:id)
  // =========================================================================
  if (currentRoute.name === 'supermarket-management') {
    const store =
      supermarkets.find((s) => s.id === currentRoute.supermarketId) ||
      supermarkets[0] ||
      SUPERMARKETS[0];

    return (
      <ErrorBoundary>
        <SupermarketPortal
          supermarket={store}
          orders={orders}
          onExitPortal={() => navigateTo({ name: 'portal' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI: UNIFIED BUSINESS & MANAGEMENT PORTAL (/portal)
  // =========================================================================
  if (currentRoute.name === 'portal') {
    return (
      <ErrorBoundary>
        <UnifiedPortalHub
          restaurants={restaurants}
          drivers={drivers}
          supermarkets={supermarkets}
          onOpenKitchenPortal={(restId) =>
            navigateTo({ name: 'restaurant', restaurantId: restId || restaurants[0]?.id || '' })
          }
          onOpenDriverPortal={(drvId) =>
            navigateTo({ name: 'driver', driverId: drvId || drivers[0]?.id })
          }
          onOpenSupermarketPortal={(smId) =>
            navigateTo({ name: 'supermarket-management', supermarketId: smId || supermarkets[0]?.id || '' })
          }
          onOpenRealEstatePortal={() => navigateTo({ name: 'real-estate-management' })}
          onOpenMotorsPortal={() => navigateTo({ name: 'motors-management' })}
          onOpenKitchenRegistration={() => setIsOnboardingOpen(true)}
          onOpenSupermarketRegistration={() => navigateTo({ name: 'supermarket-onboarding' })}
          onBackToStorefront={() => navigateTo({ name: 'home' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI: REAL ESTATE AGENCY & LANDLORD PORTAL (/real-estate-management)
  // =========================================================================
  if (currentRoute.name === 'real-estate-management') {
    return (
      <ErrorBoundary>
        <RealEstatePortal
          onExitPortal={() => navigateTo({ name: 'portal' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI: MOTORS & PARTS DEALERSHIP PORTAL (/motors-management)
  // =========================================================================
  if (currentRoute.name === 'motors-management') {
    return (
      <ErrorBoundary>
        <MotorsPortal
          onExitPortal={() => navigateTo({ name: 'portal' })}
          currency={currency}
          onToggleCurrency={handleToggleCurrency}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // DISTINCT UI 9: MAIN CONSUMER FOOD ORDERING APP (/)
  // =========================================================================
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#FF4B26]/20 selection:text-[#FF4B26]">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-gray-900/95 backdrop-blur-md text-white text-xs font-bold rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 border border-white/10">
          <Check className="w-4 h-4 text-[#FF4B26] stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PWA In-App Install Prompt Banner */}
      <PWAInstallBanner />

      {/* Decluttered Top Header */}
      <Header
        diningMode={diningMode}
        onOpenDiningModeSelect={() => setIsDiningModeOpen(true)}
        currency={currency}
        onToggleCurrency={handleToggleCurrency}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
        favoritesCount={favoriteIds.length}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        activeOrderCount={activeOrders.length}
        onOpenOrderTracker={() => {
          if (activeOrders.length > 0) {
            setActiveTrackingOrder(activeOrders[0]);
            setIsOrderTrackerOpen(true);
          } else {
            setIsFavoritesOpen(true);
          }
        }}
        onOpenLogin={() => {
          setAuthModalMode('login');
          setIsLoginOpen(true);
        }}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenRegister={() => {
          setAuthModalMode('register');
          setIsLoginOpen(true);
        }}
        onOpenAdminPortal={() => navigateTo({ name: 'admin' })}
        onOpenRestaurantPortal={(id) => navigateTo({ name: 'restaurant', restaurantId: id })}
        onOpenDriverPortal={() => navigateTo({ name: 'driver' })}
        onOpenDriverJoin={() => setIsDriverJoinOpen(true)}
        onOpenApps={() => setIsAppsHubOpen(true)}
      />

      <main className="flex-1 pb-20">
        {/* Buyer facing top: Popular items horizontal scroll */}
        <PopularHorizontalBar
          menuItems={verifiedMenuItems}
          onOpenDishModal={(dish) => setSelectedDishForModal(dish)}
          currency={currency}
        />

        {/* Monrovia Restaurants Directory Bar */}
        <RestaurantBar
          restaurants={verifiedRestaurants}
          menuItems={verifiedMenuItems}
          selectedRestaurantId={selectedRestaurantId}
          onSelectRestaurant={(id) => setSelectedRestaurantId(id)}
          selectedNeighborhood={selectedNeighborhood}
          onSelectNeighborhood={(nh) => setSelectedNeighborhood(nh)}
        />

        {/* Monrovia Food Search & Dining Preferences */}
        <Hero
          diningMode={diningMode}
          onSelectDiningMode={(mode) => setDiningMode(mode)}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          selectedNeighborhood={selectedNeighborhood}
          onSelectNeighborhood={(nh) => setSelectedNeighborhood(nh)}
          currency={currency}
          featuredDish={verifiedMenuItems.length > 0 ? (verifiedMenuItems.find((m) => m.isChefSpecial) || verifiedMenuItems[0]) : null}
          onQuickViewSpecial={() => {
            const special = verifiedMenuItems.find((m) => m.isChefSpecial) || verifiedMenuItems[0];
            if (special) setSelectedDishForModal(special);
          }}
        />

        {/* Focused Food Grid with Multi-Image Support & Prep Times */}
        <MenuSection
          menuItems={verifiedMenuItems}
          onOpenDishModal={(dish) => setSelectedDishForModal(dish)}
          onQuickAddToCart={handleQuickAddToCart}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          searchQuery={searchQuery}
          currency={currency}
          selectedRestaurantId={selectedRestaurantId}
        />
      </main>

      {/* Monrovia Footer */}
      <Footer />

      {/* Mobile Bottom Navigation & Floating Sticky Cart Bar */}
      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'apps') {
            setIsAppsHubOpen(true);
          } else if (tab === 'favorites') {
            setIsFavoritesOpen(true);
          } else if (tab === 'orders') {
            if (activeOrders.length > 0) {
              setActiveTrackingOrder(activeOrders[0]);
              setIsOrderTrackerOpen(true);
            } else {
              setIsFavoritesOpen(true);
            }
          }
        }}
        favoritesCount={favoriteIds.length}
        activeOrderCount={activeOrders.length}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
        onFocusSearch={handleFocusSearch}
        onOpenLogin={() => {
          setAuthModalMode('login');
          setIsLoginOpen(true);
        }}
        onOpenAccount={() => setIsAccountOpen(true)}
        currency={currency}
      />

      {/* Login Modal for Restaurant Kitchen, Courier & Customer with Phone Auto-Routing */}
      <LoginModal
        isOpen={isLoginOpen}
        initialMode={authModalMode}
        onClose={() => setIsLoginOpen(false)}
        restaurants={restaurants}
        drivers={drivers}
        onOpenRestaurantPortal={(restaurantId) => navigateTo({ name: 'restaurant', restaurantId })}
        onOpenDriverPortal={(driverId) => navigateTo({ name: 'driver', driverId })}
        onOpenAdminPortal={() => navigateTo({ name: 'admin' })}
        onOpenRestaurantOnboarding={() => setIsOnboardingOpen(true)}
        onOpenDriverJoin={() => setIsDriverJoinOpen(true)}
      />

      {/* Driver Onboarding & Registration Modal */}
      {isDriverJoinOpen && (
        <DriverJoinModal
          isOpen={isDriverJoinOpen}
          onClose={() => setIsDriverJoinOpen(false)}
          onDriverRegistered={handleDriverRegistered}
          onOpenDriverPortal={(driverId) => navigateTo({ name: 'driver', driverId })}
        />
      )}

      {/* Dish Customizer Modal with Multi-Image Gallery */}
      <DishModal
        dish={selectedDishForModal}
        onClose={() => setSelectedDishForModal(null)}
        onAddToCart={handleAddToCart}
        currency={currency}
        restaurants={restaurants}
        allMenuItems={menuItems}
      />

      {/* Mobile Bottom Sheet: Cart */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        diningMode={diningMode}
        onChangeDiningMode={(mode) => setDiningMode(mode)}
        currency={currency}
        restaurants={restaurants}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Mobile Bottom Sheet: Checkout */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        diningMode={diningMode}
        currency={currency}
        currentUser={user}
        restaurants={restaurants}
        cartTotals={checkoutTotals}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Floating Minimize/Expand Action Button for Live Order Tracker */}
      <FloatingOrderTrackerFab
        order={activeTrackingOrder}
        isOpen={isOrderTrackerOpen}
        onOpenTracker={() => setIsOrderTrackerOpen(true)}
      />

      {/* Mobile Bottom Sheet: Live Order Tracker with Google Maps */}
      <OrderTrackerModal
        isOpen={isOrderTrackerOpen}
        order={activeTrackingOrder}
        onClose={() => setIsOrderTrackerOpen(false)}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        currency={currency}
        restaurants={restaurants}
      />

      {/* Mobile Bottom Sheet: Favorites & History */}
      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favoriteDishes}
        onRemoveFavorite={handleToggleFavorite}
        onAddToCart={handleQuickAddToCart}
        pastOrders={orders}
        onSelectOrderToTrack={(order) => {
          setActiveTrackingOrder(order);
          setIsOrderTrackerOpen(true);
        }}
        onReorder={handleReorder}
        currency={currency}
      />

      {/* Dining Mode Picker */}
      <DiningModeModal
        isOpen={isDiningModeOpen}
        onClose={() => setIsDiningModeOpen(false)}
        currentMode={diningMode}
        onSelectMode={(mode) => setDiningMode(mode)}
      />

      {/* Customer Account & Saved Delivery Location Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onOpenOrders={() => {
          setIsAccountOpen(false);
          if (activeOrders.length > 0) {
            setActiveTrackingOrder(activeOrders[0]);
            setIsOrderTrackerOpen(true);
          } else {
            setIsFavoritesOpen(true);
          }
        }}
        onOpenFavorites={() => {
          setIsAccountOpen(false);
          setIsFavoritesOpen(true);
        }}
        favoritesCount={favoriteIds.length}
        activeOrderCount={activeOrders.length}
      />

      {/* Full Restaurant Onboarding Modal */}
      {isOnboardingOpen && (
        <RestaurantOnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onRestaurantCreated={handleRestaurantCreated}
          onOpenKitchenPortal={(restaurantId) => navigateTo({ name: 'restaurant', restaurantId })}
          isSuperAdminMode={user?.role === 'super_admin'}
        />
      )}

      {/* Apps Ecosystem Hub Modal */}
      <AppsHubModal
        isOpen={isAppsHubOpen}
        onClose={() => setIsAppsHubOpen(false)}
        onOpenRides={() => {
          setIsAppsHubOpen(false);
          navigateTo({ name: 'rides' });
        }}
        onOpenSupermarket={() => {
          setIsAppsHubOpen(false);
          navigateTo({ name: 'supermarket' });
        }}
        onOpenRealEstate={() => {
          setIsAppsHubOpen(false);
          navigateTo({ name: 'real-estate' });
        }}
        onOpenLifestyle={() => {
          setIsAppsHubOpen(false);
          navigateTo({ name: 'lifestyle' });
        }}
        onOpenMotors={() => {
          setIsAppsHubOpen(false);
          navigateTo({ name: 'motors' });
        }}
        onOpenFood={() => {
          setIsAppsHubOpen(false);
          setMobileTab('menu');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      </div>
    </ErrorBoundary>
  );
}
