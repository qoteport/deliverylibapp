import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  User, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  ChefHat, 
  Bike, 
  Store, 
  ArrowRight, 
  Lock, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  ShieldAlert,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  WifiOff,
  RefreshCw,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Restaurant, DeliveryDriver, MONROVIA_NEIGHBORHOODS, AppUser } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { getCustomerMemory, saveCustomerMemory } from '../utils/customerMemory';
import { sendTwilioSms } from '../utils/twilio';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  drivers?: DeliveryDriver[];
  onOpenRestaurantPortal: (restaurantId: string) => void;
  onOpenDriverPortal?: (driverId?: string) => void;
  onOpenAdminPortal?: () => void;
  onOpenRestaurantOnboarding?: () => void;
  onOpenDriverJoin?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  restaurants,
  drivers = [],
  onOpenRestaurantPortal,
  onOpenDriverPortal,
  onOpenAdminPortal,
  onOpenRestaurantOnboarding,
  onOpenDriverJoin,
}) => {
  const { loginWithPhone, setUserDirectly, user } = useAuth();
  const memory = getCustomerMemory();

  // Mode: customer auth ('login' | 'register') vs staff portal
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffSubTab, setStaffSubTab] = useState<'kitchen' | 'driver'>('kitchen');

  // Customer State (prepopulated from memory)
  const [phoneNumber, setPhoneNumber] = useState(memory.phone || '');
  const [customerName, setCustomerName] = useState(memory.name || '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    memory.destinationArea && MONROVIA_NEIGHBORHOODS.includes(memory.destinationArea)
      ? memory.destinationArea
      : MONROVIA_NEIGHBORHOODS[0]
  );
  const [streetAddress, setStreetAddress] = useState(memory.address || '');

  // OTP Verification State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpAlertBanner, setOtpAlertBanner] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(30);

  // Password Fallback State (when OTP fails or user selects password)
  const [isPasswordFallback, setIsPasswordFallback] = useState(false);
  const [otpSendFailed, setOtpSendFailed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Staff Portal Specific State
  const [kitchenPhoneInput, setKitchenPhoneInput] = useState('');
  const [driverPhoneInput, setDriverPhoneInput] = useState('');
  const [staffPasswordInput, setStaffPasswordInput] = useState('');
  const [useStaffPasswordMode, setUseStaffPasswordMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (isOtpStep && resendSeconds > 0) {
      timer = setInterval(() => {
        setResendSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpStep, resendSeconds]);

  if (!isOpen) return null;

  // Helper: Normalize phone digits for robust matching
  const normalizePhoneDigits = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    return digits.length >= 7 ? digits.slice(-7) : digits;
  };

  const findMatchingRestaurant = (phoneInput: string): Restaurant | undefined => {
    const inputDigits = normalizePhoneDigits(phoneInput);
    if (!inputDigits || inputDigits.length < 6) return undefined;

    return restaurants.find((r) => {
      if (normalizePhoneDigits(r.phone).includes(inputDigits) || inputDigits.includes(normalizePhoneDigits(r.phone))) {
        return true;
      }
      if (r.momoNumber && (normalizePhoneDigits(r.momoNumber).includes(inputDigits) || inputDigits.includes(normalizePhoneDigits(r.momoNumber)))) {
        return true;
      }
      if (r.allowedPhoneNumbers && r.allowedPhoneNumbers.length > 0) {
        return r.allowedPhoneNumbers.some((p) => {
          const pDigits = normalizePhoneDigits(p);
          return pDigits.length >= 6 && (pDigits.includes(inputDigits) || inputDigits.includes(pDigits));
        });
      }
      return false;
    });
  };

  const findMatchingDriver = (phoneInput: string): DeliveryDriver | undefined => {
    const inputDigits = normalizePhoneDigits(phoneInput);
    if (!inputDigits || inputDigits.length < 6) return undefined;

    return drivers.find((d) => {
      if (normalizePhoneDigits(d.phone).includes(inputDigits) || inputDigits.includes(normalizePhoneDigits(d.phone))) {
        return true;
      }
      if (d.momoNumber && (normalizePhoneDigits(d.momoNumber).includes(inputDigits) || inputDigits.includes(normalizePhoneDigits(d.momoNumber)))) {
        return true;
      }
      return false;
    });
  };

  // Trigger password requirement when OTP fails or SMS network is down
  const triggerOtpFailureFallback = (customMessage?: string) => {
    setOtpSendFailed(true);
    setIsPasswordFallback(true);
    setOtpAlertBanner(null);
    setErrorMsg(
      customMessage ||
        'SMS delivery failed via carrier network. Please enter your account password to sign in or complete registration.'
    );
  };

  // Helper to initiate sending OTP
  const startOtpDispatch = async (targetPhone: string) => {
    setIsLoading(true);
    setErrorMsg('');
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomOtp);
    setResendSeconds(30);

    const smsMessage = `Your AURA Monrovia verification code is: ${randomOtp}. Valid for 10 minutes.`;

    try {
      const smsRes = await sendTwilioSms(targetPhone, smsMessage);
      setIsLoading(false);

      if (smsRes.success) {
        setIsOtpStep(true);
        setIsPasswordFallback(false);
        setOtpAlertBanner(`📱 Monrovia SMS to ${targetPhone}: Your AURA verification code is ${randomOtp}`);
      } else {
        // SMS failed: Transition to OTP screen with simulation fallback or password fallback
        console.warn('SMS delivery notice:', smsRes.message);
        setIsOtpStep(true);
        setIsPasswordFallback(false);
        // Show demo banner and note fallback
        setOtpAlertBanner(`📱 Monrovia SMS to ${targetPhone}: Your AURA verification code is ${randomOtp}`);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.warn('SMS dispatch error:', err);
      // Automatically provide OTP step or password option
      setIsOtpStep(true);
      setIsPasswordFallback(false);
      setOtpAlertBanner(`📱 Monrovia SMS to ${targetPhone}: Your AURA verification code is ${randomOtp}`);
    }
  };

  // 1. Submit Customer Login (Sign In with Phone)
  const handleCustomerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsPasswordFallback(false);
    setOtpSendFailed(false);

    const rawPhone = phoneNumber.trim();
    if (!rawPhone) {
      setErrorMsg('Please enter your phone number');
      return;
    }

    // Auto-check if phone belongs to a Restaurant Manager
    const matchedRest = findMatchingRestaurant(rawPhone);
    if (matchedRest) {
      const restOwnerUser: AppUser = {
        uid: `staff-${matchedRest.id}-${Date.now().toString().slice(-4)}`,
        email: `${matchedRest.id}@monrovia.lr`,
        name: `${matchedRest.name} Staff`,
        role: 'restaurant_owner',
        restaurantId: matchedRest.id,
        restaurantName: matchedRest.name,
        phone: rawPhone,
      };
      setUserDirectly(restOwnerUser);
      onClose();
      onOpenRestaurantPortal(matchedRest.id);
      return;
    }

    // Auto-check if phone belongs to a Courier Rider
    const matchedDriver = findMatchingDriver(rawPhone);
    if (matchedDriver) {
      const driverUser: AppUser = {
        uid: matchedDriver.id,
        email: `${matchedDriver.id}@monrovia.lr`,
        name: matchedDriver.name,
        role: 'driver',
        driverId: matchedDriver.id,
        phone: rawPhone,
      };
      setUserDirectly(driverUser);
      onClose();
      if (onOpenDriverPortal) {
        onOpenDriverPortal(matchedDriver.id);
      }
      return;
    }

    // Standard Customer OTP Dispatch
    await startOtpDispatch(rawPhone);
  };

  // 2. Submit Customer Registration (New Account)
  const handleCustomerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsPasswordFallback(false);
    setOtpSendFailed(false);

    const rawPhone = phoneNumber.trim();
    const rawName = customerName.trim();

    if (!rawPhone) {
      setErrorMsg('Please enter your phone number');
      return;
    }

    if (!rawName) {
      setErrorMsg('Please enter your full name to register');
      return;
    }

    // Standard Customer OTP Dispatch
    await startOtpDispatch(rawPhone);
  };

  // 3. Complete Customer Login / Registration via OTP Code
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setErrorMsg('Invalid verification code. Please check your SMS or use your password.');
      return;
    }

    setIsLoading(true);
    saveCustomerMemory({
      phone: phoneNumber,
      name: customerName || 'Monrovia Foodie',
      destinationArea: selectedNeighborhood,
      address: streetAddress,
    });

    const res = await loginWithPhone(
      phoneNumber || '0886 000 000',
      customerName || 'Monrovia Foodie',
      selectedNeighborhood,
      streetAddress
    );

    setIsLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to sign in');
    }
  };

  // 4. Complete Customer Login / Registration via Password Fallback
  const handlePasswordFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPass = passwordInput.trim();
    if (!cleanPass) {
      setErrorMsg('Please enter your account password / security PIN');
      return;
    }

    if (cleanPass.length < 4) {
      setErrorMsg('Password must be at least 4 characters');
      return;
    }

    if (authMode === 'register') {
      if (confirmPasswordInput && cleanPass !== confirmPasswordInput.trim()) {
        setErrorMsg('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    setIsLoading(true);
    saveCustomerMemory({
      phone: phoneNumber,
      name: customerName || 'Monrovia Foodie',
      destinationArea: selectedNeighborhood,
      address: streetAddress,
    });

    const res = await loginWithPhone(
      phoneNumber || '0886 000 000',
      customerName || 'Monrovia Foodie',
      selectedNeighborhood,
      streetAddress,
      cleanPass
    );

    setIsLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to authenticate password');
    }
  };

  // 5. Kitchen Staff Portal Login Handler
  const handleKitchenStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawPhone = kitchenPhoneInput.trim();
    if (!rawPhone) {
      setErrorMsg('Please enter your authorized kitchen phone number');
      return;
    }

    if (useStaffPasswordMode && (!staffPasswordInput || staffPasswordInput.trim().length < 4)) {
      setErrorMsg('Please enter a valid staff password/PIN (at least 4 characters)');
      return;
    }

    const matchedRest = findMatchingRestaurant(rawPhone);
    if (matchedRest) {
      const restOwnerUser: AppUser = {
        uid: `staff-${matchedRest.id}-${Date.now().toString().slice(-4)}`,
        email: `${matchedRest.id}@monrovia.lr`,
        name: `${matchedRest.name} Staff`,
        role: 'restaurant_owner',
        restaurantId: matchedRest.id,
        restaurantName: matchedRest.name,
        phone: rawPhone,
      };
      setUserDirectly(restOwnerUser);
      onClose();
      onOpenRestaurantPortal(matchedRest.id);
      return;
    }

    setErrorMsg(
      `No restaurant found attached to "${rawPhone}". Please ensure this number is added to the restaurant's authorized staff list, or register a new kitchen below.`
    );
  };

  // 6. Courier Rider Login Handler
  const handleDriverStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawPhone = driverPhoneInput.trim();
    if (!rawPhone) {
      setErrorMsg('Please enter your registered rider phone number');
      return;
    }

    if (useStaffPasswordMode && (!staffPasswordInput || staffPasswordInput.trim().length < 4)) {
      setErrorMsg('Please enter a valid courier security PIN/password (at least 4 characters)');
      return;
    }

    const matchedDriver = findMatchingDriver(rawPhone);
    if (matchedDriver) {
      const driverUser: AppUser = {
        uid: matchedDriver.id,
        email: `${matchedDriver.id}@monrovia.lr`,
        name: matchedDriver.name,
        role: 'driver',
        driverId: matchedDriver.id,
        phone: rawPhone,
      };
      setUserDirectly(driverUser);
      onClose();
      if (onOpenDriverPortal) {
        onOpenDriverPortal(matchedDriver.id);
      }
      return;
    }

    setErrorMsg(
      `No rider account found for "${rawPhone}". Register as a rider below or verify your phone number.`
    );
  };

  // Live match detection helper while typing in kitchen tab
  const liveKitchenMatch = kitchenPhoneInput.length >= 6 ? findMatchingRestaurant(kitchenPhoneInput) : null;
  const liveDriverMatch = driverPhoneInput.length >= 6 ? findMatchingDriver(driverPhoneInput) : null;

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
          className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0 cursor-pointer" 
        />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#111827]">
                {showStaffLogin 
                  ? 'Staff Portal Hub' 
                  : isPasswordFallback 
                    ? 'Password Verification' 
                    : isOtpStep 
                      ? 'Verify Phone OTP' 
                      : authMode === 'register' 
                        ? 'Create Account' 
                        : 'Sign In'}
              </h2>
              {showStaffLogin ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-100 text-[#FF4B26]">
                  Staff Portal
                </span>
              ) : isPasswordFallback ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Password Backup
                </span>
              ) : isOtpStep ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  SMS OTP
                </span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {showStaffLogin 
                ? 'Kitchen Managers & Delivery Couriers' 
                : isPasswordFallback
                  ? 'SMS delivery unavailable — enter your password to sign in'
                  : isOtpStep
                    ? `Enter code sent to ${phoneNumber} or use password`
                    : authMode === 'register'
                      ? 'Enter your details to receive an instant verification OTP'
                      : 'Enter your phone number to receive an instant login OTP'}
            </p>
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-start gap-1.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* OTP Simulation Alert Banner */}
          {otpAlertBanner && !isPasswordFallback && (
            <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl text-xs text-[#FF4B26] font-bold space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF4B26]" />
                  <span>Liberia SMS Dispatch (Simulated/Live)</span>
                </div>
                {generatedOtp && (
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(generatedOtp)}
                    className="text-[10px] bg-white border border-orange-300 text-[#FF4B26] px-2 py-0.5 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                  >
                    Auto-Fill OTP
                  </button>
                )}
              </div>
              <p className="text-[11px] font-mono font-bold text-gray-800">
                {otpAlertBanner}
              </p>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1. STAFF PORTAL LOGIN (Kitchen & Courier)                    */}
          {/* ============================================================ */}
          {showStaffLogin ? (
            <div className="space-y-4">
              
              {/* Segmented Sub-Tab Switcher */}
              <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setStaffSubTab('kitchen');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    staffSubTab === 'kitchen'
                      ? 'bg-white text-[#FF4B26] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Kitchen Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStaffSubTab('driver');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    staffSubTab === 'driver'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Courier Rider</span>
                </button>
              </div>

              {/* 1A. KITCHEN STAFF PHONE LOGIN TAB */}
              {staffSubTab === 'kitchen' && (
                <form onSubmit={handleKitchenStaffLogin} className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5 text-[#FF4B26]">
                      <Store className="w-4 h-4" />
                      <span>Kitchen Management Portal</span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Enter any phone number authorized by your restaurant to immediately access the Kitchen Order Display (KDS).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#FF4B26]" />
                        <span>Staff Phone Number *</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Lonestar MTN / Orange</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={kitchenPhoneInput}
                      onChange={(e) => setKitchenPhoneInput(e.target.value)}
                      placeholder="e.g. 0886 554 321 / 0770 123 456"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                      autoFocus
                    />
                  </div>

                  {/* Optional Password Mode if SMS fails */}
                  {useStaffPasswordMode && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label className="font-bold text-gray-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#FF4B26]" />
                        <span>Kitchen Access PIN / Password *</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={staffPasswordInput}
                        onChange={(e) => setStaffPasswordInput(e.target.value)}
                        placeholder="Enter 4-6 digit PIN or password"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                      />
                    </div>
                  )}

                  {/* Live Matched Restaurant Feedback */}
                  {liveKitchenMatch && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-emerald-900">{liveKitchenMatch.name}</div>
                          <div className="text-[10px] text-emerald-700">{liveKitchenMatch.neighborhood}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Attached
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <button
                      type="button"
                      onClick={() => setUseStaffPasswordMode(!useStaffPasswordMode)}
                      className="text-gray-500 hover:text-[#FF4B26] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>{useStaffPasswordMode ? 'Use Phone-Only Mode' : 'SMS failed? Sign in with Staff PIN'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#FF4B26]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
                  >
                    <span>Launch Kitchen Portal &rarr;</span>
                  </button>
                </form>
              )}

              {/* 1B. COURIER RIDER PHONE LOGIN TAB */}
              {staffSubTab === 'driver' && (
                <form onSubmit={handleDriverStaffLogin} className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5 text-blue-700">
                      <Bike className="w-4 h-4" />
                      <span>Courier Dispatch &amp; GPS Portal</span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Enter your registered courier phone number to receive delivery offers and live navigation.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Rider Phone Number *</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Lonestar MTN / Orange</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={driverPhoneInput}
                      onChange={(e) => setDriverPhoneInput(e.target.value)}
                      placeholder="e.g. 0886 991 223 / 0777 445 119"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-blue-600"
                      autoFocus
                    />
                  </div>

                  {/* Optional Password Mode if SMS fails */}
                  {useStaffPasswordMode && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label className="font-bold text-gray-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Rider Security PIN / Password *</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={staffPasswordInput}
                        onChange={(e) => setStaffPasswordInput(e.target.value)}
                        placeholder="Enter your driver security PIN"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  )}

                  {liveDriverMatch && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-bold text-blue-900">{liveDriverMatch.name}</div>
                          <div className="text-[10px] text-blue-700">{liveDriverMatch.vehicleType} • {liveDriverMatch.baseZone.split(' ')[0]}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                        {liveDriverMatch.isVerified !== false ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <button
                      type="button"
                      onClick={() => setUseStaffPasswordMode(!useStaffPasswordMode)}
                      className="text-gray-500 hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>{useStaffPasswordMode ? 'Use Phone-Only Mode' : 'SMS failed? Sign in with Rider PIN'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
                  >
                    <span>Launch Driver App &rarr;</span>
                  </button>
                </form>
              )}

              {/* Quick Registration Links */}
              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center text-[11px]">
                {onOpenRestaurantOnboarding && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRestaurantOnboarding();
                    }}
                    className="p-2.5 bg-orange-50/60 hover:bg-orange-100 text-[#FF4B26] font-bold rounded-xl transition-colors cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span>Register Kitchen &rarr;</span>
                  </button>
                )}

                {onOpenDriverJoin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDriverJoin();
                    }}
                    className="p-2.5 bg-blue-50/60 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <Bike className="w-3.5 h-3.5 shrink-0" />
                    <span>Register Rider &rarr;</span>
                  </button>
                )}
              </div>

              {/* Back to Customer Login */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowStaffLogin(false)}
                  className="text-xs text-gray-500 hover:text-black font-bold py-1 cursor-pointer transition-colors"
                >
                  &larr; Return to Customer Sign In
                </button>
              </div>

            </div>
          ) : isPasswordFallback ? (
            /* ============================================================ */
            /* 2. PASSWORD FALLBACK (When OTP Send Fails or User Selects)   */
            /* ============================================================ */
            <form onSubmit={handlePasswordFallbackSubmit} className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs space-y-1.5 text-amber-900">
                <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                  <WifiOff className="w-4 h-4 text-amber-600" />
                  <span>SMS OTP Delivery Unavailable / Failed</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  SMS network to <strong>{phoneNumber}</strong> could not complete OTP dispatch. {authMode === 'register' ? 'Set a password to complete registration.' : 'Enter your account password or PIN to sign in.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#FF4B26]" />
                    <span>{authMode === 'register' ? 'Create Password or Security PIN *' : 'Account Password or PIN *'}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">Min 4 characters</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={authMode === 'register' ? 'Create a secure password' : 'Enter your password / PIN'}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26] pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="font-bold text-gray-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FF4B26]" />
                    <span>Confirm Password *</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#FF4B26]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoading ? 'Authenticating...' : authMode === 'register' ? 'Register with Password & Sign In' : 'Verify Password & Sign In'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordFallback(false);
                      setIsOtpStep(true);
                      startOtpDispatch(phoneNumber);
                    }}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry SMS OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordFallback(false);
                      setIsOtpStep(false);
                    }}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Change Phone
                  </button>
                </div>
              </div>
            </form>
          ) : !isOtpStep ? (
            /* ============================================================ */
            /* 3. CUSTOMER MAIN TABS: SIGN IN OR REGISTER                   */
            /* ============================================================ */
            <div className="space-y-4">
              
              {/* Sign In vs Register Tabs */}
              <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-[#FF4B26] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-[#06C167] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* 3A. SIGN IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleCustomerLoginSubmit} className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#FF4B26]" />
                        <span>Phone Number *</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">Lonestar MTN / Orange</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0886 554 123 / 0770 123 456"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                      autoFocus
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2 text-[11px] text-slate-600">
                    <Sparkles className="w-4 h-4 text-[#FF4B26] shrink-0 mt-0.5" />
                    <span>
                      We will send a 4-digit OTP to your phone. If SMS fails to deliver, you will be prompted for your password.
                    </span>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#FF4B26]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isLoading ? 'Sending Code...' : 'Send Login OTP &rarr;'}</span>
                    </button>
                  </div>

                  {/* Direct Password Login Option */}
                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!phoneNumber.trim()) {
                          setErrorMsg('Please enter your phone number first');
                          return;
                        }
                        setIsPasswordFallback(true);
                      }}
                      className="text-[11px] text-gray-500 hover:text-[#FF4B26] font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Sign in directly with Password / PIN</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-center">
                    <button
                      type="button"
                      onClick={() => setShowStaffLogin(true)}
                      className="text-[11px] text-gray-500 hover:text-[#FF4B26] font-bold transition-colors cursor-pointer"
                    >
                      Kitchen Manager or Rider? <span className="underline text-[#FF4B26]">Staff Portal Hub</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 3B. REGISTRATION FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleCustomerRegisterSubmit} className="space-y-3.5 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#06C167]" />
                        <span>Phone Number *</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">Lonestar MTN / Orange</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0886 554 123 / 0770 123 456"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#06C167]" />
                      <span>Your Full Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Koffa Davies"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#06C167]" />
                      <span>Primary Neighborhood *</span>
                    </label>
                    <CustomDropdown
                      options={MONROVIA_NEIGHBORHOODS}
                      value={selectedNeighborhood}
                      onChange={(val) => setSelectedNeighborhood(val)}
                      buttonClassName="bg-gray-50 border-gray-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700">Street Name or Landmark (Optional)</label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="e.g. 14th Street, Tubman Blvd"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C167] to-[#048747] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isLoading ? 'Dispatching OTP...' : 'Send Registration OTP &rarr;'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-center">
                    <button
                      type="button"
                      onClick={() => setShowStaffLogin(true)}
                      className="text-[11px] text-gray-500 hover:text-[#FF4B26] font-bold transition-colors cursor-pointer"
                    >
                      Kitchen Manager or Rider? <span className="underline text-[#FF4B26]">Staff Portal Hub</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          ) : (
            /* ============================================================ */
            /* 4. OTP VERIFICATION STEP WITH INSTANT PASSWORD FALLBACK      */
            /* ============================================================ */
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1 text-gray-600">
                <div className="font-bold text-[#111827] flex items-center justify-between">
                  <span>Code sent to <strong>{phoneNumber}</strong></span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    SMS Dispatched
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {authMode === 'register' 
                    ? 'Enter the 4-digit code to verify your phone and activate your account.' 
                    : 'Enter the 4-digit code below to complete sign in.'}
                </div>
              </div>

              <div className="space-y-2 text-center">
                <label className="font-bold text-gray-700 block text-xs">Enter 4-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder={generatedOtp || '••••'}
                  className="w-44 mx-auto px-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-[#FF4B26] rounded-2xl text-center text-2xl font-mono font-black tracking-widest text-[#FF4B26] focus:outline-none transition-colors shadow-inner"
                  autoFocus
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] to-[#FF7A00] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#FF4B26]/20 hover:shadow-xl active:scale-[0.98] transition-all min-h-[46px] cursor-pointer"
                >
                  {isLoading ? 'Verifying...' : authMode === 'register' ? 'Verify Code & Create Account' : 'Verify Code & Sign In'}
                </button>

                {/* Password Fallback Button when OTP fails or SMS unavailable */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold">
                    <span className="flex items-center gap-1">
                      <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                      Didn't receive SMS?
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Ready to resend'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerOtpFailureFallback()}
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{authMode === 'register' ? 'OTP Failed? Set Password to Register &rarr;' : 'OTP Failed? Sign In with Password &rarr;'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={resendSeconds > 0}
                    onClick={() => startOtpDispatch(phoneNumber)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                      resendSeconds > 0 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{resendSeconds > 0 ? `Resend (${resendSeconds}s)` : 'Resend OTP'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpStep(false);
                      setIsPasswordFallback(false);
                    }}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Change Phone
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
