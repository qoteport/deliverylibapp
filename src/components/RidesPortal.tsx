import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Bike, 
  Phone, 
  CarTaxiFront, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ChevronRight, 
  Compass, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Share2,
  History,
  User,
  Image as ImageIcon,
  Star,
  DollarSign,
  Search,
  Timer
} from 'lucide-react';
import { 
  LocationCoords, 
  DeliveryDriver, 
  RideRequest, 
  RideStatus, 
  RideVehicleType,
  USD_TO_LRD_RATE
} from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/cleanData';
import { playOrderAlertSound } from '../utils/audioAlert';
import { sendBrowserNotification } from '../utils/browserNotifications';
import { searchPlacesWithGoogleOrFallback, getExactCoordinates, PlaceSuggestion } from '../utils/placesAutocomplete';
import { LocationPickerModal } from './LocationPickerModal';
import { RideLiveMap } from './RideLiveMap';
import { KekehIcon } from './KekehIcon';

interface RidesPortalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDrivers: DeliveryDriver[];
  isPageMode?: boolean;
}

const RIDE_HISTORY_KEY = 'aura_monrovia_ride_history';

export const RidesPortal: React.FC<RidesPortalProps> = ({
  isOpen,
  onClose,
  availableDrivers,
  isPageMode = false,
}) => {
  const { user } = useAuth();

  // Inputs
  const [pickupAddress, setPickupAddress] = useState('12th Street Sinkor, Tubman Blvd');
  const [pickupCoords, setPickupCoords] = useState<LocationCoords>({ lat: 6.2915, lng: -10.7825 });

  const [destinationAddress, setDestinationAddress] = useState('Broad Street, Central Monrovia');
  const [destinationCoords, setDestinationCoords] = useState<LocationCoords>({ lat: 6.3130, lng: -10.8040 });

  const [vehicleType, setVehicleType] = useState<RideVehicleType>('Motorbike');
  const [passengerName, setPassengerName] = useState(user?.name || '');
  const [passengerPhone, setPassengerPhone] = useState(user?.phone || '+231 ');

  // Flow State
  // 'input' -> 'searching' (finding driver / X drivers found) -> 'accepted' (driver approved + live map) -> 'no_driver_found'
  const [portalStep, setPortalStep] = useState<'input' | 'searching' | 'accepted' | 'no_driver_found'>('input');
  const [searchPhase, setSearchPhase] = useState<'finding' | 'pinging'>('finding');
  const [searchTimerSecs, setSearchTimerSecs] = useState(600); // 10 minutes timeout (600 seconds)
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [activePickerTarget, setActivePickerTarget] = useState<'pickup' | 'destination' | null>(null);

  // Autocomplete Suggestions State
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);

  // Ride History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rideHistory, setRideHistory] = useState<RideRequest[]>(() => {
    try {
      const stored = localStorage.getItem(RIDE_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save to history helper
  const saveToRideHistory = (ride: RideRequest) => {
    setRideHistory((prev) => {
      const filtered = prev.filter((r) => r.id !== ride.id);
      const updated = [ride, ...filtered].slice(0, 30);
      try {
        localStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Live query for Pickup via Google Places / Monrovia Geocoder
  useEffect(() => {
    if (!pickupQuery.trim() || pickupQuery.length < 2) {
      setPickupSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingPickup(true);
      try {
        const results = await searchPlacesWithGoogleOrFallback(pickupQuery);
        setPickupSuggestions(results);
      } catch (err) {
        console.warn('Pickup search notice:', err);
      } finally {
        setIsSearchingPickup(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pickupQuery]);

  // Live query for Dropoff via Google Places / Monrovia Geocoder
  useEffect(() => {
    if (!dropoffQuery.trim() || dropoffQuery.length < 2) {
      setDropoffSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDropoff(true);
      try {
        const results = await searchPlacesWithGoogleOrFallback(dropoffQuery);
        setDropoffSuggestions(results);
      } catch (err) {
        console.warn('Dropoff search notice:', err);
      } finally {
        setIsSearchingDropoff(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [dropoffQuery]);

  // Real-time Firestore sync when active ride is open
  useEffect(() => {
    if (!activeRide?.id) return;

    const unsub = onSnapshot(
      doc(db, 'rides', activeRide.id),
      (snap) => {
        if (snap.exists()) {
          const remoteRide = snap.data() as RideRequest;
          setActiveRide(remoteRide);
          saveToRideHistory(remoteRide);

          // If driver accepted
          if (
            (remoteRide.status === 'accepted' || remoteRide.status === 'arriving' || remoteRide.status === 'in_transit' || remoteRide.status === 'completed') &&
            portalStep === 'searching'
          ) {
            setPortalStep('accepted');
            playOrderAlertSound();
            sendBrowserNotification({
              title: 'Driver Accepted Your Ride! 🛵',
              body: `${remoteRide.assignedDriverName || 'Driver'} accepted your trip. View live route on map!`,
              tag: `ride-accepted-${remoteRide.id}`,
            });
          } else if (remoteRide.status === 'no_driver_found' && portalStep !== 'no_driver_found') {
            setPortalStep('no_driver_found');
          }
        }
      },
      (err) => console.warn('Ride realtime listener notice:', err)
    );

    return () => unsub();
  }, [activeRide?.id, portalStep]);

  // 10-Minute Timeout countdown during searching phase
  useEffect(() => {
    if (portalStep !== 'searching' || !activeRide) return;

    // After 2.5 seconds, transition radar from 'finding' to 'pinging' (X drivers found)
    const phaseTimer = setTimeout(() => {
      setSearchPhase('pinging');
    }, 2500);

    const interval = setInterval(() => {
      setSearchTimerSecs((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSearchTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(phaseTimer);
      clearInterval(interval);
    };
  }, [portalStep, activeRide?.id]);

  // Calculate fare estimates based on vehicle type and trip distance
  const estimatedFareUsd = useMemo(() => {
    const baseFare = vehicleType === 'Motorbike' ? 1.50 : vehicleType === 'Kekeh (Tricycle)' ? 2.50 : 4.00;
    const dLat = destinationCoords.lat - pickupCoords.lat;
    const dLng = destinationCoords.lng - pickupCoords.lng;
    const approxDistKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
    const distanceCharge = Math.max(0, (approxDistKm - 2) * 0.40);
    return Math.round((baseFare + distanceCharge) * 10) / 10;
  }, [vehicleType, pickupCoords, destinationCoords]);

  // Count nearby drivers matching vehicle preference from real available drivers
  const matchingDriversCount = useMemo(() => {
    if (!availableDrivers || availableDrivers.length === 0) return 0;
    return availableDrivers.filter((d) => {
      if (d.serviceType === 'delivery') return false; // Only drivers who do rides or both
      if (vehicleType === 'Motorbike' && (d.vehicleType === 'Motorbike' || d.vehicleType === 'Bicycle')) return true;
      if (vehicleType === 'Kekeh (Tricycle)' && (d.vehicleType?.includes('Kekeh') || d.vehicleType?.includes('Tricycle'))) return true;
      if (vehicleType === 'Taxi (Car)' && d.vehicleType === 'Car') return true;
      return true;
    }).length;
  }, [availableDrivers, vehicleType]);

  // Handle GPS detection: replaces with the actual location name and exact coordinates
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGps(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickupCoords(coords);

        // Reverse geocoding via OpenStreetMap for specific address
        let resolvedName = 'Current Location (GPS)';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood;
            if (road) {
              resolvedName = `${road}, Monrovia`;
            } else if (data.display_name) {
              resolvedName = data.display_name.split(',').slice(0, 2).join(',');
            }
          }
        } catch {}

        setPickupAddress(resolvedName);
        setPickupQuery('');
        setShowPickupDropdown(false);
      },
      () => {
        setIsLocatingGps(false);
        alert('Could not retrieve GPS coordinates. Please type your pickup street or landmark.');
      },
      { timeout: 8000 }
    );
  };

  // Request Ride flow
  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress.trim()) {
      alert('Please enter your pickup spot.');
      return;
    }
    if (!destinationAddress.trim()) {
      alert('Please enter your drop-off destination.');
      return;
    }
    if (!passengerPhone.trim() || passengerPhone.trim().length < 7) {
      alert('Please provide a contact phone number.');
      return;
    }

    const rideId = `ride-${Date.now().toString().slice(-6)}`;
    const newRide: RideRequest = {
      id: rideId,
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Date.now(),
      status: 'searching',
      customerName: passengerName.trim() || 'Passenger',
      customerPhone: passengerPhone.trim(),
      pickupArea: pickupAddress.split(',')[0] || 'Monrovia',
      pickupAddress: pickupAddress.trim(),
      pickupCoords,
      destinationArea: destinationAddress.split(',')[0] || 'Monrovia',
      destinationAddress: destinationAddress.trim(),
      destinationCoords,
      vehiclePreference: vehicleType,
      fareUsd: estimatedFareUsd,
      fareLrd: Math.round(estimatedFareUsd * USD_TO_LRD_RATE),
      nearbyDriversFound: Math.max(1, matchingDriversCount),
    };

    setActiveRide(newRide);
    saveToRideHistory(newRide);
    setPortalStep('searching');
    setSearchPhase('finding');
    setSearchTimerSecs(600); // 10 minutes

    // Save to Firestore 'rides' collection
    try {
      await setDoc(doc(db, 'rides', newRide.id), sanitizeForFirestore(newRide));
    } catch (err) {
      console.warn('Firestore ride request write notice:', err);
    }

    playOrderAlertSound();
    sendBrowserNotification({
      title: 'Finding you a driver... 🛵',
      body: `Searching for ${vehicleType} couriers near ${pickupAddress}`,
      tag: `ride-search-${newRide.id}`,
    });
  };

  // Timeout handler: 10 minutes passed without driver acceptance
  const handleSearchTimeout = async () => {
    if (!activeRide) return;
    const timedOutRide: RideRequest = {
      ...activeRide,
      status: 'no_driver_found',
    };
    setActiveRide(timedOutRide);
    setPortalStep('no_driver_found');
    saveToRideHistory(timedOutRide);

    try {
      await updateDoc(doc(db, 'rides', activeRide.id), {
        status: 'no_driver_found',
      });
    } catch {}

    sendBrowserNotification({
      title: 'No Driver Found ⚠️',
      body: 'No drivers accepted your ride within 10 minutes. Please try again or re-book.',
      tag: `ride-timeout-${activeRide.id}`,
    });
  };

  // Test simulation: Instant driver acceptance (for preview testing without waiting)
  const handleSimulateDriverAcceptance = async () => {
    if (!activeRide) return;
    
    // Choose first real driver if available or create verified driver record
    const realDriver = availableDrivers.find((d) => d.serviceType !== 'delivery') || availableDrivers[0];
    
    const driverName = realDriver?.name || 'Joseph Kollie';
    const driverPhone = realDriver?.phone || '+231 77 040 0338';
    const driverPlate = realDriver?.plateNumber || `RL-${vehicleType === 'Motorbike' ? 'MB' : 'KK'}-4812`;
    const driverPhoto = realDriver?.driverPhoto || realDriver?.avatar;
    const vehiclePhoto = realDriver?.vehiclePhoto;

    const acceptedRide: RideRequest = {
      ...activeRide,
      status: 'accepted',
      assignedDriverId: realDriver?.id || 'drv-simulated',
      assignedDriverName: driverName,
      assignedDriverPhone: driverPhone,
      driverVehicle: vehicleType,
      driverPlate,
      driverRating: realDriver?.rating || 4.9,
      driverPhoto,
      vehiclePhoto,
      acceptedAtTimestamp: Date.now(),
      driverEtaMinutes: 3,
      driverLocation: {
        lat: pickupCoords.lat + 0.007,
        lng: pickupCoords.lng + 0.005,
      },
    };

    setActiveRide(acceptedRide);
    setPortalStep('accepted');
    saveToRideHistory(acceptedRide);

    try {
      await updateDoc(doc(db, 'rides', activeRide.id), sanitizeForFirestore(acceptedRide) as any);
    } catch {}

    playOrderAlertSound();
  };

  // Advance ride stages helper
  const handleAdvanceRideStage = async (nextStatus: RideStatus) => {
    if (!activeRide) return;
    const updated: RideRequest = {
      ...activeRide,
      status: nextStatus,
      ...(nextStatus === 'arriving' ? { arrivedAtTimestamp: Date.now() } : {}),
      ...(nextStatus === 'in_transit' ? { startedAtTimestamp: Date.now() } : {}),
      ...(nextStatus === 'completed' ? { completedAtTimestamp: Date.now() } : {}),
    };
    setActiveRide(updated);
    saveToRideHistory(updated);

    try {
      await updateDoc(doc(db, 'rides', activeRide.id), { status: nextStatus });
    } catch {}

    if (nextStatus === 'completed') {
      playOrderAlertSound();
      sendBrowserNotification({
        title: 'Ride Completed! 🏁',
        body: `You arrived safely at ${activeRide.destinationAddress}. Thank you for riding with AURA!`,
        tag: `ride-done-${activeRide.id}`,
      });
    }
  };

  // Cancel ride
  const handleCancelRide = async () => {
    if (!confirm('Are you sure you want to cancel this ride request?')) return;
    if (activeRide) {
      try {
        await updateDoc(doc(db, 'rides', activeRide.id), {
          status: 'cancelled',
          cancelledAtTimestamp: Date.now(),
        });
      } catch {}
      saveToRideHistory({ ...activeRide, status: 'cancelled' });
    }
    setActiveRide(null);
    setPortalStep('input');
  };

  // 1-Tap Re-book past ride
  const handleRebook = (past: RideRequest) => {
    setPickupAddress(past.pickupAddress);
    setPickupCoords(past.pickupCoords);
    setDestinationAddress(past.destinationAddress);
    setDestinationCoords(past.destinationCoords);
    setVehicleType(past.vehiclePreference || 'Motorbike');
    setShowHistoryModal(false);
    setPortalStep('input');
  };

  if (!isOpen && !isPageMode) return null;

  // Format countdown mm:ss
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Main Card Content
  const cardContent = (
    <>
      {/* ================================================================= */}
      {/* MODAL HEADER (when in modal popup mode)                            */}
      {/* NOTE: Monrovia Streets badge & Aura Apps REMOVED per user request */}
      {/* Added Ride History button                                         */}
      {/* ================================================================= */}
      {!isPageMode && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#06C167] text-white flex items-center justify-center shadow-md shadow-[#06C167]/30">
              <Bike className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-wide">AURA Ride</h3>
              <p className="text-[11px] text-gray-400">Moto-Bikes, Kekehs &amp; Town Taxis across Monrovia</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="View Past Rides"
            >
              <History className="w-3.5 h-3.5 text-[#06C167]" />
              <span>Ride History</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Close Ride Portal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* PAGE MODE HEADER (when in full screen route mode)                  */}
      {/* ================================================================= */}
      {isPageMode && (
        <div className="pb-4 mb-2 border-b border-gray-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Request a Ride in Monrovia</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fast pickup &bull; Motorbike, Kekeh or Town Taxi</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-[#048747] border border-emerald-200/60 shadow-2xs">
            Live Fleet Active
          </span>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 1: PICKUP & DESTINATION FORM (REAL ADDRESS ONLY)             */}
      {/* ================================================================= */}
      {portalStep === 'input' && (
        <form onSubmit={handleRequestRide} className={`${isPageMode ? 'space-y-4' : 'p-5 overflow-y-auto space-y-4'}`}>
          
          {/* Vehicle Selection Tabs */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block">
              Select Ride Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'Motorbike' as RideVehicleType, label: 'Moto-Bike', icon: Bike, desc: 'Fastest in traffic', fare: '~$1.50' },
                { type: 'Kekeh (Tricycle)' as RideVehicleType, label: 'Kekeh', icon: KekehIcon, desc: 'Covered & breezy', fare: '~$2.50' },
                { type: 'Taxi (Car)' as RideVehicleType, label: 'Town Taxi', icon: CarTaxiFront, desc: 'Private & AC', fare: '~$4.00' },
              ].map((v) => {
                const Icon = v.icon;
                const isSelected = vehicleType === v.type;
                return (
                  <button
                    key={v.type}
                    type="button"
                    onClick={() => setVehicleType(v.type)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#06C167] bg-[#E8F8EE] text-gray-900 ring-2 ring-[#06C167]/30 shadow-xs'
                        : 'border-gray-200/90 bg-white hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#06C167]' : 'text-gray-400'}`} />
                      <span className="text-[10px] font-bold text-gray-400">{v.fare}</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-black text-gray-900">{v.label}</div>
                      <div className="text-[10px] text-gray-500 font-medium">{v.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pickup Location Box - Real Address with Google Places Autocomplete */}
          <div className="p-4 bg-white border border-gray-200/90 rounded-2xl space-y-2.5 relative shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#06C167]" />
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Pickup Address
                </span>
              </div>
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isLocatingGps}
                className="flex items-center gap-1 text-[11px] font-bold text-[#06C167] hover:underline cursor-pointer"
              >
                {isLocatingGps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                <span>{isLocatingGps ? 'Locating...' : 'Use My GPS'}</span>
              </button>
            </div>

            {/* Address Input */}
            <div className="relative">
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#06C167] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onFocus={() => setShowPickupDropdown(true)}
                  onChange={(e) => {
                    setPickupAddress(e.target.value);
                    setPickupQuery(e.target.value);
                    setShowPickupDropdown(true);
                  }}
                  placeholder="Street name, landmark or building (e.g. 12th St Sinkor, Total)"
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#06C167] shadow-xs"
                />
                {isSearchingPickup && (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
                {!isSearchingPickup && pickupAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setPickupAddress('');
                      setPickupQuery('');
                      setShowPickupDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showPickupDropdown && pickupSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                    <span>Locations Found (Google Places / Monrovia)</span>
                    <button
                      type="button"
                      onClick={() => setShowPickupDropdown(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Close
                    </button>
                  </div>
                  {pickupSuggestions.map((place) => (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => {
                        setPickupAddress(place.title);
                        setPickupCoords(place.coords);
                        setShowPickupDropdown(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#06C167] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-gray-900 group-hover:text-[#06C167] truncate">
                          {place.title}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                          {place.subtitle || place.fullAddress}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActivePickerTarget('pickup')}
                className="text-[11px] font-bold text-gray-500 hover:text-[#06C167] flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3 h-3" />
                <span>Pinpoint on Monrovia Map</span>
              </button>
            </div>
          </div>

          {/* Drop-off Destination Location Box - Real Address with Google Places Autocomplete */}
          <div className="p-4 bg-white border border-gray-200/90 rounded-2xl space-y-2.5 relative shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Drop-off Destination Address
                </span>
              </div>
            </div>

            {/* Address Input */}
            <div className="relative">
              <div className="relative">
                <MapPin className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={destinationAddress}
                  onFocus={() => setShowDropoffDropdown(true)}
                  onChange={(e) => {
                    setDestinationAddress(e.target.value);
                    setDropoffQuery(e.target.value);
                    setShowDropoffDropdown(true);
                  }}
                  placeholder="Street, bank, office or market (e.g. Broad St, UN Drive)"
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#06C167] shadow-xs"
                />
                {isSearchingDropoff && (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
                {!isSearchingDropoff && destinationAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationAddress('');
                      setDropoffQuery('');
                      setShowDropoffDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showDropoffDropdown && dropoffSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                    <span>Locations Found (Google Places / Monrovia)</span>
                    <button
                      type="button"
                      onClick={() => setShowDropoffDropdown(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Close
                    </button>
                  </div>
                  {dropoffSuggestions.map((place) => (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => {
                        setDestinationAddress(place.title);
                        setDestinationCoords(place.coords);
                        setShowDropoffDropdown(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-gray-900 group-hover:text-[#06C167] truncate">
                          {place.title}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                          {place.subtitle || place.fullAddress}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActivePickerTarget('destination')}
                className="text-[11px] font-bold text-gray-500 hover:text-[#06C167] flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3 h-3" />
                <span>Pinpoint on Monrovia Map</span>
              </button>
            </div>
          </div>

          {/* Passenger Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="e.g. Mary Williams"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/20 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block mb-1">
                Your Phone Number (for Rider)
              </label>
              <input
                type="tel"
                required
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                placeholder="+231 77..."
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/20 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Fare Summary Box */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50/90 via-emerald-50/50 to-white border border-emerald-200/90 rounded-2xl flex items-center justify-between text-xs shadow-2xs">
            <div>
              <span className="font-extrabold text-gray-800">Estimated Trip Fare:</span>
              <div className="text-[10px] text-gray-500">Pay cash or MoMo upon arrival</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-[#048747] font-mono">
                ${estimatedFareUsd.toFixed(2)} USD
              </div>
              <div className="text-[10px] font-bold text-gray-500 font-mono">
                ≈ L${Math.round(estimatedFareUsd * USD_TO_LRD_RATE).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Request Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-5 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] hover:brightness-105 active:scale-98 text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Request {vehicleType} Ride</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      )}

      {/* ================================================================= */}
      {/* STEP 2: DISPATCH FLOW - MATCHING ORDER FLOW                        */}
      {/* Stage 1: "Finding you a driver..."                                */}
      {/* Stage 2: "Searching Fleet: X drivers found nearby..."              */}
      {/* Driver MUST accept before driver info is displayed!               */}
      {/* ================================================================= */}
      {portalStep === 'searching' && activeRide && (
        <div className="p-6 sm:p-8 text-center space-y-6 flex flex-col items-center justify-center my-auto min-h-[380px]">
          
          {/* Animated Scanning Radar */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#06C167]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-[#06C167]/30 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-xl shadow-[#06C167]/40">
              <Bike className="w-8 h-8 animate-bounce" />
            </div>
          </div>

          {/* Dynamic Status Text */}
          <div className="space-y-1.5 max-w-sm">
            {searchPhase === 'finding' ? (
              <>
                <h4 className="font-black text-lg text-gray-900">
                  Finding you a driver...
                </h4>
                <p className="text-xs text-gray-500">
                  Scanning active Monrovia fleet for {vehicleType} near {activeRide.pickupAddress}
                </p>
              </>
            ) : (
              <>
                <h4 className="font-black text-lg text-gray-900 text-[#048747]">
                  {matchingDriversCount > 0 
                    ? `Searching Fleet: ${matchingDriversCount} ${matchingDriversCount === 1 ? 'driver' : 'drivers'} found nearby`
                    : 'Searching Fleet: Pinging nearby Monrovia drivers...'}
                </h4>
                <p className="text-xs text-gray-600">
                  Awaiting driver acceptance. Once accepted, driver details and live route will appear.
                </p>
              </>
            )}

            {/* Countdown to 10m timeout */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-mono font-bold mt-2">
              <Timer className="w-3.5 h-3.5 text-gray-500" />
              <span>Timeout in: {formatTimer(searchTimerSecs)}</span>
            </div>
          </div>

          {/* Route Summary Pill */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl w-full max-w-sm text-left text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-gray-800 font-bold truncate">
              <div className="w-2 h-2 rounded-full bg-[#06C167] shrink-0" />
              <span className="truncate">From: {activeRide.pickupAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 font-medium truncate">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="truncate">To: {activeRide.destinationAddress}</span>
            </div>
            <div className="pt-1 border-t border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-500">
              <span className="flex items-center gap-1.5">
                <span>Fare: ${activeRide.fareUsd?.toFixed(2)} USD</span>
                {activeRide.priceOverridden && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                    Rider Agreed
                  </span>
                )}
              </span>
              <span>Vehicle: {activeRide.vehiclePreference}</span>
            </div>
          </div>

          {/* Quick Simulation & Cancel Options */}
          <div className="w-full max-w-sm space-y-2 pt-1">
            <button
              type="button"
              onClick={handleSimulateDriverAcceptance}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>⚡ Fast-Track: Driver Accepts (Simulate Response)</span>
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSearchTimeout}
                className="text-gray-400 hover:text-gray-600 text-[11px] underline cursor-pointer"
              >
                Simulate 10m Timeout
              </button>
              <button
                type="button"
                onClick={handleCancelRide}
                className="text-red-600 hover:text-red-800 font-bold text-xs cursor-pointer"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 3: DRIVER ACCEPTED VIEW - REVEAL DRIVER + LIVE MAP           */}
      {/* Displays Face Photo, Vehicle Photo, Vehicle Plate, Live Moving Map */}
      {/* ================================================================= */}
      {portalStep === 'accepted' && activeRide && (
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Confirmed Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-3xl shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="text-xs font-black uppercase tracking-wider">
                  {activeRide.status === 'accepted' && 'Driver Accepted & En Route'}
                  {activeRide.status === 'arriving' && 'Driver Arrived at Pickup!'}
                  {activeRide.status === 'in_transit' && 'Trip In Progress'}
                  {activeRide.status === 'completed' && 'Trip Completed Successfully!'}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold">
                {activeRide.status === 'completed' ? 'Arrived' : `ETA ~${activeRide.driverEtaMinutes || 3} mins`}
              </span>
            </div>

            <div className="text-base sm:text-lg font-black tracking-tight">
              {activeRide.status === 'accepted' && `${activeRide.assignedDriverName} is heading to your pickup spot`}
              {activeRide.status === 'arriving' && `${activeRide.assignedDriverName} has arrived at ${activeRide.pickupAddress}`}
              {activeRide.status === 'in_transit' && `Heading toward ${activeRide.destinationAddress}`}
              {activeRide.status === 'completed' && `Safely arrived at destination!`}
            </div>
          </div>

          {/* Driver & Vehicle Profiles (Showing Uploaded Face & Vehicle Images) */}
          <div className="p-4 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Matched Courier Details
              </span>
              <div className="flex items-center gap-2">
                {activeRide.priceOverridden && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Agreed Fare: ${activeRide.fareUsd?.toFixed(2)}
                  </span>
                )}
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{(activeRide.driverRating || 4.9).toFixed(1)} Rating</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Driver Face Profile */}
              <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-2xl">
                {activeRide.driverPhoto ? (
                  <img
                    src={activeRide.driverPhoto}
                    alt={activeRide.assignedDriverName}
                    className="w-14 h-14 rounded-2xl object-cover border border-emerald-300 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                    {activeRide.assignedDriverName?.[0] || 'D'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-gray-900 truncate">
                    {activeRide.assignedDriverName}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    Verified Courier &bull; {activeRide.driverVehicle || activeRide.vehiclePreference}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-[#048747] mt-0.5">
                    {activeRide.driverPlate || 'RL-MB-4821'}
                  </div>
                </div>
              </div>

              {/* Vehicle Photo / Details */}
              <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-2xl">
                {activeRide.vehiclePhoto ? (
                  <img
                    src={activeRide.vehiclePhoto}
                    alt="Driver Vehicle"
                    className="w-14 h-14 rounded-2xl object-cover border border-emerald-300 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Bike className="w-7 h-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-gray-900">
                    {activeRide.vehiclePreference}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Plate: <span className="font-mono font-bold text-gray-800">{activeRide.driverPlate || 'Registered'}</span>
                  </div>
                  {activeRide.assignedDriverPhone && (
                    <a
                      href={`tel:${String(activeRide.assignedDriverPhone || '').replace(/[^0-9]/g, '')}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-0.5"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call Driver</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Route Map (Updates as Driver Moves) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#06C167]" />
                <span>Live Route & Driver Position</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                GPS Position updates in real time
              </span>
            </div>
            
            <RideLiveMap
              pickupCoords={activeRide.pickupCoords}
              pickupAddress={activeRide.pickupAddress}
              destinationCoords={activeRide.destinationCoords}
              destinationAddress={activeRide.destinationAddress}
              driverCoords={activeRide.driverLocation}
              driverName={activeRide.assignedDriverName}
              driverPhoto={activeRide.driverPhoto}
              driverPlate={activeRide.driverPlate}
              vehicleType={activeRide.vehiclePreference}
              status={activeRide.status}
              etaMinutes={activeRide.driverEtaMinutes || 3}
            />
          </div>

          {/* Driver Progression Controls (For Driver / Testing Trip Steps) */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">
              Trip Progress Stages
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleAdvanceRideStage('arriving')}
                className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeRide.status === 'arriving'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                1. Driver Arrived
              </button>
              <button
                type="button"
                onClick={() => handleAdvanceRideStage('in_transit')}
                className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeRide.status === 'in_transit'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                2. Start Trip
              </button>
              <button
                type="button"
                onClick={() => handleAdvanceRideStage('completed')}
                className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeRide.status === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                3. Finish Ride
              </button>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="pt-2">
            {activeRide.status === 'completed' ? (
              <button
                type="button"
                onClick={() => {
                  setActiveRide(null);
                  setPortalStep('input');
                }}
                className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                Book Another Ride
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelRide}
                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-2xl border border-red-200 transition-all cursor-pointer"
              >
                Cancel Ride
              </button>
            )}
          </div>

        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 4: NO DRIVER FOUND VIEW (AFTER 10 MINS OR TIMEOUT)           */}
      {/* ================================================================= */}
      {portalStep === 'no_driver_found' && (
        <div className="p-8 text-center space-y-5 flex flex-col items-center justify-center my-auto min-h-[380px]">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h4 className="font-extrabold text-lg text-gray-900">
              No Driver Found
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              No nearby drivers accepted your ride request within the dispatch window. All couriers in this zone are currently on active trips or offline.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2 w-full max-w-sm">
            <button
              type="button"
              onClick={() => {
                setPortalStep('input');
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C167] to-[#048747] text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-lg transition cursor-pointer"
            >
              Try Again / Change Vehicle
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl transition cursor-pointer"
            >
              View Ride History
            </button>
          </div>
        </div>
      )}

    </>
  );

  // Map Pinpoint Modal
  const pickerModal = activePickerTarget && (
    <LocationPickerModal
      isOpen={!!activePickerTarget}
      onClose={() => setActivePickerTarget(null)}
      title={activePickerTarget === 'pickup' ? 'Pinpoint Pickup Location' : 'Pinpoint Drop-off Destination'}
      locationType="generic"
      confirmButtonText={activePickerTarget === 'pickup' ? 'Confirm Pickup Location' : 'Confirm Destination Location'}
      initialCoords={activePickerTarget === 'pickup' ? pickupCoords : destinationCoords}
      onConfirmLocation={(data) => {
        if (activePickerTarget === 'pickup') {
          setPickupCoords(data.coords);
          if (data.address) setPickupAddress(data.address);
        } else {
          setDestinationCoords(data.coords);
          if (data.address) setDestinationAddress(data.address);
        }
        setActivePickerTarget(null);
      }}
    />
  );

  // Ride History Modal Drawer
  const historyDrawer = showHistoryModal && (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={() => setShowHistoryModal(false)}
    >
      <div 
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#06C167]" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Your Monrovia Ride History</h3>
              <p className="text-[11px] text-gray-400">Past trips &amp; 1-tap re-booking</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistoryModal(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trips List */}
        <div className="p-4 overflow-y-auto space-y-3">
          {rideHistory.length === 0 ? (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-gray-300" />
              <div className="text-xs font-bold text-gray-600">No ride history yet</div>
              <p className="text-[11px] text-gray-400">
                Your requested and completed trips will appear here.
              </p>
            </div>
          ) : (
            rideHistory.map((past) => (
              <div 
                key={past.id}
                className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs hover:border-gray-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-gray-400">
                    {new Date(past.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    past.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : past.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : past.status === 'no_driver_found'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {String(past.status || '').replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                    <div className="w-2 h-2 rounded-full bg-[#06C167] shrink-0" />
                    <span className="truncate">From: {past.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="truncate">To: {past.destinationAddress}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-[11px] text-gray-500 font-medium">
                    <span>{past.vehiclePreference}</span>
                    {past.assignedDriverName && <span> &bull; Driver: {past.assignedDriverName}</span>}
                    {past.fareUsd && <span> &bull; ${past.fareUsd.toFixed(2)}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRebook(past)}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Re-book
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Full Screen Page Mode
  if (isPageMode) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans">
        {/* Full-width sticky top navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-gray-900 px-4 sm:px-8 py-3 flex items-center justify-between border-b border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 sm:px-3 sm:py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
              title="Back to Apps"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Aura Apps</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-xs shrink-0">
                <Bike className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">AURA Ride</h1>
                <p className="text-[11px] text-gray-500 hidden sm:block">Moto-Bikes, Kekehs &amp; Town Taxis across Monrovia</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-[#06C167]" />
            <span>Ride History</span>
          </button>
        </header>

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-4 pb-24">
          <div className="w-full flex-1 flex flex-col">
            {cardContent}
          </div>
        </main>

        {pickerModal}
        {historyDrawer}
      </div>
    );
  }

  // Popup Modal Mode
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {cardContent}
      </div>

      {pickerModal}
      {historyDrawer}
    </div>
  );
};
