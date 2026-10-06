import React, { useState, useMemo } from 'react';
import { Heart, Plus, Sparkles, Filter, Flame, Clock, Zap, Store, MapPin } from 'lucide-react';
import { MenuItem, Restaurant, Category, Currency, USD_TO_LRD_RATE } from '../types';
import { CATEGORIES } from '../data/monroviaData';
import { DishIllustration } from './DishIllustration';

interface MenuSectionProps {
  menuItems: MenuItem[];
  restaurants?: Restaurant[];
  onOpenDishModal: (dish: MenuItem) => void;
  onQuickAddToCart: (dish: MenuItem) => void;
  favoriteIds: string[];
  onToggleFavorite: (dishId: string) => void;
  searchQuery: string;
  currency: Currency;
  selectedRestaurantId: string;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  menuItems,
  restaurants = [],
  onOpenDishModal,
  onQuickAddToCart,
  favoriteIds,
  onToggleFavorite,
  searchQuery,
  currency,
  selectedRestaurantId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all');

  // Filtered dishes
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Restaurant filter
      if (selectedRestaurantId !== 'all' && item.restaurantId && item.restaurantId !== selectedRestaurantId) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Dietary / Spicy filter
      if (dietaryFilter === 'spicy' && !item.dietary.includes('Spicy')) {
        return false;
      }
      if (dietaryFilter === 'vegetarian' && !item.dietary.includes('Vegetarian')) {
        return false;
      }
      if (dietaryFilter === 'gluten-free' && !item.dietary.includes('Gluten-Free')) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSubname = item.subname?.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesIngredients = item.ingredients?.some((i) => i.toLowerCase().includes(query));
        return matchesName || matchesSubname || matchesDesc || matchesIngredients;
      }

      return true;
    });
  }, [menuItems, selectedRestaurantId, selectedCategory, dietaryFilter, searchQuery]);

  const formatPrice = (priceUsd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(priceUsd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${priceUsd.toFixed(2)}`;
  };

  const getSecondaryPrice = (priceUsd: number) => {
    if (currency === 'USD') {
      return `L$${Math.round(priceUsd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${priceUsd.toFixed(2)}`;
  };

  return (
    <section id="menu-section" className="pt-2 pb-28 px-4 sm:px-8 lg:px-10 max-w-5xl mx-auto scroll-mt-20">
      
      {/* Category Horizontal Scrolling Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Dishes ({menuItems.length})
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r from-[#06C167] to-[#048747] text-white shadow-md shadow-[#06C167]/20'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}

        <div className="h-6 w-px bg-gray-200 shrink-0 mx-1" />

        <button
          onClick={() => setDietaryFilter(dietaryFilter === 'spicy' ? 'all' : 'spicy')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-xs ${
            dietaryFilter === 'spicy'
              ? 'bg-[#EF4444] text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-[#EF4444]" />
          <span>Spicy Pepper</span>
        </button>

        <button
          onClick={() => setDietaryFilter(dietaryFilter === 'vegetarian' ? 'all' : 'vegetarian')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-xs ${
            dietaryFilter === 'vegetarian'
              ? 'bg-[#06C167] text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <span>🥗 Vegetarian</span>
        </button>
      </div>

      {/* Modern Food Cards Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map((dish) => {
          const isFav = favoriteIds.includes(dish.id);
          const primaryImage = dish.image || (dish.images && dish.images[0]);
          const dishRestaurant = restaurants.find((r) => r.id === dish.restaurantId);

          return (
            <div
              key={dish.id}
              onClick={() => onOpenDishModal(dish)}
              className="group bg-white rounded-3xl border border-gray-100/90 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-gray-200/90 transition-all duration-200 cursor-pointer flex flex-col active:scale-[0.99]"
            >
              {/* Vibrant Dish Illustration or Uploaded Image Area */}
              <div className="relative aspect-[16/10] w-full bg-gray-100 overflow-hidden">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <DishIllustration type={dish.illustrationType} className="group-hover:scale-105 transition-transform duration-300" />
                )}
                
                {/* Heart Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(dish.id);
                  }}
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur-md text-gray-600 hover:bg-white hover:text-[#06C167] transition-all shadow-md min-h-[38px] min-w-[38px] flex items-center justify-center z-10"
                  aria-label="Save dish"
                >
                  <Heart
                    className={`w-4 h-4 transition-transform active:scale-125 ${
                      isFav ? 'fill-[#06C167] text-[#06C167]' : 'text-gray-600'
                    }`}
                  />
                </button>

                {/* Spice Badge */}
                {dish.spiceLevel && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wide rounded-lg flex items-center gap-1">
                    <Flame className="w-3 h-3 text-[#FF5A36] fill-[#FF5A36]" />
                    <span>{dish.spiceLevel}</span>
                  </div>
                )}

                {/* Floating Quick Add Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAddToCart(dish);
                  }}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-2xl bg-white hover:bg-[#06C167] text-[#111827] hover:text-white shadow-lg flex items-center justify-center transition-all duration-150 active:scale-90 group-hover:bg-[#06C167] group-hover:text-white"
                  title="Quick add to bag"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Food Info Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-[#111827] group-hover:text-[#06C167] transition-colors line-clamp-1">
                      {dish.name}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed font-normal">
                    {dish.description}
                  </p>
                </div>

                {/* Price & Prep Info Row */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-lg font-black text-[#111827] tabular-nums tracking-tight">
                      {formatPrice(dish.price)}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      ~{getSecondaryPrice(dish.price)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-xl font-bold">
                    <Clock className="w-3.5 h-3.5 text-[#06C167]" />
                    <span>Ready in ~{dish.prepTimeMinutes} mins</span>
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-100 mt-4 p-8 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-[#E8F8EE] text-[#06C167] flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <h4 className="font-extrabold text-lg text-[#111827]">
            {menuItems.length === 0 ? 'Ready for Real Monrovia Kitchens & Menus' : 'No dishes match your filter'}
          </h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            {menuItems.length === 0
              ? 'The demo kitchen data has been cleared. Onboard your restaurant or log into the Kitchen Portal to add real Monrovia dishes, prices, and food photos.'
              : 'Try adjusting your search or category filter to discover tasty Monrovia meals.'}
          </p>
          {menuItems.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setDietaryFilter('all');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-[#06C167] to-[#048747] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#06C167]/20 cursor-pointer active:scale-95"
              >
                Show All Dishes
              </button>
            </div>
          )}
        </div>
      )}

    </section>
  );
};
