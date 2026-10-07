import React, { useState } from 'react';
import { X, Plus, Minus, Check, Flame, Clock, Store, ShieldCheck, ChevronRight } from 'lucide-react';
import { MenuItem, SelectedAddon, CartItem, Currency, USD_TO_LRD_RATE, AddonOption, Restaurant } from '../types';
import { DishIllustration } from './DishIllustration';
import { RestaurantDetailsModal } from './RestaurantDetailsModal';

interface DishModalProps {
  dish: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, 'cartItemId' | 'itemTotal'>) => void;
  currency: Currency;
  restaurants?: Restaurant[];
  restaurantName?: string;
  allMenuItems?: MenuItem[];
}

const SPICE_PRESET_META: Record<string, { label: string; badge: string }> = {
  'No Pepper': { label: 'No Pepper', badge: '🥗 Zero Spice' },
  'Mild': { label: 'Mild (Low Pepper)', badge: '🌶️ Gentle' },
  'Medium': { label: 'Medium (Balanced Pepper)', badge: '🌶️🌶️ Classic' },
  'Monrovia Hot': { label: 'Monrovia Hot (Local Style)', badge: '🔥 Local Fire' },
  'Extreme Pepper': { label: 'Extreme Pepper (Extra Fire)', badge: '💥 Extra Fire' },
};

export const DishModal: React.FC<DishModalProps> = ({
  dish,
  onClose,
  onAddToCart,
  currency,
  restaurants = [],
  restaurantName,
  allMenuItems = [],
}) => {
  if (!dish) return null;

  // Resolve allowed spice levels for this dish configured by the restaurant
  const configuredSpiceLevels: string[] = (dish.availableSpiceLevels && Array.isArray(dish.availableSpiceLevels) && dish.availableSpiceLevels.length > 0)
    ? dish.availableSpiceLevels
    : (dish.spiceLevel ? [dish.spiceLevel] : []);

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [selectedTemperature, setSelectedTemperature] = useState<string>(
    dish.cookingTemperatures ? dish.cookingTemperatures[1] || dish.cookingTemperatures[0] : ''
  );
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<string>(() => {
    if (configuredSpiceLevels.length > 0) {
      if (dish.spiceLevel && configuredSpiceLevels.includes(dish.spiceLevel)) {
        return dish.spiceLevel;
      }
      return configuredSpiceLevels[0];
    }
    return '';
  });
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [isRestaurantDetailsOpen, setIsRestaurantDetailsOpen] = useState(false);

  const targetRestaurant = restaurants.find(
    (r) => r.id === dish.restaurantId || (r.name && dish.provenance && r.name.toLowerCase() === dish.provenance.toLowerCase())
  );
  const resolvedRestaurantName = restaurantName || targetRestaurant?.name || dish.provenance || '';

  // Only use authentic add-ons / extras configured by the kitchen (never dummy defaults)
  const availableAddonsList: AddonOption[] = (dish.availableAddons && Array.isArray(dish.availableAddons))
    ? dish.availableAddons
    : [];

  const allImages = dish.images && dish.images.length > 0
    ? dish.images
    : dish.image
    ? [dish.image]
    : [];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 35;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next image
      setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Previous image
      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const toggleAddon = (addonId: string, addonName: string, price: number) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addonId);
      if (exists) {
        return prev.filter((a) => a.id !== addonId);
      } else {
        return [...prev, { id: addonId, name: addonName, price }];
      }
    });
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const itemTotalUsd = (dish.price + addonsTotal) * quantity;

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const handleConfirm = () => {
    onAddToCart({
      menuItem: dish,
      quantity,
      selectedAddons,
      selectedTemperature: selectedTemperature || undefined,
      selectedSpiceLevel: selectedSpiceLevel || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    });
    onClose();
  };

  const [sheetDragY, setSheetDragY] = useState<number>(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState<boolean>(false);
  const [sheetTouchStartY, setSheetTouchStartY] = useState<number | null>(null);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    setSheetTouchStartY(e.touches[0].clientY);
    setIsDraggingSheet(true);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (sheetTouchStartY === null) return;
    const deltaY = e.touches[0].clientY - sheetTouchStartY;
    if (deltaY > 0) {
      setSheetDragY(deltaY);
    }
  };

  const handleSheetTouchEnd = () => {
    setIsDraggingSheet(false);
    if (sheetDragY > 85) {
      onClose();
    }
    setSheetDragY(0);
    setSheetTouchStartY(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end p-0 animate-overlay-fade" onClick={onClose}>
      <div 
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-full h-auto sm:h-full animate-modal-sheet sm:animate-drawer-right touch-pan-y"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: sheetDragY > 0 ? `translateY(${sheetDragY}px)` : undefined,
          transition: isDraggingSheet ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Visual Top Image Gallery / Illustration */}
        <div className="relative w-full h-72 sm:h-80 bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
          
          {/* Mobile top pull-down notch handle (Interactive touch area) */}
          <div 
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            className="absolute top-0 inset-x-0 h-10 flex items-center justify-center z-30 sm:hidden cursor-grab active:cursor-grabbing"
            title="Pull down to close"
          >
            <div className="w-14 h-1.5 bg-white/90 shadow-md rounded-full ring-1 ring-black/10 transition-transform active:scale-95" />
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/95 hover:bg-white text-gray-800 border border-gray-200/90 min-h-[38px] min-w-[38px] flex items-center justify-center transition-all shadow-md absolute top-3.5 right-3.5 z-30 cursor-pointer active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {allImages.length > 0 ? (
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-full h-full flex items-center justify-center overflow-hidden touch-pan-y select-none bg-gray-100"
            >
              {/* Centered High-Def Food Image with smooth animated transition */}
              <img
                key={activeImageIndex}
                src={allImages[activeImageIndex] || allImages[0]}
                alt={dish.name}
                className="w-full h-full object-cover object-center pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                loading="eager"
                draggable={false}
              />

              {/* Swipe Dots Indicator */}
              {allImages.length > 1 && (
                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full z-20 shadow-md">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(i);
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === activeImageIndex ? 'bg-white w-5' : 'bg-white/50 w-1.5 hover:bg-white/80'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4">
              <DishIllustration type={dish.illustrationType} className="w-full h-full" />
            </div>
          )}
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {allImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-2 px-2 -mx-2 no-scrollbar scroll-smooth">
              {allImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    idx === 0 ? 'ml-1' : ''
                  } ${
                    idx === activeImageIndex
                      ? 'border-[#06C167] ring-2 ring-[#06C167]/40 scale-105 shadow-sm'
                      : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                {dish.name}
              </h2>
              <div className="font-mono text-xl font-black text-[#111827] tabular-nums shrink-0">
                {formatPrice(dish.price)}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
              {dish.description}
            </p>

            {/* Ready in Time and Restaurant Name Badge */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-2.5 font-medium">
              <span className="flex items-center gap-1 bg-[#E8F8EE] text-[#048747] font-bold px-2.5 py-1 rounded-lg border border-[#A7F3D0]">
                <Clock className="w-3.5 h-3.5" />
                Ready in ~{dish.prepTimeMinutes} mins
              </span>
              {resolvedRestaurantName && (
                <span className="flex items-center gap-1.5 bg-gray-100 text-gray-800 font-extrabold px-2.5 py-1 rounded-lg border border-gray-200">
                  <Store className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>{resolvedRestaurantName}</span>
                </span>
              )}
            </div>
          </div>

          {/* SPICE PREFERENCE SECTION */}
          {configuredSpiceLevels.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Spice Preference</span>
                </label>
                <span className="text-[11px] font-bold text-[#06C167]">
                  {selectedSpiceLevel}
                </span>
              </div>

              {/* Custom Segmented Buttons for Spice */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {configuredSpiceLevels.map((spice) => {
                  const isSelected = selectedSpiceLevel === spice;
                  const meta = SPICE_PRESET_META[spice] || { label: spice, badge: '🌶️ Pepper' };

                  return (
                    <button
                      key={spice}
                      type="button"
                      onClick={() => setSelectedSpiceLevel(spice)}
                      className={`py-2 px-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747] shadow-xs ring-1 ring-[#06C167]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-gray-400">{meta.badge}</span>
                      <span className="text-xs font-extrabold mt-0.5 truncate">{spice}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TEMPERATURE SELECTION (FOR MEATS / STEAKS) */}
          {dish.cookingTemperatures && dish.cookingTemperatures.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Cooking Temperature
                </label>
                <span className="text-[11px] font-bold text-[#06C167]">
                  {selectedTemperature}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {dish.cookingTemperatures.map((temp) => {
                  const isSelected = selectedTemperature === temp;
                  return (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => setSelectedTemperature(temp)}
                      className={`py-2 px-2.5 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747] font-bold shadow-xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 text-xs'
                      }`}
                    >
                      <span className="text-xs">{temp}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MONROVIA SIDES & ADD-ONS (Only displayed if menu item actually has add-ons configured) */}
          {availableAddonsList.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Sides &amp; Extras
                </label>
                <span className="text-[11px] text-gray-400 font-medium">Optional</span>
              </div>

              <div className="space-y-2">
                {availableAddonsList.map((addon) => {
                  const isSelected = selectedAddons.some((a) => a.id === addon.id);

                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id, addon.name, addon.price)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#06C167] bg-[#E8F8EE]/60 text-gray-900 shadow-xs'
                          : 'border-gray-100 bg-gray-50/70 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-[#06C167] border-[#06C167] text-white'
                              : 'border-gray-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">{addon.name}</div>
                          {addon.description && (
                            <div className="text-[11px] text-gray-400">{addon.description}</div>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-gray-900 tabular-nums">
                        +{formatPrice(addon.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SPECIAL INSTRUCTIONS */}
          <div className="space-y-1.5 pt-3 border-t border-gray-100">
            <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
              Special Instructions
            </label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Extra pepper gravy, no onions, pack soup separately..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#06C167]"
            />
          </div>

          {/* RESTAURANT NAME & DETAILS POPUP CARD (AFTER SPECIAL INSTRUCTIONS) */}
          {targetRestaurant ? (
            <div className="pt-3 border-t border-gray-100 space-y-1.5">
              <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                Restaurant
              </label>
              <button
                type="button"
                onClick={() => setIsRestaurantDetailsOpen(true)}
                className="w-full p-3.5 bg-gradient-to-r from-emerald-50/70 via-gray-50 to-emerald-50/40 hover:from-emerald-100/70 hover:to-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 text-[#048747] flex items-center justify-center group-hover:bg-[#06C167] group-hover:text-white transition-colors shadow-2xs shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#111827] flex items-center gap-1.5 truncate">
                      <span className="truncate">{targetRestaurant.name}</span>
                      {targetRestaurant.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#06C167] shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="truncate">{targetRestaurant.neighborhood}</span>
                      <span>•</span>
                      <span className="text-[#048747] font-bold shrink-0">~{targetRestaurant.deliveryTimeMinutes}m</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-[#06C167] group-hover:translate-x-0.5 transition-transform shrink-0 pl-2">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          ) : resolvedRestaurantName ? (
            <div className="pt-3 border-t border-gray-100 space-y-1.5">
              <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                Restaurant
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2.5 text-xs font-extrabold text-gray-800">
                <Store className="w-4 h-4 text-[#06C167]" />
                <span>{resolvedRestaurantName}</span>
              </div>
            </div>
          ) : null}

        </div>

        {/* Modal Bottom CTA Action */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3 shrink-0">
          
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl bg-white hover:bg-gray-50 text-gray-800 shadow-xs flex items-center justify-center transition-colors disabled:opacity-40"
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="font-mono text-sm font-extrabold px-2 tabular-nums text-gray-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl bg-white hover:bg-gray-50 text-gray-800 shadow-xs flex items-center justify-center transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Add to Bag CTA Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-between min-h-[46px] cursor-pointer"
          >
            <span>Add to Bag</span>
            <span className="font-mono text-sm font-black tabular-nums">
              {formatPrice(itemTotalUsd)}
            </span>
          </button>

        </div>

      </div>

      {/* Restaurant Details Popup */}
      <RestaurantDetailsModal
        restaurant={targetRestaurant || null}
        isOpen={isRestaurantDetailsOpen}
        onClose={() => setIsRestaurantDetailsOpen(false)}
        currency={currency}
        menuItems={allMenuItems}
      />
    </div>
  );
};
