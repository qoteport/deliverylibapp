import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Store, 
  ShoppingBag, 
  DollarSign, 
  Plus, 
  Check, 
  X, 
  ArrowLeft, 
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
  Save
} from 'lucide-react';
import { Restaurant, MenuItem, Order, Currency, USD_TO_LRD_RATE, DeliveryDriver, MONROVIA_NEIGHBORHOODS, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { MonroviaDeliveryMap } from './MonroviaDeliveryMap';
import { getSavedTwilioConfig, saveTwilioConfig, TwilioConfig } from '../utils/twilio';
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
  onExitAdmin,
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
  const [activeTab, setActiveTab] = useState<'restaurants' | 'drivers' | 'orders' | 'system'>('restaurants');
  const [restaurantFilter, setRestaurantFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [driverFilter, setDriverFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchRestaurant, setSearchRestaurant] = useState<string>('');
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [prevOrdersCount, setPrevOrdersCount] = useState(orders.length);

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

  // Inline Phone Edit State for Restaurant
  const [editingPhoneRestId, setEditingPhoneRestId] = useState<string | null>(null);
  const [editingPhoneInput, setEditingPhoneInput] = useState<string>('');

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const totalGmvUsd = orders.reduce((sum, o) => sum + o.total, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length;
  const onlineDriversCount = drivers.filter((d) => d.isOnline).length;
  
  const pendingRestaurantsCount = restaurants.filter(
    (r) => r.isVerified === false || r.verificationStatus === 'pending'
  ).length;

  const pendingDriversCount = drivers.filter(
    (d) => d.isVerified === false || d.verificationStatus === 'pending'
  ).length;

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

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans">
      
      {/* Modern White Admin Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs h-16 flex items-center">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onExitAdmin}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
              title="Return to customer app"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
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
              title={soundEnabled ? 'Live Order Chime Active' : 'Live Order Chime Muted'}
            >
              <span>{soundEnabled ? '🔔 Chime On' : '🔕 Muted'}</span>
            </button>
            <button
              onClick={onToggleCurrency}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-mono font-bold text-gray-800 cursor-pointer"
            >
              {currency}
            </button>

            <span className="text-xs text-gray-500 hidden md:inline truncate max-w-[160px] font-semibold">
              {user?.email}
            </span>

            <button
              onClick={() => {
                logout();
                onExitAdmin();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 lg:px-10 py-6 space-y-6">
        
        {/* KPI Scorecard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Monrovia Kitchens</span>
              {pendingRestaurantsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black animate-pulse">
                  {pendingRestaurantsCount} Pending
                </span>
              )}
            </div>
            <div className="text-3xl font-black text-[#111827] mt-1 tracking-tight">
              {restaurants.length}
            </div>
            <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {restaurants.filter((r) => r.isVerified !== false).length} Verified Live
            </div>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Delivery Fleet</span>
              {pendingDriversCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black animate-pulse">
                  {pendingDriversCount} Pending
                </span>
              )}
            </div>
            <div className="text-3xl font-black text-[#111827] mt-1 tracking-tight">
              {drivers.length}
            </div>
            <div className="text-xs text-blue-600 font-bold mt-1 flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" />
              {drivers.filter((d) => d.isVerified !== false).length} Verified Riders
            </div>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              Total Orders
            </div>
            <div className="text-3xl font-black text-[#111827] mt-1 tracking-tight">
              {orders.length}
            </div>
            <div className="text-xs text-[#06C167] font-bold mt-1">
              {activeOrdersCount} in progress
            </div>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              Platform GMV
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-[#111827] mt-1 tracking-tight truncate">
              {formatPrice(totalGmvUsd)}
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'restaurants'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            Kitchens &amp; Verification ({restaurants.length})
            {pendingRestaurantsCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white text-[#048747] text-[10px] font-black">
                {pendingRestaurantsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            Delivery Fleet ({drivers.length})
            {pendingDriversCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white text-[#048747] text-[10px] font-black">
                {pendingDriversCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            Live Orders Feed ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            Database Maintenance
          </button>
        </div>

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
                        <div className="flex items-center gap-2">
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
                            <span>{isVerified ? 'Suspend / Unverify' : 'Verify & Publish'}</span>
                          </button>

                          <button
                            onClick={() => onOpenRestaurantPortal(restaurant.id)}
                            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Kitchen KDS</span>
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
        {/* TAB 2: DRIVERS & FLEET VERIFICATION                         */}
        {/* ============================================================ */}
        {activeTab === 'drivers' && (
          <div className="space-y-6">
            
            {/* Filter & Monrovia Fleet Live Map */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#111827]">
                    Monrovia Fleet Dispatch &amp; Verification
                  </h3>
                  <p className="text-xs text-gray-500">
                    Verify couriers before they can go online or receive delivery dispatches
                  </p>
                </div>

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
              </div>

              <MonroviaDeliveryMap
                driverLocation={drivers[0]?.currentLocation}
                height="280px"
              />
            </div>

            {/* Drivers Roster Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#111827]">
                  Registered Monrovia Couriers ({filteredDrivers.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                    <tr>
                      <th className="p-3 sm:p-4">Rider Name</th>
                      <th className="p-3 sm:p-4">Verification</th>
                      <th className="p-3 sm:p-4">Vehicle / Plate</th>
                      <th className="p-3 sm:p-4">Phone / MoMo</th>
                      <th className="p-3 sm:p-4">Base Zone</th>
                      <th className="p-3 sm:p-4">Deliveries</th>
                      <th className="p-3 sm:p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {filteredDrivers.map((d) => {
                      const isVerified = d.isVerified !== false && d.verificationStatus !== 'pending';

                      return (
                        <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 sm:p-4 font-bold text-[#111827] flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                              <Bike className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div>{d.name}</div>
                              <div className="text-[10px] text-amber-500 font-bold">★ {d.rating.toFixed(1)}</div>
                            </div>
                          </td>

                          <td className="p-3 sm:p-4">
                            {isVerified ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3 sm:p-4">
                            <div className="font-semibold">{d.vehicleType}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{d.plateNumber || 'N/A'}</div>
                          </td>

                          <td className="p-3 sm:p-4 font-mono text-[11px]">
                            <div>{d.phone}</div>
                            <div className="text-[10px] text-emerald-600 font-bold uppercase">{d.momoProvider} MoMo: {d.momoNumber || d.phone}</div>
                          </td>

                          <td className="p-3 sm:p-4 text-[11px] font-semibold">
                            {d.baseZone.split(' ')[0]}
                          </td>

                          <td className="p-3 sm:p-4 font-mono font-bold">
                            {d.totalDeliveries}
                          </td>

                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleDriverVerification(d)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                                  isVerified
                                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                }`}
                              >
                                {isVerified ? 'Unverify' : 'Verify Rider'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: LIVE ORDERS FEED                                      */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* TAB 3: LIVE ORDERS FEED (REALTIME SYNC)                      */}
        {/* ============================================================ */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
                {['all', 'received', 'preparing', 'plating', 'en-route', 'completed'].map((st) => (
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
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-black text-[#111827] bg-gray-100 px-2.5 py-1 rounded-lg">
                            #{o.id}
                          </span>
                          <span className="text-xs font-semibold text-gray-400">
                            {o.createdAt}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#E8F8EE] text-[#048747] border border-emerald-200">
                            {o.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                            {o.diningMode}
                          </span>
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

                      {/* Quick Status Control Buttons */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
                        <div className="text-[11px] text-gray-500 font-semibold">
                          {o.status === 'cancelled' ? 'Order Status:' : 'Advance Status in Realtime:'}
                        </div>
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
                              🍲 Pack Thermal Meal
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
                                Cancel Order
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
        {/* TAB 4: DATABASE MAINTENANCE                                  */}
        {/* ============================================================ */}
        {activeTab === 'system' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-extrabold text-[#111827]">
                Database &amp; Platform Maintenance
              </h3>
              <p className="text-xs text-gray-500">
                Manage live Firestore collections, purge test orders, and configure system rules.
              </p>
            </div>

            {onPurgeDemoData && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                <div className="font-extrabold text-xs text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Purge All Mock / Demo Data</span>
                </div>
                <p className="text-xs text-red-600">
                  Reset local state and ensure no hardcoded dummy items exist in the app.
                </p>
                <button
                  type="button"
                  onClick={onPurgeDemoData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Clear Demo Data Now
                </button>
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
};
