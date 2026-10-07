import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, Check, Search, Loader2 } from 'lucide-react';
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
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  // Helper to find nearest Monrovia landmark by distance if geocoder returns generic
  const findNearestMonroviaNeighborhood = (coords: LocationCoords): string => {
    let nearest = MONROVIA_LANDMARKS[0].name;
    let minDistance = Infinity;

    for (const lm of MONROVIA_LANDMARKS) {
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

  // Google Places Reverse Geocoding
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

        // Build clean area representation
        let finalArea = detectedArea || detectedStreet || detectedCity;
        if (!finalArea || finalArea.toLowerCase() === 'monrovia' || finalArea.toLowerCase() === 'liberia') {
          finalArea = findNearestMonroviaNeighborhood(coords);
        }

        setAreaName(finalArea);

        // Auto-fill street/landmark detail if empty
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

  // Initialize Native Google Map & Places Autocomplete
  useEffect(() => {
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
        const newCoords = { lat: newLat, lng: newLng };
        setSelectedCoords(newCoords);
        setGpsError(null);
        reverseGeocode(newCoords);
      });

      // Handle map click
      map.addListener('click', (event: any) => {
        if (!isMounted) return;
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        const newCoords = { lat: newLat, lng: newLng };
        setSelectedCoords(newCoords);
        if (typeof marker.setPosition === 'function') { marker.setPosition(newCoords); } else { marker.position = newCoords; }
        setGpsError(null);
        reverseGeocode(newCoords);
      });

      // Setup Places Autocomplete on the search input
      if (searchInputRef.current && gmaps.places?.Autocomplete) {
        const autocomplete = new gmaps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'lr' },
          fields: ['geometry', 'name', 'formatted_address', 'address_components'],
        });

        autocomplete.bindTo('bounds', map);
        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const newCoords = { lat, lng };

          setSelectedCoords(newCoords);
          map.panTo(newCoords);
          map.setZoom(16);
          marker.setPosition(newCoords);

          // Extract area and place name
          const placeTitle = place.name || '';
          let placeArea = '';

          for (const comp of place.address_components || []) {
            const types = comp.types || [];
            if (types.includes('neighborhood') || types.includes('sublocality')) {
              placeArea = comp.long_name;
              break;
            }
          }

          setAreaName(placeArea || placeTitle || findNearestMonroviaNeighborhood(newCoords));
          if (placeTitle) {
            setLandmarkDetails(placeTitle);
          }
          setGpsError(null);
        });
      }
    };

    // Robust Google Maps Script Loader & Polling Manager
    let intervalId: any = null;

    const checkAndInitMap = () => {
      if ((window as any).google?.maps?.Map) {
        if (intervalId) clearInterval(intervalId);
        if (isMounted) {
          initMap();
        }
        return true;
      }
      return false;
    };

    if (!checkAndInitMap()) {
      const scripts = Array.from(document.querySelectorAll('script'));
      const hasGmapsScript = scripts.some(
        (s) => s.src && s.src.includes('maps.googleapis.com/maps/api/js')
      );

      if (!hasGmapsScript) {
        const script = document.createElement('script');
        script.id = 'google-maps-script-loader';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker&v=weekly`;
        script.async = true;
        document.head.appendChild(script);
      }

      let attempts = 0;
      intervalId = setInterval(() => {
        attempts++;
        if (checkAndInitMap() || attempts > 120) {
          if (intervalId) clearInterval(intervalId);
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Update map and marker when selectedCoords change programmatically
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
        setIsLocating(false);
        updateMapPosition(coords, false); // Will trigger reverseGeocode
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can tap anywhere on the map or search above.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please tap your location on the map.';
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectLandmark = (landmark: { name: string; coords: LocationCoords }) => {
    updateMapPosition(landmark.coords, true);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-y-auto flex flex-col max-h-[92vh] border border-gray-100 my-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#111827] text-sm">{title || "Pinpoint Delivery Spot"}</h3>
              <p className="text-[11px] text-gray-500">Google Places &amp; GPS Area Detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Places Search Bar */}
        <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places in Monrovia (e.g. Boulevard Palace, 15th St Sinkor, ELWA)..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#06C167] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Quick Area Filter Pills & Use GPS */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleLocateMe(); }}
            disabled={isLocating}
            className="px-3 py-1.5 bg-[#06C167] hover:bg-[#05A357] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isLocating ? 'Detecting Area...' : 'Use My GPS'}</span>
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
          <div ref={mapContainerRef} style={{ width: "100%", height: "320px", minHeight: "320px" }} className="w-full relative rounded-2xl overflow-hidden" />

          {/* Floating Instructions Banner & Geocoding status */}
          <div className="absolute top-2 left-2 right-2 sm:left-auto sm:right-2 sm:w-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200 text-[11px] font-bold text-gray-800 flex items-center gap-1.5 pointer-events-none">
            {isGeocoding ? (
              <>
                <Loader2 className="w-3 h-3 text-[#06C167] animate-spin" />
                <span className="text-[#048747]">Detecting Monrovia Area...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Tap map or drag pin to update area</span>
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

        {/* Selected Coordinates & Detailed Address Form */}
        <div className="p-4 bg-white border-t border-gray-100 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block">
                  Detected Area / Neighborhood
                </label>
                {isGeocoding && (
                  <span className="text-[10px] text-[#06C167] font-bold animate-pulse">
                    Detecting...
                  </span>
                )}
              </div>
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

          <div className="flex items-center justify-end text-[11px] text-gray-500 font-mono px-1">
            <a
              href={`https://www.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#06C167] font-bold hover:underline font-sans"
            >
              Preview in Google Maps &rarr;
            </a>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#06C167]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm Delivery Location ({areaName || 'Selected Area'})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
