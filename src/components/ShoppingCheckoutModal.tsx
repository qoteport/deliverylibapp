import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ArrowLeft,
  Store,
  ChevronDown,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  SupermarketItem, 
  Currency, 
  USD_TO_LRD_RATE, 
  Order, 
  MONROVIA_NEIGHBORHOODS,
  MONROVIA_NEIGHBORHOOD_COORDS,
  PaymentMethod
} from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/cleanData';
import { playOrderAlertSound } from '../utils/audioAlert';
import { sendBrowserNotification } from '../utils/browserNotifications';
import { CustomSelect } from './common/CustomSelect';

export interface ShoppingCartItem {
  item: SupermarketItem;
  quantity: number;
}

interface ShoppingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ShoppingCartItem[];
  currency: Currency;
  onOrderPlaced: (order: Order) => void;
}

export const ShoppingCheckoutModal: React.FC<ShoppingCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  currency,
  onOrderPlaced,
}) => {
  const { user } = useAuth();

  // Contact info
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  
  // Delivery details
  const [deliveryArea, setDeliveryArea] = useState(MONROVIA_NEIGHBORHOODS[0]);
  const [streetAddress, setStreetAddress] = useState(user?.address || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryTiming, setDeliveryTiming] = useState<'express' | 'standard' | 'pickup'>('express');
  
  // Out of stock policy
  const [substitutionPreference, setSubstitutionPreference] = useState<'call_me' | 'substitute_best' | 'refund'>('call_me');
  
  // Bagging preference
  const [includeEcoBags, setIncludeEcoBags] = useState(true);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo-mtn');
  const [momoNumber, setMomoNumber] = useState(user?.phone || '');
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Calculations
  const itemsSubtotalUsd = items.reduce((acc, curr) => acc + (curr.item.priceUsd * curr.quantity), 0);
  
  // Zone-based grocery delivery fee
  const getDeliveryFee = () => {
    if (deliveryTiming === 'pickup') return 0;
    if (deliveryArea.includes('Paynesville') || deliveryArea.includes('Bushrod')) return 3.00;
    if (deliveryArea.includes('Congo')) return 2.50;
    if (deliveryArea.includes('Mamba')) return 2.00;
    return 1.50; // Sinkor default
  };

  const deliveryFee = getDeliveryFee();
  const ecoBagFee = includeEcoBags ? 0.25 : 0;
  const totalUsd = itemsSubtotalUsd + deliveryFee + ecoBagFee;

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const storeNames = Array.from(new Set(items.map((i) => i.item.supermarketName))).join(', ');
  const primaryStoreId = items[0]?.item.supermarketId || 'supermarket_stop_shop';

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 6) {
      setErrorMsg('Please enter a valid Monrovia contact phone number');
      return;
    }
    if (deliveryTiming !== 'pickup' && !streetAddress.trim()) {
      setErrorMsg('Please enter your street address or landmark (e.g. 15th Street, near Catholic Hospital)');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = `SHOP-${Date.now().toString().slice(-6)}`;
      const now = new Date();
      const coords = MONROVIA_NEIGHBORHOOD_COORDS[deliveryArea] || { lat: 6.2907, lng: -10.7812 };

      // Convert ShoppingCartItems into standard Order MenuItem format
      const formattedItems = items.map((cartItem, idx) => ({
        cartItemId: `shop-${cartItem.item.id}-${idx}`,
        menuItem: {
          id: cartItem.item.id,
          restaurantId: cartItem.item.supermarketId,
          name: cartItem.item.name,
          subname: `${cartItem.item.supermarketName} • ${cartItem.item.unitWeight}`,
          category: cartItem.item.category,
          description: cartItem.item.description,
          price: cartItem.item.priceUsd,
          priceLrd: cartItem.item.priceUsd * USD_TO_LRD_RATE,
          calories: 0,
          prepTimeMinutes: 20,
          dietary: [],
          ingredients: [cartItem.item.unitWeight],
          provenance: cartItem.item.supermarketName,
          illustrationType: 'jollof' as const,
          image: cartItem.item.image,
          images: [cartItem.item.image],
          isAvailable: true,
        },
        quantity: cartItem.quantity,
        selectedAddons: [],
        itemTotal: cartItem.item.priceUsd * cartItem.quantity,
      }));

      const newOrder: Order = {
        id: orderId,
        restaurantId: primaryStoreId,
        diningMode: deliveryTiming === 'pickup' ? 'pickup' : 'delivery',
        status: 'received',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryTiming === 'pickup' ? `Store Pickup at ${storeNames}` : `${streetAddress.trim()}, ${deliveryArea}`,
        deliveryArea: deliveryArea,
        deliveryCoords: coords,
        specialInstructions: `[Shopping/Grocery Order] Store: ${storeNames} | Timing: ${deliveryTiming} | Out-of-stock preference: ${substitutionPreference}${deliveryNotes ? ` | Note: ${deliveryNotes}` : ''}`,
        items: formattedItems,
        subtotal: itemsSubtotalUsd,
        tax: 0,
        serviceFee: ecoBagFee,
        deliveryFee: deliveryFee,
        tip: 0,
        total: totalUsd,
        currency: currency,
        estimatedDeliveryTime: deliveryTiming === 'express' ? '30-45 mins' : deliveryTiming === 'standard' ? '60 mins' : 'Curbside Pickup in 20 mins',
        createdAt: now.toISOString(),
        createdAtTimestamp: now.getTime(),
        paymentMethod: paymentMethod,
        paymentNumber: (paymentMethod === 'momo-mtn' || paymentMethod === 'orange-money') ? momoNumber : undefined,
        paymentStatus: 'pending',
      };

      // 1. Save to Firestore if available
      if (db) {
        try {
          await setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(newOrder));
        } catch (dbErr) {
          console.warn('Firestore grocery order save notice:', dbErr);
        }
      }

      // 2. Play sound & send browser notification
      playOrderAlertSound();
      sendBrowserNotification({
        title: `🛍️ Grocery Order Confirmed #${orderId}`,
        body: `Your order from ${storeNames} is confirmed! Estimated arrival: ${newOrder.estimatedDeliveryTime}.`,
        tag: `order-${orderId}`,
      });

      // 3. Update callback & transition to completed screen
      onOrderPlaced(newOrder);
      setCompletedOrder(newOrder);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMsg(err?.message || 'Could not place grocery order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // SUCCESS RECEIPT VIEW
  // =========================================================================
  if (completedOrder) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
        <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#059669] to-[#10B981] text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-full border border-emerald-200">
              Grocery Order Confirmed
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-2">
              Thank You, {completedOrder.customerName}!
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Order ID: <span className="font-mono font-bold text-gray-900">#{completedOrder.id}</span>
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-left border border-gray-100 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
              <span className="text-gray-500">Supermarket</span>
              <span className="font-black text-gray-900">{storeNames}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
              <span className="text-gray-500">Estimated Delivery</span>
              <span className="font-bold text-emerald-700">{completedOrder.estimatedDeliveryTime}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
              <span className="text-gray-500">Delivery Address</span>
              <span className="font-medium text-gray-800 text-right truncate max-w-[200px]">{completedOrder.deliveryAddress}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
              <span className="text-gray-500">Total Charged</span>
              <span className="font-black text-gray-900 font-mono text-sm">
                ${completedOrder.total.toFixed(2)} (~L${Math.round(completedOrder.total * USD_TO_LRD_RATE).toLocaleString()})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Payment</span>
              <span className="font-bold uppercase text-gray-700">{String(completedOrder.paymentMethod || 'momo').replace('-', ' ')}</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 text-left flex items-start gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Your grocery shopper at <strong>{storeNames}</strong> is handpicking your items. If any item is unavailable, we will respect your policy (<strong>{substitutionPreference === 'call_me' ? 'Call you first' : substitutionPreference === 'substitute_best' ? 'Substitute best brand' : 'Refund'}</strong>).
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              Done &bull; Return to Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN CHECKOUT FORM
  // =========================================================================
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#059669] to-[#10B981] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Store className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-gray-900">Grocery &amp; Mart Checkout</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">
                  Aura Shopping
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Dedicated checkout for Monrovia supermarkets</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitOrder} className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Basket Summary Preview */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-black text-gray-900">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Grocery Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
              </span>
              <span className="text-gray-500 font-normal">{storeNames}</span>
            </div>

            <div className="divide-y divide-gray-200/60 max-h-44 overflow-y-auto pr-1">
              {items.map((cartItem) => (
                <div key={cartItem.item.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img 
                      src={cartItem.item.image} 
                      alt={cartItem.item.name} 
                      className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate">{cartItem.item.name}</div>
                      <div className="text-[10px] text-gray-500">{cartItem.item.unitWeight} &bull; {cartItem.item.supermarketName}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-gray-900">
                      {formatPrice(cartItem.item.priceUsd * cartItem.quantity)}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {cartItem.quantity} &times; ${cartItem.item.priceUsd.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Customer Contact */}
          <div className="space-y-3">
            <div className="font-black text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customer Contact Info</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Marie Sirleaf"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Phone Number (for Courier &amp; Store call) *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0886 123 456"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Delivery Method & Timing */}
          <div className="space-y-3">
            <div className="font-black text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Delivery Timing &amp; Speed</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryTiming('express')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  deliveryTiming === 'express'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>⚡ Express</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">35-45 mins</div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryTiming('standard')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  deliveryTiming === 'standard'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-bold text-xs">Standard</div>
                <div className="text-[10px] text-gray-500 mt-1">60-90 mins</div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryTiming('pickup')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  deliveryTiming === 'pickup'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-bold text-xs">Store Pickup</div>
                <div className="text-[10px] text-gray-500 mt-1">Free &bull; In 20m</div>
              </button>
            </div>
          </div>

          {/* 4. Delivery Destination (Only if not pickup) */}
          {deliveryTiming !== 'pickup' && (
            <div className="space-y-3">
              <div className="font-black text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monrovia Drop-Off Destination</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Monrovia Neighborhood</label>
                  <CustomSelect
                    value={deliveryArea}
                    onChange={(e) => setDeliveryArea(e.target.value)}
                    searchable={true}
                  >
                    {MONROVIA_NEIGHBORHOODS.map((nh) => (
                      <option key={nh} value={nh}>{nh}</option>
                    ))}
                  </CustomSelect>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Street Address &amp; Prominent Landmark *
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 15th Street Sinkor, adjacent to Catholic Hospital, Blue gate"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Driver / Gate Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Ring the bell twice, or leave with security at the gate"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Grocery Out-of-Stock Preference */}
          <div className="space-y-2.5 bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
            <div className="font-black text-emerald-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Out-of-Stock Item Policy</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              If an item is sold out in the store aisles during picking:
            </p>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="substitution"
                  checked={substitutionPreference === 'call_me'}
                  onChange={() => setSubstitutionPreference('call_me')}
                  className="accent-emerald-600"
                />
                <span className="font-bold text-gray-900">📞 Call me immediately for verbal approval</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="substitution"
                  checked={substitutionPreference === 'substitute_best'}
                  onChange={() => setSubstitutionPreference('substitute_best')}
                  className="accent-emerald-600"
                />
                <span className="font-bold text-gray-900">🔄 Substitute with closest quality brand / size</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="substitution"
                  checked={substitutionPreference === 'refund'}
                  onChange={() => setSubstitutionPreference('refund')}
                  className="accent-emerald-600"
                />
                <span className="font-bold text-gray-900">❌ Do not replace &mdash; simply refund the item</span>
              </label>
            </div>
          </div>

          {/* 6. Packaging & Eco Bags */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
            <div>
              <div className="font-bold text-gray-900">Reinforced Eco Grocery Bags</div>
              <div className="text-[10px] text-gray-500">Heavy-duty insulated paper packaging (+$0.25)</div>
            </div>
            <input
              type="checkbox"
              checked={includeEcoBags}
              onChange={(e) => setIncludeEcoBags(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </div>

          {/* 7. Payment Method */}
          <div className="space-y-3">
            <div className="font-black text-gray-900 uppercase tracking-wider text-[11px]">
              Payment Method
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('momo-mtn')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'momo-mtn'
                    ? 'border-yellow-500 bg-yellow-50 text-gray-900 ring-1 ring-yellow-500'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-black text-xs text-yellow-900">Lonestar MTN MoMo</div>
                <div className="text-[10px] text-gray-500 mt-0.5">*156# Mobile Money</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('orange-money')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'orange-money'
                    ? 'border-orange-500 bg-orange-50 text-gray-900 ring-1 ring-orange-500'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-black text-xs text-orange-900">Orange Money</div>
                <div className="text-[10px] text-gray-500 mt-0.5">*144# Mobile Money</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod-usd')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'cod-usd'
                    ? 'border-gray-900 bg-gray-100 text-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-black text-xs text-gray-900">Cash on Delivery</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Pay in USD or LRD</div>
              </button>
            </div>

            {(paymentMethod === 'momo-mtn' || paymentMethod === 'orange-money') && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  {paymentMethod === 'momo-mtn' ? 'Lonestar MTN MoMo Number' : 'Orange Money Number'}
                </label>
                <input
                  type="tel"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="e.g. 0886 123 456"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium font-mono text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}
          </div>

          {/* 8. Price Breakdown Summary */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Items Subtotal</span>
              <span className="font-mono font-bold text-gray-900">{formatPrice(itemsSubtotalUsd)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Monrovia Grocery Delivery</span>
              <span className="font-mono font-bold text-gray-900">
                {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
              </span>
            </div>
            {includeEcoBags && (
              <div className="flex justify-between text-gray-600">
                <span>Eco Grocery Bags</span>
                <span className="font-mono font-bold text-gray-900">{formatPrice(ecoBagFee)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-black text-base text-gray-900">
              <span>Total Amount</span>
              <div className="text-right">
                <div className="text-lg font-mono text-emerald-700">${totalUsd.toFixed(2)}</div>
                <div className="text-[11px] text-gray-400 font-mono font-normal">
                  ~L${Math.round(totalUsd * USD_TO_LRD_RATE).toLocaleString()} LRD
                </div>
              </div>
            </div>
          </div>

          {/* Place Order CTA Button */}
          <div className="pt-2 sticky bottom-0 bg-white">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#059669] via-[#06C167] to-[#048747] hover:brightness-105 active:scale-98 text-white text-sm font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Submitting to Store...' : 'Confirm & Place Grocery Order'}</span>
              <span className="font-mono">${totalUsd.toFixed(2)}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
