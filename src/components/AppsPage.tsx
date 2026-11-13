import React from 'react';
import { 
  ArrowLeft, 
  Bike, 
  ShoppingBag, 
  Utensils, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Car,
  Package,
  Pill,
  Store,
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
  onOpenSupermarketOnboarding,
  onOpenKitchenOnboarding,
  onOpenLogin,
  currency,
  onToggleCurrency,
}) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#06C167]/20 selection:text-[#06C167]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStorefront}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Food Storefront</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#06C167] to-emerald-400 text-white flex items-center justify-center shadow-md shadow-[#06C167]/20">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">Aura Apps Hub</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-[#06C167] border border-emerald-200">
                  Monrovia Ecosystem
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block">Seamless on-demand services: Rides, Supermarkets & Dining</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dual Currency Pill */}
          <button
            onClick={onToggleCurrency}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-xl transition flex items-center gap-1 cursor-pointer"
            title="Toggle USD / Liberian Dollars"
          >
            <span className={currency === 'USD' ? 'text-[#06C167]' : 'text-gray-400'}>USD</span>
            <span className="text-gray-300">/</span>
            <span className={currency === 'LRD' ? 'text-[#06C167]' : 'text-gray-400'}>LRD</span>
          </button>

          <button
            onClick={onOpenLogin}
            className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Sign In / Staff</span>
          </button>
        </div>
      </header>

      {/* Main Apps Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8 pb-24">
        
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 sm:p-10 shadow-xl border border-white/10">
          <div className="relative z-10 max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
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
            <span className="text-xs font-bold text-[#06C167]">2 Live &bull; 1 Main</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
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
