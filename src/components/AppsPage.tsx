import React from 'react';
import { 
  ArrowLeft, 
  Bike, 
  ShoppingBag, 
  Utensils, 
  LayoutGrid,
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Car,
  Package,
  Pill,
  Store,
  Building2,
  Key,
  Wrench,
  Shirt,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Currency } from '../types';

interface AppsPageProps {
  onBackToStorefront: () => void;
  onOpenRides: () => void;
  onOpenSupermarket: () => void;
  onOpenRealEstate?: () => void;
  onOpenLifestyle?: () => void;
  onOpenMotors?: () => void;
  onOpenPortal?: () => void;
  onOpenSupermarketOnboarding: () => void;
  onOpenKitchenOnboarding: () => void;
  onOpenLogin: () => void;
  currency: Currency;
  onToggleCurrency: () => void;
}

export const AppsPage: React.FC<AppsPageProps> = ({
  onBackToStorefront,
  onOpenRides,
  onOpenSupermarket,
  onOpenRealEstate,
  onOpenLifestyle,
  onOpenMotors,
  onOpenPortal,
  onOpenSupermarketOnboarding,
  onOpenKitchenOnboarding,
  onOpenLogin,
  currency,
  onToggleCurrency,
}) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#06C167]/20 selection:text-[#06C167]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-3 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBackToStorefront}
            className="px-2.5 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
            title="Back to Food Storefront"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Food Storefront</span>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-[#06C167] to-emerald-400 text-white flex items-center justify-center shadow-md shadow-[#06C167]/20 shrink-0">
              <LayoutGrid className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-xs sm:text-base text-gray-900 tracking-tight truncate">Aura Apps Hub</h1>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-[#06C167] border border-emerald-200 shrink-0">
                  Monrovia Ecosystem
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden lg:block truncate">Seamless on-demand services: Rides, Supermarkets & Dining</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Dual Currency Pill */}
          <button
            onClick={onToggleCurrency}
            className="px-2.5 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-xl transition flex items-center gap-0.5 sm:gap-1 cursor-pointer shrink-0"
            title="Toggle USD / Liberian Dollars"
          >
            <span className={currency === 'USD' ? 'text-[#06C167]' : 'text-gray-400'}>USD</span>
            <span className="text-gray-300">/</span>
            <span className={currency === 'LRD' ? 'text-[#06C167]' : 'text-gray-400'}>LRD</span>
          </button>

          {onOpenPortal && (
            <button
              onClick={onOpenPortal}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#06C167] border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Aura Business & Management Center"
            >
              <Store className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Merchant Portal</span>
            </button>
          )}

          <button
            onClick={onOpenLogin}
            className="px-2.5 sm:px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            title="Sign In / Staff"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sign In / Staff</span>
          </button>
        </div>
      </header>

      {/* Main Apps Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8 pb-24">
        
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 sm:p-10 shadow-xl border border-white/10">
          <div className="relative z-10 max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-emerald-400">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Service Monrovia Super-App</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Everyday Services Built for Monrovia
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
              Hail quick motorbikes and kekehs, order fresh groceries from Monrovia&apos;s leading supermarkets, or explore authentic local kitchens.
            </p>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-[#06C167]/15 blur-3xl pointer-events-none" />
        </div>

        {/* Primary Apps Grid (Open in page!) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-900">Featured Apps</h3>
              <p className="text-xs text-gray-500">Tap any application to launch full-screen</p>
            </div>
            <span className="text-xs font-bold text-[#06C167]">5 Live Apps • Super-App</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* APP 1: AURA RIDES */}
            <div 
              onClick={onOpenRides}
              className="group relative overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-6 hover:border-emerald-500 hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#06C167] to-teal-500 text-white flex items-center justify-center shadow-lg shadow-[#06C167]/25 group-hover:scale-105 transition-transform">
                    <Bike className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#06C167] text-white shadow-xs">
                      Live App
                    </span>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-[#06C167] group-hover:text-white text-[#06C167] flex items-center justify-center transition-all">
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <h4 className="text-xl font-black text-gray-900 group-hover:text-[#06C167] transition-colors">
                  Aura Rides
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  On-demand motorbikes, kekehs (tricycles) and town taxis. Enter your Monrovia pickup spot and destination, match with available riders, and call or ping to alert.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-100/80 text-[11px] text-gray-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#06C167]" />
                    <span>Sinkor, Broad St, Paynesville</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#06C167]" />
                    <span>3-5 min average arrival</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between text-xs font-bold text-[#06C167]">
                <span>Launch Aura Rides</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* APP 2: AURA SHOPPING */}
            <div 
              onClick={onOpenSupermarket}
              className="group relative overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-6 hover:border-emerald-500 hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#059669] to-[#10B981] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                      Ecommerce
                    </span>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center transition-all">
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <h4 className="text-xl font-black text-gray-900 group-hover:text-[#059669] transition-colors">
                  AURA Shopping
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Browse and shop everyday pantry essentials, rice, drinks, snacks and household goods from Stop &amp; Shop, Boulevard Supermarket, Monoprix and Abi Jaoudi.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-100/80 text-[11px] text-gray-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Top Monrovia Marts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Dedicated grocery basket &amp; checkout</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Launch Shopping</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* APP 3: AURA REAL ESTATE */}
            <div 
              onClick={onOpenRealEstate}
              className="group relative overflow-hidden rounded-3xl border-2 border-sky-500/30 bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30 p-6 hover:border-sky-500 hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform">
                    <Building2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-600 text-white shadow-xs">
                      Properties
                    </span>
                    <div className="w-8 h-8 rounded-full bg-sky-100 group-hover:bg-sky-600 group-hover:text-white text-sky-600 flex items-center justify-center transition-all">
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <h4 className="text-xl font-black text-gray-900 group-hover:text-sky-600 transition-colors">
                  Aura Real Estate
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Rent luxury apartments, purchase residential homes & titled land in Mamba Point, Sinkor, Congo Town, Paynesville, and ELWA.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-sky-100/80 text-[11px] text-gray-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Rentals & Purchases</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    <span>Verified Mother Deeds</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between text-xs font-bold text-sky-700">
                <span>Launch Real Estate</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* APP 4: AURA LIFESTYLE & TECH */}
            <div 
              onClick={onOpenLifestyle}
              className="group relative overflow-hidden rounded-3xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 p-6 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs">
                      Tech & Fashion
                    </span>
                    <div className="w-8 h-8 rounded-full bg-purple-100 group-hover:bg-purple-600 group-hover:text-white text-purple-600 flex items-center justify-center transition-all">
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <h4 className="text-xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">
                  Aura Lifestyle & Tech
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Smartphones, laptops, solar power backup units, authentic handwoven Liberian country cloth gowns, and sneakers delivered to your gate.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-purple-100/80 text-[11px] text-gray-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-purple-600" />
                    <span>Electronics & Apparel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Monrovia Delivery</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between text-xs font-bold text-purple-700">
                <span>Launch Lifestyle</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* APP 5: AURA MOTORS & RENTALS */}
            <div 
              onClick={onOpenMotors}
              className="group relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-6 hover:border-amber-500 hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                    <Car className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-600 text-white shadow-xs">
                      Motors
                    </span>
                    <div className="w-8 h-8 rounded-full bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-600 flex items-center justify-center transition-all">
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <h4 className="text-xl font-black text-gray-900 group-hover:text-amber-600 transition-colors">
                  Aura Motors & Rentals
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Buy foreign & Monrovia-used cars, rent chauffeur-driven 4x4 Land Cruisers, or order genuine auto & kekeh spare parts.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-amber-100/80 text-[11px] text-gray-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Car Sales & Rentals</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto & Kekeh Spares</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Launch Motors</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        </div>



        {/* Coming Soon Services */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 px-1">
            More Services In Development
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Aura Pharmacy</h4>
                  <p className="text-[11px] text-gray-500">Prescription drops & essential health supplies</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Coming Soon
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Express Parcel Courier</h4>
                  <p className="text-[11px] text-gray-500">Same-hour package deliveries across Monrovia</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Coming Soon
              </span>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};
