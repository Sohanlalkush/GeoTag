import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Compass,
  Crosshair,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { LocationData, MapType } from '../types';
import { computePlusCode } from '../utils/plusCode';
import { reverseGeocode, searchPlaces, PlaceSearchResult } from '../utils/reverseGeocode';

interface InteractiveMapModalProps {
  isOpen?: boolean;
  onClose: () => void;
  location: LocationData;
  onApplyCoordinates: (coords: { latitude: number; longitude: number; title?: string; subtitle?: string; plusCode?: string }) => void;
  onResetGps: () => void;
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  isOpen = true,
  onClose,
  location,
  onApplyCoordinates,
  onResetGps,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(location.latitude);
  const [currentLng, setCurrentLng] = useState<number>(location.longitude);
  const [activeLayer, setActiveLayer] = useState<MapType>('google');
  const [resolvedTitle, setResolvedTitle] = useState<string>(location.title);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const tileUrls: Record<MapType, { url: string; attribution: string; subdomains?: string }> = {
    google: {
      url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en',
      attribution: '&copy; Google Maps',
      subdomains: '0123',
    },
    'google-satellite': {
      url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=en',
      attribution: '&copy; Google Maps Imagery',
      subdomains: '0123',
    },
    'google-terrain': {
      url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=en',
      attribution: '&copy; Google Maps Terrain',
      subdomains: '0123',
    },
    streets: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; World Street Map',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
    },
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
  };

  // Custom GPS Pin Icon with SVG
  const createPinIcon = () => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 34px; height: 42px; transform: translate(-17px, -42px);">
          <svg viewBox="0 0 34 42" width="34" height="42" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
            <path d="M17 0 C7.6 0 0 7.6 0 17 C0 29.7 17 42 17 42 C17 42 34 29.7 34 17 C34 7.6 26.4 0 17 0 Z" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/>
            <circle cx="17" cy="17" r="6.5" fill="#ffffff"/>
            <circle cx="17" cy="17" r="3.5" fill="#b91c1c"/>
          </svg>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [location.latitude, location.longitude],
      zoom: 16,
      zoomControl: false,
    });

    const layerConfig = tileUrls[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      subdomains: layerConfig.subdomains || 'abc',
      maxZoom: 20,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Draggable Marker
    const marker = L.marker([location.latitude, location.longitude], {
      icon: createPinIcon(),
      draggable: true,
    }).addTo(map);

    marker.on('dragend', async () => {
      const position = marker.getLatLng();
      setCurrentLat(Number(position.lat.toFixed(6)));
      setCurrentLng(Number(position.lng.toFixed(6)));
      resolveAddress(position.lat, position.lng);
    });

    // Tap anywhere on map to move marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCurrentLat(Number(lat.toFixed(6)));
      setCurrentLng(Number(lng.toFixed(6)));
      resolveAddress(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when layer changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.remove();

    const layerConfig = tileUrls[activeLayer];
    const newLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      subdomains: layerConfig.subdomains || 'abc',
      maxZoom: 20,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [activeLayer]);

  // Reverse geocode whenever pin changes
  const resolveAddress = async (lat: number, lng: number) => {
    setIsResolving(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      setResolvedTitle(geo.title);
    } catch {
      // Ignore
    } finally {
      setIsResolving(false);
    }
  };

  // Search Place Handler
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchPlaces(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectSearchResult = (place: PlaceSearchResult) => {
    setCurrentLat(place.lat);
    setCurrentLng(place.lng);
    setResolvedTitle(place.displayName);
    setSearchResults([]);
    setSearchQuery('');

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([place.lat, place.lng], 16);
      markerRef.current.setLatLng([place.lat, place.lng]);
    }
  };

  const handleResetToGps = () => {
    onResetGps();
    if (navigator.geolocation && mapInstanceRef.current && markerRef.current) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLat(Number(latitude.toFixed(6)));
        setCurrentLng(Number(longitude.toFixed(6)));
        mapInstanceRef.current?.setView([latitude, longitude], 17);
        markerRef.current?.setLatLng([latitude, longitude]);
        resolveAddress(latitude, longitude);
      });
    }
  };

  const handleApply = () => {
    const { fullCode, shortCode } = computePlusCode(currentLat, currentLng);
    onApplyCoordinates({
      latitude: currentLat,
      longitude: currentLng,
      title: resolvedTitle,
      subtitle: shortCode,
      plusCode: fullCode,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl h-[88vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Map Preview & Pinpoint</h3>
              <p className="text-[11px] text-slate-400">
                Tap anywhere or drag the red marker pin to adjust coordinates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Layer Control Toolbar */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap gap-2 items-center justify-between shrink-0">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search place, city, or address..."
              className="w-full pl-8 pr-16 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="absolute right-1 top-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold rounded-lg"
            >
              {isSearching ? '...' : 'Find'}
            </button>

            {/* Search Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-950 border border-slate-700 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.placeId}
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left p-2 text-xs text-slate-200 hover:bg-slate-800 flex items-start gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span className="truncate">{item.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] overflow-x-auto">
            <button
              onClick={() => setActiveLayer('google')}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                activeLayer === 'google'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Roads
            </button>
            <button
              onClick={() => setActiveLayer('google-satellite')}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                activeLayer === 'google-satellite'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Satellite
            </button>
            <button
              onClick={() => setActiveLayer('google-terrain')}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                activeLayer === 'google-terrain'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Terrain
            </button>
            <button
              onClick={() => setActiveLayer('osm')}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                activeLayer === 'osm'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OSM
            </button>
          </div>
        </div>

        {/* Map Viewport */}
        <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Map Zoom / Recenter Controls */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
            <button
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="p-2.5 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 shadow-xl border border-white/20 transition active:scale-95"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="p-2.5 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 shadow-xl border border-white/20 transition active:scale-95"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetToGps}
              className="p-2.5 rounded-xl bg-slate-900/90 text-emerald-400 hover:bg-slate-800 shadow-xl border border-white/20 transition active:scale-95"
              title="Recenter on Real GPS"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Current Pin Coordinate Pill */}
          <div className="absolute top-3 left-3 z-20 bg-slate-950/85 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl text-xs shadow-lg max-w-sm">
            <p className="font-semibold text-white truncate text-[11px]">
              {isResolving ? 'Resolving address...' : resolvedTitle}
            </p>
            <p className="font-mono text-[10px] text-blue-300">
              Lat: {currentLat.toFixed(6)} | Lon: {currentLng.toFixed(6)}
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-t border-slate-800 shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/25 transition active:scale-95 flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Use This Pin Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
