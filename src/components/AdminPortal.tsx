import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Store, 
  ShoppingBag, 
  DollarSign, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Phone, 
  MapPin, 
  Eye, 
  Power, 
  Trash2, 
  Zap, 
  Star, 
  Bike, 
  Send, 
  MessageSquare,
  Users,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Edit2,
  Save,
  Navigation,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Smartphone,
  Wallet,
  Calendar,
  Layers,
  Utensils,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  Search,
  Timer,
  Sparkles,
  ChefHat
} from 'lucide-react';
import { Restaurant, MenuItem, Order, Currency, USD_TO_LRD_RATE, DeliveryDriver, MONROVIA_NEIGHBORHOODS, MONROVIA_NEIGHBORHOOD_COORDS, AppUser } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc, deleteDoc, setDoc, collection, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { MonroviaDeliveryMap } from './MonroviaDeliveryMap';
import { playOrderAlertSound, primeAudioContext } from '../utils/audioAlert';
import { sendBrowserNotification } from '../utils/browserNotifications';

interface AdminPortalProps {
  restaurants: Restaurant[];
  orders: Order[];
  drivers: DeliveryDriver[];
  onOpenOnboarding: () => void;
  onExitAdmin: () => void;
  onOpenRestaurantPortal: (restaurantId: string) => void;
  onToggleRestaurantStatus: (restaurantId: string) => void;
  onDeleteRestaurant: (restaurantId: string) => void;
  onUpdateOrderStatus: (
    orderId: string, 
    status: Order['status'], 
    cancelledBy?: 'customer' | 'restaurant' | 'admin', 
    cancellationReason?: string
  ) => void;
  onUpdateDriver: (driver: DeliveryDriver) => void;
  onPurgeDemoData?: () => void;
  currency: Currency;
  onToggleCurrency: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  restaurants,
  orders,
  drivers,
  onOpenOnboarding,
  onOpenRestaurantPortal,
  onToggleRestaurantStatus,
  onDeleteRestaurant,
  onUpdateOrderStatus,
  onUpdateDriver,
  onPurgeDemoData,
  currency,
  onToggleCurrency,
}) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'restaurants' | 'drivers' | 'orders' | 'users' | 'system'>('analytics');
  const [restaurantFilter, setRestaurantFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [driverFilter, setDriverFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchRestaurant, setSearchRestaurant] = useState<string>('');
  const [searchDriver, setSearchDriver] = useState<string>('');
  const [searchUser, setSearchUser] = useState<string>('');

  // Firestore Live Users & Customer Directory
  const [dbUsers, setDbUsers] = useState<AppUser[]>([]);
  const [selectedUserForOrders, setSelectedUserForOrders] = useState<{
    name: string;
    phone: string;
    location: string;
    address: string;
    orders: Order[];
    totalSpend: number;
    ordersCount: number;
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [prevOrdersCount, setPrevOrdersCount] = useState(orders.length);

  // Database Deletion & Confirmation Modal State
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState<{
    isOpen: boolean;
    target: 'all-orders' | 'inactive-orders' | 'drivers' | 'restaurants' | 'users' | 'all-data' | 'local-cache';
    title: string;
    description: string;
    count: number;
    requireTextMatch?: string;
  } | null>(null);

  const [confirmInputText, setConfirmInputText] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  const handleExecuteDelete = async () => {
    if (!deleteConfirmationModal) return;
    setIsDeletingData(true);

    try {
      if (deleteConfirmationModal.target === 'all-orders') {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        setDeleteSuccessMessage(`Successfully deleted all ${querySnapshot.size} orders from Firestore.`);
      } else if (deleteConfirmationModal.target === 'inactive-orders') {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        const batch = writeBatch(db);
        let count = 0;
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'completed' || data.status === 'cancelled') {
            batch.delete(docSnap.ref);
            count++;
          }
        });
        await batch.commit();
        setDeleteSuccessMessage(`Successfully deleted ${count} completed/cancelled orders.`);
      } else if (deleteConfirmationModal.target === 'drivers') {
        const querySnapshot = await getDocs(collection(db, 'drivers'));
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        setDeleteSuccessMessage(`Successfully deleted ${querySnapshot.size} couriers from fleet.`);
      } else if (deleteConfirmationModal.target === 'restaurants') {
        const querySnapshot = await getDocs(collection(db, 'restaurants'));
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        setDeleteSuccessMessage(`Successfully deleted ${querySnapshot.size} restaurants and menus.`);
      } else if (deleteConfirmationModal.target === 'users') {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        setDeleteSuccessMessage(`Successfully deleted ${querySnapshot.size} customer accounts.`);
      } else if (deleteConfirmationModal.target === 'all-data') {
        // Nuke all collections
        const orderSnaps = await getDocs(collection(db, 'orders'));
        const restSnaps = await getDocs(collection(db, 'restaurants'));
        const driverSnaps = await getDocs(collection(db, 'drivers'));
        const userSnaps = await getDocs(collection(db, 'users'));

        const batch = writeBatch(db);
        orderSnaps.forEach((d) => batch.delete(d.ref));
        restSnaps.forEach((d) => batch.delete(d.ref));
        driverSnaps.forEach((d) => batch.delete(d.ref));
        userSnaps.forEach((d) => batch.delete(d.ref));

        await batch.commit();

        if (onPurgeDemoData) onPurgeDemoData();
        setDeleteSuccessMessage('Full database reset completed. All live Firestore collections emptied.');
      } else if (deleteConfirmationModal.target === 'local-cache') {
        localStorage.clear();
        sessionStorage.clear();
        if (onPurgeDemoData) onPurgeDemoData();
        setDeleteSuccessMessage('Local storage and cache cleared successfully.');
      }
    } catch (err: any) {
      console.error('Data deletion error:', err);
      alert(`Error deleting data: ${err.message || err}`);
    } finally {
      setIsDeletingData(false);
      setDeleteConfirmationModal(null);
      setConfirmInputText('');
      setTimeout(() => setDeleteSuccessMessage(null), 6000);
    }
  };

  // Large Popup Details State
  const [selectedDriverForDetails, setSelectedDriverForDetails] = useState<DeliveryDriver | null>(null);
  const [selectedRestaurantForDetails, setSelectedRestaurantForDetails] = useState<Restaurant | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);

  // Driver Onboarding Wizard State
  const [isOnboardingDriverOpen, setIsOnboardingDriverOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPin, setDriverPin] = useState('');
  const [driverVehicleType, setDriverVehicleType] = useState<DeliveryDriver['vehicleType']>('Motorbike');
  const [driverPlate, setDriverPlate] = useState('');
  const [driverBaseZone, setDriverBaseZone] = useState<string>('Sinkor');
  const [driverMomoProvider, setDriverMomoProvider] = useState<DeliveryDriver['momoProvider']>('mtn');
  const [driverMomoNumber, setDriverMomoNumber] = useState('');
  const [driverIsVerified, setDriverIsVerified] = useState(true);

  // Driver Editing State
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverPin, setEditDriverPin] = useState('');
  const [editDriverVehicleType, setEditDriverVehicleType] = useState<DeliveryDriver['vehicleType']>('Motorbike');
  const [editDriverPlate, setEditDriverPlate] = useState('');
  const [editDriverBaseZone, setEditDriverBaseZone] = useState<string>('Sinkor');
  const [editDriverMomoProvider, setEditDriverMomoProvider] = useState<DeliveryDriver['momoProvider']>('mtn');
  const [editDriverMomoNumber, setEditDriverMomoNumber] = useState('');
  const [editDriverIsVerified, setEditDriverIsVerified] = useState(true);
  const [editDriverIsOnline, setEditDriverIsOnline] = useState(false);

  // Inline Phone Edit State for Restaurant
  const [editingPhoneRestId, setEditingPhoneRestId] = useState<string | null>(null);
  const [editingPhoneInput, setEditingPhoneInput] = useState<string>('');

  useEffect(() => {
    const handlePrime = () => primeAudioContext();
    window.addEventListener('click', handlePrime, { once: true });
    return () => window.removeEventListener('click', handlePrime);
  }, []);

  useEffect(() => {
    if (orders.length > prevOrdersCount) {
      if (soundEnabled) {
        playOrderAlertSound();
      }
      const newest = orders[0];
      if (newest) {
        sendBrowserNotification({
          title: `🔔 [Admin Live] New Order #${newest.id}`,
          body: `${newest.customerName} ordered at ${newest.restaurantName || 'Monrovia Spot'} ($${newest.total.toFixed(2)})`,
          tag: `admin-order-${newest.id}`,
        });
      }
      setPrevOrdersCount(orders.length);
    }
  }, [orders.length, prevOrdersCount, soundEnabled, orders]);

  // Keep selected item synced with latest props
  useEffect(() => {
    if (selectedDriverForDetails) {
      const refreshed = drivers.find(d => d.id === selectedDriverForDetails.id);
      if (refreshed) setSelectedDriverForDetails(refreshed);
    }
  }, [drivers]);

  useEffect(() => {
    if (selectedRestaurantForDetails) {
      const refreshed = restaurants.find(r => r.id === selectedRestaurantForDetails.id);
      if (refreshed) setSelectedRestaurantForDetails(refreshed);
    }
  }, [restaurants]);

  useEffect(() => {
    if (selectedOrderForDetails) {
      const refreshed = orders.find(o => o.id === selectedOrderForDetails.id);
      if (refreshed) setSelectedOrderForDetails(refreshed);
    }
  }, [orders]);

  // Listen to Firestore users collection in realtime
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const list: AppUser[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as AppUser);
        });
        setDbUsers(list);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore users listen error:', e);
    }
  }, []);

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const totalGmvUsd = orders.reduce((sum, o) => sum + o.total, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const onlineDriversCount = drivers.filter((d) => d.isOnline).length;
  
  const pendingRestaurantsCount = restaurants.filter(
    (r) => r.isVerified === false || r.verificationStatus === 'pending'
  ).length;

  const pendingDriversCount = drivers.filter(
    (d) => d.isVerified === false || d.verificationStatus === 'pending'
  ).length;

  // Aggregate customers from both Firestore `users` collection and `orders` history
  const customersMap = new Map<string, {
    uid?: string;
    phone: string;
    name: string;
    location: string;
    address: string;
    ordersCount: number;
    totalSpend: number;
    lastOrderDate: string;
    orders: Order[];
    favoriteRestaurant: string;
    role: string;
  }>();

  // 1. Seed from Firestore users
  dbUsers.forEach((u) => {
    if (u.phone) {
      const cleanPhone = u.phone.trim();
      customersMap.set(cleanPhone, {
        uid: u.uid,
        phone: cleanPhone,
        name: u.name || 'Monrovia Customer',
        location: u.location || 'Monrovia',
        address: u.address || '',
        ordersCount: 0,
        totalSpend: 0,
        lastOrderDate: (u as any).lastActiveAt ? new Date((u as any).lastActiveAt).toLocaleDateString() : 'Active',
        orders: [],
        favoriteRestaurant: 'N/A',
        role: u.role || 'customer',
      });
    }
  });

  // 2. Aggregate from all orders placed in system
  orders.forEach((o) => {
    const phone = (o.customerPhone || '').trim();
    if (!phone) return;

    const existing = customersMap.get(phone) || {
      uid: `order-cust-${phone.replace(/\D/g, '')}`,
      phone: phone,
      name: o.customerName || 'Customer',
      location: o.deliveryArea || o.deliveryAddress || 'Monrovia',
      address: o.deliveryAddress || '',
      ordersCount: 0,
      totalSpend: 0,
      lastOrderDate: o.createdAt || 'Recent',
      orders: [],
      favoriteRestaurant: o.restaurantName || 'Monrovia Spot',
      role: 'customer',
    };

    if (o.customerName && (!existing.name || existing.name === 'Monrovia Customer')) {
      existing.name = o.customerName;
    }
    if (o.deliveryArea && (!existing.location || existing.location === 'Monrovia')) {
      existing.location = o.deliveryArea;
    }
    if (o.deliveryAddress && !existing.address) {
      existing.address = o.deliveryAddress;
    }

    existing.ordersCount += 1;
    existing.totalSpend += o.total;
    existing.orders.push(o);

    customersMap.set(phone, existing);
  });

  // Calculate favorite restaurant for each customer
  customersMap.forEach((cust) => {
    if (cust.orders.length > 0) {
      const restCounts: Record<string, number> = {};
      cust.orders.forEach((o) => {
        const name = o.restaurantName || 'Spot';
        restCounts[name] = (restCounts[name] || 0) + 1;
      });
      const topRest = Object.entries(restCounts).sort((a, b) => b[1] - a[1])[0];
      if (topRest) {
        cust.favoriteRestaurant = topRest[0];
      }
    }
  });

  const allCustomers = Array.from(customersMap.values());
  const filteredCustomers = allCustomers.filter((c) => {
    const q = searchUser.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  // Analytics Aggregations
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');
  const inProgressOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const completionRate = orders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 0;
  const avgOrderValueUsd = orders.length > 0 ? totalGmvUsd / orders.length : 0;
  const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  const estimatedPlatformCommission = completedOrders.reduce((sum, o) => sum + (o.total * 0.1), 0);

  // Prep time metrics (Kitchen)
  const ordersWithPrep = orders.filter((o) => o.actualPrepMinutes && o.actualPrepMinutes > 0);
  const avgPrepMins = ordersWithPrep.length > 0
    ? Math.round(ordersWithPrep.reduce((acc, o) => acc + (o.actualPrepMinutes || 0), 0) / ordersWithPrep.length)
    : (orders.length > 0 ? 22 : 0);

  // Delivery transit metrics (Rider)
  const ordersWithDelivery = orders.filter((o) => o.actualDeliveryMinutes && o.actualDeliveryMinutes > 0);
  const avgDeliveryMins = ordersWithDelivery.length > 0
    ? Math.round(ordersWithDelivery.reduce((acc, o) => acc + (o.actualDeliveryMinutes || 0), 0) / ordersWithDelivery.length)
    : (orders.length > 0 ? 18 : 0);

  // Total fulfillment duration
  const ordersWithFulfillment = orders.filter((o) => o.totalFulfillmentMinutes && o.totalFulfillmentMinutes > 0);
  const avgFulfillmentMins = ordersWithFulfillment.length > 0
    ? Math.round(ordersWithFulfillment.reduce((acc, o) => acc + (o.totalFulfillmentMinutes || 0), 0) / ordersWithFulfillment.length)
    : (avgPrepMins + avgDeliveryMins);

  // Status breakdown counts
  const statusCounts = {
    received: orders.filter((o) => o.status === 'received').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    plating: orders.filter((o) => o.status === 'plating').length,
    'en-route': orders.filter((o) => o.status === 'en-route').length,
    completed: completedOrders.length,
    cancelled: cancelledOrders.length,
  };

  // Payment Breakdown
  const paymentBreakdown: Record<string, { count: number; gmv: number; label: string; icon: string }> = {
    'momo-on-delivery': { count: 0, gmv: 0, label: 'MTN / Orange MoMo on Delivery', icon: '📱' },
    'cash': { count: 0, gmv: 0, label: 'Cash on Delivery (USD / LRD)', icon: '💵' },
    'momo': { count: 0, gmv: 0, label: 'Instant Mobile Money (MoMo)', icon: '⚡' },
    'card': { count: 0, gmv: 0, label: 'Debit / Credit Card', icon: '💳' },
  };

  orders.forEach((o) => {
    const key = o.paymentMethod || 'momo-on-delivery';
    if (!paymentBreakdown[key]) {
      paymentBreakdown[key] = { count: 0, gmv: 0, label: key, icon: '💰' };
    }
    paymentBreakdown[key].count += 1;
    paymentBreakdown[key].gmv += o.total;
  });

  // Top Performing Kitchens
  const kitchenPerformanceMap: Record<string, { id: string; name: string; cuisine: string; ordersCount: number; gmv: number; completedCount: number; prepTimes: number[] }> = {};
  orders.forEach((o) => {
    const id = o.restaurantId || o.restaurantName || 'kitchen';
    const matchingRest = restaurants.find((r) => r.id === id || r.name === o.restaurantName);
    const name = o.restaurantName || matchingRest?.name || 'Kitchen';
    const cuisine = matchingRest?.cuisine || 'Monrovia Kitchen';
    if (!kitchenPerformanceMap[id]) {
      kitchenPerformanceMap[id] = { id, name, cuisine, ordersCount: 0, gmv: 0, completedCount: 0, prepTimes: [] };
    }
    kitchenPerformanceMap[id].ordersCount += 1;
    kitchenPerformanceMap[id].gmv += o.total;
    if (o.status === 'completed') kitchenPerformanceMap[id].completedCount += 1;
    if (o.actualPrepMinutes) kitchenPerformanceMap[id].prepTimes.push(o.actualPrepMinutes);
  });

  const topKitchens = Object.values(kitchenPerformanceMap)
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 6);

  // Top Selling Dishes
  const dishSalesMap: Record<string, { name: string; quantity: number; gmv: number; count: number; restaurantName: string }> = {};
  orders.forEach((o) => {
    o.items?.forEach((item) => {
      const name = item.menuItem?.name || 'Dish Item';
      if (!dishSalesMap[name]) {
        dishSalesMap[name] = { 
          name, 
          quantity: 0, 
          gmv: 0, 
          count: 0, 
          restaurantName: o.restaurantName || 'Spot' 
        };
      }
      dishSalesMap[name].quantity += item.quantity || 1;
      dishSalesMap[name].gmv += item.itemTotal || ((item.menuItem?.priceUsd || 0) * (item.quantity || 1));
      dishSalesMap[name].count += 1;
    });
  });

  const topDishes = Object.values(dishSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Top Delivery Neighborhoods
  const neighborhoodDemandMap: Record<string, { name: string; ordersCount: number; gmv: number }> = {};
  orders.forEach((o) => {
    const area = o.deliveryArea || o.deliveryAddress || 'Monrovia Central';
    const cleanArea = area.split(',')[0].split('(')[0].trim() || 'Monrovia';
    if (!neighborhoodDemandMap[cleanArea]) {
      neighborhoodDemandMap[cleanArea] = { name: cleanArea, ordersCount: 0, gmv: 0 };
    }
    neighborhoodDemandMap[cleanArea].ordersCount += 1;
    neighborhoodDemandMap[cleanArea].gmv += o.total;
  });

  const topNeighborhoods = Object.values(neighborhoodDemandMap)
    .sort((a, b) => b.ordersCount - a.ordersCount)
    .slice(0, 6);

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchRestaurant.toLowerCase()) ||
      r.neighborhood.toLowerCase().includes(searchRestaurant.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(searchRestaurant.toLowerCase());
    
    if (!matchesSearch) return false;

    if (restaurantFilter === 'pending') {
      return r.isVerified === false || r.verificationStatus === 'pending';
    }
    if (restaurantFilter === 'verified') {
      return r.isVerified !== false && r.verificationStatus !== 'pending';
    }
    return true;
  });

  const filteredDrivers = drivers.filter((d) => {
    if (!d) return false;
    const name = (d.name || '').toLowerCase();
    const phone = (d.phone || '');
    const baseZone = (d.baseZone || '').toLowerCase();
    const vehicleType = (d.vehicleType || '').toLowerCase();
    const plateNumber = (d.plateNumber || '').toLowerCase();
    const search = (searchDriver || '').toLowerCase().trim();

    const matchesSearch = 
      !search ||
      name.includes(search) ||
      phone.includes(search) ||
      baseZone.includes(search) ||
      vehicleType.includes(search) ||
      plateNumber.includes(search);
    
    if (!matchesSearch) return false;

    if (driverFilter === 'pending') {
      return d.isVerified === false || d.verificationStatus === 'pending';
    }
    if (driverFilter === 'verified') {
      return d.isVerified !== false && d.verificationStatus !== 'pending';
    }
    return true;
  });

  // Verify / Unverify Restaurant
  const handleToggleRestaurantVerification = async (restaurant: Restaurant) => {
    const newVerified = !restaurant.isVerified;
    const newStatus = newVerified ? 'verified' : 'pending';
    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        isVerified: newVerified,
        verificationStatus: newStatus,
      });
    } catch (e) {
      console.warn('Firestore restaurant verification error:', e);
    }
  };

  // Verify / Unverify Driver
  const handleToggleDriverVerification = async (driver: DeliveryDriver) => {
    const newVerified = !driver.isVerified;
    const newStatus = newVerified ? 'verified' : 'pending';
    const updated: DeliveryDriver = {
      ...driver,
      isVerified: newVerified,
      verificationStatus: newStatus,
      isOnline: newVerified ? driver.isOnline : false,
      status: newVerified ? driver.status : 'offline',
    };
    onUpdateDriver(updated);
    try {
      await setDoc(doc(db, 'drivers', driver.id), updated, { merge: true });
    } catch (e) {
      console.warn('Firestore driver verification error:', e);
    }
  };

  // Save Allowed Phone Numbers for a Restaurant
  const handleSaveAllowedPhones = async (restaurantId: string) => {
    const phonesList = editingPhoneInput
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        allowedPhoneNumbers: phonesList,
      });
      setEditingPhoneRestId(null);
    } catch (e) {
      console.warn('Firestore phone update notice:', e);
    }
  };

  // Onboard New Driver Submit
  const handleCreateDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim() || !driverPhone.trim()) return;

    const newId = `driver-${Date.now().toString().slice(-4)}`;
    const zoneCoords = MONROVIA_NEIGHBORHOOD_COORDS[driverBaseZone] || { lat: 6.2907, lng: -10.7818 };

    const newDriver: DeliveryDriver = {
      id: newId,
      name: driverName.trim(),
      phone: driverPhone.trim(),
      vehicleType: driverVehicleType,
      plateNumber: driverPlate.trim() || `LR-${Math.floor(1000 + Math.random() * 9000)}`,
      baseZone: driverBaseZone,
      momoNumber: driverMomoNumber.trim() || driverPhone.trim(),
      momoProvider: driverMomoProvider,
      driverPin: driverPin.trim() || '1234',
      rating: 5.0,
      totalDeliveries: 0,
      earningsTodayUsd: 0,
      isOnline: false,
      status: 'offline',
      isVerified: driverIsVerified,
      verificationStatus: driverIsVerified ? 'verified' : 'pending',
      currentLocation: zoneCoords,
      createdAt: new Date().toISOString(),
    };

    onUpdateDriver(newDriver);

    try {
      await setDoc(doc(db, 'drivers', newId), newDriver);
    } catch (err) {
      console.warn('Driver write error:', err);
    }

    setIsOnboardingDriverOpen(false);
    setDriverName('');
    setDriverPhone('');
    setDriverPin('');
    setDriverPlate('');
    setDriverMomoNumber('');
  };

  // Open Edit Driver
  const handleOpenEditDriver = (driver: DeliveryDriver) => {
    setEditingDriver(driver);
    setEditDriverName(driver.name);
    setEditDriverPhone(driver.phone);
    setEditDriverPin(driver.driverPin || '');
    setEditDriverVehicleType(driver.vehicleType);
    setEditDriverPlate(driver.plateNumber || '');
    setEditDriverBaseZone(driver.baseZone);
    setEditDriverMomoProvider(driver.momoProvider);
    setEditDriverMomoNumber(driver.momoNumber || driver.phone);
    setEditDriverIsVerified(driver.isVerified !== false && driver.verificationStatus !== 'pending');
    setEditDriverIsOnline(driver.isOnline);
  };

  // Save Edited Driver Submit
  const handleSaveEditedDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    const zoneCoords = MONROVIA_NEIGHBORHOOD_COORDS[editDriverBaseZone] || editingDriver.currentLocation;

    const updated: DeliveryDriver = {
      ...editingDriver,
      name: editDriverName.trim(),
      phone: editDriverPhone.trim(),
      driverPin: editDriverPin.trim() || undefined,
      vehicleType: editDriverVehicleType,
      plateNumber: editDriverPlate.trim() || undefined,
      baseZone: editDriverBaseZone,
      momoNumber: editDriverMomoNumber.trim() || editDriverPhone.trim(),
      momoProvider: editDriverMomoProvider,
      isVerified: editDriverIsVerified,
      verificationStatus: editDriverIsVerified ? 'verified' : 'pending',
      isOnline: editDriverIsOnline,
      status: editDriverIsOnline ? (editingDriver.status === 'busy' ? 'busy' : 'available') : 'offline',
      currentLocation: zoneCoords,
    };

    onUpdateDriver(updated);

    try {
      await setDoc(doc(db, 'drivers', editingDriver.id), updated, { merge: true });
    } catch (err) {
      console.warn('Driver update error:', err);
    }

    setEditingDriver(null);
  };

  // Delete Driver
  const handleDeleteDriver = async (driverId: string) => {
    if (!window.confirm('Are you sure you want to remove this driver from the Monrovia fleet?')) return;
    try {
      await deleteDoc(doc(db, 'drivers', driverId));
    } catch (err) {
      console.warn('Driver delete error:', err);
    }
    if (selectedDriverForDetails?.id === driverId) {
      setSelectedDriverForDetails(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans">
      
      {/* Modern White Admin Header (Locked In - No Back Button) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs h-16 flex items-center">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#06C167] to-[#048747] flex items-center justify-center text-white shadow-xs">
                <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[#111827]">
                Super Admin Console
              </span>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#E8F8EE] border border-emerald-200 text-[#048747] text-[10px] font-extrabold uppercase tracking-wider">
              Super User
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-emerald-50 border border-emerald-200 text-[#048747]'
                  : 'bg-gray-100 text-gray-400'
              }`}
              title={soundEnabled ? 'Order audio alert ON' : 'Audio alerts muted'}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>

            <button
              onClick={onToggleCurrency}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-mono font-bold text-gray-800 transition-colors cursor-pointer"
              title="Toggle USD / LRD"
            >
              {currency}
            </button>

            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign out of Admin Portal"
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 lg:px-10 py-6 space-y-6">
        
        {/* KPI Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total GMV</span>
              <DollarSign className="w-4 h-4 text-[#06C167]" />
            </div>
            <div className="text-xl font-mono font-black text-[#111827]">
              {formatPrice(totalGmvUsd)}
            </div>
            <div className="text-[10px] text-gray-400 font-medium">All Monrovia Orders</div>
          </div>

          <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Orders</span>
              <ShoppingBag className="w-4 h-4 text-[#06C167]" />
            </div>
            <div className="text-xl font-mono font-black text-[#111827]">
              {activeOrdersCount}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold">In-kitchen / In-transit</div>
          </div>

          <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Monrovia Fleet</span>
              <Bike className="w-4 h-4 text-[#06C167]" />
            </div>
            <div className="text-xl font-mono font-black text-[#111827]">
              {onlineDriversCount} / {drivers.length}
            </div>
            <div className="text-[10px] text-gray-400 font-medium">
              {pendingDriversCount > 0 ? (
                <span className="text-amber-600 font-bold">{pendingDriversCount} pending approval</span>
              ) : (
                'Riders online right now'
              )}
            </div>
          </div>

          <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Kitchens</span>
              <Store className="w-4 h-4 text-[#06C167]" />
            </div>
            <div className="text-xl font-mono font-black text-[#111827]">
              {restaurants.length}
            </div>
            <div className="text-[10px] text-gray-400 font-medium">
              {pendingRestaurantsCount > 0 ? (
                <span className="text-amber-600 font-bold">{pendingRestaurantsCount} pending review</span>
              ) : (
                'All kitchens verified'
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics &amp; Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Live Orders ({orders.length})</span>
            {activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'restaurants'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Kitchens ({restaurants.length})</span>
            {pendingRestaurantsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-[#048747] text-[10px] font-black">
                {pendingRestaurantsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'drivers'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Delivery Fleet ({drivers.length})</span>
            {pendingDriversCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-[#048747] text-[10px] font-black">
                {pendingDriversCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers &amp; Users ({allCustomers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <span>Database Maintenance</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 0: ADVANCED ANALYTICS & INSIGHTS DASHBOARD               */}
        {/* ============================================================ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Speed & Fulfillment Efficiency KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Avg Kitchen Prep Time */}
              <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Avg Kitchen Prep</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ChefHat className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-gray-900">{avgPrepMins}</span>
                  <span className="text-xs font-bold text-gray-500">minutes</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Target: &le; 25m • {ordersWithPrep.length} timed orders</span>
                </div>
              </div>

              {/* Avg Courier Delivery Transit */}
              <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Avg Courier Transit</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Bike className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-gray-900">{avgDeliveryMins}</span>
                  <span className="text-xs font-bold text-gray-500">minutes</span>
                </div>
                <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Monrovia city transit time</span>
                </div>
              </div>

              {/* Avg Total Fulfillment Time */}
              <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Total Order to Door</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#048747] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-gray-900">{avgFulfillmentMins}</span>
                  <span className="text-xs font-bold text-gray-500">minutes</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cooking to customer hands</span>
                </div>
              </div>

              {/* Order Success & Completion Rate */}
              <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Completion Rate</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-gray-900">{completionRate}%</span>
                  <span className="text-xs font-bold text-gray-500">({completedOrders.length}/{orders.length})</span>
                </div>
                <div className="text-[11px] text-gray-500 font-medium">
                  {cancelledOrders.length} cancelled • {inProgressOrders.length} live
                </div>
              </div>

            </div>

            {/* Financial Revenue & Splits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-3">
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                  Gross Merchandise Volume
                </span>
                <div className="text-2xl font-mono font-black text-gray-900">
                  {formatPrice(totalGmvUsd)}
                </div>
                <div className="text-xs text-gray-500 space-y-1 pt-1 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span>Delivered GMV:</span>
                    <span className="font-mono font-bold text-gray-900">{formatPrice(completedOrders.reduce((s, o) => s + o.total, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Order Basket:</span>
                    <span className="font-mono font-bold text-gray-900">{formatPrice(avgOrderValueUsd)}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-3">
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                  Estimated Platform Revenue (10%)
                </span>
                <div className="text-2xl font-mono font-black text-[#048747]">
                  {formatPrice(estimatedPlatformCommission)}
                </div>
                <div className="text-xs text-gray-500 space-y-1 pt-1 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span>Total Orders:</span>
                    <span className="font-bold text-gray-900">{orders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active In Flight:</span>
                    <span className="font-bold text-emerald-600">{inProgressOrders.length} orders</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-3">
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                  Delivery Fees Paid to Riders
                </span>
                <div className="text-2xl font-mono font-black text-blue-600">
                  {formatPrice(totalDeliveryFees)}
                </div>
                <div className="text-xs text-gray-500 space-y-1 pt-1 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span>Active Couriers:</span>
                    <span className="font-bold text-gray-900">{onlineDriversCount} online</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Fleet:</span>
                    <span className="font-bold text-gray-900">{drivers.length} registered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Status Distribution & Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Status Breakdown */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#06C167]" />
                    <span>Order Status Lifecycle Breakdown</span>
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">{orders.length} total</span>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { key: 'received', label: 'Received / Awaiting Prep', count: statusCounts.received, color: 'bg-amber-400' },
                    { key: 'preparing', label: 'Cooking in Kitchen', count: statusCounts.preparing, color: 'bg-orange-500' },
                    { key: 'plating', label: 'Plating & Packed', count: statusCounts.plating, color: 'bg-blue-500' },
                    { key: 'en-route', label: 'En-Route with Courier', count: statusCounts.enRoute || statusCounts['en-route'], color: 'bg-indigo-500' },
                    { key: 'completed', label: 'Delivered & Completed', count: statusCounts.completed, color: 'bg-emerald-500' },
                    { key: 'cancelled', label: 'Cancelled / Declined', count: statusCounts.cancelled, color: 'bg-red-500' },
                  ].map((st) => {
                    const pct = orders.length > 0 ? Math.round((st.count / orders.length) * 100) : 0;
                    return (
                      <div key={st.key} className="space-y-1">
                        <div className="flex justify-between font-bold text-gray-700">
                          <span>{st.label}</span>
                          <span className="font-mono text-gray-900">{st.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${st.color} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#06C167]" />
                    <span>Payment Methods Distribution</span>
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">Monrovia MoMo & Cash</span>
                </div>

                <div className="space-y-3 text-xs">
                  {Object.entries(paymentBreakdown).map(([key, data]) => {
                    const pct = orders.length > 0 ? Math.round((data.count / orders.length) * 100) : 0;
                    return (
                      <div key={key} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{data.icon}</span>
                          <div>
                            <div className="font-bold text-gray-900">{data.label}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{data.count} orders ({pct}%)</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-extrabold text-gray-900">{formatPrice(data.gmv)}</div>
                          <div className="text-[10px] text-emerald-600 font-bold">GMV Share</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Top Kitchens & Top Dishes Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Top Performing Kitchens */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#06C167]" />
                    <span>Top Performing Kitchens</span>
                  </h4>
                  <span className="text-xs text-gray-400">By Sales & Volume</span>
                </div>

                {topKitchens.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">No kitchen orders recorded yet.</div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {topKitchens.map((k, idx) => {
                      const avgKPrep = k.prepTimes.length > 0 
                        ? Math.round(k.prepTimes.reduce((a, b) => a + b, 0) / k.prepTimes.length)
                        : null;

                      return (
                        <div key={k.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-100/80 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-white border border-gray-200 text-gray-800 font-mono font-black text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="font-extrabold text-gray-900">{k.name}</div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                <span>{k.cuisine}</span>
                                <span>•</span>
                                <span>{k.ordersCount} orders</span>
                                {avgKPrep && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-bold">⏱️ {avgKPrep}m avg prep</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="font-black text-gray-900">{formatPrice(k.gmv)}</div>
                            <div className="text-[10px] text-gray-400">{k.completedCount} fulfilled</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Selling Dishes */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-[#06C167]" />
                    <span>Top Selling Monrovia Dishes</span>
                  </h4>
                  <span className="text-xs text-gray-400">By Quantity Sold</span>
                </div>

                {topDishes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">No dish items recorded yet.</div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {topDishes.map((d, idx) => (
                      <div key={d.name} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-100/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-xl bg-[#E8F8EE] text-[#048747] font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="font-extrabold text-gray-900">{d.name}</div>
                            <div className="text-[10px] text-gray-400">
                              From {d.restaurantName}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-black text-[#048747]">{d.quantity} ordered</div>
                          <div className="text-[10px] text-gray-400">{formatPrice(d.gmv)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Monrovia Delivery Demand by Neighborhood */}
            <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#06C167]" />
                  <span>Monrovia Delivery Corridors &amp; Demand</span>
                </h4>
                <span className="text-xs text-gray-400">Top Neighborhoods</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {topNeighborhoods.map((nh) => (
                  <div key={nh.name} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1 text-center">
                    <span className="text-xs font-extrabold text-gray-800 block truncate">{nh.name}</span>
                    <div className="text-base font-mono font-black text-emerald-600">{nh.ordersCount}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{formatPrice(nh.gmv)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: USERS & CUSTOMERS DIRECTORY                           */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            
            {/* Quick Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Search by customer name, phone, or neighborhood..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-2xl text-[#111827] focus:outline-none focus:border-[#06C167]"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-50 text-[#048747] font-bold rounded-xl border border-emerald-200">
                  {allCustomers.length} Total Registered Customers
                </span>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#111827]">
                  Customer Directory ({filteredCustomers.length})
                </h3>
                <span className="text-xs text-gray-400">
                  Synced with Firestore &amp; Order History
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                    <tr>
                      <th className="p-3 sm:p-4">Customer</th>
                      <th className="p-3 sm:p-4">Phone / Contact</th>
                      <th className="p-3 sm:p-4">Delivery Location</th>
                      <th className="p-3 sm:p-4">Orders Placed</th>
                      <th className="p-3 sm:p-4">Lifetime Spend</th>
                      <th className="p-3 sm:p-4">Favorite Kitchen</th>
                      <th className="p-3 sm:p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          No customer records found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const initials = c.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || 'MC';

                        return (
                          <tr key={c.phone} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 sm:p-4 font-bold text-[#111827] flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-extrabold text-gray-900">{c.name}</div>
                                <div className="text-[10px] text-gray-400">Last active: {c.lastOrderDate}</div>
                              </div>
                            </td>

                            <td className="p-3 sm:p-4 font-mono text-xs">
                              <div className="font-bold text-gray-900">{c.phone}</div>
                              <a
                                href={`tel:${c.phone}`}
                                className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>Call Customer</span>
                              </a>
                            </td>

                            <td className="p-3 sm:p-4 text-xs">
                              <div className="font-semibold text-gray-800">{c.location}</div>
                              {c.address && (
                                <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                  {c.address}
                                </div>
                              )}
                            </td>

                            <td className="p-3 sm:p-4 font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                c.ordersCount > 3
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : c.ordersCount > 0
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-gray-100 text-gray-500'
                              }`}>
                                {c.ordersCount} orders
                              </span>
                            </td>

                            <td className="p-3 sm:p-4 font-mono font-black text-gray-900">
                              {formatPrice(c.totalSpend)}
                            </td>

                            <td className="p-3 sm:p-4 text-xs font-semibold text-gray-700">
                              {c.favoriteRestaurant}
                            </td>

                            <td className="p-3 sm:p-4">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForOrders(c)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#048747] font-bold rounded-xl border border-emerald-200 text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <ShoppingBag className="w-3 h-3" />
                                <span>Orders ({c.orders.length})</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: RESTAURANTS & ONBOARDING + VERIFICATION               */}
        {/* ============================================================ */}
        {activeTab === 'restaurants' && (
          <div className="space-y-4">
            
            {/* Filter & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={searchRestaurant}
                  onChange={(e) => setSearchRestaurant(e.target.value)}
                  placeholder="Filter kitchens..."
                  className="w-full sm:w-64 px-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-2xl text-[#111827] focus:outline-none focus:border-[#06C167]"
                />

                {/* Sub-Filter: Verification Status */}
                <div className="flex items-center p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRestaurantFilter('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      restaurantFilter === 'all' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    All ({restaurants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestaurantFilter('pending')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      restaurantFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    Pending ({pendingRestaurantsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestaurantFilter('verified')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      restaurantFilter === 'verified' ? 'bg-[#06C167] text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Verified ({restaurants.length - pendingRestaurantsCount})
                  </button>
                </div>
              </div>

              <button
                onClick={onOpenOnboarding}
                className="px-5 py-2.5 bg-gradient-to-r from-[#06C167] to-[#048747] text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Onboard &amp; Verify Kitchen</span>
              </button>
            </div>

            {/* Restaurant Cards Grid */}
            {filteredRestaurants.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 space-y-2">
                <Store className="w-10 h-10 text-gray-300 mx-auto" />
                <h4 className="font-extrabold text-sm text-gray-800">No restaurants in this filter</h4>
                <p className="text-xs text-gray-500">
                  {restaurantFilter === 'pending'
                    ? 'All kitchens have been verified!'
                    : 'Click "Onboard & Verify Kitchen" to register a new Monrovia kitchen.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRestaurants.map((restaurant) => {
                  const isVerified = restaurant.isVerified !== false && restaurant.verificationStatus !== 'pending';
                  const allowedPhones = restaurant.allowedPhoneNumbers || [restaurant.phone];
                  const isEditingPhones = editingPhoneRestId === restaurant.id;

                  return (
                    <div 
                      key={restaurant.id} 
                      className={`p-5 bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                        !isVerified ? 'border-amber-300 bg-amber-50/20' : 'border-gray-100'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-extrabold text-[#111827]">
                                {restaurant.name}
                              </h4>
                              {isVerified ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                                  <span>Pending Approval</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-[#06C167]" />
                              <span>{restaurant.neighborhood}</span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              restaurant.isOpen 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {restaurant.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>

                        {/* Kitchen Info */}
                        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-1.5">
                          <div><strong>Cuisine:</strong> {restaurant.cuisine}</div>
                          <div><strong>Main Phone:</strong> <span className="font-mono">{restaurant.phone}</span></div>
                          <div><strong>MoMo Payout:</strong> <span className="font-mono text-emerald-700 font-bold">{restaurant.momoNumber || restaurant.phone}</span> ({restaurant.momoProvider || 'MTN'})</div>
                        </div>

                        {/* Authorized Phone Numbers Section */}
                        <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#06C167]" />
                              <span>Authorized Staff Phone Numbers:</span>
                            </span>
                            {!isEditingPhones && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPhoneRestId(restaurant.id);
                                  setEditingPhoneInput(allowedPhones.join(', '));
                                }}
                                className="text-[11px] text-[#06C167] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit Phones</span>
                              </button>
                            )}
                          </div>

                          {isEditingPhones ? (
                            <div className="space-y-2 pt-1">
                              <input
                                type="text"
                                value={editingPhoneInput}
                                onChange={(e) => setEditingPhoneInput(e.target.value)}
                                placeholder="0886 554 321, 0777 990 123"
                                className="w-full px-3 py-2 bg-white border border-[#06C167] rounded-xl text-xs font-mono text-gray-900"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveAllowedPhones(restaurant.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Save Phones</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPhoneRestId(null)}
                                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {allowedPhones.map((p, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px] font-bold text-gray-700"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-100 gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Large Popup View Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedRestaurantForDetails(restaurant)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#048747] font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>

                          {/* Verify / Unverify Action Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleRestaurantVerification(restaurant)}
                            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isVerified
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{isVerified ? 'Suspend' : 'Verify'}</span>
                          </button>

                          <button
                            onClick={() => onOpenRestaurantPortal(restaurant.id)}
                            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>KDS</span>
                          </button>
                        </div>

                        <button
                          onClick={() => onDeleteRestaurant(restaurant.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete restaurant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: DRIVERS & FLEET ONBOARDING & MANAGEMENT              */}
        {/* ============================================================ */}
        {activeTab === 'drivers' && (
          <div className="space-y-6">
            
            {/* Filter, Onboard Button & Monrovia Fleet Live Map */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#111827]">
                    Monrovia Fleet Dispatch &amp; Management
                  </h3>
                  <p className="text-xs text-gray-500">
                    Onboard new couriers, assign zones, manage verification, and track real-time dispatch
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search driver */}
                  <input
                    type="text"
                    value={searchDriver}
                    onChange={(e) => setSearchDriver(e.target.value)}
                    placeholder="Search couriers..."
                    className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-[#111827] focus:outline-none focus:border-[#06C167]"
                  />

                  {/* Sub-Filter: Driver Verification Status */}
                  <div className="flex items-center p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setDriverFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        driverFilter === 'all' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
                      }`}
                    >
                      All ({drivers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriverFilter('pending')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        driverFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900'
                      }`}
                    >
                      Pending ({pendingDriversCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriverFilter('verified')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        driverFilter === 'verified' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      Verified ({drivers.length - pendingDriversCount})
                    </button>
                  </div>

                  {/* Onboard Courier Button */}
                  <button
                    type="button"
                    onClick={() => setIsOnboardingDriverOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-[#06C167] to-[#048747] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Onboard Rider</span>
                  </button>
                </div>
              </div>

              <MonroviaDeliveryMap
                driverLocation={drivers[0]?.currentLocation}
                height="260px"
              />
            </div>

            {/* Drivers Roster Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#111827]">
                  Registered Monrovia Couriers ({filteredDrivers.length})
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {onlineDriversCount} Online &amp; Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                    <tr>
                      <th className="p-3 sm:p-4">Rider Profile</th>
                      <th className="p-3 sm:p-4">Status &amp; Verification</th>
                      <th className="p-3 sm:p-4">Vehicle / Plate</th>
                      <th className="p-3 sm:p-4">Phone / MoMo</th>
                      <th className="p-3 sm:p-4">Base Zone</th>
                      <th className="p-3 sm:p-4">Deliveries</th>
                      <th className="p-3 sm:p-4">Management Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          No couriers found matching your filter criteria. Click "Onboard Rider" to add a new courier.
                        </td>
                      </tr>
                    ) : (
                      filteredDrivers.map((d) => {
                        const isVerified = d.isVerified !== false && d.verificationStatus !== 'pending';

                        return (
                          <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 sm:p-4 font-bold text-[#111827] flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#048747] flex items-center justify-center font-black shrink-0">
                                <Bike className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-extrabold text-gray-900">{d.name || 'Courier'}</div>
                                <div className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>{(d.rating || 5.0).toFixed(1)} rating</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-3 sm:p-4">
                              <div className="flex flex-col gap-1">
                                {isVerified ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Verified</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                                    <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                                    <span>Pending</span>
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded w-fit ${
                                  d.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {d.isOnline ? '🟢 Online' : '⚪ Offline'}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 sm:p-4">
                              <div className="font-semibold">{d.vehicleType || 'Motorbike'}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{d.plateNumber || 'N/A'}</div>
                            </td>

                            <td className="p-3 sm:p-4 font-mono text-[11px]">
                              <div className="font-bold text-gray-900">{d.phone}</div>
                              <div className="text-[10px] text-emerald-600 font-bold uppercase">
                                {d.momoProvider || 'mtn'} MoMo: {d.momoNumber || d.phone}
                              </div>
                              {d.driverPin && (
                                <div className="text-[10px] text-gray-500 font-mono">
                                  PIN: <span className="font-bold text-gray-800">{d.driverPin}</span>
                                </div>
                              )}
                            </td>

                            <td className="p-3 sm:p-4 text-[11px] font-semibold">
                              {(d.baseZone || 'Monrovia').split(' ')[0]}
                            </td>

                            <td className="p-3 sm:p-4 font-mono font-bold">
                              <div>{d.totalDeliveries || 0} trips</div>
                              <div className="text-[10px] text-gray-400">${(d.earningsTodayUsd || 0).toFixed(2)} today</div>
                            </td>

                            <td className="p-3 sm:p-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Large Details Wizard */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedDriverForDetails(d)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#048747] font-bold rounded-lg border border-emerald-200 text-[10px] flex items-center gap-1 cursor-pointer"
                                  title="View complete rider profile & map"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Details</span>
                                </button>

                                {/* Edit Driver */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditDriver(d)}
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs cursor-pointer"
                                  title="Edit courier details"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                {/* Verify Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleDriverVerification(d)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                    isVerified
                                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                  title={isVerified ? 'Suspend Courier' : 'Verify Courier'}
                                >
                                  {isVerified ? 'Suspend' : 'Verify'}
                                </button>

                                {/* Delete Driver */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDriver(d.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete courier from fleet"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: LIVE ORDERS FEED (REALTIME SYNC)                      */}
        {/* ============================================================ */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
                {['all', 'received', 'preparing', 'plating', 'en-route', 'completed', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#06C167] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:text-black hover:bg-gray-200'
                    }`}
                  >
                    {st.replace('-', ' ')}
                    {st === 'all' ? ` (${orders.length})` : ` (${orders.filter((o) => o.status === st).length})`}
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#06C167] animate-ping" />
                <span>Live Firestore Feed: {orders.length} orders loaded</span>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white p-16 text-center rounded-3xl border border-gray-100 shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#E8F8EE] text-[#048747] flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-[#111827]">
                  {statusFilter === 'all' ? 'No orders placed yet' : `No orders with status "${statusFilter}"`}
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  When a customer places an order anywhere in Monrovia, it will appear here in real-time without needing to refresh the page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredOrders.map((o) => {
                  const isDone = o.status === 'completed';

                  return (
                    <div
                      key={o.id}
                      className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                        isDone
                          ? 'bg-gray-50/70 border-gray-100'
                          : 'bg-white border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
                      }`}
                    >
                      {/* Order Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#111827] bg-gray-100 px-2.5 py-1 rounded-lg">
                            #{o.id}
                          </span>
                          <span className="text-xs font-semibold text-gray-400">
                            {o.createdAt}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            o.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : o.status === 'completed'
                                ? 'bg-gray-100 text-gray-700 border-gray-200'
                                : 'bg-[#E8F8EE] text-[#048747] border-emerald-200'
                          }`}>
                            {o.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                            {o.diningMode}
                          </span>

                          {/* Prep and Delivery Metrics Badges */}
                          {o.actualPrepMinutes && o.actualPrepMinutes > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <span>👨‍🍳 Prep: {o.actualPrepMinutes}m</span>
                            </span>
                          ) : null}

                          {o.actualDeliveryMinutes && o.actualDeliveryMinutes > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <span>🛵 Transit: {o.actualDeliveryMinutes}m</span>
                            </span>
                          ) : null}

                          {o.totalFulfillmentMinutes && o.totalFulfillmentMinutes > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span>⚡ Doorstep: {o.totalFulfillmentMinutes}m</span>
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-black text-[#111827]">
                            {formatPrice(o.total)}
                          </span>
                          <span className="text-[11px] font-bold text-gray-500">
                            ({o.paymentMethod})
                          </span>
                        </div>
                      </div>

                      {/* Customer & Kitchen Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Customer</span>
                          <div className="font-extrabold text-gray-900">{o.customerName}</div>
                          <a href={`tel:${o.customerPhone}`} className="text-[#048747] font-mono hover:underline block">
                            📞 {o.customerPhone}
                          </a>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Kitchen &amp; Destination</span>
                          <div className="font-bold text-gray-900">{o.restaurantName || 'Kitchen'}</div>
                          <div className="text-gray-500 truncate">
                            📍 {o.deliveryArea || o.deliveryAddress || 'Monrovia'}
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Dispatched Courier</span>
                          <div className="font-bold text-gray-900">
                            {o.assignedDriverName || 'Auto-dispatching...'}
                          </div>
                          <div className="text-gray-500">
                            {o.assignedDriverPhone ? `📞 ${o.assignedDriverPhone}` : 'Awaiting assignment'}
                          </div>
                        </div>
                      </div>

                      {/* Ordered Items List */}
                      <div className="bg-gray-50/60 p-3 rounded-2xl space-y-1 text-xs text-gray-700">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                          Ordered Items ({o.items?.length || 0})
                        </div>
                        {o.items?.map((item) => (
                          <div key={item.cartItemId} className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-gray-900">{item.quantity}x</span> {item.menuItem?.name || 'Dish'}
                              {item.selectedSpiceLevel && (
                                <span className="ml-1 text-red-500 font-bold text-[10px]">
                                  [{item.selectedSpiceLevel}]
                                </span>
                              )}
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <span className="text-gray-400 text-[10px] block pl-3">
                                  +{item.selectedAddons.map((a) => a.name).join(', ')}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-semibold">{formatPrice(item.itemTotal)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Quick Status Control Buttons & Large Dialogue Trigger */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForDetails(o)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#048747] text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Full Order Wizard</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {o.status === 'cancelled' && (
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
                              o.cancelledBy === 'restaurant'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-red-50 text-red-900 border-red-200'
                            }`}>
                              {o.cancelledBy === 'customer'
                                ? 'Cancelled by Customer'
                                : o.cancelledBy === 'restaurant'
                                  ? `Declined by Kitchen (${o.cancellationReason || 'Unavailable'})`
                                  : `Cancelled by Admin (${o.cancellationReason || 'Admin'})`}
                            </span>
                          )}

                          {o.status === 'received' && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrderStatus(o.id, 'preparing')}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-colors cursor-pointer"
                            >
                              👨‍🍳 Start Cooking
                            </button>
                          )}
                          {(o.status === 'received' || o.status === 'preparing') && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrderStatus(o.id, 'plating')}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer"
                            >
                              🍲 Pack Meal
                            </button>
                          )}
                          {(o.status === 'received' || o.status === 'preparing' || o.status === 'plating') && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrderStatus(o.id, 'en-route')}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                            >
                              🛵 Dispatch En-Route
                            </button>
                          )}
                          {o.status !== 'completed' && o.status !== 'cancelled' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onUpdateOrderStatus(o.id, 'completed')}
                                className="px-3.5 py-1.5 bg-[#06C167] hover:bg-[#05A357] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Mark Delivered</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const reason = window.prompt('Enter cancellation reason (e.g. Customer requested, kitchen issue, or unfulfillable):', 'Admin cancellation');
                                  if (reason) {
                                    onUpdateOrderStatus(o.id, 'cancelled', 'admin', reason);
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: DATABASE & DATA MAINTENANCE                          */}
        {/* ============================================================ */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            
            {/* Header & Status Banner */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#111827]">
                      Database &amp; Data Deletion Console
                    </h3>
                    <p className="text-xs text-gray-500">
                      Manage live Firestore collections, purge test orders, couriers, kitchens, and accounts with verified confirmation dialogues.
                    </p>
                  </div>
                </div>
              </div>

              {deleteSuccessMessage && (
                <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{deleteSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Live Collection Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">Orders Collection</span>
                <div className="text-xl font-mono font-black text-gray-900">{orders.length} docs</div>
                <div className="text-[10px] text-gray-400 font-medium">{activeOrdersCount} live • {completedOrders.length} completed</div>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">Kitchens Collection</span>
                <div className="text-xl font-mono font-black text-gray-900">{restaurants.length} docs</div>
                <div className="text-[10px] text-gray-400 font-medium">{restaurants.length - pendingRestaurantsCount} verified</div>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">Couriers Collection</span>
                <div className="text-xl font-mono font-black text-gray-900">{drivers.length} docs</div>
                <div className="text-[10px] text-gray-400 font-medium">{onlineDriversCount} online</div>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">Users Collection</span>
                <div className="text-xl font-mono font-black text-gray-900">{dbUsers.length} docs</div>
                <div className="text-[10px] text-gray-400 font-medium">{allCustomers.length} total customers</div>
              </div>
            </div>

            {/* Deletion Operations Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Orders Collection Management */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#06C167]" />
                    <h4 className="font-extrabold text-sm text-gray-900">Orders Collection Management</h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    Clear finished demo orders or wipe the entire live orders feed from the database.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationModal({
                      isOpen: true,
                      target: 'inactive-orders',
                      title: 'Purge Completed & Cancelled Orders',
                      description: 'This will permanently delete all completed and cancelled orders from Firestore. Live active orders currently being cooked or delivered will NOT be touched.',
                      count: completedOrders.length + cancelledOrders.length,
                    })}
                    className="w-full py-2.5 px-4 bg-gray-50 hover:bg-amber-50 hover:text-amber-900 text-gray-700 text-xs font-bold rounded-2xl border border-gray-200 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Purge Inactive Orders ({completedOrders.length + cancelledOrders.length})</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg font-black">Clean</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationModal({
                      isOpen: true,
                      target: 'all-orders',
                      title: 'Delete ALL Orders Feed',
                      description: 'This will permanently erase ALL order documents from Firestore. Live orders, tracking links, and order history will be deleted.',
                      count: orders.length,
                    })}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-2xl border border-red-200 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Delete All Orders ({orders.length} docs)</span>
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Card 2: Couriers / Drivers Fleet Deletion */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-blue-600" />
                    <h4 className="font-extrabold text-sm text-gray-900">Courier Fleet Collection</h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    Manage the couriers roster. You can delete individual riders from the Fleet tab or clear the whole fleet here.
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationModal({
                      isOpen: true,
                      target: 'drivers',
                      title: 'Delete All Couriers from Fleet',
                      description: 'This will permanently delete all registered delivery driver profiles from Firestore. Riders will need to be re-onboarded.',
                      count: drivers.length,
                    })}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-2xl border border-red-200 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Delete All Drivers ({drivers.length} couriers)</span>
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Card 3: Restaurants & Kitchens Deletion */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-orange-500" />
                    <h4 className="font-extrabold text-sm text-gray-900">Kitchens &amp; Menus Collection</h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    Permanently delete all restaurant profiles, menus, dish prices, and operating hours from the database.
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationModal({
                      isOpen: true,
                      target: 'restaurants',
                      title: 'Delete All Restaurants & Menus',
                      description: 'This will permanently remove all restaurant documents and their dishes from Firestore. Kitchens will need to be re-onboarded.',
                      count: restaurants.length,
                    })}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-2xl border border-red-200 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Delete All Kitchens ({restaurants.length} spots)</span>
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Card 4: Customer Users Collection */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <h4 className="font-extrabold text-sm text-gray-900">Customer Accounts Collection</h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    Delete customer profile records, saved addresses, and login phone associations stored in Firestore.
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationModal({
                      isOpen: true,
                      target: 'users',
                      title: 'Delete All Customer Profiles',
                      description: 'This will permanently delete all user records from Firestore "users" collection. Saved addresses and login history will be reset.',
                      count: dbUsers.length,
                    })}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-2xl border border-red-200 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Delete All User Accounts ({dbUsers.length} profiles)</span>
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>

            </div>

            {/* Danger Zone: Full Factory Reset */}
            <div className="p-6 sm:p-7 bg-red-500/5 rounded-3xl border-2 border-red-200 space-y-4">
              <div className="flex items-center gap-2.5 text-red-700">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <h4 className="font-black text-base">Danger Zone: Full Platform Reset</h4>
              </div>
              <p className="text-xs text-gray-600 max-w-xl">
                Wipe all Firestore collections (Orders, Kitchens, Couriers, and Users) simultaneously and purge local browser caches. Requires typing <strong>"DELETE"</strong> to prevent accidental execution.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationModal({
                    isOpen: true,
                    target: 'all-data',
                    title: 'FULL DATABASE RESET (NUCLEAR)',
                    description: 'WARNING: This will permanently wipe ALL collections in Firestore (Orders, Restaurants, Drivers, and Users). The platform will be completely empty. This cannot be undone!',
                    count: orders.length + restaurants.length + drivers.length + dbUsers.length,
                    requireTextMatch: 'DELETE',
                  })}
                  className="px-5 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Wipe All Collections (Full DB Reset)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmationModal({
                    isOpen: true,
                    target: 'local-cache',
                    title: 'Purge Local Storage & Session State',
                    description: 'This will reset localStorage keys, auth sessions, and demo caches in this browser.',
                    count: 1,
                  })}
                  className="px-4 py-3 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-2xl border border-gray-200 transition-all cursor-pointer"
                >
                  Clear Browser Cache &amp; Storage
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* POPUP MODAL 1: DRIVER ONBOARDING WIZARD                                  */}
      {/* ========================================================================= */}
      {isOnboardingDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-[#048747] flex items-center justify-center">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Onboard Monrovia Courier</h3>
                  <p className="text-xs text-gray-500">Register a new rider into the live dispatch fleet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardingDriverOpen(false)}
                className="p-2 text-gray-400 hover:text-black rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriverSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Emmanuel Weah"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="0886 123 456"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Security PIN *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={driverPin}
                    onChange={(e) => setDriverPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-6 digit PIN"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#06C167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Vehicle Type</label>
                  <select
                    value={driverVehicleType}
                    onChange={(e) => setDriverVehicleType(e.target.value as DeliveryDriver['vehicleType'])}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                  >
                    <option value="Motorbike">Motorbike (Fastest)</option>
                    <option value="Kekeh (Tricycle)">Kekeh (Tricycle)</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Car / Van</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Plate / Registration</label>
                  <input
                    type="text"
                    value={driverPlate}
                    onChange={(e) => setDriverPlate(e.target.value)}
                    placeholder="LR-7890"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Base Operational Zone</label>
                  <select
                    value={driverBaseZone}
                    onChange={(e) => setDriverBaseZone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                  >
                    {MONROVIA_NEIGHBORHOODS.map((nh) => (
                      <option key={nh} value={nh}>{nh}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3">
                <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Mobile Money Payout Settings</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-emerald-800 text-[11px]">Provider</label>
                    <select
                      value={driverMomoProvider}
                      onChange={(e) => setDriverMomoProvider(e.target.value as DeliveryDriver['momoProvider'])}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-gray-900"
                    >
                      <option value="mtn">Lonestar MTN MoMo</option>
                      <option value="orange">Orange Money</option>
                      <option value="both">Both (MTN & Orange)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-emerald-800 text-[11px]">MoMo Account Number</label>
                    <input
                      type="text"
                      value={driverMomoNumber}
                      onChange={(e) => setDriverMomoNumber(e.target.value)}
                      placeholder="Same as phone if empty"
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-mono text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="driverVerifiedCheck"
                  checked={driverIsVerified}
                  onChange={(e) => setDriverIsVerified(e.target.checked)}
                  className="w-4 h-4 text-[#06C167] rounded focus:ring-emerald-500"
                />
                <label htmlFor="driverVerifiedCheck" className="text-gray-700 font-bold">
                  Approve and verify courier immediately (Ready for dispatches)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#06C167] to-[#048747] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Confirm &amp; Register Courier
                </button>
                <button
                  type="button"
                  onClick={() => setIsOnboardingDriverOpen(false)}
                  className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL 2: EDIT DRIVER MODAL                                         */}
      {/* ========================================================================= */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gray-100 text-gray-900 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Edit Courier: {editingDriver.name}</h3>
                  <p className="text-xs text-gray-500">ID: {editingDriver.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="p-2 text-gray-400 hover:text-black rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDriver} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editDriverName}
                  onChange={(e) => setEditDriverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editDriverPhone}
                    onChange={(e) => setEditDriverPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Security PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editDriverPin}
                    onChange={(e) => setEditDriverPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-6 digit PIN"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#06C167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Vehicle Type</label>
                  <select
                    value={editDriverVehicleType}
                    onChange={(e) => setEditDriverVehicleType(e.target.value as DeliveryDriver['vehicleType'])}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                  >
                    <option value="Motorbike">Motorbike</option>
                    <option value="Kekeh (Tricycle)">Kekeh (Tricycle)</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Car</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Plate Number</label>
                  <input
                    type="text"
                    value={editDriverPlate}
                    onChange={(e) => setEditDriverPlate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Base Zone</label>
                  <select
                    value={editDriverBaseZone}
                    onChange={(e) => setEditDriverBaseZone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                  >
                    {MONROVIA_NEIGHBORHOODS.map((nh) => (
                      <option key={nh} value={nh}>{nh}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <span className="font-extrabold text-gray-800">MoMo Payout Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600">Provider</label>
                    <select
                      value={editDriverMomoProvider}
                      onChange={(e) => setEditDriverMomoProvider(e.target.value as DeliveryDriver['momoProvider'])}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    >
                      <option value="mtn">Lonestar MTN MoMo</option>
                      <option value="orange">Orange Money</option>
                      <option value="both">Both (MTN & Orange)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600">MoMo Number</label>
                    <input
                      type="text"
                      value={editDriverMomoNumber}
                      onChange={(e) => setEditDriverMomoNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editDriverIsVerified}
                    onChange={(e) => setEditDriverIsVerified(e.target.checked)}
                    className="w-4 h-4 text-[#06C167] rounded"
                  />
                  <span className="font-bold text-gray-800">Verified &amp; Approved</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editDriverIsOnline}
                    onChange={(e) => setEditDriverIsOnline(e.target.checked)}
                    className="w-4 h-4 text-[#06C167] rounded"
                  />
                  <span className="font-bold text-gray-800">Online &amp; Available for Dispatch</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#06C167] hover:bg-[#05A357] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL 3: LARGE DRIVER DETAILS DIALOG / WIZARD                      */}
      {/* ========================================================================= */}
      {selectedDriverForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900">{selectedDriverForDetails.name}</h2>
                    {selectedDriverForDetails.isVerified !== false && selectedDriverForDetails.verificationStatus !== 'pending' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Courier</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                        Pending Verification
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>ID: {selectedDriverForDetails.id}</span>
                    <span>•</span>
                    <span>{selectedDriverForDetails.vehicleType}</span>
                    <span>•</span>
                    <span className="font-mono">{selectedDriverForDetails.plateNumber || 'No Plate'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDriverForDetails(null)}
                className="p-2 text-gray-400 hover:text-black rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Trips</span>
                <div className="text-lg font-mono font-black text-gray-900">{selectedDriverForDetails.totalDeliveries}</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Today's Earnings</span>
                <div className="text-lg font-mono font-black text-emerald-600">${(selectedDriverForDetails.earningsTodayUsd || 0).toFixed(2)}</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Rating</span>
                <div className="text-lg font-bold text-amber-500 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{selectedDriverForDetails.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Dispatch Status</span>
                <div className="text-xs font-bold text-gray-800 capitalize">{selectedDriverForDetails.status} ({selectedDriverForDetails.isOnline ? 'Online' : 'Offline'})</div>
              </div>
            </div>

            {/* Contact, MoMo & PIN Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-2xl space-y-1.5 border border-gray-100">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#06C167]" />
                  <span>Direct Contact</span>
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-gray-800">{selectedDriverForDetails.phone}</span>
                  <a
                    href={`tel:${selectedDriverForDetails.phone}`}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-2xl space-y-1.5 border border-emerald-100">
                <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#06C167]" />
                  <span>MoMo Account</span>
                </span>
                <div className="font-mono text-xs font-bold text-gray-900 truncate">
                  {selectedDriverForDetails.momoNumber || selectedDriverForDetails.phone}
                  <span className="ml-1 text-[10px] font-sans text-emerald-700 font-bold">({selectedDriverForDetails.momoProvider})</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-2xl space-y-1.5 border border-amber-200">
                <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Security PIN</span>
                </span>
                <div className="font-mono text-xs font-bold text-amber-950 tracking-wider">
                  {selectedDriverForDetails.driverPin || 'None (1234)'}
                </div>
              </div>
            </div>

            {/* Live Map Position */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#06C167]" />
                  <span>Assigned Zone &amp; Live Location: {selectedDriverForDetails.baseZone}</span>
                </span>
              </div>
              <MonroviaDeliveryMap
                driverLocation={selectedDriverForDetails.currentLocation}
                height="220px"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditDriver(selectedDriverForDetails);
                  }}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleDriverVerification(selectedDriverForDetails)}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#048747] text-xs font-bold rounded-xl border border-emerald-200 cursor-pointer"
                >
                  {selectedDriverForDetails.isVerified ? 'Suspend Courier' : 'Approve Courier'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteDriver(selectedDriverForDetails.id)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Courier</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL 4: LARGE RESTAURANT DETAILS DIALOG / WIZARD                  */}
      {/* ========================================================================= */}
      {selectedRestaurantForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] text-white flex items-center justify-center font-black shadow-md shadow-orange-500/20">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900">{selectedRestaurantForDetails.name}</h2>
                    {selectedRestaurantForDetails.isVerified !== false && selectedRestaurantForDetails.verificationStatus !== 'pending' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Kitchen</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                        Pending Verification
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>{selectedRestaurantForDetails.neighborhood}</span>
                    <span>•</span>
                    <span>{selectedRestaurantForDetails.cuisine}</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-600">{selectedRestaurantForDetails.isOpen ? 'Open for Orders' : 'Closed'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRestaurantForDetails(null)}
                className="p-2 text-gray-400 hover:text-black rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Delivery Fee</span>
                <div className="text-lg font-mono font-black text-gray-900">${(selectedRestaurantForDetails.deliveryFeeUsd ?? 2.0).toFixed(2)}</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Prep Time</span>
                <div className="text-lg font-mono font-black text-gray-900">{selectedRestaurantForDetails.deliveryTimeMinutes ?? 25} mins</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Rating</span>
                <div className="text-lg font-bold text-amber-500 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{(selectedRestaurantForDetails.rating ?? 5.0).toFixed(1)}</span>
                </div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Min Order</span>
                <div className="text-lg font-mono font-black text-gray-900">${(selectedRestaurantForDetails.minOrderUsd ?? 5.0).toFixed(2)}</div>
              </div>
            </div>

            {/* Location & Map Preview */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#06C167]" />
                <span>Location: {selectedRestaurantForDetails.address || selectedRestaurantForDetails.neighborhood}</span>
              </span>
              <MonroviaDeliveryMap
                driverLocation={selectedRestaurantForDetails.location || MONROVIA_NEIGHBORHOOD_COORDS[selectedRestaurantForDetails.neighborhood]}
                height="200px"
              />
            </div>

            {/* Contact & Staff Phones */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-gray-800">Primary Phone: </span>
                  <span className="font-mono text-gray-900 font-bold">{selectedRestaurantForDetails.phone}</span>
                </div>
                <div>
                  <span className="font-extrabold text-gray-800">MoMo Payout: </span>
                  <span className="font-mono text-emerald-700 font-bold">{selectedRestaurantForDetails.momoNumber || selectedRestaurantForDetails.phone} ({selectedRestaurantForDetails.momoProvider || 'MTN'})</span>
                </div>
              </div>

              <div>
                <span className="font-extrabold text-gray-800 block mb-1">Authorized Staff Login Phones:</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedRestaurantForDetails.allowedPhoneNumbers || [selectedRestaurantForDetails.phone]).map((p, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-mono text-[11px] font-bold text-gray-800">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRestaurantForDetails(null);
                    onOpenRestaurantPortal(selectedRestaurantForDetails.id);
                  }}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Kitchen KDS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleRestaurantVerification(selectedRestaurantForDetails)}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#048747] text-xs font-bold rounded-xl border border-emerald-200 cursor-pointer"
                >
                  {selectedRestaurantForDetails.isVerified ? 'Suspend Kitchen' : 'Approve Kitchen'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onDeleteRestaurant(selectedRestaurantForDetails.id);
                  setSelectedRestaurantForDetails(null);
                }}
                className="px-3 py-2 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Kitchen</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL 5: LARGE ORDER DETAILS / STATUS PROGRESSION WIZARD           */}
      {/* ========================================================================= */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-xl">
                    #{selectedOrderForDetails.id}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                    selectedOrderForDetails.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : selectedOrderForDetails.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedOrderForDetails.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-700">
                    {selectedOrderForDetails.diningMode}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Placed on: {selectedOrderForDetails.createdAt}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="p-2 text-gray-400 hover:text-black rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Visual Stage Progression Wizard */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                Order Lifecycle Progression
              </span>
              <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-bold">
                {[
                  { key: 'received', label: '1. Received', icon: '📝' },
                  { key: 'preparing', label: '2. Cooking', icon: '👨‍🍳' },
                  { key: 'plating', label: '3. Packed', icon: '🍲' },
                  { key: 'en-route', label: '4. En Route', icon: '🛵' },
                  { key: 'completed', label: '5. Delivered', icon: '✅' },
                ].map((st, idx) => {
                  const stages = ['received', 'preparing', 'plating', 'en-route', 'completed'];
                  const currentIdx = stages.indexOf(selectedOrderForDetails.status);
                  const isCurrent = selectedOrderForDetails.status === st.key;
                  const isPast = currentIdx > idx;

                  return (
                    <div
                      key={st.key}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-[#06C167] text-white border-[#06C167] shadow-sm'
                          : isPast
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-white text-gray-400 border-gray-200'
                      }`}
                    >
                      <div className="text-base mb-0.5">{st.icon}</div>
                      <div>{st.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer, Kitchen & Courier 3-Way Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl space-y-1.5 border border-gray-100">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Customer Info</span>
                <div className="font-extrabold text-gray-900 text-sm">{selectedOrderForDetails.customerName}</div>
                <a href={`tel:${selectedOrderForDetails.customerPhone}`} className="text-[#048747] font-mono font-bold hover:underline block">
                  📞 {selectedOrderForDetails.customerPhone}
                </a>
                <div className="text-gray-500 pt-1">
                  📍 {selectedOrderForDetails.deliveryArea || selectedOrderForDetails.deliveryAddress || 'Monrovia'}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-1.5 border border-gray-100">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Kitchen Spot</span>
                <div className="font-extrabold text-gray-900 text-sm">{selectedOrderForDetails.restaurantName || 'Kitchen'}</div>
                <div className="text-gray-500">
                  {selectedOrderForDetails.diningMode === 'pickup' ? 'Takeaway order' : 'Delivery Dispatch'}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-1.5 border border-gray-100">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Courier Assignment</span>
                <div className="font-extrabold text-gray-900 text-sm">
                  {selectedOrderForDetails.assignedDriverName || 'Auto-dispatching...'}
                </div>
                {selectedOrderForDetails.assignedDriverPhone && (
                  <a href={`tel:${selectedOrderForDetails.assignedDriverPhone}`} className="text-[#048747] font-mono font-bold hover:underline block">
                    📞 {selectedOrderForDetails.assignedDriverPhone}
                  </a>
                )}
                <div className="text-[10px] text-gray-400 capitalize">
                  Stage: {selectedOrderForDetails.delegationStatus || 'unassigned'}
                </div>
              </div>
            </div>

            {/* Itemized Order Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider block">
                Line Items ({selectedOrderForDetails.items?.length || 0})
              </span>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl bg-gray-50/50 p-3 space-y-2 text-xs">
                {selectedOrderForDetails.items?.map((item) => (
                  <div key={item.cartItemId} className="pt-2 first:pt-0 flex items-start justify-between">
                    <div>
                      <div className="font-extrabold text-gray-900">
                        <span className="text-[#048747]">{item.quantity}x</span> {item.menuItem?.name}
                      </div>
                      {item.selectedSpiceLevel && (
                        <div className="text-red-600 font-bold text-[11px]">Spice: {item.selectedSpiceLevel}</div>
                      )}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="text-gray-500 text-[11px]">
                          Toppings: {item.selectedAddons.map(a => a.name).join(', ')}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="text-amber-700 italic text-[11px]">"{item.specialInstructions}"</div>
                      )}
                    </div>
                    <span className="font-mono font-bold text-gray-900">{formatPrice(item.itemTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatPrice(selectedOrderForDetails.subtotal || selectedOrderForDetails.total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee:</span>
                <span className="font-mono">{formatPrice(selectedOrderForDetails.deliveryFee || 0)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base text-gray-900 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span className="font-mono">{formatPrice(selectedOrderForDetails.total)} ({selectedOrderForDetails.paymentMethod})</span>
              </div>
            </div>

            {/* Quick Actions in Dialog */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {selectedOrderForDetails.status !== 'completed' && selectedOrderForDetails.status !== 'cancelled' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateOrderStatus(selectedOrderForDetails.id, 'completed');
                        setSelectedOrderForDetails(null);
                      }}
                      className="px-4 py-2 bg-[#06C167] hover:bg-[#05A357] text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Mark Order Delivered</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const reason = window.prompt('Enter cancellation reason:', 'Admin cancellation');
                        if (reason) {
                          onUpdateOrderStatus(selectedOrderForDetails.id, 'cancelled', 'admin', reason);
                          setSelectedOrderForDetails(null);
                        }
                      }}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL 6: CUSTOMER ORDER HISTORY DIALOG                              */}
      {/* ========================================================================= */}
      {selectedUserForOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center font-black text-base shadow-md shadow-emerald-500/20">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900">{selectedUserForOrders.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-[#048747] border border-emerald-200">
                      Customer
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-gray-800">{selectedUserForOrders.phone}</span>
                    <span>•</span>
                    <span>{selectedUserForOrders.location}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForOrders(null)}
                className="p-2 text-gray-400 hover:text-black rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Orders</span>
                <div className="text-lg font-mono font-black text-gray-900">{selectedUserForOrders.orders.length}</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Lifetime Spend</span>
                <div className="text-lg font-mono font-black text-[#048747]">{formatPrice(selectedUserForOrders.totalSpend)}</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Avg Spend</span>
                <div className="text-lg font-mono font-black text-gray-900">
                  {formatPrice(selectedUserForOrders.orders.length > 0 ? selectedUserForOrders.totalSpend / selectedUserForOrders.orders.length : 0)}
                </div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Contact</span>
                <a
                  href={`tel:${selectedUserForOrders.phone}`}
                  className="text-xs font-bold text-[#048747] hover:underline flex items-center gap-1 mt-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call Customer</span>
                </a>
              </div>
            </div>

            {/* Customer Saved Address */}
            {selectedUserForOrders.address && (
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                <span className="font-extrabold text-gray-700 uppercase tracking-wider text-[10px] block">
                  Saved Delivery Address:
                </span>
                <div className="text-gray-900 font-medium">{selectedUserForOrders.address}</div>
              </div>
            )}

            {/* Order History Timeline */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider block">
                Order History ({selectedUserForOrders.orders.length})
              </span>

              {selectedUserForOrders.orders.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400">
                  No orders placed under this phone number yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedUserForOrders.orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-4 bg-gray-50/70 hover:bg-gray-100/70 transition-colors rounded-2xl border border-gray-200/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-gray-900">#{o.id}</span>
                          <span className="text-gray-400 font-medium">{o.createdAt}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            o.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : o.status === 'cancelled'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                        <span className="font-mono font-black text-gray-900">{formatPrice(o.total)}</span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600">
                        <div>
                          <strong>Spot: </strong>
                          <span>{o.restaurantName || 'Kitchen'}</span>
                        </div>
                        <div>
                          <strong>Payment: </strong>
                          <span>{o.paymentMethod}</span>
                        </div>
                      </div>

                      {o.items && o.items.length > 0 && (
                        <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                          {o.items.map((it) => `${it.quantity}x ${it.menuItem?.name || 'Dish'}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedUserForOrders(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Directory
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL 7: DATA DELETION CONFIRMATION DIALOGUE                         */}
      {/* ========================================================================= */}
      {deleteConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-red-100 space-y-5">
            
            {/* Warning Icon & Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  {deleteConfirmationModal.title}
                </h3>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Irreversible Action
                </span>
              </div>
            </div>

            {/* Description & Impact */}
            <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl space-y-2 text-xs text-gray-700">
              <p className="leading-relaxed font-medium">
                {deleteConfirmationModal.description}
              </p>
              <div className="pt-2 border-t border-red-200/60 flex items-center justify-between font-mono">
                <span className="text-gray-500 font-bold">Affected records:</span>
                <span className="font-black text-red-700">{deleteConfirmationModal.count} documents</span>
              </div>
            </div>

            {/* Optional Verification Text Input for Nuclear Reset */}
            {deleteConfirmationModal.requireTextMatch && (
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-gray-700 block">
                  To confirm this deletion, type <strong className="text-red-600 font-mono font-black">{deleteConfirmationModal.requireTextMatch}</strong> below:
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder={`Type "${deleteConfirmationModal.requireTextMatch}"`}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-red-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={
                  isDeletingData ||
                  Boolean(
                    deleteConfirmationModal.requireTextMatch &&
                    confirmInputText.trim() !== deleteConfirmationModal.requireTextMatch
                  )
                }
                onClick={handleExecuteDelete}
                className={`flex-1 py-3 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isDeletingData ||
                  (deleteConfirmationModal.requireTextMatch &&
                    confirmInputText.trim() !== deleteConfirmationModal.requireTextMatch)
                    ? 'bg-red-300 cursor-not-allowed opacity-60'
                    : 'bg-red-600 hover:bg-red-700 active:scale-95'
                }`}
              >
                {isDeletingData ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting from Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isDeletingData}
                onClick={() => {
                  setDeleteConfirmationModal(null);
                  setConfirmInputText('');
                }}
                className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
