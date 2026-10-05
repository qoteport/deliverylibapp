import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, ChefHat, Bike, Flame, Utensils, Phone, MapPin, Store, Minimize2, Copy, Check } from 'lucide-react';
import { Order, Currency, USD_TO_LRD_RATE, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';
import { MonroviaDeliveryMap } from './MonroviaDeliveryMap';

interface OrderTrackerModalProps {
  isOpen?: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  currency: Currency;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen = true,
  order,
  onClose,
  currency,
}) => {
  if (!isOpen || !order) return null;

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const isConfirmed = order.status !== 'received';
  const isCompleted = order.status === 'completed';
  const prepMinutes = order.prepDurationMinutes || (order.diningMode === 'pickup' ? 15 : order.diningMode === 'dine-in' ? 12 : 25);

  const calculateSecondsLeft = () => {
    if (isCompleted) return 0;
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

  const steps: { key: Order['status']; label: string; icon: React.ElementType }[] = [
    { key: 'received', label: 'Order Confirmed & Sent to Kitchen', icon: CheckCircle2 },
    { key: 'preparing', label: 'Chef Cooking & Searing', icon: Flame },
    { key: 'plating', label: 'Packed in Thermal Carrier', icon: ChefHat },
    {
      key: 'en-route',
      label: order.diningMode === 'dine-in' ? 'Serving to Table' : order.diningMode === 'pickup' ? 'Ready for Pickup' : order.assignedDriverName ? `${order.assignedDriverName} En Route` : 'Courier En Route',
      icon: order.diningMode === 'dine-in' ? Utensils : Bike,
    },
    { key: 'completed', label: 'Delivered & Completed', icon: CheckCircle2 },
  ];

  const statusOrder: Order['status'][] = ['received', 'preparing', 'plating', 'en-route', 'completed'];
  const currentIndex = statusOrder.indexOf(order.status);

  // Map coordinates
  const restaurantCoords = MONROVIA_NEIGHBORHOOD_COORDS['Sinkor (Tubman Blvd)'];
  const customerCoords = MONROVIA_NEIGHBORHOOD_COORDS[order.deliveryArea || 'Congotown & Old Road'] || { lat: 6.2690, lng: -10.7480 };

  // Restaurant details fallback
  const restaurantName = order.restaurantName || 'Sinkor Kitchen';
  const restaurantLocation = 'Tubman Blvd, Sinkor';
  const restaurantPhone = '+231 886 554 123';

  // Driver details (Real dynamic dispatch info)
  const driverName = order.assignedDriverName || null;
  const driverPhone = order.assignedDriverPhone || null;
  const driverVehicle = order.driverVehicle || 'Motorbike';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-overlay-fade"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          onClick={onClose}
          className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0 cursor-pointer hover:bg-gray-300 transition-colors" 
          title="Swipe down or tap to minimize"
        />

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
          
          {/* Live Countdown Card */}
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

          {/* Live Google Map Interactive View (Delivery Mode) */}
          {order.diningMode === 'delivery' && (
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
              Preparation &amp; Delivery Milestones
            </div>

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
          </div>

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

            {/* 2. Delivery Driver Contact Information (Shown when driver is assigned) */}
            {order.diningMode === 'delivery' && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2 text-xs">
                {driverName ? (
                  <>
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
                          className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-[#048747] border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition-colors active:scale-95"
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
                  </>
                ) : (
                  <div className="flex items-center gap-2.5 py-1 text-gray-600">
                    <div className="w-7 h-7 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                      <Bike className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-gray-900">
                        {order.status === 'received' || order.status === 'preparing' || order.status === 'plating'
                          ? 'Dispatching nearest available Monrovia courier...'
                          : 'Awaiting courier assignment'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Courier details will appear as soon as a driver accepts your delivery
                      </div>
                    </div>
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
