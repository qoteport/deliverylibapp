import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, ChefHat, Bike, Flame, Utensils, Phone, MapPin, Store, Minimize2, Copy, Check, AlertTriangle, XCircle, Wallet, DollarSign, ShieldCheck } from 'lucide-react';
import { Order, Currency, USD_TO_LRD_RATE, MONROVIA_NEIGHBORHOOD_COORDS, Restaurant, PaymentMethod } from '../types';
import { MonroviaDeliveryMap } from './MonroviaDeliveryMap';

interface OrderTrackerModalProps {
  isOpen?: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateOrderStatus: (
    orderId: string, 
    status: Order['status'], 
    cancelledBy?: 'customer' | 'restaurant' | 'admin', 
    cancellationReason?: string
  ) => void;
  currency: Currency;
  restaurants?: Restaurant[];
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen = true,
  order,
  onClose,
  onUpdateOrderStatus,
  currency,
  restaurants,
}) => {
  if (!isOpen || !order) return null;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(order.paymentMethod || 'momo-mtn');
  const [isPaid, setIsPaid] = useState<boolean>(order.paymentStatus === 'paid');

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const isCancelled = order.status === 'cancelled';
  const isConfirmed = order.status !== 'received' && !isCancelled;
  const isCompleted = order.status === 'completed';
  const prepMinutes = order.prepDurationMinutes || (order.diningMode === 'pickup' ? 15 : order.diningMode === 'dine-in' ? 12 : 25);

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    await onUpdateOrderStatus(order.id, 'cancelled', 'customer', 'Cancelled by customer before kitchen confirmation');
    setIsCancelling(false);
    setShowCancelConfirm(false);
  };

  const calculateSecondsLeft = () => {
    if (isCompleted || isCancelled) return 0;
    if (!isConfirmed) return prepMinutes * 60;
    const targetTimestamp = order.targetEtaTimestamp || (
      order.confirmedAtTimestamp 
        ? order.confirmedAtTimestamp + prepMinutes * 60000
        : (order.createdAtTimestamp ? order.createdAtTimestamp + prepMinutes * 60000 : Date.now() + prepMinutes * 60000)
    );
    return Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateSecondsLeft);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setSecondsRemaining(calculateSecondsLeft());
    if (!isConfirmed || isCompleted) return;

    const timer = setInterval(() => {
      setSecondsRemaining(calculateSecondsLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [order.status, order.targetEtaTimestamp, order.confirmedAtTimestamp, order.createdAtTimestamp, isConfirmed, isCompleted]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const isDriverConfirmed = Boolean(order.assignedDriverName && order.delegationStatus && order.delegationStatus !== 'offered');
  const driverName = isDriverConfirmed ? order.assignedDriverName : null;
  const driverPhone = isDriverConfirmed ? order.assignedDriverPhone : null;
  const driverVehicle = order.driverVehicle || 'Motorbike';

  const steps: { key: Order['status']; label: string; icon: React.ElementType }[] = [
    { key: 'received', label: 'Order Confirmed & Sent to Kitchen', icon: CheckCircle2 },
    { key: 'preparing', label: 'Chef Cooking & Searing', icon: Flame },
    { key: 'plating', label: 'Packed in Thermal Carrier', icon: ChefHat },
    {
      key: 'en-route',
      label: order.diningMode === 'dine-in' ? 'Serving to Table' : order.diningMode === 'pickup' ? 'Ready for Pickup' : isDriverConfirmed ? `${driverName} En Route` : 'Courier En Route',
      icon: order.diningMode === 'dine-in' ? Utensils : Bike,
    },
    { key: 'completed', label: 'Delivered & Completed', icon: CheckCircle2 },
  ];

  const statusOrder: Order['status'][] = ['received', 'preparing', 'plating', 'en-route', 'completed'];
  const currentIndex = statusOrder.indexOf(order.status);

  // Dynamic Restaurant Resolution
  const targetRestaurant = restaurants?.find(
    (r) => r.id === order.restaurantId || r.name.toLowerCase() === order.restaurantName?.toLowerCase()
  ) || (order.items?.[0]?.menuItem?.restaurantId ? restaurants?.find(r => r.id === order.items[0].menuItem.restaurantId) : undefined);

  const restaurantName = order.restaurantName || targetRestaurant?.name || order.items?.[0]?.menuItem?.provenance || 'Monrovia Kitchen';
  const restaurantLocation = targetRestaurant?.address || targetRestaurant?.neighborhood || 'Monrovia, LR';
  const restaurantPhone = targetRestaurant?.momoNumber || targetRestaurant?.phone || '+231 886 554 123';
  const restaurantNeighborhood = targetRestaurant?.neighborhood || 'Sinkor (Tubman Blvd)';
  const restaurantCoords = targetRestaurant?.location || MONROVIA_NEIGHBORHOOD_COORDS[restaurantNeighborhood] || MONROVIA_NEIGHBORHOOD_COORDS['Sinkor (Tubman Blvd)'];

  const customerCoords = MONROVIA_NEIGHBORHOOD_COORDS[order.deliveryArea || 'Congotown & Old Road'] || { lat: 6.2690, lng: -10.7480 };

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
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end p-0 animate-overlay-fade"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-full sm:h-full animate-modal-sheet sm:animate-drawer-right touch-pan-y"
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
          title="Swipe down or tap to minimize"
        >
          <div className="w-14 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-gray-500">{order.id}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F8EE] text-[#048747]">
                Live Tracker
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#111827] mt-0.5">
              Live Order Journey
            </h2>
          </div>

          {/* Elevated Close Button Design (Icon Only) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-center min-h-[38px] min-w-[38px] active:scale-95 cursor-pointer shrink-0"
            aria-label="Close live order tracker"
            title="Close tracker"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Live Countdown / Status Card */}
          {isCancelled ? (
            <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg ${
              order.cancelledBy === 'restaurant'
                ? 'bg-gradient-to-r from-gray-900 via-amber-950 to-red-950 text-white border border-amber-500/30'
                : 'bg-gradient-to-r from-gray-900 to-red-950 text-white'
            }`}>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-amber-300">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    {order.cancelledBy === 'restaurant'
                      ? 'Declined by Restaurant'
                      : order.cancelledBy === 'customer'
                        ? 'Cancelled by You'
                        : 'Order Cancelled'}
                  </span>
                </div>
                <div className="font-mono text-xl font-black mt-0.5 text-white">
                  {order.cancelledBy === 'restaurant' ? 'Declined by Kitchen' : 'Order Cancelled'}
                </div>
                <div className="text-xs text-gray-300 font-medium">
                  {order.cancelledBy === 'restaurant'
                    ? `${restaurantName} could not accept this order (${order.cancellationReason || 'Kitchen busy / item out of stock'}). Please choose another spot.`
                    : order.cancelledBy === 'customer'
                      ? 'You cancelled this order before kitchen confirmation. No charges were made.'
                      : (order.cancellationReason || 'This order was cancelled by dispatch administration.')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6 text-red-400 stroke-[2.5]" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white flex items-center justify-between shadow-lg shadow-[#06C167]/20">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                  {isCompleted ? (
                    <span>Order Completed</span>
                  ) : !isConfirmed ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                      <span>Awaiting Kitchen Confirmation</span>
                    </span>
                  ) : (
                    <span>Estimated Delivery Countdown</span>
                  )}
                </div>
                <div className="font-mono text-2xl font-black mt-0.5">
                  {isCompleted ? (
                    'Delivered!'
                  ) : !isConfirmed ? (
                    'Reviewing Order...'
                  ) : (
                    `~${formatCountdown(secondsRemaining)}`
                  )}
                </div>
                <div className="text-xs text-white/90 font-medium">
                  {!isConfirmed
                    ? `Timer starts upon kitchen accept (~${prepMinutes} mins)`
                    : order.deliveryArea || 'Monrovia, LR'}
                </div>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
            </div>
          )}

          {/* Cancellation Action for Unconfirmed Orders (status === 'received') */}
          {order.status === 'received' && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-amber-900 truncate">Not Yet Confirmed by Kitchen</div>
                    <div className="text-[11px] text-amber-700 truncate">You can cancel free of charge now</div>
                  </div>
                </div>

                {!showCancelConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              {/* Inline Cancel Confirmation Prompt */}
              {showCancelConfirm && (
                <div className="p-3 bg-white border border-red-200 rounded-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-red-900">
                        Confirm Order Cancellation?
                      </h4>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                        Your meal preparation has not started. If you cancel, your order will be stopped immediately.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={isCancelling}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Keep Order
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={isCancelling}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notice that payment transfer unlocks after kitchen accept */}
              <div className="pt-2 border-t border-amber-200/60 flex items-center gap-1.5 text-[11px] text-amber-800">
                <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Payment transfer details will appear here as soon as the kitchen confirms your order.</span>
              </div>
            </div>
          )}

          {/* Live Google Map Interactive View (Delivery Mode) */}
          {order.diningMode === 'delivery' && !isCancelled && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Monrovia Delivery Route
              </div>
              <MonroviaDeliveryMap
                driverLocation={order.driverLocation || { lat: 6.2910, lng: -10.7825 }}
                restaurantLocation={restaurantCoords}
                customerLocation={customerCoords}
                restaurantName={restaurantName}
                customerAddress={order.deliveryArea || order.deliveryAddress || 'Customer'}
                height="h-52"
              />
            </div>
          )}

          {/* Progress Timeline */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {isCancelled ? 'Order Status' : 'Preparation & Delivery Milestones'}
            </div>

            {isCancelled ? (
              <div className={`p-3.5 rounded-2xl flex items-center gap-3 border ${
                order.cancelledBy === 'restaurant'
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0 ${
                  order.cancelledBy === 'restaurant' ? 'bg-amber-600' : 'bg-red-600'
                }`}>
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-extrabold ${
                    order.cancelledBy === 'restaurant' ? 'text-amber-900' : 'text-red-900'
                  }`}>
                    {order.cancelledBy === 'restaurant'
                      ? `Declined by ${restaurantName}`
                      : order.cancelledBy === 'customer'
                        ? 'Cancelled by Customer'
                        : 'Cancelled by Dispatch'}
                  </div>
                  <div className={`text-[11px] ${
                    order.cancelledBy === 'restaurant' ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {order.cancelledBy === 'restaurant'
                      ? (order.cancellationReason ? `Reason: "${order.cancellationReason}". Please select another spot.` : 'The kitchen was unavailable to prepare this order.')
                      : order.cancelledBy === 'customer'
                        ? 'Cancelled before kitchen acceptance (no fees charged).'
                        : (order.cancellationReason || 'Cancelled by dispatch desk.')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isPassed = idx <= currentIndex;
                  const isCurrent = idx === currentIndex;

                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
                          isPassed
                            ? isCurrent
                              ? 'bg-[#06C167] text-white shadow-md shadow-[#06C167]/30 animate-pulse'
                              : 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>

                      <div className="flex-1 pb-1">
                        <div
                          className={`text-xs font-bold leading-tight ${
                            isCurrent
                              ? 'text-[#048747]'
                              : isPassed
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </div>
                        {isCurrent && (
                          <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                            In progress now in Monrovia
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. PAYMENT OPTION (Unlocked once kitchen confirms) */}
          {isConfirmed && (
            <div className="p-4 bg-white border-2 border-emerald-500/40 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-xs">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Order Payment</span>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        Kitchen Confirmed
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Please send payment to {restaurantName}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-base sm:text-lg font-black text-[#048747]">
                    {formatPrice(order.total)}
                  </span>
                  {currency === 'USD' && (
                    <div className="text-[10px] text-gray-500 font-mono">
                      ~L${Math.round(order.total * USD_TO_LRD_RATE).toLocaleString()} LRD
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Switcher Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('momo-mtn')}
                  className={`p-2 rounded-xl border text-left font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedPaymentMethod === 'momo-mtn'
                      ? 'border-[#FFCC00] bg-[#FFFBEA] ring-2 ring-[#FFCC00]/30 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-[#FFCC00] text-black font-black flex items-center justify-center text-[10px] shrink-0">M</span>
                  <span className="truncate">MTN MoMo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('orange-money')}
                  className={`p-2 rounded-xl border text-left font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedPaymentMethod === 'orange-money'
                      ? 'border-[#FF6600] bg-[#FFF5EF] ring-2 ring-[#FF6600]/30 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-[#FF6600] text-white font-black flex items-center justify-center text-[10px] shrink-0">O</span>
                  <span className="truncate">Orange</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cod-usd')}
                  className={`p-2 rounded-xl border text-left font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedPaymentMethod === 'cod-usd'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Cash ($)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cod-lrd')}
                  className={`p-2 rounded-xl border text-left font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedPaymentMethod === 'cod-lrd'
                      ? 'border-[#06C167] bg-[#E8F8EE] ring-2 ring-[#06C167]/20 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="font-mono text-xs font-black text-[#048747] shrink-0">L$</span>
                  <span className="truncate">Cash (L$)</span>
                </button>
              </div>

              {/* MoMo / Orange Money Transfer Details */}
              {(selectedPaymentMethod === 'momo-mtn' || selectedPaymentMethod === 'orange-money') && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="text-[11px] text-gray-700 leading-snug">
                    Transfer <strong className="text-gray-900 font-mono font-black">{formatPrice(order.total)}</strong> to <strong>{restaurantName}</strong> ({selectedPaymentMethod === 'momo-mtn' ? 'Dial *156#' : 'Dial *144#'}):
                  </div>

                  {/* 1. Restaurant Primary MoMo Number with Copy Button */}
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase text-gray-500">
                        Restaurant MoMo Number
                      </div>
                      <div className="font-mono text-sm font-black text-[#111827] mt-0.5 truncate">
                        {restaurantPhone}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">
                        Account: {restaurantName}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(restaurantPhone, 'trackerMoMoPhone')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#048747] border border-emerald-200 rounded-xl font-black text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      {copiedField === 'trackerMoMoPhone' ? (
                        <span className="flex items-center gap-1 text-[#048747]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied!</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* 2. Order ID with Copy Button */}
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase text-gray-500">
                        Transfer Reference / Note
                      </div>
                      <div className="font-mono text-sm font-black text-[#048747] mt-0.5">
                        {order.id}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">
                        Attach this Order ID as the transfer reason
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(order.id, 'trackerOrderIdRef')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      {copiedField === 'trackerOrderIdRef' ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied!</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy ID</span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Payment Sent Confirmation Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsPaid(!isPaid)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                      isPaid
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-gray-900 hover:bg-black text-white'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Payment Sent to Kitchen ({formatPrice(order.total)})</span>
                      </>
                    ) : (
                      <span>I have Sent Payment</span>
                    )}
                  </button>
                </div>
              )}

              {/* Cash on Delivery Details */}
              {(selectedPaymentMethod === 'cod-usd' || selectedPaymentMethod === 'cod-lrd') && (
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <span>💵 Cash Payment on Delivery</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Please have exact cash ready (<strong>{selectedPaymentMethod === 'cod-usd' ? `${(order.total || 0).toFixed(2)} USD` : `L${Math.round((order.total || 0) * USD_TO_LRD_RATE).toLocaleString()} LRD`}</strong>) to hand to your courier upon delivery.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contact & Support Section */}
          <div className="pt-3 border-t border-gray-100 space-y-2.5">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Live Order Contacts
            </div>

            {/* 1. Restaurant Contact Card */}
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#06C167] text-white flex items-center justify-center shadow-xs">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-[#111827] text-xs">
                      {restaurantName}
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-[#06C167]" />
                      <span>{restaurantLocation}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`tel:${restaurantPhone}`}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-[#048747] border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition-colors active:scale-95 cursor-pointer"
                  title="Call Restaurant Kitchen"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Kitchen</span>
                </a>
              </div>
              <div className="text-[11px] text-gray-700 bg-white p-2.5 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">MoMo Number</span>
                    <strong className="text-gray-900 font-mono text-xs">{restaurantPhone}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(restaurantPhone, 'trackerPhone')}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedField === 'trackerPhone' ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Order ID Reference</span>
                    <strong className="text-[#048747] font-mono text-xs">{order.id}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.id, 'trackerOrderId')}
                    className="px-2.5 py-1 bg-[#E8F8EE] hover:bg-[#D4F4E0] text-[#048747] rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedField === 'trackerOrderId' ? (
                      <span className="flex items-center gap-1 text-[#048747]">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Delivery Driver Contact Information (Only shown once a driver actually confirms & accepts) */}
            {order.diningMode === 'delivery' && Boolean(driverName) && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#06C167] text-white flex items-center justify-center shadow-xs">
                      <Bike className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900 text-xs flex items-center gap-1.5">
                        <span>{driverName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {driverVehicle}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        {order.delegationStatus === 'out_for_delivery'
                          ? '🛵 Courier is on the way to you'
                          : '🛵 Assigned Monrovia Courier'}
                      </div>
                    </div>
                  </div>

                  {driverPhone && (
                    <a
                      href={`tel:${driverPhone}`}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-[#048747] border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition-colors active:scale-95 cursor-pointer"
                      title="Call Courier"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver</span>
                    </a>
                  )}
                </div>
                {driverPhone && (
                  <div className="text-[11px] text-gray-600 font-mono pl-9">
                    Rider Phone: <strong className="text-gray-900">{driverPhone}</strong>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Action Bar at Bottom */}
          <div className="pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <Minimize2 className="w-4 h-4 stroke-[2.5]" />
              <span>Minimize Tracker &amp; Continue Browsing</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
