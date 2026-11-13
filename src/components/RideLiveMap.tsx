import React, { useEffect, useRef, useState } from 'react';
import { 
  Navigation, 
  MapPin, 
  Bike, 
  Radio, 
  Car, 
  Maximize2, 
  Compass, 
  RefreshCw,
  Clock,
  ShieldCheck,
  User
} from 'lucide-react';
import { LocationCoords, RideStatus, RideVehicleType } from '../types';

interface RideLiveMapProps {
  pickupCoords: LocationCoords;
  pickupAddress: string;
  destinationCoords: LocationCoords;
  destinationAddress: string;
  driverCoords?: LocationCoords;
  driverName?: string;
  driverPhoto?: string;
  driverPlate?: string;
  vehicleType: RideVehicleType;
  status: RideStatus;
  etaMinutes?: number;
}

export const RideLiveMap: React.FC<RideLiveMapProps> = ({
  pickupCoords,
  pickupAddress,
  destinationCoords,
  destinationAddress,
  driverCoords,
  driverName = 'Driver',
  driverPhoto,
  driverPlate,
  vehicleType,
  status,
  etaMinutes = 3,
}) => {
  // Live animated driver position
  const [currentDriverPos, setCurrentDriverPos] = useState<LocationCoords>(() => {
    if (driverCoords) return driverCoords;
    // Default start slightly offset from pickup
    return {
      lat: pickupCoords.lat + 0.0085,
      lng: pickupCoords.lng + 0.0065,
    };
  });

  const [headingDeg, setHeadingDeg] = useState(45);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isCentered, setIsCentered] = useState(true);

  // Sync / Smoothly animate driver movement towards pickup or destination based on status
  useEffect(() => {
    const target = (status === 'in_transit' || status === 'completed')
      ? destinationCoords
      : pickupCoords;

    const interval = setInterval(() => {
      setCurrentDriverPos((prev) => {
        const dLat = target.lat - prev.lat;
        const dLng = target.lng - prev.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        // If very close, stay near target
        if (dist < 0.0003) {
          return target;
        }

        // Move 10-15% of the distance each step for fluid live motion
        const step = Math.min(0.0008, dist * 0.12);
        const ratio = step / dist;
        const nextLat = prev.lat + dLat * ratio;
        const nextLng = prev.lng + dLng * ratio;

        // Calculate heading in degrees
        const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        setHeadingDeg(angle);

        return { lat: nextLat, lng: nextLng };
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [pickupCoords, destinationCoords, status]);

  // Project lat/lng to SVG canvas percentage coordinates (2D bounding box covering the trip)
  const allLats = [pickupCoords.lat, destinationCoords.lat, currentDriverPos.lat];
  const allLngs = [pickupCoords.lng, destinationCoords.lng, currentDriverPos.lng];

  const minLat = Math.min(...allLats) - 0.004;
  const maxLat = Math.max(...allLats) + 0.004;
  const minLng = Math.min(...allLngs) - 0.004;
  const maxLng = Math.max(...allLngs) + 0.004;

  const latRange = Math.max(0.008, maxLat - minLat);
  const lngRange = Math.max(0.008, maxLng - minLng);

  const toSvgX = (lng: number) => {
    return 10 + ((lng - minLng) / lngRange) * 80;
  };

  const toSvgY = (lat: number) => {
    // Invert Y because lat increases northward
    return 90 - ((lat - minLat) / latRange) * 80;
  };

  const pickupSvg = { x: toSvgX(pickupCoords.lng), y: toSvgY(pickupCoords.lat) };
  const destSvg = { x: toSvgX(destinationCoords.lng), y: toSvgY(destinationCoords.lat) };
  const driverSvg = { x: toSvgX(currentDriverPos.lng), y: toSvgY(currentDriverPos.lat) };

  // Calculate remaining distance in KM
  const distKm = (
    Math.sqrt(
      Math.pow((destinationCoords.lat - currentDriverPos.lat) * 111, 2) +
      Math.pow((destinationCoords.lng - currentDriverPos.lng) * 111 * Math.cos((pickupCoords.lat * Math.PI) / 180), 2)
    )
  ).toFixed(1);

  const VehicleIcon = vehicleType === 'Taxi (Car)' ? Car : vehicleType === 'Kekeh (Tricycle)' ? Radio : Bike;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-gray-800 bg-gray-950 text-white shadow-2xl flex flex-col">
      {/* Map Header Status Banner */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-900 via-gray-900 to-black border-b border-gray-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#06C167] text-white flex items-center justify-center font-bold shadow-md shadow-[#06C167]/30 shrink-0">
            <VehicleIcon className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-white">
                {status === 'accepted' ? 'Rider Assigned' : status === 'arriving' ? 'Rider is Arriving' : status === 'in_transit' ? 'On Trip to Destination' : 'Ride Completed'}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#06C167] animate-pulse" />
            </div>
            <p className="text-[10px] text-gray-400">
              {status === 'in_transit' ? `${distKm} km to dropoff` : `Driver ~${etaMinutes} mins away`}
            </p>
          </div>
        </div>

        {/* Live Tracking Pill */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <Navigation className="w-3 h-3 animate-spin text-emerald-400" />
            <span>LIVE GPS</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="relative w-full h-72 sm:h-80 bg-[#121820] overflow-hidden select-none">
        
        {/* Subtle Map Grid / Monrovia Street Texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <defs>
            <pattern id="street-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#253241" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#street-grid)" />
        </svg>

        {/* SVG Route Paths & Polyline */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            {/* Route Gradient */}
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06C167" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Dotted Connection: Driver to Pickup */}
          <line
            x1={`${driverSvg.x}%`}
            y1={`${driverSvg.y}%`}
            x2={`${pickupSvg.x}%`}
            y2={`${pickupSvg.y}%`}
            stroke="#06C167"
            strokeWidth="3"
            strokeDasharray="6,6"
            className="animate-pulse"
          />

          {/* Solid Route Line: Pickup to Destination */}
          <line
            x1={`${pickupSvg.x}%`}
            y1={`${pickupSvg.y}%`}
            x2={`${destSvg.x}%`}
            y2={`${destSvg.y}%`}
            stroke="url(#routeGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#glow)"
          />
        </svg>

        {/* 1. PICKUP PIN (Green) */}
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 z-10 pointer-events-none"
          style={{ left: `${pickupSvg.x}%`, top: `${pickupSvg.y}%` }}
        >
          <div className="flex flex-col items-center">
            <div className="px-2 py-0.5 bg-[#06C167] text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-lg whitespace-nowrap mb-1">
              Pickup: {pickupAddress.split(',')[0]}
            </div>
            <div className="w-7 h-7 rounded-full bg-[#06C167] border-2 border-white shadow-xl flex items-center justify-center text-white">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* 2. DESTINATION PIN (Red) */}
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 z-10 pointer-events-none"
          style={{ left: `${destSvg.x}%`, top: `${destSvg.y}%` }}
        >
          <div className="flex flex-col items-center">
            <div className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-lg whitespace-nowrap mb-1">
              Dropoff: {destinationAddress.split(',')[0]}
            </div>
            <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <MapPin className="w-3.5 h-3.5 fill-white" />
            </div>
          </div>
        </div>

        {/* 3. MOVING DRIVER VEHICLE MARKER */}
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-20 pointer-events-none"
          style={{ left: `${driverSvg.x}%`, top: `${driverSvg.y}%` }}
        >
          <div className="relative flex items-center justify-center">
            {/* Outer Pulse Rings */}
            <div className="absolute w-14 h-14 rounded-full bg-[#06C167]/20 animate-ping pointer-events-none" />
            <div className="absolute w-10 h-10 rounded-full bg-[#06C167]/30 pointer-events-none" />

            {/* Vehicle Bubble */}
            <div 
              className="w-10 h-10 rounded-2xl bg-white text-gray-900 border-2 border-[#06C167] shadow-2xl flex items-center justify-center transform transition-transform"
              style={{ transform: `rotate(${headingDeg - 45}deg)` }}
            >
              <VehicleIcon className="w-5 h-5 text-[#06C167] stroke-[2.5]" />
            </div>

            {/* Driver Tag */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-gray-900/90 border border-white/20 rounded-md text-[9px] font-bold text-white shadow-md">
              {driverName} &bull; {vehicleType.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* Map Control Buttons */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-20">
          <button
            type="button"
            onClick={() => setCurrentDriverPos({ ...currentDriverPos })}
            className="w-8 h-8 rounded-xl bg-gray-900/80 hover:bg-black border border-white/10 text-white flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
            title="Recenter on Driver"
          >
            <Compass className="w-4 h-4 text-[#06C167]" />
          </button>
        </div>

        {/* Live Traffic Badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[10px] text-gray-300 font-bold flex items-center gap-1.5 z-10">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Monrovia Traffic Clear</span>
        </div>
      </div>

      {/* Driver Card Info under the Map */}
      <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {driverPhoto ? (
            <img 
              src={driverPhoto} 
              alt={driverName} 
              className="w-12 h-12 rounded-2xl object-cover border-2 border-[#06C167] shadow-md shrink-0" 
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#06C167] to-teal-500 text-white flex items-center justify-center font-bold text-base shadow-md shrink-0">
              <User className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-white truncate">{driverName}</h4>
              <span className="px-1.5 py-0.2 bg-[#06C167]/20 text-[#06C167] text-[10px] font-bold rounded">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate">
              {vehicleType} &bull; {driverPlate || 'Monrovia M-Fleet'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-mono font-extrabold text-[#06C167]">
            ~{etaMinutes} mins
          </div>
          <div className="text-[10px] text-gray-400">ETA Arrival</div>
        </div>
      </div>

    </div>
  );
};
