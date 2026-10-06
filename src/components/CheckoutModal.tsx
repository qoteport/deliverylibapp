import React, { useState, useEffect } from 'react';
import { X, Check, Lock, Bike, ShoppingBag, UtensilsCrossed, Phone, DollarSign, ShieldCheck, User as UserIcon, Copy, MapPin, Navigation } from 'lucide-react';
import { CartItem, DiningMode, Order, Currency, PaymentMethod, MONROVIA_NEIGHBORHOODS, USD_TO_LRD_RATE, AppUser, Restaurant } from '../types';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { CustomDropdown } from './CustomDropdown';
import { sendTwilioOrderNotification } from '../utils/twilio';
import { LocationPickerModal } from './LocationPickerModal';
import { getCustomerMemory, saveCustomerMemory } from '../utils/customerMemory';
import { normalizeLiberianPhoneNumber } from '../utils/phoneUtils';
import { sanitizeForFirestore } from '../utils/cleanData';
import { saveOrderToApi } from '../utils/apiSync';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  diningMode: DiningMode;
  currency: Currency;
  currentUser?: AppUser | null;
  restaurants?: Restaurant[];
  cartTotals: {
    subtotal: number;
    discount: number;
    serviceFee: number;
    deliveryFee: number;
    tax: number;
    tip: number;
    total: number;
    promoCode: string;
  };
  onOrderPlaced: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  diningMode,
  currency,
  currentUser,
  restaurants,
  cartTotals,
  onOrderPlaced,
}) => {
  if (!isOpen) return null;

  // Load from current logged-in user or persistent browser memory
  const memory = getCustomerMemory();

  const isRealCustomer = (u?: AppUser | null) => u?.role === 'customer';
  const sanitizeCustomerName = (n?: string) => {
    if (!n) return '';
    const lower = n.toLowerCase().trim();
    if (lower.includes('kitchen staff') || lower.includes('staff') || lower.includes('restaurant manager') || lower.includes('admin') || lower.includes('portal')) {
      return '';
    }
    return n;
  };

  const [orderId, setOrderId] = useState(() => `AU-LR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState(() => {
    if (isRealCustomer(currentUser) && currentUser?.name) {
      return sanitizeCustomerName(currentUser.name);
    }
    return sanitizeCustomerName(memory.name) || '';
  });
  const [phone, setPhone] = useState(() => {
    if (isRealCustomer(currentUser) && currentUser?.phone) {
      return currentUser.phone;
    }
    return memory.phone || '';
  });
  const [destinationArea, setDestinationArea] = useState(
    currentUser?.location || memory.destinationArea || 'Sinkor (Tubman Blvd)'
  );
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(memory.gpsCoords || null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [address, setAddress] = useState(currentUser?.address || memory.address || '');
  const [tableNumber, setTableNumber] = useState('Table 4');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo-mtn');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Determine primary restaurant for order
  const primaryRestaurantId = items[0]?.menuItem?.restaurantId;
  const targetRestaurant = restaurants?.find((r) => r.id === primaryRestaurantId);
  const restaurantName = targetRestaurant?.name || 'Monrovia Kitchen';
  const restaurantPhone = targetRestaurant?.momoNumber || targetRestaurant?.phone || '0886 554 123';

  // Sync / prefill when currentUser updates or modal opens
  useEffect(() => {
    if (isOpen) {
      setOrderId(`AU-LR-${Math.floor(1000 + Math.random() * 9000)}`);
      const currentMemory = getCustomerMemory();
      const validMemName = sanitizeCustomerName(currentMemory.name);
      const isCust = isRealCustomer(currentUser);
      if (!name) {
        const candidate = isCust ? sanitizeCustomerName(currentUser?.name) : validMemName;
        if (candidate) setName(candidate);
      }
      if (!phone) {
        const candidate = isCust ? currentUser?.phone : currentMemory.phone;
        if (candidate) setPhone(candidate);
      }
      if (!destinationArea && (currentUser?.location || currentMemory.destinationArea)) {
        setDestinationArea(currentUser?.location || currentMemory.destinationArea || 'Sinkor (Tubman Blvd)');
      }
      if (!address && (currentUser?.address || currentMemory.address)) {
        setAddress(currentUser?.address || currentMemory.address || '');
      }
      if (!gpsCoords && currentMemory.gpsCoords) {
        setGpsCoords(currentMemory.gpsCoords);
      }
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (isRealCustomer(currentUser)) {
      const validName = sanitizeCustomerName(currentUser?.name);
      if (validName) setName(validName);
      if (currentUser?.phone) {
        setPhone(currentUser.phone);
      }
      if (currentUser?.location) {
        setDestinationArea(currentUser.location);
      }
      if (currentUser?.address) {
        setAddress(currentUser.address);
      }
    }
  }, [currentUser]);

  // Persist memory on input changes
  const handleNameChange = (val: string) => {
    setName(val);
    saveCustomerMemory({ name: val });
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    saveCustomerMemory({ phone: val });
  };

  const handleDestinationChange = (val: string) => {
    setDestinationArea(val);
    saveCustomerMemory({ destinationArea: val });
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    saveCustomerMemory({ address: val });
  };

  const handleGpsLocationSelected = (coords: { lat: number; lng: number }) => {
    setGpsCoords(coords);
    saveCustomerMemory({ gpsCoords: coords });
  };

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const nowTimestamp = now.getTime();
    const prepMinutes = diningMode === 'pickup' ? 15 : diningMode === 'dine-in' ? 12 : 25;
    const eta = new Date(nowTimestamp + prepMinutes * 60000);

    const chosenDeliveryArea = destinationArea.trim() || 'Monrovia';
    let fullAddress = address.trim();
    if (gpsCoords) {
      fullAddress = fullAddress ? `${fullAddress} (GPS: ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)})` : `GPS: ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`;
    }

    const resolvedRestaurantId = primaryRestaurantId || targetRestaurant?.id;
    const resolvedRestaurantName = targetRestaurant?.name || items[0]?.menuItem?.provenance || 'Monrovia Kitchen';

    const newOrder: Order = {
      id: orderId,
      createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtTimestamp: nowTimestamp,
      prepDurationMinutes: prepMinutes,
      status: 'received',
      items,
      diningMode,
      restaurantId: resolvedRestaurantId,
      restaurantName: resolvedRestaurantName,
      deliveryArea: chosenDeliveryArea,
      deliveryAddress: diningMode === 'delivery' ? (fullAddress ? `${fullAddress}, ${chosenDeliveryArea}` : chosenDeliveryArea) : undefined,
      tableNumber: diningMode === 'dine-in' ? tableNumber : undefined,
      customerName: name.trim() || (currentUser?.name || 'Monrovia Customer'),
      customerPhone: normalizeLiberianPhoneNumber(phone.trim() || currentUser?.phone || '0886 000 000'),
      customerEmail: currentUser?.email || `${(name || 'customer').toLowerCase().replace(/\s+/g, '')}@monrovia.lr`,
      subtotal: cartTotals.subtotal,
      discount: cartTotals.discount,
      serviceFee: cartTotals.serviceFee,
      deliveryFee: cartTotals.deliveryFee,
      tax: cartTotals.tax,
      tip: cartTotals.tip,
      total: cartTotals.total,
      currency,
      estimatedDeliveryTime: eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod,
      paymentNumber: normalizeLiberianPhoneNumber(phone.trim() || currentUser?.phone || '0886 000 000'),
    };

    // Save order to Firebase Firestore with complete metadata for realtime listeners
    try {
      const orderPayload = sanitizeForFirestore({
        id: newOrder.id,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        customerEmail: newOrder.customerEmail,
        deliveryArea: newOrder.deliveryArea || '',
        deliveryAddress: newOrder.deliveryAddress || '',
        diningMode: newOrder.diningMode,
        tableNumber: newOrder.tableNumber || '',
        restaurantId: resolvedRestaurantId || '',
        restaurantName: resolvedRestaurantName,
        paymentMethod: newOrder.paymentMethod,
        paymentNumber: newOrder.paymentNumber || '',
        currency: newOrder.currency,
        subtotal: newOrder.subtotal,
        discount: newOrder.discount || 0,
        serviceFee: newOrder.serviceFee || 0,
        deliveryFee: newOrder.deliveryFee || 0,
        tax: newOrder.tax || 0,
        tip: newOrder.tip || 0,
        total: newOrder.total,
        status: newOrder.status,
        createdAt: newOrder.createdAt,
        createdAtTimestamp: nowTimestamp,
        prepDurationMinutes: prepMinutes,
        estimatedDeliveryTime: newOrder.estimatedDeliveryTime,
        itemsCount: newOrder.items.length,
        items: newOrder.items.map((i) => ({
          cartItemId: i.cartItemId,
          quantity: i.quantity,
          itemTotal: i.itemTotal,
          selectedSpiceLevel: i.selectedSpiceLevel || '',
          specialInstructions: i.specialInstructions || '',
          selectedAddons: i.selectedAddons || [],
          menuItem: {
            id: i.menuItem.id,
            name: i.menuItem.name,
            price: i.menuItem.price,
            category: i.menuItem.category,
            restaurantId: i.menuItem.restaurantId || primaryRestaurantId || '',
            image: i.menuItem.image || '',
            images: i.menuItem.images || [],
            illustrationType: i.menuItem.illustrationType || 'jollof',
          },
        })),
      });

      // 1. Sync directly to Backend API store for instantaneous cross-device delivery
      await saveOrderToApi(newOrder);

      // 2. Sync to Firebase Firestore
      await setDoc(doc(db, 'orders', newOrder.id), orderPayload);
      console.log('Order successfully synced to Firebase Firestore:', newOrder.id);
    } catch (err) {
      console.warn('Firestore order write notice:', err);
    }

    // Dispatch Twilio SMS & WhatsApp alerts to customer and dispatch desk
    sendTwilioOrderNotification(newOrder, items[0]?.menuItem?.name ? 'AURA Monrovia' : undefined)
      .then((res) => {
        console.log('📱 Twilio Dispatch Status:', res);
      })
      .catch((err) => {
        console.warn('Twilio Dispatch Notice:', err);
      });

    setIsSubmitting(false);
    onOrderPlaced(newOrder);
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
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-none sm:rounded-l-3xl border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-full h-auto sm:h-full animate-modal-sheet sm:animate-drawer-right touch-pan-y"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: sheetDragY > 0 ? `translateY(${sheetDragY}px)` : undefined,
          transition: isDraggingSheet ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Mobile top pull indicator handle */}
        <div 
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          className="w-full py-2.5 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing shrink-0"
          title="Pull down to close"
        >
          <div className="w-14 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111827]">
              Checkout & Payment
            </h2>
            <div className="text-xs text-gray-500 font-medium">
              Monrovia, Liberia · {diningMode === 'delivery' ? 'White-Glove Dispatch' : diningMode === 'pickup' ? 'Counter Pickup' : 'Table Service'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 pb-[calc(1.75rem+var(--sab))] overflow-y-auto space-y-4">
          
          {/* Customer Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-[#111827] uppercase tracking-wider">
                1. Contact Information
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-gray-500 font-semibold mb-1 block">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
                />
              </div>
              <div>
                <label className="text-gray-500 font-semibold mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="088... / 077..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
                />
              </div>
            </div>
          </div>

          {/* Location in Monrovia */}
          <div className="space-y-2 text-xs pt-2 border-t border-gray-100">
            <div className="font-extrabold text-[#111827] uppercase tracking-wider">
              2. {diningMode === 'delivery' ? 'Delivery Destination' : diningMode === 'dine-in' ? 'Table Number' : 'Pickup Point'}
            </div>

            {diningMode === 'delivery' && (
              <div className="space-y-2">
                {/* Single unified destination input with GPS icon button */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    list="monrovia-areas-list"
                    value={destinationArea}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    placeholder="e.g. Sinkor, ELWA Junction, Oldest Congo Town, Duala Market, etc."
                    className="w-full pl-9 pr-24 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />

                  {/* Monrovia Preset Suggestions */}
                  <datalist id="monrovia-areas-list">
                    {MONROVIA_NEIGHBORHOODS.map((area) => (
                      <option key={area} value={area} />
                    ))}
                  </datalist>

                  {/* Map Pinpoint Button next to / inside the text input box */}
                  <button
                    type="button"
                    onClick={() => setIsLocationPickerOpen(true)}
                    className="absolute right-1.5 px-3 py-1.5 bg-[#E8F8EE] hover:bg-[#D4F4E0] active:scale-95 text-[#048747] border border-[#A7F3D0] rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Open interactive Monrovia map to pinpoint exact delivery spot"
                  >
                    <MapPin className="w-3 h-3 text-[#06C167] stroke-[2.5]" />
                    <span>Pick on Map</span>
                  </button>
                </div>

                {gpsCoords && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-medium">
                    <span>📍 Pinpoint: {gpsCoords.lat.toFixed(4)}° N, {gpsCoords.lng.toFixed(4)}° W</span>
                    <button
                      type="button"
                      onClick={() => setIsLocationPickerOpen(true)}
                      className="text-[#06C167] hover:underline font-bold"
                    >
                      Adjust on Map
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Street name, landmark, gate color or house description"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
                />
              </div>
            )}

            {diningMode === 'dine-in' && (
              <input
                type="text"
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 4 or Terrace"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
              />
            )}

            {diningMode === 'pickup' && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
                ⚡ Order will be freshly prepared and waiting at the counter in 15–20 minutes.
              </div>
            )}
          </div>

          {/* Payment Selection Preference */}
          <div className="space-y-2.5 text-xs pt-2 border-t border-gray-100">
            <div className="font-extrabold text-[#111827] uppercase tracking-wider flex items-center justify-between">
              <span>3. Payment Preference</span>
              <span className="font-mono text-[#048747] font-bold">Currency: {currency}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Lonestar MTN MoMo */}
              <button
                type="button"
                onClick={() => setPaymentMethod('momo-mtn')}
                className={`p-3 rounded-2xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  paymentMethod === 'momo-mtn'
                    ? 'border-[#FFCC00] bg-[#FFFBEA] ring-2 ring-[#FFCC00]/30 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-[#FFCC00] text-black font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                  M
                </div>
                <div>
                  <div className="text-xs font-black text-gray-950">MTN MoMo</div>
                  <div className="text-[10px] text-amber-800 font-medium">088 / 055</div>
                </div>
              </button>

              {/* Orange Money */}
              <button
                type="button"
                onClick={() => setPaymentMethod('orange-money')}
                className={`p-3 rounded-2xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  paymentMethod === 'orange-money'
                    ? 'border-[#FF6600] bg-[#FFF5EF] ring-2 ring-[#FF6600]/30 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-[#FF6600] text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                  O
                </div>
                <div>
                  <div className="text-xs font-black text-[#B84A00]">Orange Money</div>
                  <div className="text-[10px] text-orange-700 font-medium">077</div>
                </div>
              </button>

              {/* Cash on Delivery (USD) */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cod-usd')}
                className={`p-3 rounded-2xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  paymentMethod === 'cod-usd'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-black text-emerald-800">Cash (USD $)</div>
                  <div className="text-[10px] text-emerald-600 font-medium">Pay on arrival</div>
                </div>
              </button>

              {/* Cash on Delivery (LRD) */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cod-lrd')}
                className={`p-3 rounded-2xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  paymentMethod === 'cod-lrd'
                    ? 'border-[#06C167] bg-[#E8F8EE] ring-2 ring-[#06C167]/20 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="font-mono text-sm font-black text-[#048747] shrink-0">L$</span>
                <div>
                  <div className="text-xs font-black text-[#048747]">Cash (LRD L$)</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Pay on arrival</div>
                </div>
              </button>
            </div>

            {/* Pay After Kitchen Confirms Notice */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-[#048747]">Pay After Kitchen Confirms</div>
                <div className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                  Your order is sent to the restaurant first. Once the kitchen accepts and starts cooking, you will complete payment via MoMo / Orange / Cash in your <strong>Live Order Tracker</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Total Breakdown Snapshot */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs font-semibold">
            <div>
              <span className="text-gray-900 font-extrabold">Total Amount</span>
              <div className="text-[10px] text-gray-500 font-normal">
                {items.length} items · Fast dispatch
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xl font-black text-[#111827] tabular-nums">
                {formatPrice(cartTotals.total)}
              </span>
              {currency === 'USD' && (
                <div className="text-[10px] text-gray-500 font-mono">
                  ~L${Math.round(cartTotals.total * USD_TO_LRD_RATE).toLocaleString()} LRD
                </div>
              )}
            </div>
          </div>

          {/* Place Order CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-5 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-xl shadow-[#06C167]/20 hover:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[50px] cursor-pointer"
          >
            {isSubmitting ? (
              <span>Transmitting Order to Kitchen...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Place Order • {formatPrice(cartTotals.total)}</span>
              </span>
            )}
          </button>

        </form>

      </div>

      {/* Interactive Monrovia Delivery Map Picker Modal */}
      {isLocationPickerOpen && (
        <LocationPickerModal
          isOpen={isLocationPickerOpen}
          onClose={() => setIsLocationPickerOpen(false)}
          initialCoords={gpsCoords}
          initialArea={destinationArea}
          initialAddress={address}
          onConfirmLocation={({ area, address: updatedAddress, coords }) => {
            setDestinationArea(area);
            if (updatedAddress) {
              setAddress(updatedAddress);
            }
            setGpsCoords(coords);
            saveCustomerMemory({
              destinationArea: area,
              address: updatedAddress || address,
              gpsCoords: coords,
            });
          }}
        />
      )}
    </div>
  );
};
