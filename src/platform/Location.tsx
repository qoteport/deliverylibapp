import React, { useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { LocateFixed, LoaderCircle, MapPin } from "lucide-react";
import { Dialog, Button, Field, Notice } from "./ui";
import { command } from "../utils/commandApi";
import { useRemote, friendly } from "./hooks";
import { Row } from "./model";
export const mapsKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");
export function decodeRoute(encoded: string) {
  const points: { lat: number; lng: number }[] = [];
  let i = 0,
    lat = 0,
    lng = 0;
  const read = () => {
    let shift = 0,
      result = 0,
      b;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 31) << shift;
      shift += 5;
    } while (b >= 32 && i < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += read();
    lng += read();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
export function SmallMap({
  markers = [],
  route,
  onPin,
  height = 310,
}: {
  markers: Row[];
  route?: string;
  onPin?: (p: { lat: number; lng: number }) => void;
  height?: number;
}) {
  if (!mapsKey)
    return (
      <div
        className="a-empty"
        style={{ height, background: "#e8f0e9", borderRadius: 20 }}
      >
        <MapPin />
        <p>Map is unavailable. You can still enter an address and use GPS.</p>
      </div>
    );
  markers = markers.map((m, i) => ({
    ...m,
    id: m.id || String(i),
    coords:
      m.coords || (Number.isFinite(m.lat) ? { lat: m.lat, lng: m.lng } : null),
  }));
  const center = markers.find((m) => m.coords)?.coords;
  if (!center)
    return <div className="a-empty">Waiting for a location pin.</div>;
  return (
    <div style={{ height, borderRadius: 22, overflow: "hidden" }}>
      <GoogleMap
        defaultCenter={center}
        defaultZoom={16}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        styles={[
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "water", stylers: [{ color: "#c9e3d8" }] },
          { featureType: "landscape", stylers: [{ color: "#edf1eb" }] },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }],
          },
        ]}
        onClick={(e) => {
          if (e.detail.latLng) onPin?.(e.detail.latLng);
        }}
      >
        <MapContent markers={markers} route={route} />
      </GoogleMap>
    </div>
  );
}
function MapContent({ markers, route }: { markers: Row[]; route?: string }) {
  const map = useMap(),
    fitted = useRef(false);
  useEffect(() => {
    if (!map || !markers.length) return;
    const google = (window as any).google;
    if (!fitted.current) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => m.coords && bounds.extend(m.coords));
      map.fitBounds(bounds, 50);
      if (markers.length === 1) map.setZoom(17);
      fitted.current = true;
    }
  }, [map, markers]);
  useEffect(() => {
    if (!map || !route) return;
    const line = new (window as any).google.maps.Polyline({
      map,
      path: decodeRoute(route),
      strokeColor: "#163d29",
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
    return () => line.setMap(null);
  }, [map, route]);
  return (
    <>
      {markers
        .filter((m) => m.coords)
        .map((m) => (
          <Marker
            key={m.id}
            position={m.coords}
            title={m.name}
            label={{
              text:
                m.type === "driver"
                  ? "🚗"
                  : m.type === "kekeh"
                    ? "🛺"
                    : m.type === "kitchen"
                      ? "K"
                      : m.type === "pickup"
                        ? "P"
                        : "D",
              color: "#17231c",
              fontSize: "12px",
              fontWeight: "800",
            }}
          />
        ))}
    </>
  );
}
export function LocationDialog({
  initial,
  title = "Choose your location",
  onClose,
  onChoose,
}: {
  initial?: Row;
  title?: string;
  onClose: () => void;
  onChoose: (value: Row) => void;
}) {
  const places = useMapsLibrary("places"),
    [query, setQuery] = useState(""),
    [address, setAddress] = useState(initial?.address || ""),
    [area, setArea] = useState(initial?.area || ""),
    [pin, setPin] = useState(initial?.coords || null),
    [suggestions, setSuggestions] = useState<any[]>([]),
    [searching, setSearching] = useState(false),
    [locating, setLocating] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saving, setSaving] = useState(false);
  const generation = useRef(0),
    session = useRef<any>(null),
    manual = useRef(false),
    serverSession = useRef(crypto.randomUUID()),
    alive = useRef(true),
    custom = useRef(false);
  const saved = useRemote("/v1/places/saved");
  useEffect(
    () => () => {
      alive.current = false;
      generation.current++;
    },
    [],
  );
  const locate = () => {
    if (!navigator.geolocation) {
      setError(
        "Location is unavailable in this browser. Search for your address.",
      );
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (fix) => {
        if (!alive.current) return;
        if (!manual.current) {
          const coords = {
            lat: fix.coords.latitude,
            lng: fix.coords.longitude,
          };
          setPin(coords);
          try {
            const map = (window as any).google?.maps;
            if (map) {
              const r = await new map.Geocoder().geocode({ location: coords });
              if (!manual.current && r.results?.[0]) {
                setAddress(r.results[0].formatted_address);
                setArea(
                  r.results[0].address_components?.find((a: any) =>
                    a.types.includes("locality"),
                  )?.long_name || "",
                );
              }
            } else {
              const resolved = await command(
                "/v1/maps/reverse",
                coords,
                undefined,
                false,
              );
              if (alive.current && !manual.current) {
                setAddress(resolved.address || "");
                setArea(resolved.area || "");
              }
            }
          } catch {}
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(
          "Location could not be found. Search or tap the map to choose a pin.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };
  useEffect(() => {
    if (navigator.geolocation) locate();
  }, []);
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const current = ++generation.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        if (!places || !mapsKey) {
          const result = await command(
            "/v1/maps/autocomplete",
            { input: query.trim(), sessionToken: serverSession.current },
            undefined,
            false,
          );
          if (current === generation.current)
            setSuggestions(
              result.suggestions.map((p: any) => ({
                proxy: p,
                placePrediction: {
                  text: { toString: () => p.fullAddress || p.title },
                },
              })),
            );
          return;
        }
        session.current ??= new (places as any).AutocompleteSessionToken();
        const r = await (
          places as any
        ).AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: session.current,
          includedRegionCodes: ["lr"],
          ...(pin ? { locationBias: { center: pin, radius: 30000 } } : {}),
        });
        if (current === generation.current)
          setSuggestions(
            r.suggestions.filter((s: any) => s.placePrediction).slice(0, 5),
          );
      } catch (e) {
        if (current === generation.current)
          setError("Place search is unavailable. Use GPS or choose a map pin.");
      } finally {
        if (current === generation.current) setSearching(false);
      }
    }, 350);
    return () => {
      generation.current++;
      clearTimeout(timer);
    };
  }, [query, places]);
  const choose = async (s: any) => {
    manual.current = true;
    setSearching(true);
    setError(null);
    generation.current++;
    try {
      custom.current = false;
      if (s.proxy) {
        const value = await command(
          "/v1/maps/details",
          { placeId: s.proxy.placeId, sessionToken: serverSession.current },
          undefined,
          false,
        );
        if (!alive.current) return;
        setPin(value.coords);
        setAddress(value.address);
        setArea(value.area || "");
        setQuery("");
        setSuggestions([]);
        serverSession.current = crypto.randomUUID();
        return;
      }
      const p = s.placePrediction.toPlace();
      await p.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });
      if (!p.location) throw Error();
      setPin({ lat: p.location.lat(), lng: p.location.lng() });
      setAddress(p.formattedAddress || p.displayName);
      setArea(p.displayName || "");
      setQuery("");
      setSuggestions([]);
      session.current = null;
    } catch {
      setError("Could not resolve that place. Choose a map pin instead.");
    } finally {
      setSearching(false);
    }
  };
  const done = async () => {
    if (!pin || address.trim().length < 2) {
      setError("Add an address or landmark and choose its map pin.");
      return;
    }
    setSaving(true);
    try {
      if (custom.current && saved.data)
        await command("/v1/places/saved", {
          label: address.trim().slice(0, 200),
          coords: pin,
          source: "user_pin",
        });
      onChoose({ address: address.trim(), area: area.trim(), coords: pin });
    } catch (e) {
      setError(friendly(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="a-search">
        <input
          aria-label="Search an address or landmark"
          placeholder="Search an address or landmark"
          value={query}
          onChange={(e) => {
            manual.current = true;
            setQuery(e.target.value);
            setError(null);
          }}
        />
        {searching ? (
          <LoaderCircle className="spin" size={20} />
        ) : (
          <MapPin size={20} />
        )}
      </div>
      {suggestions.map((s, i) => (
        <button className="a-option" key={i} onClick={() => choose(s)}>
          {s.placePrediction.text.toString()}
        </button>
      ))}
      {query &&
        !suggestions.length &&
        !searching &&
        (saved.data?.places || [])
          .filter((p: Row) =>
            p.label.toLowerCase().includes(query.toLowerCase()),
          )
          .map((p: Row) => (
            <button
              className="a-option"
              key={p.id}
              onClick={() => {
                manual.current = true;
                setPin(p.coords);
                setAddress(p.label);
                setArea("");
                setQuery("");
              }}
            >
              {p.label} · Saved place
            </button>
          ))}
      <p style={{ fontSize: 10, textAlign: "right" }}>Powered by Google</p>
      <SmallMap
        markers={pin ? [{ id: "pin", name: address, coords: pin }] : []}
        onPin={(p) => {
          manual.current = true;
          custom.current = true;
          setPin(p);
        }}
        height={270}
      />
      <Button
        secondary
        disabled={locating}
        onClick={() => {
          manual.current = false;
          locate();
        }}
      >
        <LocateFixed size={17} />
        {locating ? "Finding your location..." : "Use my current location"}
      </Button>
      <Field
        label="Address or landmark"
        hint="Not listed on Google? Name your map pin and save it for next time."
      >
        <input
          value={address}
          maxLength={300}
          onChange={(e) => {
            manual.current = true;
            setAddress(e.target.value);
          }}
        />
      </Field>
      <Notice error={error} />
      <Button disabled={saving || !pin} onClick={done}>
        {saving ? "Saving..." : "Use this location"}
      </Button>
    </Dialog>
  );
}
