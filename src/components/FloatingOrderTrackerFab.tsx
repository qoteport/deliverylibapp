import React, { useState, useEffect } from 'react';
import { Clock, Bike, Flame, ChefHat, CheckCircle2, ChevronUp, X, Sparkles } from 'lucide-react';
import { Order } from '../types';

interface FloatingOrderTrackerFabProps {
  order: Order | null;
  isOpen: boolean;
  onOpenTracker: () => void;
  onDismiss?: () => void;
}

export const FloatingOrderTrackerFab: React.FC<FloatingOrderTrackerFabProps> = ({
  order,
  isOpen,
  onOpenTracker,
  onDismiss,
}) => {
  if (!order || isOpen) return null;

  // Don't show if completed or cancelled
  if (order.status === 'completed' || order.status === 'cancelled') return null;

  const isConfirmed = order.status !== 'received';
  const prepMinutes = order.prepDurationMinutes || (order.diningMode === 'pickup' ? 15 : order.diningMode === 'dine-in' ? 12 : 25);

  const calculateSecondsLeft = () => {
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
    setSecondsRemaining(calculateSecondsLeft());
    if (!isConfirmed) return;

    const timer = setInterval(() => {
      setSecondsRemaining(calculateSecondsLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [order.status, order.targetEtaTimestamp, order.confirmedAtTimestamp, order.createdAtTimestamp, isConfirmed]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getStatusDisplay = (status: Order['status']) => {
    switch (status) {
      case 'received':
        return {
          label: 'Awaiting Kitchen Accept',
          icon: Clock,
          color: 'from-amber-500 to-emerald-600',
        };
      case 'preparing':
        return {
          label: 'Kitchen Cooking',
          icon: Flame,
          color: 'from-[#06C167] to-[#048747]',
        };
      case 'plating':
        return {
          label: 'Packed for Delivery',
          icon: ChefHat,
          color: 'from-emerald-500 to-teal-600',
        };
      case 'en-route':
        return {
          label: order.assignedDriverName ? `${order.assignedDriverName.split(' ')[0]} En Route` : 'Courier En Route',
          icon: Bike,
          color: 'from-blue-600 to-indigo-600',
        };
      default:
        return {
          label: 'Order Active',
          icon: CheckCircle2,
          color: 'from-[#06C167] to-[#048747]',
        };
    }
  };

  const { label, icon: Icon, color } = getStatusDisplay(order.status);

  return (
    <div className="fixed bottom-[calc(4.5rem+var(--sab))] sm:bottom-6 right-3 sm:right-6 z-40 animate-in slide-in-from-bottom-3 duration-200">
      <div 
        onClick={onOpenTracker}
        className="group cursor-pointer flex items-center gap-2.5 p-2 pr-3.5 bg-[#111827]/95 hover:bg-black backdrop-blur-md text-white rounded-2xl shadow-xl hover:shadow-2xl border border-white/15 transition-all active:scale-95 ring-2 ring-[#06C167]/30 hover:ring-[#06C167]"
        title="Click to expand live order tracker"
      >
        {/* Animated Status Icon */}
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${color} flex items-center justify-center text-white shadow-md shrink-0 relative`}>
          <Icon className="w-4 h-4 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#111827] animate-ping" />
        </div>

        {/* Status Info */}
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-white truncate">
            <span>{label}</span>
            <span className="font-mono text-[10px] text-emerald-400 bg-white/10 px-1 rounded">
              #{order.id.slice(-4)}
            </span>
          </div>
          <div className="text-[10px] text-gray-300 font-medium flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-gray-400" />
            <span>{!isConfirmed ? 'Timer starts on confirm' : `ETA ~${formatCountdown(secondsRemaining)}`}</span>
          </div>
        </div>

        {/* Expand Indicator */}
        <div className="p-1 bg-white/10 rounded-lg text-white group-hover:bg-[#06C167] transition-colors shrink-0">
          <ChevronUp className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
