import React, { useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Bike, Store, MapPin, Navigation, ExternalLink } from 'lucide-react';
import { LocationCoords } from '../types';

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

  // Google Maps navigation intent URL
  const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${driverLocation ? `${driverLocation.lat},${driverLocation.lng}` : `${restaurantLocation.lat},${restaurantLocation.lng}`}&destination=${customerLocation.lat},${customerLocation.lng}&waypoints=${restaurantLocation.lat},${restaurantLocation.lng}&travelmode=driving`;

  // Convert height prop (handles Tailwind classes like 'h-56', 'h-64' or CSS dimensions like '280px', '320px')
  const isExplicitCssHeight = typeof height === 'string' && (height.endsWith('px') || height.endsWith('%') || height.endsWith('vh') || height.endsWith('rem'));
  const containerStyle = isExplicitCssHeight ? { height, width: '100%' } : { minHeight: '260px', height: '260px', width: '100%' };
  const heightClass = !isExplicitCssHeight ? (height.startsWith('h-') ? height : 'h-64') : '';

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-gray-200 shadow-sm ${className}`}>
      {/* Map Container */}
      <div style={containerStyle} className={`relative bg-gray-100 ${heightClass}`}>
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
            {/* 1. Restaurant Marker */}
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

            {/* 2. Customer Destination Marker */}
            <AdvancedMarker position={customerLocation} title={customerAddress}>
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="px-2 py-0.5 bg-emerald-700 text-white text-[10px] font-bold rounded-full shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-white/20">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>Customer</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white animate-bounce">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
            </AdvancedMarker>

            {/* 3. Driver Live Location Marker */}
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

        {/* Floating Google Navigation Shortcut */}
        <div className="absolute bottom-3 right-3 z-10">
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md hover:bg-gray-50 text-[#111827] border border-gray-200 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Turn-by-Turn GPS</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
