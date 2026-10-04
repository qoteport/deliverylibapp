import React from 'react';
import { Bike, ShoppingBag, UtensilsCrossed, Search, Flame, ArrowRight, Zap, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { DiningMode, Currency, USD_TO_LRD_RATE, MenuItem } from '../types';

interface HeroProps {
  diningMode: DiningMode;
  onSelectDiningMode: (mode: DiningMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedNeighborhood: string;
  onSelectNeighborhood: (nh: string) => void;
  currency: Currency;
  featuredDish?: MenuItem | null;
  onQuickViewSpecial: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  diningMode,
  onSelectDiningMode,
  searchQuery,
  onSearchChange,
  currency,
  featuredDish,
  onQuickViewSpecial,
}) => {
  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const quickSearchTags = ['Jollof Rice', 'Pepper Soup', 'Grilled Suya', 'Fried Fish', 'Kala', 'Pasta'];

  return (
    <section className="pt-1 pb-1 px-4 sm:px-8 lg:px-10 max-w-5xl mx-auto space-y-3">
      
      {/* Search Bar & Dining Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF4B26] absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search dishes, restaurants, Monrovia specials..."
            className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#FF4B26] focus:ring-4 focus:ring-[#FF4B26]/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all min-h-[44px] sm:min-h-[48px]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dining Mode Segmented Switcher */}
        <div className="flex items-center justify-center p-1 bg-white border border-gray-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] shrink-0">
          <button
            type="button"
            onClick={() => onSelectDiningMode('delivery')}
            className={`flex items-center gap-1.5 py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl font-bold text-xs transition-all ${
              diningMode === 'delivery'
                ? 'bg-gradient-to-r from-[#FF4B26] to-[#FF6B00] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#111827]'
            }`}
          >
            <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDiningMode('pickup')}
            className={`flex items-center gap-1.5 py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl font-bold text-xs transition-all ${
              diningMode === 'pickup'
                ? 'bg-gradient-to-r from-[#FF4B26] to-[#FF6B00] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#111827]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Pickup</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDiningMode('dine-in')}
            className={`flex items-center gap-1.5 py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl font-bold text-xs transition-all ${
              diningMode === 'dine-in'
                ? 'bg-gradient-to-r from-[#FF4B26] to-[#FF6B00] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#111827]'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Dine-In</span>
          </button>
        </div>

      </div>

      {/* Quick Search Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-0.5">
          Trending:
        </span>
        {quickSearchTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onSearchChange(tag)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              searchQuery === tag
                ? 'bg-[#FF4B26] border-[#FF4B26] text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-[#111827]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Hero Promotional / Welcome Banner */}
      {featuredDish ? (
        <div 
          onClick={onQuickViewSpecial}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white p-4 sm:p-6 shadow-lg shadow-[#FF4B26]/15 cursor-pointer active:scale-[0.99] transition-all group"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            <div className="space-y-1 sm:space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wide">
                <Flame className="w-3 h-3 fill-white" />
                <span>Chef Special</span>
              </div>

              <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                {featuredDish.name}
              </h2>

              <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                {featuredDish.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-semibold text-white/95">
                <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-md">
                  <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                  {featuredDish.prepTimeMinutes}m prep
                </span>
                <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  MTN MoMo &amp; Orange Money
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/20">
              <div className="text-left sm:text-right">
                <div className="text-[11px] text-white/80 font-medium">Price</div>
                <div className="font-mono text-xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                  {formatPrice(featuredDish.price)}
                </div>
              </div>

              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-[#FF4722] hover:bg-orange-50 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md group-hover:shadow-lg"
              >
                <span>Order Now</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white p-5 sm:p-6 shadow-lg shadow-[#FF4B26]/15">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Monrovia Food Network</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                Authentic Monrovia Kitchens &amp; Fast Courier Delivery
              </h2>

              <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                Order directly from your favorite local kitchens in Sinkor, Mamba Point, Congotown, and Paynesville.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-white/95">
                <span className="flex items-center gap-1 bg-white/15 px-2.5 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Lonestar MTN MoMo &amp; Orange Money
                </span>
                <span className="flex items-center gap-1 bg-white/15 px-2.5 py-0.5 rounded-md">
                  <Bike className="w-3 h-3 text-yellow-300" />
                  Live GPS Rider Tracking
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
