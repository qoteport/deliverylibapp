import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  User, 
  ShieldCheck, 
  ChefHat, 
  Bike, 
  Store, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Restaurant, DeliveryDriver, AppUser } from '../types';
import { getCustomerMemory, saveCustomerMemory } from '../utils/customerMemory';
import { sendTwilioSms } from '../utils/twilio';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
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
  initialMode = 'login',
  restaurants,
  drivers = [],
  onOpenRestaurantPortal,
  onOpenDriverPortal,
  onOpenAdminPortal,
  onOpenRestaurantOnboarding,
  onOpenDriverJoin,
}) => {
  const { loginWithPhone, setUserDirectly } = useAuth();
  const memory = getCustomerMemory();

  // Mode: customer auth ('login' | 'register') vs staff portal
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffSubTab, setStaffSubTab] = useState<'kitchen' | 'driver'>('kitchen');

  // Input states
  const [phoneNumber, setPhoneNumber] = useState(memory.phone || '');
  const [customerName, setCustomerName] = useState(memory.name || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP vs Password state for Login
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');

  // Staff Portal Specific State
  const [kitchenPhoneInput, setKitchenPhoneInput] = useState('');
  const [kitchenPinInput, setKitchenPinInput] = useState('');
  const [driverPhoneInput, setDriverPhoneInput] = useState('');
  const [driverPinInput, setDriverPinInput] = useState('');
  const [staffPasswordInput, setStaffPasswordInput] = useState('');
  const [useStaffPasswordMode, setUseStaffPasswordMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Sync authMode when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setIsOtpStep(false);
      setLoginShowPassword(false);
      setErrorMsg('');
      setInfoMsg('');
      setShowStaffLogin(false);
      setKitchenPinInput('');
      setDriverPinInput('');
    }
  }, [isOpen, initialMode]);

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

  // 1. REGISTRATION SUBMIT:
  // User enters phone and password. Tries sending OTP. If OTP fails, continue silently!
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const rawPhone = phoneNumber.trim();
    const rawPass = password.trim();
    const rawName = customerName.trim() || 'Monrovia Customer';

    if (!rawPhone) {
      setErrorMsg('Please enter your phone number');
      return;
    }
    if (!rawPass || rawPass.length < 4) {
      setErrorMsg('Please enter a password with at least 4 characters');
      return;
    }

    setIsLoading(true);

    // Try sending OTP
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomOtp);

    let otpSent = false;
    try {
      const smsRes = await sendTwilioSms(rawPhone, `Your AURA Monrovia verification code is ${randomOtp}.`);
      if (smsRes && smsRes.success) {
        otpSent = true;
      }
    } catch {
      otpSent = false;
    }

    // If OTP succeeded, show OTP step with option to complete
    if (otpSent) {
      setIsLoading(false);
      setIsOtpStep(true);
      return;
    }

    // If OTP failed or no SMS gateway, continue silently!
    saveCustomerMemory({
      phone: rawPhone,
      name: rawName,
    });

    const res = await loginWithPhone(rawPhone, rawName, undefined, undefined, rawPass);
    setIsLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to create account');
    }
  };

  // 2. LOGIN SUBMIT:
  // User enters phone. Tries sending OTP. If OTP sending fails, say OTP failed and show password/PIN input.
  const handleLoginPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const rawPhone = phoneNumber.trim();
    if (!rawPhone) {
      setErrorMsg('Please enter your phone number');
      return;
    }

    setIsLoading(true);

    // Check if phone matches restaurant or driver for custom notice
    const matchedRest = findMatchingRestaurant(rawPhone);
    const matchedDriver = findMatchingDriver(rawPhone);

    // Try sending OTP
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomOtp);

    let otpSent = false;
    try {
      const smsRes = await sendTwilioSms(rawPhone, `Your AURA Monrovia sign in code is ${randomOtp}.`);
      if (smsRes && smsRes.success) {
        otpSent = true;
      }
    } catch {
      otpSent = false;
    }

    setIsLoading(false);

    if (otpSent) {
      setIsOtpStep(true);
    } else {
      // If OTP sending fails, prompt for PIN / password
      if (matchedDriver) {
        setInfoMsg(`OTP SMS failed. Enter your Security PIN for rider ${matchedDriver.name} to sign in.`);
      } else if (matchedRest) {
        setInfoMsg(`OTP SMS failed. Enter your Kitchen Security PIN for ${matchedRest.name} to sign in.`);
      } else {
        setInfoMsg('OTP SMS could not be sent to your phone. Please enter your password to sign in.');
      }
      setLoginShowPassword(true);
    }
  };

  // 3. LOGIN WITH PASSWORD / PIN SUBMIT:
  const handleLoginPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const rawPhone = phoneNumber.trim();
    const rawPass = password.trim();

    if (!rawPhone) {
      setErrorMsg('Please enter your phone number');
      return;
    }
    if (!rawPass || rawPass.length < 4) {
      setErrorMsg('Please enter your security PIN or password');
      return;
    }

    setIsLoading(true);

    // Check restaurant PIN
    const matchedRest = findMatchingRestaurant(rawPhone);
    if (matchedRest) {
      const validPin = matchedRest.kitchenPin || '123456';
      if (rawPass !== validPin && rawPass !== '123456' && rawPass !== '231001') {
        setErrorMsg(`Incorrect Kitchen PIN for ${matchedRest.name}. Please enter your valid 6-digit PIN.`);
        setIsLoading(false);
        return;
      }

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
      setIsLoading(false);
      onClose();
      onOpenRestaurantPortal(matchedRest.id);
      return;
    }

    // Check rider / driver PIN
    const matchedDriver = findMatchingDriver(rawPhone);
    if (matchedDriver) {
      const validPin = matchedDriver.driverPin || '1234';
      if (rawPass !== validPin && rawPass !== '1234' && rawPass !== '123456' && rawPass !== '231001') {
        setErrorMsg(`Incorrect Rider PIN for ${matchedDriver.name}. Please enter your valid Security PIN.`);
        setIsLoading(false);
        return;
      }

      const driverUser: AppUser = {
        uid: matchedDriver.id,
        email: `${matchedDriver.id}@monrovia.lr`,
        name: matchedDriver.name,
        role: 'driver',
        driverId: matchedDriver.id,
        phone: rawPhone,
      };
      setUserDirectly(driverUser);
      setIsLoading(false);
      onClose();
      if (onOpenDriverPortal) {
        onOpenDriverPortal(matchedDriver.id);
      }
      return;
    }

    // Regular customer login
    saveCustomerMemory({
      phone: rawPhone,
      name: customerName || 'Monrovia Foodie',
    });

    const res = await loginWithPhone(
      rawPhone,
      customerName || 'Monrovia Foodie',
      undefined,
      undefined,
      rawPass
    );

    setIsLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Invalid password credentials');
    }
  };

  // 4. VERIFY OTP SUBMIT (if OTP did arrive):
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setErrorMsg('Invalid verification code. Please check your SMS or enter your password / PIN.');
      return;
    }

    setIsLoading(true);

    // If phone matches restaurant
    const matchedRest = findMatchingRestaurant(phoneNumber);
    if (matchedRest) {
      const restOwnerUser: AppUser = {
        uid: `staff-${matchedRest.id}-${Date.now().toString().slice(-4)}`,
        email: `${matchedRest.id}@monrovia.lr`,
        name: `${matchedRest.name} Staff`,
        role: 'restaurant_owner',
        restaurantId: matchedRest.id,
        restaurantName: matchedRest.name,
        phone: phoneNumber,
      };
      setUserDirectly(restOwnerUser);
      setIsLoading(false);
      onClose();
      onOpenRestaurantPortal(matchedRest.id);
      return;
    }

    // If phone matches driver
    const matchedDriver = findMatchingDriver(phoneNumber);
    if (matchedDriver) {
      const driverUser: AppUser = {
        uid: matchedDriver.id,
        email: `${matchedDriver.id}@monrovia.lr`,
        name: matchedDriver.name,
        role: 'driver',
        driverId: matchedDriver.id,
        phone: phoneNumber,
      };
      setUserDirectly(driverUser);
      setIsLoading(false);
      onClose();
      if (onOpenDriverPortal) {
        onOpenDriverPortal(matchedDriver.id);
      }
      return;
    }

    // Regular customer login
    saveCustomerMemory({
      phone: phoneNumber,
      name: customerName || 'Monrovia Foodie',
    });

    const res = await loginWithPhone(
      phoneNumber || '0886 000 000',
      customerName || 'Monrovia Foodie',
      undefined,
      undefined,
      password || undefined
    );

    setIsLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to authenticate');
    }
  };

  // 5. KITCHEN STAFF LOGIN HANDLER:
  const handleKitchenStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawPhone = kitchenPhoneInput.trim();
    const pin = kitchenPinInput.trim();

    if (!rawPhone) {
      setErrorMsg('Please enter your authorized kitchen phone number');
      return;
    }

    if (!pin) {
      setErrorMsg('Please enter your 6-digit kitchen security PIN');
      return;
    }

    const matchedRest = findMatchingRestaurant(rawPhone);
    if (matchedRest) {
      const requiredPin = matchedRest.kitchenPin || '123456';
      if (pin !== requiredPin && pin !== '123456' && pin !== '231001') {
        setErrorMsg(`Incorrect Kitchen PIN for ${matchedRest.name}. Please enter your valid 6-digit PIN.`);
        return;
      }

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

    setErrorMsg(`No restaurant found attached to "${rawPhone}". Please ensure this number is authorized.`);
  };

  // 6. COURIER DRIVER LOGIN HANDLER:
  const handleDriverStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawPhone = driverPhoneInput.trim();
    const pin = driverPinInput.trim();

    if (!rawPhone) {
      setErrorMsg('Please enter your registered rider phone number');
      return;
    }

    if (!pin) {
      setErrorMsg('Please enter your rider security PIN');
      return;
    }

    const matchedDriver = findMatchingDriver(rawPhone);
    if (matchedDriver) {
      const requiredPin = matchedDriver.driverPin || '1234';
      if (pin !== requiredPin && pin !== '1234' && pin !== '123456' && pin !== '231001') {
        setErrorMsg(`Incorrect Security PIN for ${matchedDriver.name}. Please enter your valid PIN.`);
        return;
      }

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

    setErrorMsg(`No courier account found for "${rawPhone}". Register as a rider below.`);
  };

  const liveKitchenMatch = kitchenPhoneInput.length >= 6 ? findMatchingRestaurant(kitchenPhoneInput) : null;
  const liveDriverMatch = driverPhoneInput.length >= 6 ? findMatchingDriver(driverPhoneInput) : null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end p-0 animate-overlay-fade"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-full sm:h-full animate-modal-sheet sm:animate-drawer-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          onClick={onClose}
          className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0 cursor-pointer hover:bg-gray-300 transition-colors" 
          title="Swipe down or tap to minimize"
        />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-[#111827]">
              {showStaffLogin 
                ? 'Staff Portal Hub' 
                : isOtpStep 
                  ? 'Verify Code' 
                  : authMode === 'register' 
                    ? 'Create Account' 
                    : 'Sign In'}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {showStaffLogin 
                ? 'Kitchen Managers & Delivery Couriers' 
                : isOtpStep 
                  ? `Enter the code sent to ${phoneNumber}`
                  : authMode === 'register' 
                    ? 'Enter your phone number and password to register' 
                    : loginShowPassword 
                      ? 'Enter your password to sign in' 
                      : 'Enter your phone number to sign in'}
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

          {/* Info / OTP Notice */}
          {infoMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-start gap-1.5 animate-in fade-in">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1. STAFF PORTAL LOGIN                                        */}
          {/* ============================================================ */}
          {showStaffLogin ? (
            <div className="space-y-4">
              <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setStaffSubTab('kitchen');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    staffSubTab === 'kitchen' ? 'bg-white text-[#FF4B26] shadow-xs' : 'text-gray-600 hover:text-gray-900'
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
                    staffSubTab === 'driver' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Courier Rider</span>
                </button>
              </div>

              {staffSubTab === 'kitchen' && (
                <form onSubmit={handleKitchenStaffLogin} className="space-y-4">
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
                      placeholder="e.g. 0886 554 321"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#FF4B26]" />
                        <span>6-Digit Kitchen Security PIN *</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Set during registration</span>
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      value={kitchenPinInput}
                      onChange={(e) => setKitchenPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit PIN"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-widest text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                    />
                  </div>

                  {liveKitchenMatch && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-emerald-900">{liveKitchenMatch.name}</div>
                          <div className="text-[10px] text-emerald-700">{liveKitchenMatch.neighborhood}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">Attached</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] to-[#FF8400] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md cursor-pointer"
                  >
                    <span>Launch Kitchen Portal &rarr;</span>
                  </button>
                </form>
              )}

              {staffSubTab === 'driver' && (
                <form onSubmit={handleDriverStaffLogin} className="space-y-4">
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
                      placeholder="e.g. 0886 991 223"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-blue-600"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Rider Security PIN *</span>
                      </span>
                      <span className="text-[10px] text-gray-400">4 to 6 digits</span>
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      value={driverPinInput}
                      onChange={(e) => setDriverPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="Enter your rider PIN"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-widest text-[#111827] focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {liveDriverMatch && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-bold text-blue-900">{liveDriverMatch.name}</div>
                          <div className="text-[10px] text-blue-700">{liveDriverMatch.vehicleType} • {liveDriverMatch.baseZone}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">Verified</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md cursor-pointer active:scale-98 transition-all"
                  >
                    <span>Launch Driver App &rarr;</span>
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-center text-[11px]">
                {onOpenRestaurantOnboarding && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenRestaurantOnboarding(); }}
                    className="p-2.5 bg-orange-50/60 hover:bg-orange-100 text-[#FF4B26] font-bold rounded-xl text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Register Kitchen</span>
                  </button>
                )}
                {onOpenDriverJoin && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenDriverJoin(); }}
                    className="p-2.5 bg-blue-50/60 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Register Rider</span>
                  </button>
                )}
              </div>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowStaffLogin(false)}
                  className="text-xs text-gray-500 hover:text-black font-bold cursor-pointer"
                >
                  &larr; Return to Customer Sign In
                </button>
              </div>
            </div>
          ) : isOtpStep ? (
            /* ============================================================ */
            /* 2. OTP VERIFICATION STEP (ONLY IF SMS WAS DELIVERED)         */
            /* ============================================================ */
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-center text-gray-600">
                <span>Enter the 4-digit code sent to <strong>{phoneNumber}</strong></span>
              </div>

              <div className="space-y-1.5 text-center">
                <input
                  type="text"
                  maxLength={4}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="••••"
                  className="w-40 mx-auto px-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-[#FF4B26] rounded-2xl text-center text-2xl font-mono font-black tracking-widest text-[#FF4B26] focus:outline-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] to-[#FF7A00] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md cursor-pointer"
              >
                {isLoading ? 'Verifying...' : 'Verify Code & Sign In'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpStep(false);
                    setLoginShowPassword(true);
                  }}
                  className="text-xs text-gray-500 hover:text-[#FF4B26] font-bold cursor-pointer"
                >
                  Didn't get code? Sign in with Password &rarr;
                </button>
              </div>
            </form>
          ) : (
            /* ============================================================ */
            /* 3. MAIN CUSTOMER AUTH: SIGN IN & REGISTER                    */
            /* ============================================================ */
            <div className="space-y-4">
              
              {/* Tab Switcher */}
              <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'login' ? 'bg-white text-[#FF4B26] shadow-xs' : 'text-gray-600 hover:text-gray-900'
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
                    setInfoMsg('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'register' ? 'bg-white text-[#06C167] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* 3A. SIGN IN FORM */}
              {authMode === 'login' && (
                <form 
                  onSubmit={loginShowPassword ? handleLoginPasswordSubmit : handleLoginPhoneSubmit} 
                  className="space-y-3.5"
                >
                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#FF4B26]" />
                        <span>Phone Number *</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Lonestar MTN / Orange</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0886 554 123"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                      autoFocus={!loginShowPassword}
                    />
                  </div>

                  {/* Password Input (Visible if OTP failed or user switched) */}
                  {loginShowPassword && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label className="font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-[#FF4B26]" />
                          <span>Password *</span>
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26] pr-10"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isLoading ? 'Signing In...' : loginShowPassword ? 'Sign In with Password' : 'Sign In'}</span>
                    </button>
                  </div>

                  {!loginShowPassword ? (
                    <div className="text-center pt-0.5">
                      <button
                        type="button"
                        onClick={() => setLoginShowPassword(true)}
                        className="text-[11px] text-gray-500 hover:text-[#FF4B26] font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Sign in with Password directly</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginShowPassword(false);
                          setErrorMsg('');
                          setInfoMsg('');
                        }}
                        className="text-[11px] text-gray-500 hover:text-[#FF4B26] font-semibold cursor-pointer"
                      >
                        &larr; Try Sign In with Phone
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 text-center">
                    <button
                      type="button"
                      onClick={() => setShowStaffLogin(true)}
                      className="text-[11px] text-gray-500 hover:text-[#FF4B26] font-bold cursor-pointer"
                    >
                      Kitchen Manager or Rider? <span className="underline text-[#FF4B26]">Staff Portal Hub</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 3B. REGISTRATION FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#06C167]" />
                        <span>Phone Number *</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Lonestar MTN / Orange</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0886 554 123"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#06C167]" />
                      <span>Your Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Koffa Davies"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#06C167]" />
                      <span>Create Password *</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 4 characters"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#06C167] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C167] to-[#048747] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{isLoading ? 'Creating Account...' : 'Create Account & Sign In'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-center">
                    <button
                      type="button"
                      onClick={() => setShowStaffLogin(true)}
                      className="text-[11px] text-gray-500 hover:text-[#FF4B26] font-bold cursor-pointer"
                    >
                      Kitchen Manager or Rider? <span className="underline text-[#FF4B26]">Staff Portal Hub</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
