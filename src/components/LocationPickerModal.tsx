import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, Check } from 'lucide-react';
import { LocationCoords } from '../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: LocationCoords | null;
  initialArea?: string;
  initialAddress?: string;
  onConfirmLocation: (data: { area: string; address: string; coords: LocationCoords }) => void;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyBopYcwX6ywdAFbPlc0-dk3Gi1Hv7VqUPA';

const MONROVIA_LANDMARKS = [
  { name: 'Sinkor (1st–24th St)', coords: { lat: 6.2907, lng: -10.7818 } },
  { name: 'Mamba Point & Snapper Hill', coords: { lat: 6.3182, lng: -10.8123 } },
  { name: 'Congotown & Boulevard', coords: { lat: 6.2690, lng: -10.7480 } },
  { name: 'Paynesville & ELWA Junction', coords: { lat: 6.2753, lng: -10.7100 } },
  { name: 'Central Monrovia (Broad St)', coords: { lat: 6.3130, lng: -10.8040 } },
  { name: 'Old Road & Key Hole', coords: { lat: 6.2790, lng: -10.7600 } },
  { name: 'Airfield & Lakpazee', coords: { lat: 6.2810, lng: -10.7680 } },
  { name: 'Bushrod Island & Freeport', coords: { lat: 6.3450, lng: -10.7880 } },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  initialArea,
  initialAddress,
  onConfirmLocation,
}) => {
  if (!isOpen) return null;

  const defaultCenter = initialCoords || { lat: 6.2907, lng: -10.7818 };
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords>(defaultCenter);
  const [areaName, setAreaName] = useState(initialArea || 'Sinkor');
  const [landmarkDetails, setLandmarkDetails] = useState(initialAddress || '');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Initialize Native Google Map
  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
      if (!mapContainerRef.current || !(window as any).google?.maps) return;

      const gmaps = (window as any).google.maps;
      const center = { lat: selectedCoords.lat, lng: selectedCoords.lng };

      const map = new gmaps.Map(mapContainerRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;

      const marker = new gmaps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'Delivery Pinpoint',
        animation: gmaps.Animation.DROP,
      });

      markerInstanceRef.current = marker;

      // Handle marker drag
      marker.addListener('dragend', (event: any) => {
        if (!isMounted) return;
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        setSelectedCoords({ lat: newLat, lng: newLng });
        setGpsError(null);
      });

      // Handle map click
      map.addListener('click', (event: any) => {
        if (!isMounted) return;
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        setSelectedCoords({ lat: newLat, lng: newLng });
        marker.setPosition({ lat: newLat, lng: newLng });
        setGpsError(null);
      });
    };

    // Load Google Maps Script if not present
    if ((window as any).google?.maps) {
      initMap();
    } else {
      const existingScript = document.getElementById('google-maps-script-loader');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-maps-script-loader';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.onload = () => {
          if (isMounted) initMap();
        };
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', () => {
          if (isMounted) initMap();
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Update map and marker when selectedCoords change programmatically
  const updateMapPosition = (coords: LocationCoords) => {
    setSelectedCoords(coords);
    if (mapInstanceRef.current && (window as any).google?.maps) {
      mapInstanceRef.current.panTo(coords);
      mapInstanceRef.current.setZoom(15);
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition(coords);
    }
  };

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
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        updateMapPosition(coords);
        setIsLocating(false);
        if (!areaName || areaName === 'Sinkor') {
          setAreaName('My Current Location');
        }
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can tap anywhere on the map instead.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please tap your location on the map.';
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectLandmark = (landmark: { name: string; coords: LocationCoords }) => {
    updateMapPosition(landmark.coords);
    setAreaName(landmark.name);
    setGpsError(null);
  };

  const handleConfirm = () => {
    onConfirmLocation({
      area: areaName.trim() || 'Monrovia Delivery Spot',
      address: landmarkDetails.trim(),
      coords: selectedCoords,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#111827] text-sm">Pinpoint Delivery Spot</h3>
              <p className="text-[11px] text-gray-500">Tap anywhere on the map or drag the pin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Area Filter Pills */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="px-3 py-1.5 bg-[#FF4B26] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs hover:bg-[#E03A16] active:scale-95 transition-all cursor-pointer"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
          </button>

          {MONROVIA_LANDMARKS.map((lm) => (
            <button
              key={lm.name}
              type="button"
              onClick={() => handleSelectLandmark(lm)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                areaName === lm.name
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {lm.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Map View */}
        <div className="relative flex-1 min-h-[260px] sm:min-h-[300px] bg-gray-100">
          <div ref={mapContainerRef} className="w-full h-full min-h-[260px] sm:min-h-[300px]" />

          {/* Floating Instructions Banner */}
          <div className="absolute top-2 left-2 right-2 sm:left-auto sm:right-2 sm:w-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200 text-[11px] font-bold text-gray-800 flex items-center gap-1.5 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Tap anywhere or drag pin to set exact delivery spot</span>
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

        {/* Selected Coordinates & Detailed Address Form */}
        <div className="p-4 bg-white border-t border-gray-100 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block">
                Area / Neighborhood
              </label>
              <input
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="e.g. Sinkor 12th Street, ELWA, Duala"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
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
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono px-1">
            <span>📍 Pin Lat: {selectedCoords.lat.toFixed(5)}, Lng: {selectedCoords.lng.toFixed(5)}</span>
            <a
              href={`https://www.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF4B26] font-bold hover:underline font-sans"
            >
              Preview in Google Maps &rarr;
            </a>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4722] via-[#FF5F2E] to-[#FF8400] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#FF4B26]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm Pinpoint Location</span>
          </button>
        </div>

      </div>
    </div>
  );
};
