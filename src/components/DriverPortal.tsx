import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Store, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Power, 
  ShieldAlert, 
  Sparkles, 
  ShieldCheck, 
  ArrowLeft, 
  Wallet, 
  Navigation,
  Check,
  Award,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ChefHat,
  Flame,
  LogOut,
  History,
  Search,
  Calendar,
  Receipt,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Package
} from 'lucide-react';
import { Order, DeliveryDriver, Currency, USD_TO_LRD_RATE, MONROVIA_NEIGHBORHOOD_COORDS, Restaurant } from '../types';
import { MonroviaDeliveryMap } from './MonroviaDeliveryMap';
import { sendBrowserNotification } from '../utils/browserNotifications';
import { playOrderAlertSound } from '../utils/audioAlert';
import { db } from '../firebase/config';
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { saveOrderToApi, saveDriverToApi, updateOrderStatusApi, updateDriverApi } from '../utils/apiSync';

const getKitchenStatusInfo = (status: Order['status']) => {
  switch (status) {
    case 'received':
      return {
        label: 'Order Confirmed',
        subtext: 'Kitchen confirmed the ticket',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
        icon: Clock,
      };
    case 'preparing':
      return {
        label: 'Cooking in Kitchen',
        subtext: 'Kitchen is preparing the food',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
        dotColor: 'bg-amber-500 animate-pulse',
        icon: Flame,
      };
    case 'plating':
      return {
        label: 'Ready for Pickup',
        subtext: 'Food is packed and ready for pickup!',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/30',
        dotColor: 'bg-emerald-500 animate-ping',
        icon: ChefHat,
      };
    case 'en-route':
      return {
        label: 'Picked Up / In Transit',
        subtext: 'Food handed to rider and on the way',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        dotColor: 'bg-purple-500',
        icon: Bike,
      };
    case 'completed':
      return {
        label: 'Delivered',
        subtext: 'Order completed and handed to customer',
        badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
        dotColor: 'bg-gray-400',
        icon: CheckCircle2,
      };
    default:
      return {
        label: 'Processing',
        subtext: 'Kitchen is handling the order',
        badgeColor: 'bg-gray-50 text-gray-700 border-gray-200',
        dotColor: 'bg-gray-400',
        icon: Clock,
      };
  }
};

interface DriverPortalProps {
  driver: DeliveryDriver;
  orders: Order[];
  onExitPortal: () => void;
  onUpdateOrderStatus: (
    orderId: string, 
    status: Order['status'], 
    cancelledBy?: 'customer' | 'restaurant' | 'admin', 
    cancellationReason?: string,
    extra?: Partial<Order>
  ) => void;
  onUpdateDriver: (driver: DeliveryDriver) => void;
  onDriverRejectOrder: (orderId: string, driverId: string) => void;
  currency: Currency;
  onToggleCurrency: () => void;
  restaurants?: Restaurant[];
}

export const DriverPortal: React.FC<DriverPortalProps> = ({
  driver,
  orders,
  onExitPortal,
  onUpdateOrderStatus,
  onUpdateDriver,
  onDriverRejectOrder,
  currency,
  onToggleCurrency,
  restaurants,
}) => {
  // isOnline is dynamically enforced based on driver verification state
  const [justVerifiedNotice, setJustVerifiedNotice] = useState(false);

  const isDriverVerified = driver.isVerified !== false && driver.verificationStatus !== 'pending';
  const isOnline = isDriverVerified ? (driver.isOnline ?? false) : false;

  useEffect(() => {
    if (!driver?.id) return;
    let previousVerified = isDriverVerified;

    const unsub = onSnapshot(
      doc(db, 'drivers', driver.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as DeliveryDriver;
          const nowVerified = data.isVerified !== false && data.verificationStatus !== 'pending';
          if (!previousVerified && nowVerified) {
            setJustVerifiedNotice(true);
            playOrderAlertSound();
            sendBrowserNotification({
              title: 'Account Verified! 🚀',
              body: 'Your courier account has been verified by Monrovia Admin. You can now Go Online to receive orders!',
              tag: `driver-verified-${driver.id}`,
            });
          }
          previousVerified = nowVerified;
          onUpdateDriver(data);
        }
      },
      (error) => {
        console.warn('Driver realtime listener notice:', error?.message || error);
      }
    );

    return () => unsub();
  }, [driver?.id]);
  const [activeTab, setActiveTab] = useState<'dispatch' | 'history' | 'earnings'>('dispatch');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'today' | 'week'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Keyboard Escape listener for history modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedHistoryOrder) {
        setSelectedHistoryOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistoryOrder]);

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Find incoming offer for this driver or active delivery
  const offeredOrder = orders.find(
    (o) => o.assignedDriverId === driver.id && o.delegationStatus === 'offered'
  );

  const activeDelivery = orders.find(
    (o) =>
      o.assignedDriverId === driver.id &&
      o.delegationStatus &&
      o.delegationStatus !== 'offered' &&
      o.delegationStatus !== 'rejected' &&
      o.delegationStatus !== 'delivered' &&
      o.status !== 'completed'
  );

  // Delivery History: All completed trips assigned to this rider
  const completedDriverOrders = orders
    .filter(
      (o) =>
        o.assignedDriverId === driver.id &&
        (o.status === 'completed' || o.delegationStatus === 'delivered')
    )
    .sort((a, b) => {
      const timeA = a.deliveredAtTimestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.deliveredAtTimestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

  // Calculate history stats
  const totalHistoryEarnings = completedDriverOrders.reduce(
    (acc, o) => acc + (o.deliveryFee || 2.5),
    0
  );
  const totalTripsCount = Math.max(driver.totalDeliveries || 0, completedDriverOrders.length);
  const todayTripsCount = completedDriverOrders.filter((o) => {
    const date = new Date(o.deliveredAtTimestamp || o.createdAt || Date.now());
    const now = new Date();
    return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const weekTripsCount = completedDriverOrders.filter((o) => {
    const time = o.deliveredAtTimestamp || (o.createdAt ? new Date(o.createdAt).getTime() : 0);
    return time >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Filtered trips list based on user selection and search input
  const filteredHistoryOrders = completedDriverOrders.filter((order) => {
    if (historyFilter === 'today') {
      const date = new Date(order.deliveredAtTimestamp || order.createdAt || Date.now());
      const now = new Date();
      if (date.getDate() !== now.getDate() || date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) {
        return false;
      }
    } else if (historyFilter === 'week') {
      const time = order.deliveredAtTimestamp || (order.createdAt ? new Date(order.createdAt).getTime() : 0);
      if (time < Date.now() - 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      const matchId = order.id.toLowerCase().includes(q);
      const matchRest = (order.restaurantName || '').toLowerCase().includes(q);
      const matchCust = (order.customerName || '').toLowerCase().includes(q);
      const matchArea = (order.deliveryArea || order.deliveryAddress || '').toLowerCase().includes(q);
      return matchId || matchRest || matchCust || matchArea;
    }

    return true;
  });

  const formatMoney = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const getOrderDeliveryTiming = (order: Order) => {
    const deliveredTimeMs = order.deliveredAtTimestamp || (order.createdAt ? new Date(order.createdAt).getTime() : Date.now());
    const deliveryDateObj = new Date(deliveredTimeMs);
    
    const formattedDeliveredDate = deliveryDateObj.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedDeliveredTime = deliveryDateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate Transit Duration (from picking up at kitchen to customer dropoff)
    let transitMinutes = order.actualDeliveryMinutes;
    let pickupTimeMs = order.enRouteAtTimestamp;

    if (!transitMinutes && order.enRouteAtTimestamp && order.deliveredAtTimestamp) {
      transitMinutes = Math.max(1, Math.round((order.deliveredAtTimestamp - order.enRouteAtTimestamp) / 60000));
    } else if (!transitMinutes) {
      // Graceful fallback for demo or past orders
      transitMinutes = 14;
    }

    if (!pickupTimeMs) {
      pickupTimeMs = deliveredTimeMs - transitMinutes * 60000;
    }

    const pickupDateObj = new Date(pickupTimeMs);
    const formattedPickupTime = pickupDateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      formattedDeliveredDate,
      formattedDeliveredTime,
      formattedPickupTime,
      transitMinutes,
    };
  };

  const handleToggleOnline = async () => {
    if (!isDriverVerified) {
      alert('Verification Required: Your courier profile is currently pending verification by Monrovia Admin. You cannot go online until verified.');
      return;
    }
    const nextStatus = !isOnline;
    const updated: DeliveryDriver = {
      ...driver,
      isOnline: nextStatus,
      status: nextStatus ? 'available' : 'offline',
    };
    onUpdateDriver(updated);

    try {
      await setDoc(doc(db, 'drivers', driver.id), updated, { merge: true });
    } catch (e) {
      console.warn('Driver status sync notice:', e);
    }
  };

  const handleAcceptOffer = async (order: Order) => {
    const driverDetails: Partial<Order> = {
      assignedDriverId: driver.id,
      assignedDriverName: driver.name,
      assignedDriverPhone: driver.phone,
      driverVehicle: driver.vehicleType,
      driverLocation: driver.currentLocation,
      delegationStatus: 'heading_to_restaurant',
    };

    const updatedOrder: Order = {
      ...order,
      ...driverDetails,
      status: 'preparing',
    };

    // Immediate reactive state and API/Firestore sync via App handler
    onUpdateOrderStatus(order.id, 'preparing', undefined, undefined, driverDetails);

    const updatedDriver: DeliveryDriver = {
      ...driver,
      status: 'busy',
      activeOrderId: order.id,
    };
    onUpdateDriver(updatedDriver);

    // 1. Dual Sync to Backend API
    saveOrderToApi(updatedOrder).catch(() => {});
    saveDriverToApi(updatedDriver).catch(() => {});

    // 2. Sync to Firestore
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        assignedDriverId: driver.id,
        assignedDriverName: driver.name,
        assignedDriverPhone: driver.phone,
        driverVehicle: driver.vehicleType,
        driverLocation: driver.currentLocation,
        delegationStatus: 'heading_to_restaurant',
        status: 'preparing',
      });
      await updateDoc(doc(db, 'drivers', driver.id), {
        status: 'busy',
        activeOrderId: order.id,
      });
    } catch (e) {
      console.warn('Firestore accept order notice:', e);
    }

    sendBrowserNotification({
      title: `✅ Accepted Delivery #${order.id}`,
      body: `Head to ${order.restaurantName || 'the kitchen'} for pickup.`,
      tag: `driver-accept-${order.id}`,
    });
  };

  const handleRejectOffer = (order: Order) => {
    onDriverRejectOrder(order.id, driver.id);
  };

  const handleRiderSetStage = async (
    order: Order,
    stage: 'accepted' | 'bringing_it' | 'delivered'
  ) => {
    if (stage === 'accepted') {
      const targetStatus: Order['status'] = (order.status === 'plating' || order.status === 'preparing') ? order.status : 'preparing';
      const delegationStatus = 'heading_to_restaurant';

      onUpdateOrderStatus(order.id, targetStatus, undefined, undefined, {
        delegationStatus,
        driverLocation: driver.currentLocation,
      });

      updateOrderStatusApi(order.id, targetStatus, undefined, undefined, { delegationStatus }).catch(() => {});
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          delegationStatus,
          status: targetStatus,
        });
      } catch (e) {
        console.warn('Firestore rider stage notice:', e);
      }

      sendBrowserNotification({
        title: `🛵 Order #${order.id}: Accepted`,
        body: `Heading to ${order.restaurantName || 'the kitchen'} for pickup.`,
        tag: `driver-status-${order.id}`,
      });
    } else if (stage === 'bringing_it') {
      const now = Date.now();
      const targetStatus: Order['status'] = 'en-route';
      const delegationStatus = 'out_for_delivery';

      onUpdateOrderStatus(order.id, targetStatus, undefined, undefined, {
        delegationStatus,
        enRouteAtTimestamp: now,
        driverLocation: driver.currentLocation,
      });

      updateOrderStatusApi(order.id, targetStatus, undefined, undefined, { 
        delegationStatus,
        enRouteAtTimestamp: now,
      }).catch(() => {});
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          delegationStatus,
          status: targetStatus,
          enRouteAtTimestamp: now,
        });
      } catch (e) {
        console.warn('Firestore rider stage notice:', e);
      }

      sendBrowserNotification({
        title: `🛵 Order #${order.id}: Bringing It!`,
        body: `Food picked up! On the way to ${order.customerName || 'customer'}.`,
        tag: `driver-status-${order.id}`,
      });
    } else if (stage === 'delivered') {
      const now = Date.now();
      const targetStatus: Order['status'] = 'completed';
      const delegationStatus = 'delivered';
      const pickupTime = order.enRouteAtTimestamp || order.readyAtTimestamp || (now - 14 * 60000);
      const transitMinutes = Math.max(1, Math.round((now - pickupTime) / 60000));

      onUpdateOrderStatus(order.id, targetStatus, undefined, undefined, {
        delegationStatus,
        deliveredAtTimestamp: now,
        actualDeliveryMinutes: transitMinutes,
        driverLocation: driver.currentLocation,
      });

      const updatedDriver: DeliveryDriver = {
        ...driver,
        status: 'available',
        activeOrderId: undefined,
        totalDeliveries: (driver.totalDeliveries || 0) + 1,
        earningsTodayUsd: (driver.earningsTodayUsd || 0) + (order.deliveryFee || 2.5),
      };
      onUpdateDriver(updatedDriver);

      // Dual Sync API
      updateOrderStatusApi(order.id, 'completed', undefined, undefined, { 
        delegationStatus: 'delivered',
        deliveredAtTimestamp: now,
        actualDeliveryMinutes: transitMinutes,
      }).catch(() => {});
      saveDriverToApi(updatedDriver).catch(() => {});

      try {
        await updateDoc(doc(db, 'orders', order.id), {
          delegationStatus: 'delivered',
          status: 'completed',
          deliveredAtTimestamp: now,
          actualDeliveryMinutes: transitMinutes,
        });
        await updateDoc(doc(db, 'drivers', driver.id), {
          status: 'available',
          activeOrderId: null,
          totalDeliveries: updatedDriver.totalDeliveries,
          earningsTodayUsd: updatedDriver.earningsTodayUsd,
        });
      } catch (e) {
        console.warn('Firestore delivery complete notice:', e);
      }

      sendBrowserNotification({
        title: `🎉 Delivery #${order.id} Completed!`,
        body: `Earned +$${(order.deliveryFee || 2.5).toFixed(2)} added to your MoMo balance.`,
        tag: `delivered-${order.id}`,
      });
    }
  };

  // Dynamic Restaurant context for the offered or active delivery
  const currentOrderContext = activeDelivery || offeredOrder;
  const targetRestaurant = restaurants?.find(
    (r) => r.id === currentOrderContext?.restaurantId || r.name.toLowerCase() === currentOrderContext?.restaurantName?.toLowerCase()
  );
  const restaurantNeighborhood = targetRestaurant?.neighborhood || 'Sinkor (Tubman Blvd)';
  const restaurantCoords = targetRestaurant?.location || MONROVIA_NEIGHBORHOOD_COORDS[restaurantNeighborhood] || MONROVIA_NEIGHBORHOOD_COORDS['Sinkor (Tubman Blvd)'];
  const restaurantPickupAddress = targetRestaurant?.address || targetRestaurant?.neighborhood || 'Monrovia, LR';
  const restaurantPickupName = currentOrderContext?.restaurantName || targetRestaurant?.name || 'Monrovia Kitchen';

  // Location coords for the map
  const customerCoords = MONROVIA_NEIGHBORHOOD_COORDS[activeDelivery?.deliveryArea || offeredOrder?.deliveryArea || 'Congotown & Old Road'] || { lat: 6.2690, lng: -10.7480 };

  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#111827] flex flex-col font-sans pb-20">
      
      {/* Top Navigation Bar with AURA Monrovia styling (Locked In - No Back Button) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] flex items-center justify-center text-white shadow-md shadow-[#06C167]/20 shrink-0">
              <Bike className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs sm:text-sm text-[#111827] flex items-center gap-1.5 leading-none">
                <span className="truncate max-w-[90px] xs:max-w-[140px] sm:max-w-none">{driver.name}</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#048747] font-extrabold uppercase shrink-0">
                  {driver.vehicleType}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                {driver.plateNumber || 'Fleet Rider'} • {driver.baseZone.split(' ')[0]}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Currency Switcher */}
            <button
              onClick={onToggleCurrency}
              className="px-2 sm:px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs font-black text-gray-700 transition-colors cursor-pointer"
              title="Toggle USD / Liberian Dollars (LRD)"
            >
              {currency}
            </button>

            {/* Online / Offline Status Switch */}
            <button
              onClick={handleToggleOnline}
              disabled={!isDriverVerified}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shadow-sm ${
                !isDriverVerified
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-85'
                  : isOnline
                  ? 'bg-[#06C167] hover:bg-[#048747] text-white cursor-pointer'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700 cursor-pointer'
              }`}
              title={!isDriverVerified ? 'Account Pending Verification' : isOnline ? 'You are Online' : 'Click to Go Online'}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{!isDriverVerified ? 'Unverified' : isOnline ? 'Online' : 'Offline'}</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              className="p-1.5 sm:p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        
        {/* Pending Verification Alert Banner */}
        {!isDriverVerified && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl text-amber-900 text-xs flex items-start gap-3 shadow-xs animate-fade-in">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-amber-900 block text-sm">Account Pending Admin Verification</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Your courier profile is undergoing review by Monrovia Fleet Admin. The <strong>Go Online</strong> button is disabled until your account is verified.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs (Live Dispatch, Delivery History, Earnings) */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dispatch'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Bike className="w-3.5 h-3.5 shrink-0" />
            <span>Live Dispatch</span>
            {offeredOrder ? (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0 ml-0.5" />
            ) : activeDelivery ? (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 ml-0.5" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>Trip History</span>
            {completedDriverOrders.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ml-0.5 ${
                activeTab === 'history' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {completedDriverOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('earnings')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'earnings'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span>Earnings</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: LIVE DISPATCH VIEW                                    */}
        {/* ============================================================ */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
        {/* Metric Quick Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-xs">
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-[#06C167]" />
              <span>Today's Earnings</span>
            </div>
            <div className="font-mono text-xl font-black text-[#048747] mt-1">
              {formatMoney(driver.earningsTodayUsd)}
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-xs">
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#06C167]" />
              <span>Completed</span>
            </div>
            <div className="font-mono text-xl font-black text-[#111827] mt-1">
              {driver.totalDeliveries} <span className="text-xs text-gray-400 font-sans font-bold">trips</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-xs">
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Rating</span>
            </div>
            <div className="font-mono text-xl font-black text-amber-500 mt-1">
              ★ {(driver.rating ?? 5.0).toFixed(1)}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. INCOMING DELIVERY OFFER BANNER                            */}
        {/* ============================================================ */}
        {offeredOrder && (
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white rounded-3xl shadow-xl shadow-[#06C167]/20 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                <span className="font-black text-sm uppercase tracking-wider text-white">
                  🔥 New Monrovia Delivery Offer
                </span>
              </div>
              <span className="font-mono text-xs text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-bold">
                #{offeredOrder.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white">
              <div className="space-y-1">
                <div className="text-white/80 text-[11px] font-bold uppercase tracking-wider">1. Pickup Kitchen:</div>
                <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-white" />
                  <span>{restaurantPickupName}</span>
                </div>
                <div className="text-white/80 text-[11px]">{restaurantPickupAddress}</div>
              </div>

              <div className="space-y-1">
                <div className="text-white/80 text-[11px] font-bold uppercase tracking-wider">2. Dropoff Customer:</div>
                <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-white" />
                  <span>{offeredOrder.customerName}</span>
                </div>
                <div className="text-white/80 text-[11px]">{offeredOrder.deliveryArea || offeredOrder.deliveryAddress}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-[11px] text-white/90 font-bold uppercase tracking-wider">Earnings:</div>
                <div className="font-mono text-2xl font-black text-white">
                  +{formatMoney(offeredOrder.deliveryFee || 2.5)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRejectOffer(offeredOrder)}
                  className="px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAcceptOffer(offeredOrder)}
                  className="px-6 py-3 bg-white hover:bg-gray-100 text-[#048747] font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Accept Delivery &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. ACTIVE DELIVERY IN PROGRESS (With Monrovia Delivery Map) */}
        {/* ============================================================ */}
        {activeDelivery && (
          <div className="p-5 sm:p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-[#048747] uppercase tracking-wider flex items-center gap-1.5">
                  <Bike className="w-4 h-4 animate-bounce" />
                  <span>Active Delivery in Progress</span>
                </div>
                <h3 className="text-lg font-black text-[#111827] mt-0.5">
                  Order #{activeDelivery.id}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Earnings</span>
                <div className="font-mono text-xl font-black text-[#048747]">
                  +{formatMoney(activeDelivery.deliveryFee || 2.5)}
                </div>
              </div>
            </div>

            {/* Kitchen Live Status Display */}
            {(() => {
              const kitchenInfo = getKitchenStatusInfo(activeDelivery.status);
              const KitchenIcon = kitchenInfo.icon;
              return (
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-white rounded-2xl border border-orange-200/80 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] flex items-center justify-center text-white shadow-xs shrink-0">
                      <KitchenIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-800/80 flex items-center gap-1.5">
                        <span>Kitchen Status</span>
                        <span className="text-gray-300">•</span>
                        <span className="truncate max-w-[150px] sm:max-w-none">{activeDelivery.restaurantName || 'Kitchen'}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-gray-900 truncate">
                        {kitchenInfo.label}
                      </div>
                      <div className="text-[10px] text-gray-500 hidden sm:block truncate">
                        {kitchenInfo.subtext}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border flex items-center gap-1.5 shrink-0 ${kitchenInfo.badgeColor}`}>
                    <span className={`w-2 h-2 rounded-full ${kitchenInfo.dotColor}`} />
                    <span>{kitchenInfo.label}</span>
                  </span>
                </div>
              );
            })()}

            {/* Rider 3-State Stepper & Action Controls (Accepted -> Bringing It -> Delivered) */}
            {(() => {
              const currentRiderStep = (activeDelivery.status === 'completed' || activeDelivery.delegationStatus === 'delivered')
                ? 3
                : (activeDelivery.status === 'en-route' || activeDelivery.delegationStatus === 'out_for_delivery')
                ? 2
                : 1;

              return (
                <div className="p-3.5 sm:p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                      Rider Delivery Status (3 Stages)
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Stage {currentRiderStep} of 3: {currentRiderStep === 1 ? 'Accepted' : currentRiderStep === 2 ? 'Bringing It' : 'Delivered'}
                    </span>
                  </div>

                  {/* 3 State Pill Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'accepted' as const, num: 1, label: 'Accepted', sublabel: 'Heading to Kitchen', icon: CheckCircle2 },
                      { key: 'bringing_it' as const, num: 2, label: 'Bringing It', sublabel: 'En Route to Customer', icon: Bike },
                      { key: 'delivered' as const, num: 3, label: 'Delivered', sublabel: 'Order Handed Over', icon: Award },
                    ].map((step) => {
                      const StepIcon = step.icon;
                      const isCurrent = currentRiderStep === step.num;
                      const isCompleted = currentRiderStep > step.num;

                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => handleRiderSetStage(activeDelivery, step.key)}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                            isCurrent
                              ? 'bg-[#06C167] text-white border-[#06C167] shadow-md shadow-[#06C167]/20 ring-2 ring-[#06C167]/30'
                              : isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                          title={`Switch status to: ${step.label}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                              isCurrent
                                ? 'bg-white text-[#06C167]'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.num}
                            </span>
                            <StepIcon className="w-3.5 h-3.5 shrink-0" />
                          </div>
                          <span className="text-xs font-black truncate max-w-full leading-tight">
                            {step.label}
                          </span>
                          <span className={`text-[9px] truncate max-w-full hidden sm:block ${
                            isCurrent ? 'text-white/80' : 'text-gray-400'
                          }`}>
                            {step.sublabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Contextual Action Button to Advance to Next State */}
                  {currentRiderStep === 1 && (
                    <button
                      type="button"
                      onClick={() => handleRiderSetStage(activeDelivery, 'bringing_it')}
                      className="w-full py-3.5 px-4 bg-[#06C167] hover:bg-[#048747] text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-[#06C167]/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                    >
                      <Bike className="w-4 h-4 animate-pulse" />
                      <span>Picked Up from Kitchen · Start Trip & Bringing It &rarr;</span>
                    </button>
                  )}

                  {currentRiderStep === 2 && (
                    <button
                      type="button"
                      onClick={() => handleRiderSetStage(activeDelivery, 'delivered')}
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Handed to Customer · Confirm Delivered & Complete &rarr;</span>
                    </button>
                  )}

                  {currentRiderStep === 3 && (
                    <div className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-xs rounded-2xl text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Order Completed & MoMo Earnings Credited!</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Interactive Google Map with Route Pin */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
              <MonroviaDeliveryMap
                driverLocation={driver.currentLocation}
                restaurantLocation={restaurantCoords}
                customerLocation={customerCoords}
                restaurantName={activeDelivery.restaurantName || 'Kitchen'}
                customerAddress={activeDelivery.deliveryArea || activeDelivery.deliveryAddress || 'Customer'}
                driverName={driver.name}
                driverVehicle={driver.vehicleType}
                height="h-64"
              />
            </div>

            {/* Route Steps & Call Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="font-extrabold text-[#111827] flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Customer Contact</span>
                  <a
                    href={`tel:${activeDelivery.customerPhone}`}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Customer</span>
                  </a>
                </div>
                <div className="text-sm font-black text-gray-950">
                  {activeDelivery.customerName || 'Customer'}
                </div>
                <div className="text-xs font-mono font-bold text-[#048747]">
                  {activeDelivery.customerPhone}
                </div>
                <div className="text-gray-500 text-[11px] pt-1.5 border-t border-gray-200/70 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>{activeDelivery.deliveryAddress || activeDelivery.deliveryArea}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="font-extrabold text-[#111827] flex items-center justify-between">
                  <span>Kitchen Contact</span>
                  <span className="text-[10px] text-[#048747] font-mono font-bold bg-[#E8F8EE] px-2 py-0.5 rounded-full">
                    {activeDelivery.items.length} Items
                  </span>
                </div>
                <div className="text-gray-800 font-bold">
                  {activeDelivery.restaurantName || 'Monrovia Kitchen'}
                </div>
                <div className="text-gray-500 text-[11px] truncate">
                  {activeDelivery.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. WAITING STATE (When Online & No Active Order)             */}
        {/* ============================================================ */}
        {!offeredOrder && !activeDelivery && (
          <div className="p-8 sm:p-12 bg-white border border-gray-100 rounded-3xl text-center space-y-3 shadow-xs">
            <div className="w-16 h-16 bg-[#E8F8EE] text-[#048747] rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Bike className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-[#111827]">
              {isOnline ? 'Active on Monrovia Dispatch Radar' : 'You are currently Offline'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              {isOnline
                ? 'Your location is active in Sinkor, Congotown & Mamba Point. Orders placed by customers will chime and pop up here automatically.'
                : 'Switch your status to Online to start receiving delivery offers and earning MoMo cash.'}
            </p>

            {!isOnline && (
              <button
                type="button"
                onClick={handleToggleOnline}
                disabled={!isDriverVerified}
                className={`mt-2 px-6 py-3 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all ${
                  !isDriverVerified
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-85'
                    : 'bg-gradient-to-r from-[#06C167] to-[#048747] hover:from-[#05A357] hover:to-[#03703a] text-white cursor-pointer active:scale-95'
                }`}
              >
                {!isDriverVerified ? 'Pending Admin Verification' : 'Go Online Now'}
              </button>
            )}
          </div>
        )}
      </div>
    )}

        {/* ============================================================ */}
        {/* TAB 2: DELIVERY HISTORY VIEW                                 */}
        {/* ============================================================ */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Delivery History Header Banner */}
            <div className="p-5 sm:p-6 bg-white border border-gray-100 rounded-3xl shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#E8F8EE] text-[#048747] flex items-center justify-center font-black shadow-xs shrink-0">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900">
                      Delivery History &amp; Completed Trips
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Archive of your fulfilled deliveries across Monrovia
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#E8F8EE] text-[#048747] border border-emerald-200">
                  {completedDriverOrders.length} Completed {completedDriverOrders.length === 1 ? 'Trip' : 'Trips'}
                </span>
              </div>

              {/* History Key Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 text-xs">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/70">
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider">
                    Total Delivery Trips
                  </span>
                  <div className="font-mono text-lg font-black text-gray-900 mt-0.5">
                    {totalTripsCount} <span className="text-xs font-sans text-gray-500 font-medium">deliveries</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 block tracking-wider">
                    Total Delivery Payouts
                  </span>
                  <div className="font-mono text-lg font-black text-[#048747] mt-0.5">
                    {formatMoney(totalHistoryEarnings || driver.earningsTodayUsd)}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/70">
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider">
                    Customer Rating
                  </span>
                  <div className="font-mono text-lg font-black text-amber-500 mt-0.5">
                    ★ {(driver.rating ?? 5.0).toFixed(1)} <span className="text-xs font-sans text-gray-500 font-medium">(Top Courier)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                    historyFilter === 'all'
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  All Trips ({completedDriverOrders.length})
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryFilter('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                    historyFilter === 'today'
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Today ({todayTripsCount})
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryFilter('week')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                    historyFilter === 'week'
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Past 7 Days ({weekTripsCount})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by ID, kitchen, customer..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#06C167] shadow-2xs"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Trip Cards */}
            {filteredHistoryOrders.length === 0 ? (
              <div className="p-10 bg-white border border-gray-100 rounded-3xl text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-3xl flex items-center justify-center mx-auto">
                  <Receipt className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-gray-900">
                  {completedDriverOrders.length === 0
                    ? 'No Completed Deliveries Yet'
                    : 'No Trips Match Your Search'}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  {completedDriverOrders.length === 0
                    ? 'When you accept orders on the Live Dispatch tab and deliver them to customers, your completed trip history and MoMo earnings will appear here.'
                    : 'Try clearing your search keyword or switching the timeframe filter above.'}
                </p>

                {completedDriverOrders.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('dispatch')}
                    className="mt-2 px-5 py-2.5 bg-gradient-to-r from-[#06C167] to-[#048747] text-white font-extrabold text-xs rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer"
                  >
                    Go to Live Dispatch Radar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryFilter('all');
                      setHistorySearch('');
                    }}
                    className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistoryOrders.map((order) => {
                  const targetRest = restaurants?.find(
                    (r) => r.id === order.restaurantId || r.name.toLowerCase() === order.restaurantName?.toLowerCase()
                  );
                  const timing = getOrderDeliveryTiming(order);

                  return (
                    <div
                      key={order.id}
                      className="p-4 sm:p-5 bg-white border border-gray-100 rounded-3xl shadow-xs hover:shadow-md transition-all space-y-3"
                    >
                      {/* Top Row: Order ID, Timestamp & Earnings Pill */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyOrderId(order.id)}
                            className="font-mono text-xs font-black text-gray-900 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            title="Click to copy Order ID"
                          >
                            <span>#{order.id}</span>
                            {copiedOrderId === order.id ? (
                              <Check className="w-3 h-3 text-[#048747] stroke-[3]" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </button>

                          <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{timing.formattedDeliveredDate} &bull; Delivered {timing.formattedDeliveredTime} ({timing.transitMinutes}m trip)</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-[#048747] border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivered &amp; Paid</span>
                          </span>

                          <div className="text-right">
                            <span className="font-mono text-sm sm:text-base font-black text-[#048747]">
                              +{formatMoney(order.deliveryFee || 2.5)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Route Path (Kitchen -> Customer) */}
                      <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF4B26] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider">
                              Pickup Kitchen
                            </span>
                            <div className="font-extrabold text-gray-900 truncate">
                              {order.restaurantName || targetRest?.name || 'Monrovia Kitchen'}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">
                              {targetRest?.neighborhood || 'Monrovia, LR'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#048747] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider">
                              Dropoff Customer
                            </span>
                            <div className="font-extrabold text-gray-900 truncate">
                              {order.customerName}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">
                              {order.deliveryArea || order.deliveryAddress || 'Monrovia, LR'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Details: Items Summary & Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="text-gray-500 text-[11px] font-medium truncate max-w-sm">
                          <span className="font-bold text-gray-700">
                            {order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0} items:
                          </span>{' '}
                          {(order.items || []).map((i) => `${i.quantity || 1}x ${i.menuItem?.name || 'Dish'}`).join(', ')}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {order.customerPhone && (
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Call customer"
                            >
                              <Phone className="w-3 h-3 text-[#06C167]" />
                              <span>Call</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedHistoryOrder(order)}
                            className="px-3 py-1 bg-[#E8F8EE] hover:bg-[#D4F4E0] text-[#048747] border border-emerald-200 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Trip Receipt &rarr;</span>
                          </button>
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
        {/* TAB 3: EARNINGS & PAYOUTS DASHBOARD                          */}
        {/* ============================================================ */}
        {activeTab === 'earnings' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Earnings Hero Card */}
            <div className="p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#06C167] text-white flex items-center justify-center shadow-md">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                      Monrovia Fleet Payouts
                    </span>
                    <h2 className="text-lg font-black text-white">
                      Rider Earnings
                    </h2>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Instant Transfer Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-white/70 block">
                    Today's Earnings
                  </span>
                  <div className="font-mono text-2xl font-black text-emerald-400 mt-0.5">
                    {formatMoney(driver.earningsTodayUsd)}
                  </div>
                </div>

                <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-white/70 block">
                    All-Time Trips
                  </span>
                  <div className="font-mono text-2xl font-black text-white mt-0.5">
                    {totalTripsCount}
                  </div>
                </div>

                <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-white/70 block">
                    Courier Rating
                  </span>
                  <div className="font-mono text-2xl font-black text-amber-300 mt-0.5">
                    ★ {(driver.rating ?? 5.0).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payout Details Card */}
            <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-xs space-y-3 text-xs">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#06C167]" />
                <span>Courier MoMo Settlement Account</span>
              </h3>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Registered Rider Name:</span>
                  <strong className="text-gray-900 font-bold">{driver.name}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">MoMo Settlement Phone:</span>
                  <strong className="font-mono font-bold text-[#048747]">{driver.phone}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Assigned Vehicle:</span>
                  <span className="font-bold text-gray-800">{driver.vehicleType} ({driver.plateNumber || 'Fleet'})</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Base Dispatch Zone:</span>
                  <span className="font-bold text-gray-800">{driver.baseZone}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automated Delivery Fee Settlement</span>
                </div>
                <p className="leading-relaxed text-emerald-800">
                  Each completed trip delivery fee ($2.00 &ndash; $3.50 USD depending on distance) is credited immediately to your driver profile and settled directly to your registered Mobile Money number upon trip completion.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ============================================================ */}
      {/* 4. TRIP RECEIPT MODAL (When Rider Taps a Past Order)         */}
      {/* ============================================================ */}
      {selectedHistoryOrder && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-overlay-fade"
          onClick={() => setSelectedHistoryOrder(null)}
        >
          <div 
            className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-none border-t sm:border-2 sm:border-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-sheet sm:animate-in sm:zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Interactive Pull Notch for Small Screens */}
            <button
              type="button"
              onClick={() => setSelectedHistoryOrder(null)}
              className="sm:hidden w-full pt-3 pb-1 flex items-center justify-center cursor-pointer bg-gray-900"
              aria-label="Collapse slip"
            >
              <div className="w-12 h-1.5 bg-gray-600 rounded-full hover:bg-gray-400 transition-colors" />
            </button>

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#06C167] text-white flex items-center justify-center font-bold shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-400 block">
                    #{selectedHistoryOrder.id}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Trip Delivery Slip
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistoryOrder(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              {/* Trip Earnings Banner */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider block">
                    Rider Trip Fee Earned
                  </span>
                  <div className="font-mono text-xl font-black text-[#048747]">
                    +{formatMoney(selectedHistoryOrder.deliveryFee || 2.5)}
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completed</span>
                </span>
              </div>

              {/* Delivery Timing & Transit Breakdown (Pickup -> Customer) */}
              {(() => {
                const timing = getOrderDeliveryTiming(selectedHistoryOrder);
                return (
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#06C167]" />
                        <span>Delivery Time &amp; Duration</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#E8F8EE] text-[#048747] border border-emerald-200 flex items-center gap-1">
                        <Bike className="w-3 h-3" />
                        <span>{timing.transitMinutes} Mins On Road</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                      <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs space-y-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">
                          Picked Up at Kitchen
                        </span>
                        <div className="font-mono text-xs font-black text-gray-800">
                          {timing.formattedPickupTime}
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs space-y-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">
                          Delivered to Customer
                        </span>
                        <div className="font-mono text-xs font-black text-[#048747]">
                          {timing.formattedDeliveredTime}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-700 bg-emerald-50/80 border border-emerald-200/80 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#06C167]" />
                        <span className="font-bold text-emerald-950">Pickup &rarr; Customer Transit:</span>
                      </div>
                      <span className="font-extrabold text-[#048747]">
                        {timing.transitMinutes} minutes
                      </span>
                    </div>

                    <div className="text-[10px] text-gray-400 text-right">
                      Delivery Date: <span className="font-semibold text-gray-600">{timing.formattedDeliveredDate}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Route Summary */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                <div className="flex items-start gap-2">
                  <Store className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block">From Kitchen</span>
                    <strong className="text-gray-900 block">{selectedHistoryOrder.restaurantName || 'Monrovia Kitchen'}</strong>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2 border-t border-gray-200/60">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Delivered To</span>
                    <strong className="text-gray-900 block">{selectedHistoryOrder.customerName}</strong>
                    <span className="text-[11px] text-gray-600 font-medium">{selectedHistoryOrder.deliveryArea || selectedHistoryOrder.deliveryAddress}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 text-[10px] font-black uppercase text-gray-600">
                  Delivered Items
                </div>
                <div className="divide-y divide-gray-100 bg-white p-3 space-y-1.5">
                  {(selectedHistoryOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="font-bold text-gray-800">
                        <span className="font-mono text-[#048747] font-black mr-1.5">{item.quantity || 1}x</span>
                        <span>{item.menuItem?.name || 'Item'}</span>
                      </div>
                      <span className="font-mono text-gray-500 font-medium">
                        ${((item.menuItem?.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Contact Link */}
              {selectedHistoryOrder.customerPhone && (
                <a
                  href={`tel:${selectedHistoryOrder.customerPhone}`}
                  className="w-full py-2.5 px-3 bg-gray-100 hover:bg-emerald-50 text-[#048747] border border-gray-200 hover:border-emerald-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Customer ({selectedHistoryOrder.customerPhone})</span>
                </a>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryOrder(null)}
                className="w-full sm:w-auto px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
