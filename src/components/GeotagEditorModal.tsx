import React, { useState } from 'react';
import {
  Compass,
  Crosshair,
  Globe,
  MapPin,
  RefreshCw,
  Search,
  Sliders,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { GeotagSettings, LocationData, MapType, StampSize, StampTheme } from '../types';
import { computePlusCode } from '../utils/plusCode';
import { PlaceSearchResult, formatGeoTimestamp, reverseGeocode, searchPlaces } from '../utils/reverseGeocode';

interface GeotagEditorModalProps {
  isOpen?: boolean;
  onClose: () => void;
  location: LocationData;
  settings: GeotagSettings;
  onSaveLocation: (updatedLocation: Partial<LocationData>) => void;
  onSaveSettings: (updatedSettings: Partial<GeotagSettings>) => void;
  onResetGps: () => void;
  onOpenInteractiveMap?: () => void;
}

export const GeotagEditorModal: React.FC<GeotagEditorModalProps> = ({
  isOpen = true,
  onClose,
  location,
  settings,
  onSaveLocation,
  onSaveSettings,
  onResetGps,
  onOpenInteractiveMap,
}) => {
  // Local form states
  const [activeTab, setActiveTab] = useState<'location' | 'coordinates' | 'stamp'>('location');
  const [title, setTitle] = useState(location.title);
  const [subtitle, setSubtitle] = useState(location.subtitle);
  const [latitude, setLatitude] = useState(location.latitude.toString());
  const [longitude, setLongitude] = useState(location.longitude.toString());
  const [plusCode, setPlusCode] = useState(location.plusCode);
  const [timestamp, setTimestamp] = useState(location.timestamp);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Settings states
  const [theme, setTheme] = useState<StampTheme>(settings.theme);
  const [mapType, setMapType] = useState<MapType>(settings.mapType || 'google-satellite');
  const [stampSize, setStampSize] = useState<StampSize>(settings.stampSize || 'large');
  const [showMap, setShowMap] = useState(settings.showMap);
  const [showCoordinates, setShowCoordinates] = useState(settings.showCoordinates);
  const [showPlusCode, setShowPlusCode] = useState(settings.showPlusCode);
  const [showTimestamp, setShowTimestamp] = useState(settings.showTimestamp);
  const [showWatermark, setShowWatermark] = useState(settings.showWatermark);
  const [watermarkText, setWatermarkText] = useState(settings.watermarkText);
  const [mapZoom, setMapZoom] = useState(settings.mapZoom);

  if (!isOpen) return null;

  // Handle Search Submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchPlaces(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  // Select place from search
  const handleSelectPlace = (place: PlaceSearchResult) => {
    setLatitude(place.lat.toFixed(6));
    setLongitude(place.lng.toFixed(6));
    setTitle(place.displayName);
    const { fullCode, shortCode } = computePlusCode(place.lat, place.lng);
    setPlusCode(fullCode);
    setSubtitle(shortCode);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Auto-reverse geocode from current typed coordinates
  const handleRecalculateFromCoords = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const { fullCode, shortCode } = computePlusCode(lat, lng);
    setPlusCode(fullCode);
    const geo = await reverseGeocode(lat, lng);
    setTitle(geo.title);
    setSubtitle(geo.subtitle || shortCode);
  };

  // Fine nudge coordinates (e.g. by 0.0005 deg)
  const nudgeCoords = (dLat: number, dLng: number) => {
    const currentLat = parseFloat(latitude) || 0;
    const currentLng = parseFloat(longitude) || 0;
    const newLat = Number((currentLat + dLat).toFixed(6));
    const newLng = Number((currentLng + dLng).toFixed(6));
    setLatitude(newLat.toString());
    setLongitude(newLng.toString());
    const { fullCode, shortCode } = computePlusCode(newLat, newLng);
    setPlusCode(fullCode);
    if (!subtitle) setSubtitle(shortCode);
  };

  // Save changes
  const handleSave = () => {
    const parsedLat = parseFloat(latitude) || location.latitude;
    const parsedLng = parseFloat(longitude) || location.longitude;

    onSaveLocation({
      latitude: parsedLat,
      longitude: parsedLng,
      title: title.trim() || 'Custom Location',
      subtitle: subtitle.trim(),
      plusCode: plusCode.trim(),
      timestamp: timestamp.trim() || formatGeoTimestamp(),
      source: 'manual',
    });

    onSaveSettings({
      theme,
      mapType,
      stampSize,
      showMap,
      showCoordinates,
      showPlusCode,
      showTimestamp,
      showWatermark,
      watermarkText: watermarkText.trim() || 'GPS Map Camera',
      mapZoom,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Geotag Stamp</h3>
              <p className="text-xs text-slate-400">Modify location title, coordinates or appearance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-3 pt-2 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('location')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'location'
                ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Address & Title</span>
          </button>
          <button
            onClick={() => setActiveTab('coordinates')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'coordinates'
                ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>GPS Coords</span>
          </button>
          <button
            onClick={() => setActiveTab('stamp')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'stamp'
                ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Stamp Style</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: LOCATION & ADDRESS */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              {/* Quick Place Search Bar */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Search Any Location / City / Landmark
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="e.g. Makrandpur Bantha, Uttar Pradesh"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={isSearching}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shrink-0"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-800">
                    {searchResults.map((item) => (
                      <button
                        key={item.placeId}
                        type="button"
                        onClick={() => handleSelectPlace(item)}
                        className="w-full text-left p-2.5 text-xs text-slate-200 hover:bg-slate-800 transition flex items-start gap-2"
                      >
                        <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-white">{item.displayName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Lat: {item.lat.toFixed(5)}, Lon: {item.lng.toFixed(5)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Location Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Location Title (Printed on Stamp)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Makrandpur Bantha, Uttar Pradesh, India 🇮🇳"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You can type anything here: village, site name, inspection unit, state, country flag.
                </span>
              </div>

              {/* Subtitle / Landmark */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subtitle / Area / Landmark / Note
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. H22V+R9G or Gate No. 2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Timestamp */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Date & Time Stamp
                  </label>
                  <button
                    type="button"
                    onClick={() => setTimestamp(formatGeoTimestamp(new Date()))}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Use Current Time
                  </button>
                </div>
                <input
                  type="text"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: GPS COORDINATES */}
          {activeTab === 'coordinates' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-2">
                <Compass className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Adjust latitude and longitude manually or click nudge arrows to pinpoint exact locations.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Nudge Controls */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Micro-Nudge Coordinates
                </span>
                <button
                  type="button"
                  onClick={() => nudgeCoords(0.0005, 0)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white"
                >
                  ▲ North (+0.0005)
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => nudgeCoords(0, -0.0005)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white"
                  >
                    ◀ West
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeCoords(0, 0.0005)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white"
                  >
                    East ▶
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => nudgeCoords(-0.0005, 0)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white"
                >
                  ▼ South (-0.0005)
                </button>
              </div>

              {/* Plus Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Plus Code (Open Location Code)
                  </label>
                  <button
                    type="button"
                    onClick={handleRecalculateFromCoords}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Auto-Fill Address from Coords
                  </button>
                </div>
                <input
                  type="text"
                  value={plusCode}
                  onChange={(e) => setPlusCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Open Interactive Map Pin Picker */}
              {onOpenInteractiveMap && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInteractiveMap();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition"
                >
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Open Interactive Map Pinpoint (Drag Pin)</span>
                </button>
              )}

              {/* Reset to Device GPS */}
              <button
                type="button"
                onClick={() => {
                  onResetGps();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition"
              >
                <Crosshair className="w-4 h-4 text-emerald-400" />
                <span>Reset to Device Hardware GPS</span>
              </button>
            </div>
          )}

          {/* TAB 3: STAMP APPEARANCE */}
          {activeTab === 'stamp' && (
            <div className="space-y-4">
              {/* Map Provider / Tile Style */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Map Image Layer / Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'google', label: 'Google Maps (Roads)', desc: 'Official Google roads, shops, temples & places' },
                    { id: 'google-satellite', label: 'Google Satellite', desc: 'Google aerial photography with road overlay' },
                    { id: 'google-terrain', label: 'Google Terrain', desc: 'Google elevation & topography with roads' },
                    { id: 'osm', label: 'OpenStreetMap', desc: 'Standard community road network' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMapType(m.id as MapType)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        mapType === m.id
                          ? 'border-blue-500 bg-blue-500/15 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">{m.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stamp Scale / Size Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Stamp Overlay Size (For High-Resolution / Wide Photos)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: 'Normal', desc: '1.0x Compact' },
                    { id: 'large', label: 'Large (Default)', desc: '1.25x Balanced' },
                    { id: 'extra-large', label: 'Extra Large', desc: '1.45x Maximum' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStampSize(s.id as StampSize)}
                      className={`p-2 rounded-xl border text-center transition ${
                        stampSize === s.id
                          ? 'border-blue-500 bg-blue-500/15 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">{s.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Stamp Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'gps-classic', label: 'Classic GPS Glass', desc: 'Dark frosted glass like reference photo' },
                    { id: 'light-minimal', label: 'Light Clean', desc: 'Clean white background card' },
                    { id: 'cyber-amber', label: 'Field Amber', desc: 'High visibility survey style' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as StampTheme)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        theme === t.id
                          ? 'border-blue-500 bg-blue-500/15 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">{t.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Zoom Controls */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Map Thumbnail Zoom (Level {mapZoom})
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.max(12, z - 1))}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="12"
                  max="18"
                  value={mapZoom}
                  onChange={(e) => setMapZoom(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Watermark Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Top-Right Badge Label
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="GPS Map Camera"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Display Element Toggles */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block mb-1">
                  Elements on Stamp
                </span>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                  <span>Show Map Thumbnail</span>
                  <input
                    type="checkbox"
                    checked={showMap}
                    onChange={(e) => setShowMap(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                  <span>Show Latitude & Longitude</span>
                  <input
                    type="checkbox"
                    checked={showCoordinates}
                    onChange={(e) => setShowCoordinates(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                  <span>Show Plus Code</span>
                  <input
                    type="checkbox"
                    checked={showPlusCode}
                    onChange={(e) => setShowPlusCode(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                  <span>Show Date & Time</span>
                  <input
                    type="checkbox"
                    checked={showTimestamp}
                    onChange={(e) => setShowTimestamp(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                  <span>Show Top Badge</span>
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-950/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/25 transition active:scale-95"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
