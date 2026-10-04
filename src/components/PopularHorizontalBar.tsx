import React from 'react';
import { Flame, Plus } from 'lucide-react';
import { MenuItem, Currency, USD_TO_LRD_RATE } from '../types';
import { DishIllustration } from './DishIllustration';

interface PopularHorizontalBarProps {
  menuItems: MenuItem[];
  onOpenDishModal: (dish: MenuItem) => void;
  currency: Currency;
}

export const PopularHorizontalBar: React.FC<PopularHorizontalBarProps> = ({
  menuItems,
  onOpenDishModal,
  currency,
}) => {
  // Select popular / chef special dishes
  const popularDishes = menuItems.filter(
    (d) => d.isChefSpecial || d.calories > 400 || d.dietary.includes('Spicy')
  ).slice(0, 10);
  const displayDishes = popularDishes.length >= 4 ? popularDishes : menuItems.slice(0, 8);

  if (displayDishes.length === 0) {
    return null;
  }

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  return (
    <section className="pt-3 pb-2 px-3 sm:px-6 max-w-6xl mx-auto space-y-2.5">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] flex items-center justify-center text-white shadow-xs">
            <Flame className="w-3.5 h-3.5 fill-white" />
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#111827] tracking-tight">
            Popular Right Now
          </h2>
        </div>
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Tap to Order
        </span>
      </div>

      {/* Horizontal Scrolling Food Cards (Wider Cards + High-Prominence Images + No Prep Time) */}
      <div className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {displayDishes.map((dish) => {
          const primaryImage = dish.image || (dish.images && dish.images[0]);

          return (
            <div
              key={dish.id}
              onClick={() => onOpenDishModal(dish)}
              className="group cursor-pointer shrink-0 w-60 sm:w-68 md:w-72 rounded-3xl bg-white border border-gray-100/90 shadow-[0_3px_14px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-[#FF4B26]/30 transition-all duration-200 overflow-hidden flex flex-col active:scale-[0.98]"
            >
              {/* Prominent Food Image Area */}
              <div className="relative aspect-[16/11] w-full bg-gradient-to-br from-[#1E1A17] via-[#2E241E] to-[#151210] overflow-hidden">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <DishIllustration
                    type={dish.illustrationType}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Floating Dual Price Pill */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md text-white text-xs font-mono font-black shadow-md border border-white/10">
                  {formatPrice(dish.price)}
                </div>

                {/* Floating Quick Action Button */}
                <div className="absolute bottom-3 right-3 w-9 h-9 rounded-2xl bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* Food Name (Clean & Prominent) */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-[#111827] group-hover:text-[#FF4B26] transition-colors line-clamp-1 leading-snug">
                  {dish.name}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span className="text-[11px] font-semibold text-gray-400 truncate max-w-[150px]">
                    {dish.provenance || 'Monrovia Specialty'}
                  </span>
                  <span className="text-[11px] text-[#FF4B26] font-bold flex items-center gap-0.5">
                    Order &rarr;
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
};
