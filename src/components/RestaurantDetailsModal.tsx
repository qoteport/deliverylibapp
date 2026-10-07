import React, { useState } from 'react';
import { X, Store, Phone, MapPin, Clock, DollarSign, Star, ShieldCheck, Sparkles, Navigation, Copy, Check, Utensils, CheckCircle2, AlertCircle } from 'lucide-react';
import { Restaurant, MenuItem, Currency, USD_TO_LRD_RATE, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';
import { MonroviaDeliveryMap } from './MonroviaDeliveryMap';
import { formatDisplayPhoneNumber } from '../utils/phoneUtils';

interface RestaurantDetailsModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  menuItems?: MenuItem[];
  onSelectDish?: (dish: MenuItem) => void;
  onQuickAddToCart?: (dish: MenuItem) => void;
}

export const RestaurantDetailsModal: React.FC<RestaurantDetailsModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  currency,
  menuItems = [],
  onSelectDish,
  onQuickAddToCart,
}) => {
  if (!isOpen || !restaurant) return null;

  const [copiedMomo, setCopiedMomo] = useState(false);

  const handleCopyMomo = () => {
    const numberToCopy = restaurant.momoNumber || restaurant.phone;
    if (!numberToCopy) return;
    navigator.clipboard.writeText(numberToCopy);
    setCopiedMomo(true);
    setTimeout(() => setCopiedMomo(false), 2000);
  };

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const restaurantCoords =
    restaurant.location ||
    MONROVIA_NEIGHBORHOOD_COORDS[restaurant.neighborhood] ||
    MONROVIA_NEIGHBORHOOD_COORDS['Sinkor (Tubman Blvd)'];

  const restaurantDishes = menuItems.filter(
    (item) => item.restaurantId === restaurant.id || item.provenance === restaurant.name
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end p-0 animate-overlay-fade"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-full h-auto sm:h-full animate-modal-sheet sm:animate-drawer-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div
          className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0 cursor-pointer hover:bg-gray-300 transition-colors"
          onClick={onClose}
        />

        {/* Modal Header Bar */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-md shadow-[#06C167]/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#111827] line-clamp-1">
                  {restaurant.name}
                </h2>
                {restaurant.isVerified && (
                  <span title="Verified Kitchen Partner">
                    <ShieldCheck className="w-4 h-4 text-[#06C167] shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {restaurant.neighborhood} • {restaurant.cuisine}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Tagline & Key Stats Header */}
          <div className="space-y-3">
            {restaurant.tagline && (
              <p className="text-xs sm:text-sm text-gray-600 italic bg-gray-50 p-3 rounded-2xl border border-gray-100 leading-relaxed">
                "{restaurant.tagline}"
              </p>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-[#048747] font-extrabold text-sm">
                  <Star className="w-3.5 h-3.5 fill-[#06C167] text-[#06C167]" />
                  <span>{(restaurant.rating ?? 5.0).toFixed(1)}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                  {restaurant.reviewCount} {restaurant.reviewCount === 1 ? 'review' : 'reviews'}
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-gray-900 font-extrabold text-sm">
                  <Clock className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>~{restaurant.deliveryTimeMinutes}m</span>
                </div>
                <div className="text-[10px] text-gray-500 font-medium mt-0.5">Avg Prep Time</div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-gray-900 font-extrabold text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>{formatPrice(restaurant.deliveryFeeUsd)}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-medium mt-0.5">Delivery Fee</div>
              </div>
            </div>
          </div>

          {/* Quick Contact & Calling Buttons */}
          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
            <div className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#06C167]" />
                <span>Contact &amp; Payment Details</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  restaurant.isOpen !== false
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {restaurant.isOpen !== false ? '● Open Now' : '○ Closed'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Call Button */}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="p-3 bg-white hover:bg-emerald-50 text-gray-900 border border-gray-200 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-colors shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] text-[#048747] flex items-center justify-center group-hover:bg-[#06C167] group-hover:text-white transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Call Kitchen</div>
                      <div className="text-xs font-mono font-bold text-gray-900">
                        {formatDisplayPhoneNumber(restaurant.phone)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#06C167] group-hover:underline">
                    Call &rarr;
                  </span>
                </a>
              )}

              {/* MoMo Number Copy */}
              <button
                type="button"
                onClick={handleCopyMomo}
                className="p-3 bg-white hover:bg-emerald-50 text-left border border-gray-200 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-colors shadow-2xs group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] text-[#048747] flex items-center justify-center group-hover:bg-[#06C167] group-hover:text-white transition-colors">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">
                      MoMo Payout ({restaurant.momoProvider?.toUpperCase() || 'MTN / ORANGE'})
                    </div>
                    <div className="text-xs font-mono font-bold text-gray-900">
                      {formatDisplayPhoneNumber(restaurant.momoNumber || restaurant.phone)}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-bold flex items-center gap-1 text-gray-500 group-hover:text-[#06C167]">
                  {copiedMomo ? (
                    <>
                      <Check className="w-3 h-3 text-[#06C167] stroke-[3]" />
                      <span className="text-[#06C167]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Location Details & Interactive Map Pin */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#06C167]" />
                <span>Physical Location &amp; Coordinates</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400">
                {restaurantCoords.lat.toFixed(4)}, {restaurantCoords.lng.toFixed(4)}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-700 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#06C167] shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900 block font-bold">{restaurant.address}</strong>
                <span className="text-gray-500 text-[11px]">{restaurant.neighborhood}, Monrovia, Liberia</span>
              </div>
            </div>

            {/* Embedded Monrovia Delivery Map with Restaurant Pin */}
            <div className="h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-2xs relative">
              <MonroviaDeliveryMap
                restaurantLocation={restaurantCoords}
                customerLocation={restaurantCoords}
                restaurantName={restaurant.name}
                className="w-full h-full"
              />
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                <Store className="w-3 h-3 text-[#06C167]" />
                <span>{restaurant.name} Pinpoint</span>
              </div>
            </div>
          </div>

          {/* Popular Menu Dishes from this Restaurant */}
          {restaurantDishes.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Menu from this Kitchen ({restaurantDishes.length})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {restaurantDishes.map((dish) => {
                  const img = dish.image || dish.images?.[0];
                  return (
                    <div
                      key={dish.id}
                      onClick={() => {
                        if (onSelectDish) {
                          onClose();
                          onSelectDish(dish);
                        }
                      }}
                      className="p-2.5 rounded-2xl border border-gray-100 bg-white hover:border-[#06C167] hover:shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                    >
                      {img ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          <img src={img} alt={dish.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#048747] flex items-center justify-center shrink-0">
                          <Utensils className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-extrabold text-[#111827] truncate group-hover:text-[#06C167] transition-colors">
                          {dish.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-bold text-gray-900">
                            {formatPrice(dish.price)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            ~{dish.prepTimeMinutes}m
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Close Action */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-md"
          >
            Close Restaurant Details
          </button>
        </div>
      </div>
    </div>
  );
};
