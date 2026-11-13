import React, { useMemo, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Bike, Store, MapPin, Navigation, ExternalLink, ZoomIn, ZoomOut, RotateCcw, Compass } from 'lucide-react';
import { LocationCoords } from '../types';
import { calculateDistanceKm } from '../utils/pricingEngine';

interface MonroviaDeliveryMapProps {
  driverLocation?: LocationCoords;
  restaurantLocation?: LocationCoords;
  customerLocation?: LocationCoords;
  restaurantName?: string;
  customerAddress?: string;
  driverName?: string;
  driverVehicle?: string;
  className?: string;
  height?: string;
  zoom?: number;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

// Key Monrovia Landmarks for vector schematic view
const SCHEMATIC_LANDMARKS = [
  { name: 'Mamba Point', lat: 6.3182, lng: -10.8123, label: 'Mamba Point' },
  { name: 'Broad St', lat: 6.3130, lng: -10.8040, label: 'Central Broad St' },
  { name: 'Sinkor', lat: 6.2907, lng: -10.7818, label: 'Sinkor Corridor' },
  { name: 'Old Road', lat: 6.2790, lng: -10.7600, label: 'Old Road' },
  { name: 'Congo Town', lat: 6.2690, lng: -10.7480, label: 'Congo Town' },
  { name: 'Paynesville', lat: 6.2753, lng: -10.7100, label: 'ELWA / Paynesville' },
];

export const MonroviaDeliveryMap: React.FC<MonroviaDeliveryMapProps> = ({
  driverLocation,
  restaurantLocation = { lat: 6.2907, lng: -10.7818 }, // Default Sinkor
  customerLocation = { lat: 6.2690, lng: -10.7480 }, // Default Congotown
  restaurantName = 'Sinkor Kitchen',
  customerAddress = 'Delivery Location',
  driverName = 'Delivery Rider',
  driverVehicle = 'Motorbike',
  className = '',
  height = '320px',
  zoom = 13,
}) => {
  const [useGoogleMaps, setUseGoogleMaps] = useState<boolean>(Boolean(GOOGLE_MAPS_API_KEY));
  const [vectorZoom, setVectorZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Compute map center between restaurant, customer and driver
  const mapCenter = useMemo(() => {
    if (driverLocation) {
      return {
        lat: (driverLocation.lat + restaurantLocation.lat + customerLocation.lat) / 3,
        lng: (driverLocation.lng + restaurantLocation.lng + customerLocation.lng) / 3,
      };
    }
    return {
      lat: (restaurantLocation.lat + customerLocation.lat) / 2,
      lng: (restaurantLocation.lng + customerLocation.lng) / 2,
    };
  }, [driverLocation, restaurantLocation, customerLocation]);

  // Direct Google Maps navigation URL
  const navUrl = useMemo(() => {
    const origin = driverLocation 
      ? `${driverLocation.lat},${driverLocation.lng}` 
      : `${restaurantLocation.lat},${restaurantLocation.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${customerLocation.lat},${customerLocation.lng}&waypoints=${restaurantLocation.lat},${restaurantLocation.lng}&travelmode=driving`;
  }, [driverLocation, restaurantLocation, customerLocation]);

  // Calculate real distance
  const distanceKm = useMemo(() => {
    const d = calculateDistanceKm(
      driverLocation || restaurantLocation,
      customerLocation
    );
    return d > 0 ? d.toFixed(1) : '2.4';
  }, [driverLocation, restaurantLocation, customerLocation]);

  // Coordinate projection to SVG canvas (600x320)
  // Monrovia Lat range: ~6.24 to ~6.35 (delta ~0.11)
  // Monrovia Lng range: ~-10.83 to ~-10.68 (delta ~0.15)
  const projectCoords = (coords: LocationCoords) => {
    const minLat = 6.25;
    const maxLat = 6.34;
    const minLng = -10.83;
    const maxLng = -10.69;

    const x = ((coords.lng - minLng) / (maxLng - minLng)) * 560 + 20;
    // Invert latitude for SVG y
    const y = ((maxLat - coords.lat) / (maxLat - minLat)) * 260 + 30;
    return {
      x: Math.min(580, Math.max(20, x)),
      y: Math.min(290, Math.max(20, y)),
    };
  };

  const restPt = projectCoords(restaurantLocation);
  const custPt = projectCoords(customerLocation);
  const driverPt = driverLocation ? projectCoords(driverLocation) : null;

  // Convert height prop
  const isExplicitCssHeight = typeof height === 'string' && (height.endsWith('px') || height.endsWith('%') || height.endsWith('vh') || height.endsWith('rem'));
  const containerStyle = isExplicitCssHeight ? { height, width: '100%' } : { minHeight: '280px', height: '280px', width: '100%' };
  const heightClass = !isExplicitCssHeight ? (height.startsWith('h-') ? height : 'h-72') : '';

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-gray-200/90 shadow-sm bg-slate-950 text-white ${className}`}>
      
      {/* MAP VIEW CONTAINER */}
      <div style={containerStyle} className={`relative overflow-hidden ${heightClass}`}>
        
        {useGoogleMaps && GOOGLE_MAPS_API_KEY ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={zoom}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="DEMO_MAP_ID"
              style={{ width: '100%', height: '100%' }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              {/* Restaurant Marker */}
              <AdvancedMarker position={restaurantLocation} title={restaurantName}>
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-white/20">
                    <Store className="w-2.5 h-2.5 text-[#06C167]" />
                    <span>{restaurantName.split(' ')[0]}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                    <Store className="w-4 h-4" />
                  </div>
                </div>
              </AdvancedMarker>

              {/* Customer Destination Marker */}
              <AdvancedMarker position={customerLocation} title={customerAddress}>
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className="px-2 py-0.5 bg-emerald-700 text-white text-[10px] font-bold rounded-full shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-white/20">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>Delivery</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white animate-bounce">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </AdvancedMarker>

              {/* Driver Live Location Marker */}
              {driverLocation && (
                <AdvancedMarker position={driverLocation} title={driverName}>
                  <div className="flex flex-col items-center group cursor-pointer">
                    <div className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-white/20">
                      <Bike className="w-2.5 h-2.5" />
                      <span>{driverName.split(' ')[0]} ({driverVehicle})</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg ring-3 ring-blue-300 animate-pulse">
                      <Bike className="w-5 h-5" />
                    </div>
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* ================================================================= */
          /* HIGH-FIDELITY MONROVIA VECTOR RADAR MAP (OFFLINE / NO KEY FALLBACK) */
          /* ================================================================= */
          <div className="relative w-full h-full bg-[#0a1120] select-none overflow-hidden flex items-center justify-center">
            
            {/* Grid lines background */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none" 
              style={{
                backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#06C167 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />

            {/* Interactive SVG Radar Map Canvas */}
            <svg
              viewBox="0 0 600 320"
              className="w-full h-full transition-transform duration-300 ease-out"
              style={{
                transform: `scale(${vectorZoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'center center',
              }}
            >
              <defs>
                {/* Coastal gradient */}
                <linearGradient id="oceanGlow" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#0369a1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#082f49" stopOpacity="0.05" />
                </linearGradient>

                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06C167" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#FF4B26" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Atlantic Coastline Silhouette */}
              <path
                d="M 10,240 Q 90,200 170,170 T 320,130 T 480,110 T 590,95 L 600,320 L 0,320 Z"
                fill="url(#oceanGlow)"
              />
              <path
                d="M 0,245 Q 90,205 170,175 T 320,135 T 480,115 T 600,100"
                fill="none"
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.4"
              />

              {/* Mesurado River & Stockton Creek Estuary Arteries */}
              <path
                d="M 90,70 Q 150,90 200,130 T 260,170"
                fill="none"
                stroke="#0369a1"
                strokeWidth="4"
                opacity="0.35"
                strokeLinecap="round"
              />

              {/* Major Highway Artery: Tubman Boulevard & Freeway */}
              <path
                d="M 70,150 Q 180,165 310,185 T 450,210 T 570,230"
                fill="none"
                stroke="#334155"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M 70,150 Q 180,165 310,185 T 450,210 T 570,230"
                fill="none"
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="6 6"
              />

              {/* Key Monrovia Area Nodes */}
              {SCHEMATIC_LANDMARKS.map((lm) => {
                const pt = projectCoords({ lat: lm.lat, lng: lm.lng });
                return (
                  <g key={lm.name} className="opacity-45 hover:opacity-100 transition-opacity">
                    <circle cx={pt.x} cy={pt.y} r="2.5" fill="#94a3b8" />
                    <text
                      x={pt.x}
                      y={pt.y - 7}
                      fontSize="9"
                      fill="#94a3b8"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {lm.label}
                    </text>
                  </g>
                );
              })}

              {/* Delivery Route Path */}
              {driverPt ? (
                <>
                  {/* Restaurant -> Driver line */}
                  <path
                    d={`M ${restPt.x},${restPt.y} Q ${(restPt.x + driverPt.x) / 2},${(restPt.y + driverPt.y) / 2 - 15} ${driverPt.x},${driverPt.y}`}
                    fill="none"
                    stroke="#06C167"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    opacity="0.8"
                  />
                  {/* Driver -> Customer line */}
                  <path
                    d={`M ${driverPt.x},${driverPt.y} Q ${(driverPt.x + custPt.x) / 2},${(driverPt.y + custPt.y) / 2 - 15} ${custPt.x},${custPt.y}`}
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="3.5"
                    strokeDasharray="8 4"
                    filter="url(#glow)"
                  />
                </>
              ) : (
                /* Restaurant -> Customer direct curve */
                <path
                  d={`M ${restPt.x},${restPt.y} Q ${(restPt.x + custPt.x) / 2},${(restPt.y + custPt.y) / 2 - 25} ${custPt.x},${custPt.y}`}
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="3.5"
                  strokeDasharray="8 4"
                  filter="url(#glow)"
                />
              )}

              {/* 1. RESTAURANT PIN */}
              <g transform={`translate(${restPt.x}, ${restPt.y})`}>
                <circle r="14" fill="#06C167" opacity="0.2" className="animate-ping" />
                <circle r="11" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                {/* Store symbol */}
                <path
                  d="M -5,-3 L 5,-3 L 4,3 L -4,3 Z M -3,3 L -3,6 L 3,6 L 3,3"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                <rect x="-42" y="14" width="84" height="17" rx="8.5" fill="#0f172a" stroke="#06C167" strokeWidth="1" />
                <text x="0" y="26" fontSize="9" fill="#10b981" textAnchor="middle" fontWeight="bold">
                  {restaurantName.slice(0, 14)}
                </text>
              </g>

              {/* 2. DRIVER LIVE PIN (if active) */}
              {driverPt && (
                <g transform={`translate(${driverPt.x}, ${driverPt.y})`}>
                  <circle r="18" fill="#38bdf8" opacity="0.25" className="animate-pulse" />
                  <circle r="12" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                  <circle cx="-3" cy="2" r="2.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                  <circle cx="3" cy="2" r="2.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M -3,2 L 0,-2 L 3,2" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                  <rect x="-44" y="-28" width="88" height="17" rx="8.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                  <text x="0" y="-16" fontSize="9" fill="#ffffff" textAnchor="middle" fontWeight="bold">
                    🚴 {driverName.split(' ')[0]} ({driverVehicle})
                  </text>
                </g>
              )}

              {/* 3. CUSTOMER DESTINATION PIN */}
              <g transform={`translate(${custPt.x}, ${custPt.y})`}>
                <circle r="14" fill="#FF4B26" opacity="0.2" className="animate-pulse" />
                <circle r="11" fill="#FF4B26" stroke="#ffffff" strokeWidth="2" />
                <circle cx="0" cy="0" r="3" fill="#ffffff" />
                <rect x="-42" y="14" width="84" height="17" rx="8.5" fill="#1e1b4b" stroke="#FF4B26" strokeWidth="1" />
                <text x="0" y="26" fontSize="9" fill="#fca5a5" textAnchor="middle" fontWeight="bold">
                  📍 Destination
                </text>
              </g>
            </svg>

            {/* Radar status badge */}
            <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <div className="text-[11px] font-bold text-slate-200">
                Monrovia Live Radar • <span className="text-emerald-400">{distanceKm} km</span>
              </div>
            </div>

            {/* Interactive Zoom Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
              <button
                type="button"
                onClick={() => setVectorZoom((z) => Math.min(2.2, z + 0.25))}
                title="Zoom in"
                className="w-7 h-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setVectorZoom((z) => Math.max(0.75, z - 0.25))}
                title="Zoom out"
                className="w-7 h-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setVectorZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                title="Reset view"
                className="w-7 h-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Floating Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          {/* Mode Switcher if Google Maps Key exists */}
          {GOOGLE_MAPS_API_KEY && (
            <button
              type="button"
              onClick={() => setUseGoogleMaps(!useGoogleMaps)}
              className="pointer-events-auto px-2.5 py-1 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md cursor-pointer transition"
            >
              <Compass className="w-3 h-3 text-[#06C167]" />
              <span>{useGoogleMaps ? 'Switch to Vector' : 'Switch to Google Map'}</span>
            </button>
          )}

          {/* Turn-by-Turn GPS Button (Always Available) */}
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/95 hover:bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-black shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            <span>Turn-by-Turn GPS</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
