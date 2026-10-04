import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, Tag, Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { CartItem, DiningMode, Currency, USD_TO_LRD_RATE } from '../types';
import { DishIllustration } from './DishIllustration';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  diningMode: DiningMode;
  onChangeDiningMode: (mode: DiningMode) => void;
  currency: Currency;
  onProceedToCheckout: (totals: {
    subtotal: number;
    discount: number;
    serviceFee: number;
    deliveryFee: number;
    tax: number;
    tip: number;
    total: number;
    promoCode: string;
  }) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  diningMode,
  onChangeDiningMode,
  currency,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    const code = promoCodeInput.trim().toUpperCase();

    if (code === 'MONROVIA' || code === 'MOMO' || code === 'LIBERIA') {
      const disc = subtotal * 0.15; // 15% off
      setDiscountAmount(disc);
      setAppliedPromo(code);
      setPromoCodeInput('');
    } else {
      setPromoError('Invalid code. Try "MONROVIA" or "MOMO" for 15% off');
    }
  };

  const deliveryFee = diningMode === 'delivery' ? (subtotal > 25 ? 0 : 2.0) : 0;
  const serviceFee = subtotal > 0 ? 0.75 : 0;
  const tax = subtotal * 0.04;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee + serviceFee + tax);

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const handleCheckoutClick = () => {
    onProceedToCheckout({
      subtotal,
      discount: discountAmount,
      serviceFee,
      deliveryFee,
      tax,
      tip: 0,
      total,
      promoCode: appliedPromo || '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      
      <div 
        className="relative bg-white w-full sm:max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#111827]">
              My Basket
            </h2>
            <div className="text-xs sm:text-sm text-gray-500 font-bold">
              {items.length} {items.length === 1 ? 'item' : 'items'} selected
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dining Mode Picker */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-gray-600">Dining Option:</span>
          <div className="flex gap-1">
            {(['delivery', 'pickup', 'dine-in'] as DiningMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeDiningMode(mode)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all ${
                  diningMode === mode
                    ? 'bg-[#FF4B26] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF4B26] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-base text-[#111827]">
                Your basket is empty
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Explore delicious dishes from Monrovia's top kitchens and add your favorites.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white text-xs font-bold rounded-xl shadow-md shadow-[#FF4B26]/20"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.cartItemId}
                className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex gap-3 items-center"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gray-900 shrink-0 overflow-hidden relative shadow-xs">
                  <DishIllustration type={item.menuItem.illustrationType} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5">
                    <h4 className="font-black text-sm sm:text-base text-[#111827] leading-tight">
                      {item.menuItem.name}
                    </h4>
                    <button
                      onClick={() => onRemoveItem(item.cartItemId)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      title="Remove dish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.selectedSpiceLevel && (
                    <div className="text-xs text-red-600 font-bold mt-0.5">
                      🌶️ {item.selectedSpiceLevel}
                    </div>
                  )}

                  {item.selectedAddons.length > 0 && (
                    <div className="text-xs text-gray-500 font-medium mt-0.5 truncate">
                      +{item.selectedAddons.map((a) => a.name).join(', ')}
                    </div>
                  )}

                  {/* Quantity Stepper & Item Price */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-100/90 p-1.5 rounded-2xl">
                      <button
                        onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-8 h-8 rounded-xl bg-white text-gray-800 hover:text-black flex items-center justify-center font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4 stroke-[3]" />
                      </button>
                      <span className="w-7 text-center text-sm sm:text-base font-black text-gray-900 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-8 h-8 rounded-xl bg-white text-gray-800 hover:text-black flex items-center justify-center font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>

                    <span className="font-mono text-base sm:text-lg font-black text-[#111827] tabular-nums">
                      {formatPrice(item.itemTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Bill Breakdown & Proceed CTA */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 pb-[calc(1.25rem+var(--sab))] border-t border-gray-100 bg-white space-y-3.5 shrink-0 shadow-lg">
            
            {/* Promo Code Form */}
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="Promo: MONROVIA or MOMO"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm uppercase font-mono font-bold placeholder:normal-case placeholder:text-gray-400 focus:outline-none focus:border-[#FF4B26]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-extrabold rounded-xl transition-colors cursor-pointer"
              >
                Apply
              </button>
            </form>

            {appliedPromo && (
              <div className="text-xs sm:text-sm text-emerald-700 font-bold flex justify-between bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <span>Code {appliedPromo} applied (15% OFF)</span>
                <span className="font-mono font-black">-{formatPrice(discountAmount)}</span>
              </div>
            )}
            {promoError && (
              <div className="text-xs text-red-500 font-semibold">
                {promoError}
              </div>
            )}

            {/* Bill Summary */}
            <div className="space-y-2 text-gray-700 pt-1">
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="font-semibold text-gray-600">Subtotal</span>
                <span className="font-mono font-bold text-gray-900 text-base sm:text-lg">{formatPrice(subtotal)}</span>
              </div>

              {diningMode === 'delivery' && (
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="font-semibold text-gray-600">Delivery Fee</span>
                  <span className="font-mono font-bold text-gray-900 text-base sm:text-lg">
                    {deliveryFee === 0 ? <span className="text-emerald-600 font-black">FREE</span> : formatPrice(deliveryFee)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="font-semibold text-gray-600">Service & Packaging</span>
                <span className="font-mono font-bold text-gray-900 text-base sm:text-lg">{formatPrice(serviceFee)}</span>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                <div>
                  <span className="text-base sm:text-xl font-black text-[#111827]">Total</span>
                  <span className="text-xs text-gray-400 font-bold block sm:inline sm:ml-2">({items.length} items)</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-[#111827] tabular-nums">
                    {formatPrice(total)}
                  </span>
                  {currency === 'USD' && (
                    <div className="text-xs sm:text-sm text-gray-500 font-mono font-bold">
                      ~L${Math.round(total * USD_TO_LRD_RATE).toLocaleString()} LRD
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Proceed CTA */}
            <button
              onClick={handleCheckoutClick}
              className="w-full py-4 px-5 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs sm:text-sm uppercase tracking-wider font-black rounded-2xl shadow-xl shadow-[#FF4B26]/20 hover:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-between min-h-[52px] cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base sm:text-lg">{formatPrice(total)}</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </div>
            </button>

          </div>
        )}

      </div>

    </div>
  );
};
