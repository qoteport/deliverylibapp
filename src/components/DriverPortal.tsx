import React, { useState } from 'react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Store, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Power, 
  Sparkles, 
  ShieldCheck, 
  ArrowLeft, 
  Wallet, 
  Navigation,
  Check,
  Award,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Order, DeliveryDriver, Currency, USD_TO_LRD_RATE, MONROVIA_NEIGHBORHOOD_COORDS, Restaurant } from '../types';
import { MonroviaDeliveryMap } from './MonroviaDeliveryMap';
import { sendBrowserNotification } from '../utils/browserNotifications';
import { db } from '../firebase/config';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { saveOrderToApi, saveDriverToApi, updateOrderStatusApi, updateDriverApi } from '../utils/apiSync';

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
  const [isOnline, setIsOnline] = useState(driver.isOnline);
  const [activeTab, setActiveTab] = useState<'dispatch' | 'earnings' | 'fleet'>('dispatch');

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

  const formatMoney = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
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

  const handleAdvanceDeliveryStage = async (
    order: Order,
    nextStage: 'at_restaurant' | 'out_for_delivery' | 'delivered'
  ) => {
    let orderStatus: Order['status'] = order.status;

    if (nextStage === 'at_restaurant') {
      orderStatus = 'plating';
    } else if (nextStage === 'out_for_delivery') {
      orderStatus = 'en-route';
    } else if (nextStage === 'delivered') {
      orderStatus = 'completed';
    }

    onUpdateOrderStatus(order.id, orderStatus, undefined, undefined, {
      delegationStatus: nextStage,
      driverLocation: driver.currentLocation,
    });

    if (nextStage === 'delivered') {
      const updatedDriver: DeliveryDriver = {
        ...driver,
        status: 'available',
        activeOrderId: undefined,
        totalDeliveries: driver.totalDeliveries + 1,
        earningsTodayUsd: driver.earningsTodayUsd + (order.deliveryFee || 2.5),
      };
      onUpdateDriver(updatedDriver);

      // Dual Sync API
      updateOrderStatusApi(order.id, 'completed', undefined, undefined, { delegationStatus: 'delivered' }).catch(() => {});
      saveDriverToApi(updatedDriver).catch(() => {});

      try {
        await updateDoc(doc(db, 'orders', order.id), {
          delegationStatus: 'delivered',
          status: 'completed',
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
    } else {
      updateOrderStatusApi(order.id, orderStatus, undefined, undefined, { delegationStatus: nextStage }).catch(() => {});
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          delegationStatus: nextStage,
          status: orderStatus,
        });
      } catch (e) {
        console.warn('Firestore stage update notice:', e);
      }
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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] flex items-center justify-center text-white shadow-md shadow-[#06C167]/20">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-[#111827] flex items-center gap-1.5 leading-none">
                <span>{driver.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#048747] font-extrabold uppercase">
                  {driver.vehicleType}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 font-mono mt-1">
                {driver.plateNumber || 'Fleet Rider'} • {driver.baseZone.split(' ')[0]}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency Switcher */}
            <button
              onClick={onToggleCurrency}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs font-black text-gray-700 transition-colors cursor-pointer"
              title="Toggle USD / Liberian Dollars (LRD)"
            >
              {currency}
            </button>

            {/* Online / Offline Status Switch */}
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shadow-sm cursor-pointer ${
                isOnline
                  ? 'bg-[#06C167] hover:bg-[#048747] text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        
        {/* Metric Quick Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-xs">
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-[#06C167]" />
              <span>Today's MoMo</span>
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
              ★ {driver.rating.toFixed(1)}
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
                  <span>Customer Contact</span>
                  <a
                    href={`tel:${activeDelivery.customerPhone}`}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-1 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
                <div className="text-gray-800 font-bold">
                  {activeDelivery.customerName} ({activeDelivery.customerPhone})
                </div>
                <div className="text-gray-500 text-[11px]">
                  {activeDelivery.deliveryAddress || activeDelivery.deliveryArea}
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

            {/* Delegation Stage Step Actions */}
            <div className="pt-2 flex flex-col gap-2">
              {activeDelivery.delegationStatus === 'heading_to_restaurant' && (
                <button
                  onClick={() => handleAdvanceDeliveryStage(activeDelivery, 'at_restaurant')}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Step 1: I've Arrived at the Kitchen &rarr;
                </button>
              )}

              {activeDelivery.delegationStatus === 'at_restaurant' && (
                <button
                  onClick={() => handleAdvanceDeliveryStage(activeDelivery, 'out_for_delivery')}
                  className="w-full py-4 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#06C167]/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Step 2: Food Collected, Heading to Customer &rarr;
                </button>
              )}

              {activeDelivery.delegationStatus === 'out_for_delivery' && (
                <button
                  onClick={() => handleAdvanceDeliveryStage(activeDelivery, 'delivered')}
                  className="w-full py-4 bg-gradient-to-r from-[#06C167] to-[#048747] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#06C167]/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Step 3: Complete Delivery &amp; Collect Earnings &rarr;
                </button>
              )}
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
                onClick={handleToggleOnline}
                className="mt-2 px-6 py-3 bg-gradient-to-r from-[#06C167] to-[#048747] hover:from-[#05A357] hover:to-[#03703a] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                Go Online Now
              </button>
            )}
          </div>
        )}

      </main>

    </div>
  );
};
