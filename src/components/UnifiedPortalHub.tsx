import React, { useState } from 'react';
import {
  Store,
  Bike,
  Building2,
  Car,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  UserCheck,
  ChevronLeft,
  DollarSign,
  User,
  Phone,
  Sparkles,
  LogIn,
  PlusCircle,
  ExternalLink,
  X,
  Wrench,
  Key,
  ChefHat
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Restaurant, DeliveryDriver, SupermarketStore, Currency, AppUser } from '../types';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface UnifiedPortalHubProps {
  restaurants: Restaurant[];
  drivers: DeliveryDriver[];
  supermarkets: SupermarketStore[];
  onOpenKitchenPortal: (restaurantId?: string) => void;
  onOpenDriverPortal: (driverId?: string) => void;
  onOpenSupermarketPortal: (supermarketId?: string) => void;
  onOpenRealEstatePortal: () => void;
  onOpenMotorsPortal: () => void;
  onOpenKitchenRegistration: () => void;
  onOpenSupermarketRegistration: () => void;
  onBackToStorefront: () => void;
  currency: Currency;
  onToggleCurrency: () => void;
}

export const UnifiedPortalHub: React.FC<UnifiedPortalHubProps> = ({
  restaurants,
  drivers,
  supermarkets,
  onOpenKitchenPortal,
  onOpenDriverPortal,
  onOpenSupermarketPortal,
  onOpenRealEstatePortal,
  onOpenMotorsPortal,
  onOpenKitchenRegistration,
  onOpenSupermarketRegistration,
  onBackToStorefront,
  currency,
  onToggleCurrency,
}) => {
  const { user, setUserDirectly, logout } = useAuth();

  // Unified Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [targetPortalAfterLogin, setTargetPortalAfterLogin] = useState<
    'kitchen' | 'rides' | 'supermarket' | 'real-estate' | 'motors' | null
  >(null);

  // Phone/Password input for unified login
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginError, setLoginError] = useState('');

  // Specialized Registration Modals State
  const [activeRegisterModal, setActiveRegisterModal] = useState<
    'driver' | 'real-estate' | 'motors' | null
  >(null);

  // Driver Registration Form
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverVehicle, setDriverVehicle] = useState<'motorbike' | 'kekeh' | 'taxi'>('motorbike');
  const [driverZone, setDriverZone] = useState('Sinkor');
  const [driverPlate, setDriverPlate] = useState('');

  // Real Estate Agency Registration Form
  const [agencyName, setAgencyName] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyWhatsApp, setAgencyWhatsApp] = useState('');
  const [agencyZone, setAgencyZone] = useState('Sinkor & Mamba Point');
  const [agencyLicense, setAgencyLicense] = useState('');

  // Motors Dealership Registration Form
  const [dealerName, setDealerName] = useState('');
  const [dealerPhone, setDealerPhone] = useState('');
  const [dealerWhatsApp, setDealerWhatsApp] = useState('');
  const [dealerCategory, setDealerCategory] = useState<'sales' | 'rental' | 'parts' | 'all'>('all');
  const [dealerAddress, setDealerAddress] = useState('');

  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Quick 1-Tap Manager Logins (Unlocks all portals)
  const handleDemoLogin = (role: AppUser['role'], name: string, specificId?: { restaurantId?: string; supermarketId?: string; driverId?: string }) => {
    const demoUser: AppUser = {
      uid: `mgr-${Date.now()}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@aura.monrovia`,
      phone: '+231 77 000 1122',
      role,
      ...specificId
    };
    setUserDirectly(demoUser);
    setIsLoginModalOpen(false);

    // If user clicked a specific portal beforehand, navigate to it
    if (targetPortalAfterLogin) {
      launchPortal(targetPortalAfterLogin);
      setTargetPortalAfterLogin(null);
    }
  };

  // Custom unified login submit
  const handleCustomLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) {
      setLoginError('Please enter your phone number or business email');
      return;
    }

    const unifiedUser: AppUser = {
      uid: `user-${loginPhone.replace(/[^0-9]/g, '') || Date.now()}`,
      name: loginName.trim() || 'Monrovia Business Manager',
      email: loginPhone.includes('@') ? loginPhone : `${loginPhone.replace(/[^0-9]/g, '')}@aura.monrovia`,
      phone: loginPhone,
      role: 'admin' // Unified manager has access to all portals
    };

    setUserDirectly(unifiedUser);
    setIsLoginModalOpen(false);
    setLoginError('');

    if (targetPortalAfterLogin) {
      launchPortal(targetPortalAfterLogin);
      setTargetPortalAfterLogin(null);
    }
  };

  // Direct portal navigation with auth check
  const handleAccessPortal = (portalKey: 'kitchen' | 'rides' | 'supermarket' | 'real-estate' | 'motors') => {
    // If not logged in, prompt unified login
    if (!user) {
      setTargetPortalAfterLogin(portalKey);
      setIsLoginModalOpen(true);
      return;
    }
    launchPortal(portalKey);
  };

  const launchPortal = (portalKey: 'kitchen' | 'rides' | 'supermarket' | 'real-estate' | 'motors') => {
    switch (portalKey) {
      case 'kitchen':
        onOpenKitchenPortal(user?.restaurantId || restaurants[0]?.id);
        break;
      case 'rides':
        onOpenDriverPortal(user?.driverId || drivers[0]?.id);
        break;
      case 'supermarket':
        onOpenSupermarketPortal(user?.supermarketId || supermarkets[0]?.id);
        break;
      case 'real-estate':
        onOpenRealEstatePortal();
        break;
      case 'motors':
        onOpenMotorsPortal();
        break;
    }
  };

  // Submit Driver Registration
  const handleDriverRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverPhone) return;
    setIsSubmittingReg(true);

    try {
      const driverData = {
        name: driverName,
        phone: driverPhone,
        vehicleType: driverVehicle,
        operatingZone: driverZone,
        licensePlate: driverPlate,
        status: 'approved',
        rating: 5.0,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'driver_registrations'), driverData);

      // Log in as driver
      const newDriverUser: AppUser = {
        uid: `drv-${Date.now()}`,
        name: driverName,
        phone: driverPhone,
        email: `${driverPhone.replace(/[^0-9]/g, '')}@aura.monrovia`,
        role: 'driver'
      };
      setUserDirectly(newDriverUser);

      setRegSuccessMessage(`Welcome ${driverName}! Your driver profile is active.`);
      setActiveRegisterModal(null);
      setTimeout(() => {
        setRegSuccessMessage(null);
        onOpenDriverPortal();
      }, 1200);
    } catch {
      setActiveRegisterModal(null);
      onOpenDriverPortal();
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Submit Real Estate Agency Registration
  const handleRealEstateRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName || !agencyPhone) return;
    setIsSubmittingReg(true);

    try {
      const agencyData = {
        name: agencyName,
        phone: agencyPhone,
        whatsApp: agencyWhatsApp || agencyPhone,
        zonesCovered: agencyZone,
        licenseNumber: agencyLicense,
        status: 'verified',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'agency_registrations'), agencyData);

      // Log in as agency partner
      const newAgencyUser: AppUser = {
        uid: `agency-${Date.now()}`,
        name: agencyName,
        phone: agencyPhone,
        email: `${agencyPhone.replace(/[^0-9]/g, '')}@aura.monrovia`,
        role: 'admin'
      };
      setUserDirectly(newAgencyUser);

      setRegSuccessMessage(`Welcome ${agencyName}! Agency portal unlocked.`);
      setActiveRegisterModal(null);
      setTimeout(() => {
        setRegSuccessMessage(null);
        onOpenRealEstatePortal();
      }, 1200);
    } catch {
      setActiveRegisterModal(null);
      onOpenRealEstatePortal();
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Submit Motors Dealer Registration
  const handleMotorsRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerName || !dealerPhone) return;
    setIsSubmittingReg(true);

    try {
      const dealerData = {
        name: dealerName,
        phone: dealerPhone,
        whatsApp: dealerWhatsApp || dealerPhone,
        businessCategory: dealerCategory,
        yardAddress: dealerAddress,
        status: 'verified',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'motors_dealer_registrations'), dealerData);

      // Log in as dealer partner
      const newDealerUser: AppUser = {
        uid: `dealer-${Date.now()}`,
        name: dealerName,
        phone: dealerPhone,
        email: `${dealerPhone.replace(/[^0-9]/g, '')}@aura.monrovia`,
        role: 'admin'
      };
      setUserDirectly(newDealerUser);

      setRegSuccessMessage(`Welcome ${dealerName}! Dealership portal unlocked.`);
      setActiveRegisterModal(null);
      setTimeout(() => {
        setRegSuccessMessage(null);
        onOpenMotorsPortal();
      }, 1200);
    } catch {
      setActiveRegisterModal(null);
      onOpenMotorsPortal();
    } finally {
      setIsSubmittingReg(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-20 sm:pb-12">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStorefront}
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 text-sm font-medium"
              title="Return to Food Storefront"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white shadow-sm">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 leading-none">
                  Aura Management Center
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Unified merchant & partner portal for Monrovia</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dual Currency Switcher */}
            <button
              onClick={onToggleCurrency}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-gray-700" />
              <span>{currency}</span>
            </button>

            {/* Auth Profile / Sign-in Pill */}
            {user ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-full px-3 py-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-900 truncate max-w-[120px] sm:max-w-[180px]">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold underline text-[11px] ml-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTargetPortalAfterLogin(null);
                  setIsLoginModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In (All Portals)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1 space-y-6">
        {/* Hero Notice */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Unified Partner Access</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              One Login. Full Management Access to All Aura Apps.
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Select your business below to access live operations, incoming orders, customer viewings, and fleet dispatch. If you are new, choose register to onboard your business in minutes.
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Success Alert */}
        {regSuccessMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs sm:text-sm font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{regSuccessMessage}</span>
          </div>
        )}

        {/* The 5 Portal Ecosystem Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Available Business Portals</h3>
              <p className="text-xs text-gray-500">Pick any portal to launch management or register a new business</p>
            </div>
            <span className="text-xs font-bold text-gray-500">5 Active Modules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* PORTAL 1: KITCHENS & FOOD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-orange-400 hover:shadow-xs transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    Food & Dining
                  </span>
                </div>

                <h4 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                  Kitchens & Restaurants
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Accept incoming food orders, update cooking status, edit menu dishes, adjust prices, and toggle kitchen availability.
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                  <span>{restaurants.length} Registered Monrovia Kitchens</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleAccessPortal('kitchen')}
                  className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Access Portal</span>
                </button>
                <button
                  onClick={onOpenKitchenRegistration}
                  className="py-2.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl flex items-center justify-center gap-1 border border-orange-200 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Kitchen</span>
                </button>
              </div>
            </div>

            {/* PORTAL 2: RIDES & FLEET */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-sm">
                    <Bike className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Rides & Courier
                  </span>
                </div>

                <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  Aura Rides & Couriers
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Driver app for motorbikes, kekehs, and town taxis. Toggle online shift status, accept trip pings, and track daily fares.
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{drivers.length} Active Verified Couriers</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleAccessPortal('rides')}
                  className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Access Portal</span>
                </button>
                <button
                  onClick={() => setActiveRegisterModal('driver')}
                  className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-1 border border-emerald-200 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register as Driver</span>
                </button>
              </div>
            </div>

            {/* PORTAL 3: SUPERMARKETS & MARTS */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-green-400 hover:shadow-xs transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                    Retail & Groceries
                  </span>
                </div>

                <h4 className="text-base font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Supermarkets & Marts
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Merchant store portal for grocery stores: manage catalog, stock levels, bag packaging, and dispatch couriers.
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span>{supermarkets.length} Supermarket Partners</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleAccessPortal('supermarket')}
                  className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Access Portal</span>
                </button>
                <button
                  onClick={onOpenSupermarketRegistration}
                  className="py-2.5 px-3 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl flex items-center justify-center gap-1 border border-green-200 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Store</span>
                </button>
              </div>
            </div>

            {/* PORTAL 4: REAL ESTATE & RENTALS */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-sky-400 hover:shadow-xs transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Properties
                  </span>
                </div>

                <h4 className="text-base font-bold text-gray-900 group-hover:text-sky-600 transition-colors">
                  Real Estate & Landlords
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Manage apartment rentals, residential home sales, titled land plots, and confirm customer in-person viewing appointments.
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Monrovia Verified Mother Deeds</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleAccessPortal('real-estate')}
                  className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Access Portal</span>
                </button>
                <button
                  onClick={() => setActiveRegisterModal('real-estate')}
                  className="py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-xl flex items-center justify-center gap-1 border border-sky-200 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Agency</span>
                </button>
              </div>
            </div>

            {/* PORTAL 5: MOTORS, RENTALS & SPARES */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm">
                    <Car className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Automotive & Fleet
                  </span>
                </div>

                <h4 className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                  Motors, Rentals & Spares
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Manage car sales inventory, chauffeur 4x4 rental fleet, TVS/Bajaj kekeh spares, tires, and handle customer bookings.
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Car Dealerships & Parts Importers</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleAccessPortal('motors')}
                  className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Access Portal</span>
                </button>
                <button
                  onClick={() => setActiveRegisterModal('motors')}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl flex items-center justify-center gap-1 border border-amber-200 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Dealership</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* UNIFIED LOGIN MODAL (One Login Unlocks All Portals) */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Unified Management Login</h3>
                <p className="text-xs text-gray-500">Sign in once to unlock access to all 5 business portals</p>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-Tap Manager Shortcuts */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                Quick Demo 1-Tap Manager Access:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('restaurant_owner', 'Golden Key Kitchen', { restaurantId: restaurants[0]?.id })}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-left hover:border-orange-500 font-medium"
                >
                  🍲 Kitchen Partner
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('driver', 'Patrick Mulbah', { driverId: drivers[0]?.id })}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-left hover:border-emerald-500 font-medium"
                >
                  🛵 Fleet Courier
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('supermarket_owner', 'Stop & Shop Manager', { supermarketId: supermarkets[0]?.id })}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-left hover:border-green-500 font-medium"
                >
                  🏪 Supermarket Merchant
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('admin', 'Aura Property Broker')}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-left hover:border-sky-500 font-medium"
                >
                  🏢 Real Estate Agency
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('admin', 'Monrovia Motors Dealer')}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-left hover:border-amber-500 font-medium"
                >
                  🚗 Motors & Spares Dealer
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('super_admin', 'Aura Super Admin')}
                  className="p-2 bg-gray-900 text-white rounded-lg text-left font-bold"
                >
                  ⚡ Super Admin (All)
                </button>
              </div>
            </div>

            {/* Or custom Phone / Email sign in */}
            <form onSubmit={handleCustomLoginSubmit} className="space-y-3 text-xs pt-1">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Your Name / Title</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="e.g. Samuel B. Tweh"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number or Email *</label>
                <input
                  type="text"
                  required
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="077... or 088... or partner@gmail.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Password or PIN (Optional)</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900"
                />
              </div>

              {loginError && <p className="text-red-600 text-xs font-semibold">{loginError}</p>}

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors"
              >
                Log In & Unlock All Portals
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DRIVER REGISTRATION MODAL */}
      {activeRegisterModal === 'driver' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Register as an Aura Driver</h3>
                <p className="text-xs text-gray-500">Join Monrovia&apos;s fast dispatch delivery & rides fleet</p>
              </div>
              <button onClick={() => setActiveRegisterModal(null)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDriverRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Joseph Freeman"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number (MoMo / Orange) *</label>
                <input
                  type="tel"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="077... or 088..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={driverVehicle}
                    onChange={(e) => setDriverVehicle(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="motorbike">Motorbike</option>
                    <option value="kekeh">Kekeh (Tricycle)</option>
                    <option value="taxi">Town Taxi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Operating Zone</label>
                  <select
                    value={driverZone}
                    onChange={(e) => setDriverZone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="Sinkor">Sinkor</option>
                    <option value="Central Monrovia">Central Monrovia</option>
                    <option value="Bushrod Island">Bushrod Island</option>
                    <option value="Paynesville">Paynesville</option>
                    <option value="Congo Town">Congo Town</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Plate Number / Registration</label>
                <input
                  type="text"
                  value={driverPlate}
                  onChange={(e) => setDriverPlate(e.target.value)}
                  placeholder="e.g. TP-4321"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReg}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
              >
                {isSubmittingReg ? 'Activating Profile...' : 'Complete Driver Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REAL ESTATE AGENCY REGISTRATION MODAL */}
      {activeRegisterModal === 'real-estate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Register Real Estate Agency</h3>
                <p className="text-xs text-gray-500">List apartments, homes & verified titled land</p>
              </div>
              <button onClick={() => setActiveRegisterModal(null)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRealEstateRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Agency or Landlord Name *</label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Atlantic Coast Real Estate"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={agencyPhone}
                    onChange={(e) => setAgencyPhone(e.target.value)}
                    placeholder="077... or 088..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={agencyWhatsApp}
                    onChange={(e) => setAgencyWhatsApp(e.target.value)}
                    placeholder="+231..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Monrovia Zones Covered</label>
                <input
                  type="text"
                  value={agencyZone}
                  onChange={(e) => setAgencyZone(e.target.value)}
                  placeholder="e.g. Sinkor, Mamba Point, Oldest Congo Town"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Business Registration / Probate Deed ID</label>
                <input
                  type="text"
                  value={agencyLicense}
                  onChange={(e) => setAgencyLicense(e.target.value)}
                  placeholder="e.g. LBR-2023-8877"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReg}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-colors"
              >
                {isSubmittingReg ? 'Verifying...' : 'Register Agency & Open Portal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MOTORS DEALERSHIP REGISTRATION MODAL */}
      {activeRegisterModal === 'motors' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Register Auto Dealership & Spares</h3>
                <p className="text-xs text-gray-500">Sell cars, rent 4x4s, and supply auto & kekeh parts</p>
              </div>
              <button onClick={() => setActiveRegisterModal(null)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMotorsRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Dealership or Shop Name *</label>
                <input
                  type="text"
                  required
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  placeholder="e.g. Sinkor Auto & Kekeh Spares Yard"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={dealerPhone}
                    onChange={(e) => setDealerPhone(e.target.value)}
                    placeholder="077... or 088..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={dealerWhatsApp}
                    onChange={(e) => setDealerWhatsApp(e.target.value)}
                    placeholder="+231..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Primary Business Focus</label>
                <select
                  value={dealerCategory}
                  onChange={(e) => setDealerCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="all">Full Automotive (Sales, Rentals & Spares)</option>
                  <option value="sales">Car Sales (Foreign & Monrovia Used)</option>
                  <option value="rental">Car & 4x4 Rentals</option>
                  <option value="parts">Auto & Kekeh Spare Parts</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Yard / Store Address in Monrovia</label>
                <input
                  type="text"
                  value={dealerAddress}
                  onChange={(e) => setDealerAddress(e.target.value)}
                  placeholder="e.g. Tubman Blvd & 18th St Sinkor"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReg}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors"
              >
                {isSubmittingReg ? 'Verifying...' : 'Register Dealership & Open Portal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
