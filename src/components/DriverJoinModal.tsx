import React, { useState } from 'react';
import { X, Bike, Phone, User, MapPin, DollarSign, ShieldCheck, CheckCircle2, Sparkles, Clock, ArrowRight, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { DeliveryDriver, MONROVIA_NEIGHBORHOODS, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

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
  const [plateNumber, setPlateNumber] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<DeliveryDriver['momoProvider']>('mtn');
  const [baseZone, setBaseZone] = useState(MONROVIA_NEIGHBORHOODS[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredDriver, setRegisteredDriver] = useState<DeliveryDriver | null>(null);

  if (!isOpen) return null;

  const [isMomoNumberManuallyEdited, setIsMomoNumberManuallyEdited] = useState(false);

  // Auto detect Liberia MoMo Provider from prefix
  const detectMomoNetwork = (num: string): DeliveryDriver['momoProvider'] => {
    const clean = num.replace(/\D/g, '');
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
      driverPin: pin.trim(),
      createdAt: new Date().toISOString(),
    };

    // Optimistically register rider in state immediately
    setIsLoading(false);
    setRegisteredDriver(newDriver);
    setIsSuccess(true);
    onDriverRegistered(newDriver);

    // Sync to Firestore in background without blocking the UI
    try {
      await Promise.race([
        setDoc(doc(db, 'drivers', newDriver.id), newDriver),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 3500))
      ]);
    } catch (err) {
      console.warn('Firestore driver background sync notice:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-md shadow-[#06C167]/20">
              <Bike className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111827]">
                Join as Delivery Rider
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Monrovia Courier Fleet Application
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
              Welcome <strong>{registeredDriver.name}</strong>. Your courier profile has been submitted and is currently <strong>Pending Verification</strong>.
            </p>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-left text-xs space-y-1.5 max-w-sm mx-auto">
              <div className="font-extrabold text-[#048747] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Verification Gate &amp; Login PIN</span>
              </div>
              <p className="text-[11px] text-gray-700">
                Your phone number (<strong>{registeredDriver.phone}</strong>) and security PIN (<strong>{registeredDriver.driverPin || '******'}</strong>) will be used to log into your driver dispatch portal.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {onOpenDriverPortal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDriverPortal(registeredDriver.id);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#06C167] to-[#048747] text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl transition-all cursor-pointer"
                >
                  Preview Driver Portal &rarr;
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
              >
                Done
              </button>
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

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Courier Full Name"
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
                <span className="text-[10px] text-gray-400 font-normal">Used if OTP fails</span>
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
              <p className="text-[10px] text-gray-500">
                You will use this PIN to log into the courier app if SMS verification is unavailable.
              </p>
            </div>

            {/* Vehicle Type Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Delivery Vehicle</label>
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

            {/* Base Monrovia Zone */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Preferred Monrovia Base Zone</label>
              <CustomDropdown
                options={MONROVIA_NEIGHBORHOODS}
                value={baseZone}
                onChange={(val) => setBaseZone(val)}
                buttonClassName="bg-gray-50 border-gray-200"
              />
            </div>

            {/* MoMo Payout Number & Network */}
            <div className="space-y-2">
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

              {/* Supported MoMo Network */}
              <div className="space-y-1 mt-2">
                <label className="font-bold text-gray-700 text-[11px] block">
                  Supported MoMo Network
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMomoProvider('mtn')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      momoProvider === 'mtn'
                        ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Lonestar MTN (088 / 055)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMomoProvider('orange')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      momoProvider === 'orange'
                        ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#FF7A00]" />
                    <span>Orange Money (077)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl active:scale-[0.98] transition-all min-h-[46px] cursor-pointer"
              >
                {isLoading ? 'Submitting Application...' : 'Submit Rider Application'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
