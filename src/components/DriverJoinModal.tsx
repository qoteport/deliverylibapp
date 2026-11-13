import React, { useState } from 'react';
import { 
  X, 
  Bike, 
  Phone, 
  User, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound,
  Package,
  Car,
  Zap,
  Calendar,
  Check,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { 
  DeliveryDriver, 
  MONROVIA_NEIGHBORHOODS, 
  MONROVIA_NEIGHBORHOOD_COORDS, 
  DriverServiceType, 
  WeekDay, 
  ActiveShiftSlot, 
  ALL_WEEK_DAYS, 
  SHIFT_SLOT_DEFINITIONS 
} from '../types';
import { CustomDropdown } from './CustomDropdown';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/cleanData';
import { saveDriverToApi } from '../utils/apiSync';
import { sendBrowserNotification, requestNotificationPermission } from '../utils/browserNotifications';
import { sendDriverRegistrationSms } from '../utils/twilio';
import { playOrderAlertSound } from '../utils/audioAlert';

interface DriverJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriverRegistered: (driver: DeliveryDriver) => void;
  onOpenDriverPortal?: (driverId?: string) => void;
}

export const DriverJoinModal: React.FC<DriverJoinModalProps> = ({
  isOpen,
  onClose,
  onDriverRegistered,
  onOpenDriverPortal,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [vehicleType, setVehicleType] = useState<DeliveryDriver['vehicleType']>('Motorbike');
  const [serviceType, setServiceType] = useState<DriverServiceType>('both');
  const [activeDays, setActiveDays] = useState<WeekDay[]>([...ALL_WEEK_DAYS]);
  const [activeTimeSlots, setActiveTimeSlots] = useState<ActiveShiftSlot[]>(['morning', 'afternoon', 'evening']);
  const [plateNumber, setPlateNumber] = useState('');
  const [driverPhoto, setDriverPhoto] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<DeliveryDriver['momoProvider']>('mtn');
  const [baseZone, setBaseZone] = useState(MONROVIA_NEIGHBORHOODS[0]);
  const [deliveryFeeUsd, setDeliveryFeeUsd] = useState('2.00');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredDriver, setRegisteredDriver] = useState<DeliveryDriver | null>(null);

  if (!isOpen) return null;

  const [isMomoNumberManuallyEdited, setIsMomoNumberManuallyEdited] = useState(false);

  // Helper to read and compress image files to clean Data URLs
  const handleImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image file size should be under 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setter(compressed);
        } else {
          setter(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Auto detect Liberia MoMo Provider from prefix
  const detectMomoNetwork = (num: any): DeliveryDriver['momoProvider'] => {
    const clean = String(num || '').replace(/\D/g, '');
    if (
      clean.startsWith('23188') ||
      clean.startsWith('23155') ||
      clean.startsWith('088') ||
      clean.startsWith('055') ||
      clean.startsWith('88') ||
      clean.startsWith('55')
    ) {
      return 'mtn';
    }
    if (
      clean.startsWith('23177') ||
      clean.startsWith('077') ||
      clean.startsWith('77')
    ) {
      return 'orange';
    }
    return 'mtn';
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (!isMomoNumberManuallyEdited || !momoNumber || momoNumber === phone) {
      setMomoNumber(val);
    }
    const detected = detectMomoNetwork(val);
    setMomoProvider(detected);
  };

  const toggleDay = (day: WeekDay) => {
    setActiveDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const toggleShift = (shift: ActiveShiftSlot) => {
    setActiveTimeSlots((prev) => {
      if (prev.includes(shift)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((s) => s !== shift);
      }
      return [...prev, shift];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Please enter your name and contact phone number');
      return;
    }

    if (!pin.trim() || pin.trim().length < 4 || !/^\d{4,6}$/.test(pin.trim())) {
      setErrorMsg('Please set a 4 to 6 digit Security PIN (numbers only)');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const newDriverId = `driver-${Date.now().toString().slice(-6)}`;
    const driverCoords = MONROVIA_NEIGHBORHOOD_COORDS[baseZone] || { lat: 6.2907, lng: -10.7818 };

    const newDriver: DeliveryDriver = {
      id: newDriverId,
      name: name.trim(),
      phone: phone.trim(),
      vehicleType,
      serviceType,
      activeDays,
      activeTimeSlots,
      activeHoursStart: activeTimeSlots.includes('morning') ? '06:00' : '08:00',
      activeHoursEnd: activeTimeSlots.includes('night') ? '04:00' : '22:00',
      plateNumber: plateNumber.trim() || `RL-${vehicleType === 'Motorbike' ? 'MB' : 'KK'}-${Math.floor(1000 + Math.random() * 9000)}`,
      momoNumber: momoNumber.trim() || phone.trim(),
      momoProvider,
      baseZone,
      isOnline: false,
      status: 'offline',
      isVerified: false,
      verificationStatus: 'pending',
      currentLocation: driverCoords,
      rating: 5.0,
      totalDeliveries: 0,
      earningsTodayUsd: 0,
      deliveryFeeUsd: parseFloat(deliveryFeeUsd) || 2.0,
      driverPin: pin.trim(),
      avatar: driverPhoto || undefined,
      driverPhoto: driverPhoto || undefined,
      vehiclePhoto: vehiclePhoto || undefined,
      createdAt: new Date().toISOString(),
    };

    // Optimistically register rider in state immediately
    setIsLoading(false);
    setRegisteredDriver(newDriver);
    setIsSuccess(true);
    onDriverRegistered(newDriver);

    // Request browser notification permission & dispatch celebratory alert
    requestNotificationPermission().catch(() => {});
    playOrderAlertSound();
    sendBrowserNotification({
      title: 'Driver Registration Submitted! 🛵',
      body: `Welcome ${newDriver.name}! Your profile is submitted for ${serviceType === 'both' ? 'Deliveries & Rides' : serviceType === 'delivery' ? 'Food Deliveries' : 'Passenger Rides'} across Monrovia.`,
      tag: `driver-register-${newDriver.id}`,
    });

    // Dispatch Welcome & Verification SMS via Twilio
    sendDriverRegistrationSms(newDriver.phone, newDriver.name, newDriver.driverPin || '******').catch((e) =>
      console.warn('Driver registration SMS dispatch notice:', e)
    );

    // 1. Sync directly to Backend API store for instantaneous cross-device delivery
    saveDriverToApi(newDriver).catch((e) => console.warn('API driver sync notice:', e));

    // 2. Sync to Firebase Firestore
    try {
      await setDoc(doc(db, 'drivers', newDriver.id), sanitizeForFirestore(newDriver), { merge: true });
      console.log('Driver successfully registered to Firestore:', newDriver.id);
    } catch (err) {
      console.warn('Firestore driver write notice:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end p-0 animate-overlay-fade" onClick={onClose}>
      <div 
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-full h-auto sm:h-full animate-modal-sheet sm:animate-drawer-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          onClick={onClose}
          className="w-full py-2.5 flex items-center justify-center sm:hidden shrink-0 cursor-pointer active:scale-95"
          title="Tap to close"
          role="button"
          aria-label="Collapse modal"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-md shadow-[#06C167]/20">
              <Bike className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111827]">
                Join as Driver & Rider
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Deliver food, drive passengers, or both in Monrovia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Pending Verification View */}
        {isSuccess && registeredDriver ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <Clock className="w-8 h-8 stroke-[2.5] animate-pulse" />
            </div>
            <h3 className="text-xl font-extrabold text-[#111827]">
              Application Submitted!
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
              Welcome <strong>{registeredDriver.name}</strong>. Your driver profile has been submitted and is currently <strong>Pending Verification</strong>.
            </p>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="font-extrabold text-[#048747] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Driver Profile Configured</span>
              </div>
              <div className="text-[11px] text-gray-700 space-y-1">
                <div>
                  <span className="font-semibold text-gray-500">Service Mode:</span>{' '}
                  <span className="font-bold text-gray-900">
                    {registeredDriver.serviceType === 'both' ? '⚡ Both Deliveries & Passenger Rides' : registeredDriver.serviceType === 'delivery' ? '📦 Deliveries Only' : '🛵 Passenger Rides Only'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Active Days:</span>{' '}
                  <span className="font-bold text-gray-900">
                    {registeredDriver.activeDays?.join(', ') || 'All Days'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Active Shifts:</span>{' '}
                  <span className="font-bold text-gray-900">
                    {registeredDriver.activeTimeSlots?.map(s => SHIFT_SLOT_DEFINITIONS[s]?.label || s).join(', ') || 'All Shifts'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Login Phone:</span>{' '}
                  <span className="font-mono font-bold text-gray-900">{registeredDriver.phone}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {onOpenDriverPortal ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDriverPortal(registeredDriver.id);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#06C167] to-[#048747] text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Open Driver Portal</span>
                  <span className="text-base">&rarr;</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded-2xl hover:bg-black transition-colors cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Modal Body Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">
                {errorMsg}
              </div>
            )}

            {/* WHAT WOULD YOU LIKE TO DO: WORK PREFERENCE */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#06C167]" />
                <span>What work would you like to do? *</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setServiceType('both')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    serviceType === 'both'
                      ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747] font-extrabold shadow-sm ring-1 ring-[#06C167]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Zap className="w-4 h-4 text-[#06C167]" />
                  <span className="text-xs font-bold leading-tight">Both</span>
                  <span className="text-[9px] text-gray-500 font-normal">Deliveries & Rides</span>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType('delivery')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    serviceType === 'delivery'
                      ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747] font-extrabold shadow-sm ring-1 ring-[#06C167]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold leading-tight">Deliveries</span>
                  <span className="text-[9px] text-gray-500 font-normal">Food & Parcels</span>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType('rides')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    serviceType === 'rides'
                      ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747] font-extrabold shadow-sm ring-1 ring-[#06C167]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Car className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold leading-tight">Drive Rides</span>
                  <span className="text-[9px] text-gray-500 font-normal">Passengers Only</span>
                </button>
              </div>
            </div>

            {/* ACTIVE DAYS OF THE WEEK */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Days You Are Most Active *</span>
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setActiveDays([...ALL_WEEK_DAYS])}
                    className="text-[#06C167] font-bold hover:underline"
                  >
                    All 7 Days
                  </button>
                  <span className="text-gray-300">&bull;</span>
                  <button
                    type="button"
                    onClick={() => setActiveDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Weekdays
                  </button>
                  <span className="text-gray-300">&bull;</span>
                  <button
                    type="button"
                    onClick={() => setActiveDays(['Saturday', 'Sunday'])}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Weekends
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {ALL_WEEK_DAYS.map((day) => {
                  const isDaySelected = activeDays.includes(day);
                  const shortDay = day.slice(0, 3);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      title={day}
                      className={`py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                        isDaySelected
                          ? 'bg-[#06C167] text-white shadow-xs'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {shortDay}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400">
                {activeDays.length} of 7 days selected. Used to inform order dispatch & rider matching.
              </p>
            </div>

            {/* ACTIVE TIME OF DAY / SHIFTS */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Times You Are Most Active *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTimeSlots(['morning', 'afternoon', 'evening', 'night'])}
                  className="text-[10px] text-[#06C167] font-bold hover:underline"
                >
                  Select All 24/7
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['morning', 'afternoon', 'evening', 'night'] as ActiveShiftSlot[]).map((slotKey) => {
                  const def = SHIFT_SLOT_DEFINITIONS[slotKey];
                  const isSlotSelected = activeTimeSlots.includes(slotKey);
                  return (
                    <button
                      key={slotKey}
                      type="button"
                      onClick={() => toggleShift(slotKey)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSlotSelected
                          ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747] font-bold shadow-xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>{def.iconDesc}</span>
                          <span>{def.label}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-normal">
                          {def.timeRange}
                        </div>
                      </div>
                      {isSlotSelected && <Check className="w-4 h-4 text-[#06C167] stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5 pt-1">
              <label className="font-bold text-gray-700">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emmanuel Kollie"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Phone Number (Lonestar MTN / Orange) *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="088... / 077..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
              />
            </div>

            {/* Security Login PIN */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Security Login PIN (4 to 6 Digits) *</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal">For driver portal login</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-6 digit PIN (e.g. 5582)"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-widest text-[#111827] focus:outline-none focus:border-[#06C167]"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Vehicle Type Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Vehicle Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Motorbike', 'Kekeh (Tricycle)', 'Bicycle', 'Car'] as const).map((vt) => (
                  <button
                    key={vt}
                    type="button"
                    onClick={() => setVehicleType(vt)}
                    className={`p-2.5 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      vehicleType === vt
                        ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747] shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>{vt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Plate Number */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Vehicle License Plate (Optional)</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="e.g. RL-MB-4821"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-[#111827] focus:outline-none focus:border-[#06C167]"
              />
            </div>

            {/* Base Monrovia Zone - Searchable Custom Dropdown */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Preferred Monrovia Base Zone / Street</label>
              <CustomDropdown
                options={MONROVIA_NEIGHBORHOODS}
                value={baseZone}
                onChange={(val) => setBaseZone(val)}
                searchPlaceholder="Search 1st-24th St Sinkor, Broad St, etc..."
                buttonClassName="bg-gray-50 border-gray-200"
              />
            </div>

            {/* Custom Courier Delivery Fee */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 flex items-center justify-between">
                <span>Your Standard Delivery Fee ($ USD)</span>
                <span className="text-[10px] text-emerald-600 font-bold">~L${Math.round((parseFloat(deliveryFeeUsd) || 2) * 195).toLocaleString()} LRD</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  step="0.25"
                  min="0.5"
                  required
                  value={deliveryFeeUsd}
                  onChange={(e) => setDeliveryFeeUsd(e.target.value)}
                  placeholder="2.00"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#06C167]"
                />
              </div>
            </div>

            {/* Driver Profile Face & Vehicle Photos */}
            <div className="space-y-3 pt-1">
              <label className="font-bold text-gray-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Driver Photos (Face & Vehicle)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal">Shown to passengers on booking</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Driver Face Photo */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#06C167]" />
                      <span>Face Photo / Selfie</span>
                    </span>
                    {driverPhoto && (
                      <button
                        type="button"
                        onClick={() => setDriverPhoto('')}
                        className="text-red-500 hover:text-red-700 text-[10px] flex items-center gap-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {driverPhoto ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden border border-emerald-200 bg-white">
                      <img src={driverPhoto} alt="Driver Face" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[9px] font-bold">
                        Uploaded
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 hover:border-[#06C167] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white group h-24">
                      <Camera className="w-5 h-5 text-gray-400 group-hover:text-[#06C167] mb-1" />
                      <span className="text-[11px] font-bold text-gray-700 group-hover:text-[#06C167]">Upload Face Photo</span>
                      <span className="text-[9px] text-gray-400">Clear selfie or ID</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileChange(e, setDriverPhoto)}
                      />
                    </label>
                  )}
                </div>

                {/* Driver Vehicle Photo */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Bike className="w-3 h-3 text-[#06C167]" />
                      <span>Vehicle Photo</span>
                    </span>
                    {vehiclePhoto && (
                      <button
                        type="button"
                        onClick={() => setVehiclePhoto('')}
                        className="text-red-500 hover:text-red-700 text-[10px] flex items-center gap-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {vehiclePhoto ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden border border-emerald-200 bg-white">
                      <img src={vehiclePhoto} alt="Driver Vehicle" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[9px] font-bold">
                        Uploaded
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 hover:border-[#06C167] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white group h-24">
                      <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-[#06C167] mb-1" />
                      <span className="text-[11px] font-bold text-gray-700 group-hover:text-[#06C167]">Upload Vehicle</span>
                      <span className="text-[9px] text-gray-400">Bike, Kekeh or Car</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileChange(e, setVehiclePhoto)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* MoMo Payout Number */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 flex items-center justify-between">
                <span>MoMo / Orange Money Payout Number *</span>
                <span className="text-[10px] text-gray-400 font-normal">Auto-filled from phone</span>
              </label>
              <input
                type="text"
                required
                value={momoNumber}
                onChange={(e) => {
                  setMomoNumber(e.target.value);
                  setIsMomoNumberManuallyEdited(true);
                }}
                placeholder="e.g. 0886991223"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#06C167] focus:outline-none focus:border-[#06C167]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl active:scale-[0.98] transition-all min-h-[46px] cursor-pointer"
              >
                {isLoading ? 'Submitting Application...' : 'Submit Driver Application'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
