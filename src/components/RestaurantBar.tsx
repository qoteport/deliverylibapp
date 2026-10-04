import React from 'react';
import { Star, MapPin, Zap, Sparkles, Utensils } from 'lucide-react';
import { Restaurant, MenuItem, MONROVIA_NEIGHBORHOODS } from '../types';

interface RestaurantBarProps {
  restaurants: Restaurant[];
  menuItems?: MenuItem[];
  selectedRestaurantId: string;
  onSelectRestaurant: (id: string) => void;
  selectedNeighborhood: string;
  onSelectNeighborhood: (nh: string) => void;
}

export const RestaurantBar: React.FC<RestaurantBarProps> = ({
  restaurants,
  menuItems = [],
  selectedRestaurantId,
  onSelectRestaurant,
  selectedNeighborhood,
  onSelectNeighborhood,
}) => {
  if (restaurants.length === 0) {
    return null;
  }

  const filteredRestaurants = selectedNeighborhood === 'all'
    ? restaurants
    : restaurants.filter((r) => r.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase()));

  // Helper to extract dish tags for a restaurant
  const getDishTags = (restaurant: Restaurant): string[] => {
    const restaurantDishes = menuItems.filter(
      (m) => m.restaurantId === restaurant.id
    );

    if (restaurantDishes.length > 0) {
      return restaurantDishes.map((d) => d.name.split('&')[0].trim()).slice(0, 2);
    }

    // Fallback: parse cuisine items
    const cuisineTags = restaurant.cuisine
      .split(/[,&·]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !t.toLowerCase().includes('food') && !t.toLowerCase().includes('local'));

    return cuisineTags.length > 0 ? cuisineTags.slice(0, 2) : ['Specialties', 'Grills'];
  };

  return (
    <div className="px-3 sm:px-6 max-w-6xl mx-auto space-y-2.5 pt-1">
      
      {/* Neighborhood Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => onSelectNeighborhood('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
            selectedNeighborhood === 'all'
              ? 'bg-[#111827] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-black'
          }`}
        >
          All Monrovia
        </button>
        {MONROVIA_NEIGHBORHOODS.slice(0, 6).map((nh) => (
          <button
            key={nh}
            onClick={() => onSelectNeighborhood(nh)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
              selectedNeighborhood === nh
                ? 'bg-[#FF4B26] text-white border border-[#FF4B26]'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-black'
            }`}
          >
            {nh.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Modern Restaurant Showcase Carousel */}
      <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1.5">
        
        {/* All Kitchens Chip */}
        <div
          onClick={() => onSelectRestaurant('all')}
          className={`p-3.5 rounded-2xl border cursor-pointer shrink-0 w-44 flex flex-col justify-between transition-all ${
            selectedRestaurantId === 'all'
              ? 'border-[#FF4B26] ring-2 ring-[#FF4B26]/15 bg-white shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300 shadow-xs'
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#FF4B26] bg-orange-50 px-2 py-0.5 rounded-md">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Full Menu</span>
            </div>
            <div className="font-extrabold text-sm text-[#111827] mt-1.5">
              All Monrovia Spots
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-1 leading-snug">
              Browse dishes from every kitchen
            </p>
          </div>
          <div className="text-xs font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span>{restaurants.length} Kitchens</span>
            <span className="text-[#FF4B26]">&rarr;</span>
          </div>
        </div>

        {/* Each Restaurant Card */}
        {filteredRestaurants.map((restaurant) => {
          const isSelected = selectedRestaurantId === restaurant.id;
          const dishTags = getDishTags(restaurant);

          return (
            <div
              key={restaurant.id}
              onClick={() => onSelectRestaurant(restaurant.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer shrink-0 w-60 sm:w-64 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-[#FF4B26] ring-2 ring-[#FF4B26]/15 bg-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm shadow-xs'
              }`}
            >
              <div>
                {/* Status & Rating */}
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 font-extrabold rounded-md">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{restaurant.rating.toFixed(1)}</span>
                  </span>

                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Open
                  </span>
                </div>

                {/* Name */}
                <div className="font-extrabold text-sm text-[#111827] mt-1.5 truncate">
                  {restaurant.name}
                </div>

                {/* Cuisine & Location */}
                <div className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#FF4B26] shrink-0" />
                  <span className="truncate">{restaurant.neighborhood}</span>
                </div>
              </div>

              {/* Menu Item Tags & Delivery ETA (Replaced MoMo/Orange tags with Food Tags) */}
              <div className="pt-2.5 border-t border-gray-100 mt-2.5 flex items-center justify-between gap-1.5 text-[11px]">
                <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                  {dishTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-orange-50 text-[#FF4B26] font-bold text-[10px] rounded-md truncate max-w-[95px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-gray-600 font-semibold text-xs shrink-0">
                  <Zap className="w-3 h-3 text-orange-500" />
                  <span>{restaurant.deliveryTimeMinutes}m</span>
                </div>
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
};
