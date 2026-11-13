import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, MapPin, Navigation, Check, Search, Loader2, Compass, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react';
import { LocationCoords } from '../types';

export type LocationContextType = 'kitchen' | 'restaurant' | 'delivery' | 'address' | 'generic';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  confirmButtonText?: string;
  locationType?: LocationContextType;
  initialCoords?: LocationCoords | null;
  initialArea?: string;
  initialAddress?: string;
  onConfirmLocation: (data: { area: string; address: string; coords: LocationCoords }) => void;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

interface MonroviaSpot {
  name: string;
  category: string;
  coords: LocationCoords;
  description: string;
}

const MONROVIA_SPOTS: MonroviaSpot[] = [
  { name: 'Sinkor (Tubman Blvd)', category: 'Sinkor', coords: { lat: 6.2907, lng: -10.7818 }, description: 'Tubman Blvd, 1st to 24th Street' },
  { name: '12th Street Sinkor', category: 'Sinkor', coords: { lat: 6.2890, lng: -10.7810 }, description: 'Sinkor Commercial strip' },
  { name: 'Mamba Point & Snapper Hill', category: 'Downtown', coords: { lat: 6.3182, lng: -10.8123 }, description: 'Diplomatic quarter & UN Drive' },
  { name: 'Broad Street (Central Monrovia)', category: 'Downtown', coords: { lat: 6.3130, lng: -10.8040 }, description: 'Commerce & Government Center' },
  { name: 'Congotown & Boulevard Palace', category: 'Congo Town', coords: { lat: 6.2690, lng: -10.7480 }, description: 'Residential & Embassy zone' },
  { name: 'Old Road & Key Hole', category: 'Old Road', coords: { lat: 6.2790, lng: -10.7600 }, description: 'Old Road Market corridor' },
  { name: 'Paynesville & ELWA Junction', category: 'Paynesville', coords: { lat: 6.2753, lng: -10.7100 }, description: 'ELWA Hospital & Junction' },
  { name: 'Airfield & Lakpazee', category: 'Airfield', coords: { lat: 6.2810, lng: -10.7680 }, description: 'Old Spriggs Payne corridor' },
  { name: 'Bushrod Island & Freeport', category: 'Bushrod', coords: { lat: 6.3450, lng: -10.7880 }, description: 'National Port & Duala' },
  { name: 'SKD Boulevard & Complex', category: 'Paynesville', coords: { lat: 6.2620, lng: -10.7250 }, description: 'Sports complex & Duport Rd' },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  title,
  confirmButtonText,
  locationType,
  initialCoords,
  initialArea,
  initialAddress,
  onConfirmLocation,
}) => {
  if (!isOpen) return null;

  // Determine effective context from props or title
  const effectiveContext = useMemo<LocationContextType>(() => {
    if (locationType) return locationType;
    const lower = (title || '').toLowerCase();
    if (lower.includes('kitchen')) return 'kitchen';
    if (lower.includes('restaurant')) return 'restaurant';
    if (lower.includes('delivery')) return 'delivery';
    if (lower.includes('address') || lower.includes('home')) return 'address';
    return 'generic';
  }, [locationType, title]);

  // Context-aware labels
  const resolvedLabels = useMemo(() => {
    switch (effectiveContext) {
      case 'kitchen':
        return {
          headerTitle: title || 'Pick Kitchen Location',
          markerTitle: 'Kitchen Location Pinpoint',
          fallbackArea: 'Monrovia Kitchen Location',
          confirmAction: confirmButtonText || 'Confirm Kitchen Location',
        };
      case 'restaurant':
        return {
          headerTitle: title || 'Pick Restaurant Location',
          markerTitle: 'Restaurant Location Pinpoint',
          fallbackArea: 'Monrovia Restaurant Location',
          confirmAction: confirmButtonText || 'Confirm Restaurant Location',
        };
      case 'delivery':
        return {
          headerTitle: title || 'Pinpoint Delivery Spot',
          markerTitle: 'Delivery Destination Pinpoint',
          fallbackArea: 'Monrovia Delivery Spot',
          confirmAction: confirmButtonText || 'Confirm Delivery Location',
        };
      case 'address':
        return {
          headerTitle: title || 'Set Saved Address',
          markerTitle: 'Address Pinpoint',
          fallbackArea: 'Monrovia Saved Address',
          confirmAction: confirmButtonText || 'Confirm Address',
        };
      case 'generic':
      default:
        return {
          headerTitle: title || 'Pinpoint Location',
          markerTitle: 'Location Pinpoint',
          fallbackArea: 'Monrovia Location',
          confirmAction: confirmButtonText || 'Confirm Location',
        };
    }
  }, [effectiveContext, title, confirmButtonText]);

  const defaultCenter = initialCoords || { lat: 6.2907, lng: -10.7818 };
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords>(defaultCenter);
  const [areaName, setAreaName] = useState(initialArea || 'Sinkor');
  const [landmarkDetails, setLandmarkDetails] = useState(initialAddress || '');
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasGoogleMapsLoaded, setHasGoogleMapsLoaded] = useState(false);
  const [vectorZoom, setVectorZoom] = useState<number>(1);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const vectorSvgRef = useRef<SVGSVGElement | null>(null);

  // Helper: Find nearest Monrovia landmark by Euclidean distance on lat/lng
  const findNearestMonroviaNeighborhood = (coords: LocationCoords): string => {
    let nearest = MONROVIA_SPOTS[0].name;
    let minDistance = Infinity;

    for (const lm of MONROVIA_SPOTS) {
      const dLat = coords.lat - lm.coords.lat;
      const dLng = coords.lng - lm.coords.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = lm.name;
      }
    }
    return nearest;
  };

  // Reverse geocode fallback or native Google Maps Geocoder
  const reverseGeocode = (coords: LocationCoords) => {
    if (!(window as any).google?.maps?.Geocoder) {
      const fallback = findNearestMonroviaNeighborhood(coords);
      setAreaName(fallback);
      return;
    }

    setIsGeocoding(true);
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results: any[], status: string) => {
      setIsGeocoding(false);
      if (status === 'OK' && results && results.length > 0) {
        const firstResult = results[0];
        let detectedArea = '';
        let detectedStreet = '';
        let detectedCity = '';

        for (const comp of firstResult.address_components || []) {
          const types = comp.types || [];
          if (types.includes('neighborhood') || types.includes('sublocality') || types.includes('sublocality_level_1')) {
            if (!detectedArea) detectedArea = comp.long_name;
          } else if (types.includes('route') || types.includes('street_address')) {
            if (!detectedStreet) detectedStreet = comp.long_name;
          } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
            if (!detectedCity) detectedCity = comp.long_name;
          }
        }

        let finalArea = detectedArea || detectedStreet || detectedCity;
        if (!finalArea || finalArea.toLowerCase() === 'monrovia' || finalArea.toLowerCase() === 'liberia') {
          finalArea = findNearestMonroviaNeighborhood(coords);
        }

        setAreaName(finalArea);

        if (firstResult.formatted_address) {
          const formatted = firstResult.formatted_address.split(',')[0];
          if (formatted && formatted !== finalArea) {
            setLandmarkDetails((prev) => (prev ? prev : formatted));
          }
        }
      } else {
        const fallback = findNearestMonroviaNeighborhood(coords);
        setAreaName(fallback);
      }
    });
  };

  // Convert real Monrovia lat/lng to SVG coordinates (600x320)
  const coordsToSvg = (coords: LocationCoords) => {
    const minLat = 6.24;
    const maxLat = 6.35;
    const minLng = -10.83;
    const maxLng = -10.68;

    const x = ((coords.lng - minLng) / (maxLng - minLng)) * 560 + 20;
    const y = ((maxLat - coords.lat) / (maxLat - minLat)) * 260 + 30;
    return {
      x: Math.min(580, Math.max(20, x)),
      y: Math.min(290, Math.max(20, y)),
    };
  };

  // Convert SVG coordinates back to Monrovia lat/lng on user tap
  const svgToCoords = (x: number, y: number): LocationCoords => {
    const minLat = 6.24;
    const maxLat = 6.35;
    const minLng = -10.83;
    const maxLng = -10.68;

    const clampedX = Math.min(580, Math.max(20, x));
    const clampedY = Math.min(290, Math.max(20, y));

    const lng = minLng + ((clampedX - 20) / 560) * (maxLng - minLng);
    const lat = maxLat - ((clampedY - 30) / 260) * (maxLat - minLat);

    return {
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
    };
  };

  // Handle tap on vector map
  const handleVectorSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!vectorSvgRef.current) return;
    const rect = vectorSvgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Scale to viewBox (600x320)
    const svgX = (clickX / rect.width) * 600;
    const svgY = (clickY / rect.height) * 320;

    const newCoords = svgToCoords(svgX, svgY);
    setSelectedCoords(newCoords);
    setGpsError(null);
    reverseGeocode(newCoords);
  };

  // Initialize Native Google Map if API key is provided and available
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setHasGoogleMapsLoaded(false);
      return;
    }

    let isMounted = true;

    const initMap = () => {
      if (!mapContainerRef.current || !(window as any).google?.maps) return;

      const gmaps = (window as any).google.maps;
      const center = { lat: selectedCoords.lat, lng: selectedCoords.lng };

      const map = new gmaps.Map(mapContainerRef.current, {
        center,
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;
      setHasGoogleMapsLoaded(true);

      const marker = new gmaps.Marker({
        position: center,
        map,
        draggable: true,
        title: resolvedLabels.markerTitle,
        animation: gmaps.Animation.DROP,
      });

      markerInstanceRef.current = marker;

      marker.addListener('dragend', (event: any) => {
        if (!isMounted) return;
        const newCoords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        setSelectedCoords(newCoords);
        setGpsError(null);
        reverseGeocode(newCoords);
      });

      map.addListener('click', (event: any) => {
        if (!isMounted) return;
        const newCoords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        setSelectedCoords(newCoords);
        if (typeof marker.setPosition === 'function') {
          marker.setPosition(newCoords);
        }
        setGpsError(null);
        reverseGeocode(newCoords);
      });
    };

    if ((window as any).google?.maps?.Map) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.id = 'google-maps-script-loader';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`;
      script.async = true;
      script.onload = () => {
        if (isMounted) initMap();
      };
      script.onerror = () => {
        if (isMounted) setHasGoogleMapsLoaded(false);
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const updateMapPosition = (coords: LocationCoords, skipReverseGeocode = false) => {
    setSelectedCoords(coords);
    if (mapInstanceRef.current && (window as any).google?.maps) {
      mapInstanceRef.current.panTo(coords);
      mapInstanceRef.current.setZoom(16);
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition(coords);
    }
    if (!skipReverseGeocode) {
      reverseGeocode(coords);
    }
  };

  // Browser Geolocation API
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        };
        setIsLocating(false);
        updateMapPosition(coords, false);
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Tap anywhere on the map or select a neighborhood.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please tap your neighborhood on the map.';
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectLandmark = (spot: MonroviaSpot) => {
    updateMapPosition(spot.coords, true);
    setAreaName(spot.name);
    setLandmarkDetails(spot.description);
    setGpsError(null);
  };

  const handleConfirm = () => {
    onConfirmLocation({
      area: areaName.trim() || resolvedLabels.fallbackArea,
      address: landmarkDetails.trim(),
      coords: selectedCoords,
    });
    onClose();
  };

  // Filter spots by search
  const filteredSpots = useMemo(() => {
    if (!searchQuery.trim()) return MONROVIA_SPOTS;
    const q = searchQuery.toLowerCase();
    return MONROVIA_SPOTS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeSvgPt = coordsToSvg(selectedCoords);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-y-auto flex flex-col max-h-[92vh] border border-gray-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#111827] text-sm">{resolvedLabels.headerTitle}</h3>
              <p className="text-[11px] text-gray-500">Tap map or choose Monrovia landmark</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Monrovia (Sinkor, Broad St, Mamba Point, ELWA, Duala)..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#06C167] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Quick Area Filter Pills & GPS */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLocateMe();
            }}
            disabled={isLocating}
            className="px-3 py-1.5 bg-[#06C167] hover:bg-[#05A357] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isLocating ? 'Detecting...' : 'Use My GPS'}</span>
          </button>

          {filteredSpots.map((spot) => (
            <button
              key={spot.name}
              type="button"
              onClick={() => handleSelectLandmark(spot)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                areaName === spot.name
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {spot.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* MAP VIEW */}
        <div className="relative flex-1 min-h-[280px] bg-slate-950 overflow-hidden">
          {hasGoogleMapsLoaded && GOOGLE_MAPS_API_KEY ? (
            <div
              ref={mapContainerRef}
              style={{ width: '100%', height: '300px', minHeight: '300px' }}
              className="w-full relative"
            />
          ) : (
            /* ================================================================= */
            /* INTERACTIVE MONROVIA VECTOR PINPOINT CANVAS                       */
            /* ================================================================= */
            <div className="relative w-full h-[300px] bg-[#0a1120] select-none flex items-center justify-center cursor-crosshair">
              {/* Subtle grid */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#06C167 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              />

              <svg
                ref={vectorSvgRef}
                viewBox="0 0 600 320"
                onClick={handleVectorSvgClick}
                className="w-full h-full"
                style={{
                  transform: `scale(${vectorZoom})`,
                  transformOrigin: 'center center',
                }}
              >
                <defs>
                  <linearGradient id="oceanFill" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#082f49" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Ocean & Coastline */}
                <path
                  d="M 10,240 Q 90,200 170,170 T 320,130 T 480,110 T 590,95 L 600,320 L 0,320 Z"
                  fill="url(#oceanFill)"
                />
                <path
                  d="M 0,245 Q 90,205 170,175 T 320,135 T 480,115 T 600,100"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />

                {/* Mesurado River Estuary */}
                <path
                  d="M 90,70 Q 150,90 200,130 T 260,170"
                  fill="none"
                  stroke="#0369a1"
                  strokeWidth="5"
                  opacity="0.35"
                  strokeLinecap="round"
                />

                {/* Tubman Boulevard & Central Highway */}
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
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                />

                {/* Monrovia Landmark Reference Nodes */}
                {MONROVIA_SPOTS.map((s) => {
                  const pt = coordsToSvg(s.coords);
                  return (
                    <g key={s.name} className="opacity-60 hover:opacity-100 transition-opacity">
                      <circle cx={pt.x} cy={pt.y} r="3" fill="#94a3b8" />
                      <text
                        x={pt.x}
                        y={pt.y - 7}
                        fontSize="9"
                        fill="#cbd5e1"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {s.name.split(' (')[0]}
                      </text>
                    </g>
                  );
                })}

                {/* ACTIVE PINPOINT MARKER */}
                <g transform={`translate(${activeSvgPt.x}, ${activeSvgPt.y})`}>
                  <circle r="18" fill="#06C167" opacity="0.25" className="animate-ping" />
                  <circle r="12" fill="#06C167" stroke="#ffffff" strokeWidth="2.5" />
                  <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                  {/* Floating label box */}
                  <rect
                    x="-50"
                    y="-32"
                    width="100"
                    height="20"
                    rx="10"
                    fill="#0f172a"
                    stroke="#06C167"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="-18"
                    fontSize="9.5"
                    fill="#4ade80"
                    textAnchor="middle"
                    fontWeight="black"
                  >
                    📍 {areaName.split(' ')[0]}
                  </text>
                </g>
              </svg>

              {/* Vector Zoom Controls */}
              <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                <button
                  type="button"
                  onClick={() => setVectorZoom((z) => Math.min(2.0, z + 0.25))}
                  title="Zoom in"
                  className="w-7 h-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setVectorZoom((z) => Math.max(0.8, z - 0.25))}
                  title="Zoom out"
                  className="w-7 h-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setVectorZoom(1)}
                  title="Reset view"
                  className="w-7 h-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Floating Instructions Banner & Geocoding status */}
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200 text-[11px] font-bold text-gray-800 flex items-center gap-1.5 pointer-events-none">
            {isGeocoding ? (
              <>
                <Loader2 className="w-3 h-3 text-[#06C167] animate-spin" />
                <span className="text-[#048747]">Resolving Area...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tap anywhere on the map to pinpoint</span>
              </>
            )}
          </div>

          {/* GPS Error alert */}
          {gpsError && (
            <div className="absolute bottom-2 left-2 right-2 bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center justify-between">
              <span>{gpsError}</span>
              <button
                type="button"
                onClick={() => setGpsError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Selected Coordinates & Address Form */}
        <div className="p-4 bg-white border-t border-gray-100 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block">
                Detected Area / Neighborhood
              </label>
              <input
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="e.g. Sinkor 12th Street, ELWA, Duala"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block">
                House, Gate Color or Landmark
              </label>
              <input
                type="text"
                value={landmarkDetails}
                onChange={(e) => setLandmarkDetails(e.target.value)}
                placeholder="e.g. Green gate opposite Total Gas Station"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
              />
            </div>
          </div>

          {/* Coordinates Bar */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono px-1">
            <span className="text-[10px] text-gray-500">
              📍 {selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lng.toFixed(4)}° W
            </span>
            <a
              href={`https://www.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#06C167] font-bold hover:underline font-sans flex items-center gap-1"
            >
              <span>Preview Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {resolvedLabels.confirmAction} ({areaName || 'Selected Area'})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
