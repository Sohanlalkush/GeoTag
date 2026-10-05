import React, { useEffect, useState } from 'react';
import { Edit3, MapPin } from 'lucide-react';
import { GeotagSettings, LocationData } from '../types';
import { generateMapThumbnail } from '../utils/mapTiles';

interface GeotagOverlayProps {
  location: LocationData;
  settings: GeotagSettings;
  onEditClick?: () => void;
  interactive?: boolean;
}

export const GeotagOverlay: React.FC<GeotagOverlayProps> = ({
  location,
  settings,
  onEditClick,
  interactive = true,
}) => {
  const [mapDataUrl, setMapDataUrl] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;
    if (settings.showMap) {
      generateMapThumbnail(
        location.latitude,
        location.longitude,
        settings.mapZoom,
        280,
        280,
        settings.mapType || 'google-satellite'
      )
        .then((canvas) => {
          if (!isCancelled) {
            setMapDataUrl(canvas.toDataURL('image/png'));
          }
        })
        .catch((err) => console.warn('Failed to generate map thumbnail:', err));
    }
    return () => {
      isCancelled = true;
    };
  }, [location.latitude, location.longitude, settings.mapZoom, settings.showMap, settings.mapType]);

  // Format coordinates with degree symbol e.g. "Lat 26.553478° Long 80.030596°"
  const coordString = `Lat ${location.latitude.toFixed(6)}° Long ${location.longitude.toFixed(6)}°`;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-2 sm:p-4 select-none">
      {/* Bottom Container with Two Separate Floating Cards matching user screenshot */}
      <div className="w-full flex items-end justify-center">
        <div
          onClick={interactive ? onEditClick : undefined}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          title={interactive ? 'Click to edit location title, coordinates or map' : undefined}
          className={`group pointer-events-auto relative w-full max-w-2xl flex items-end gap-2.5 sm:gap-3 transition-all duration-200 ${
            interactive ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
          }`}
        >
          {/* Subtle edit badge that appears on hover / mobile */}
          {interactive && (
            <div className="absolute -top-6 right-2 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600/90 text-white text-[10px] font-semibold tracking-wide uppercase shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition">
              <Edit3 className="w-3 h-3" />
              <span>Tap to Edit</span>
            </div>
          )}

          {/* 1. LEFT CARD: Standalone Google Satellite Map Thumbnail */}
          {settings.showMap && (
            <div className="relative shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900">
              {mapDataUrl ? (
                <img
                  src={mapDataUrl}
                  alt="Google Satellite Map"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 bg-slate-800">
                  <MapPin className="w-6 h-6 text-red-500 animate-bounce" />
                  <span className="text-[10px]">Loading map...</span>
                </div>
              )}
            </div>
          )}

          {/* 2. RIGHT SIDE: Badge on top + Dark Frosted Text Card */}
          <div className="flex-1 min-w-0 flex flex-col items-end">
            {/* Top Right Floating Badge: [📷] GPS Map Camera */}
            {settings.showWatermark && (
              <div className="mb-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-white shadow-md">
                {/* Authentic Camera Icon with cyan border, dark background, yellow rim lens */}
                <div className="w-4 h-4 rounded bg-slate-900 border border-cyan-400 flex items-center justify-center p-0.5 shadow-xs">
                  <div className="w-2.5 h-2.5 rounded-full border border-amber-400 flex items-center justify-center bg-blue-500">
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold tracking-tight">
                  {settings.watermarkText || 'GPS Map Camera'}
                </span>
              </div>
            )}

            {/* Main Text Card matching screenshot */}
            <div className="w-full rounded-2xl p-2.5 sm:p-3.5 bg-black/65 backdrop-blur-md border border-white/15 text-white shadow-2xl space-y-1">
              {/* Primary Location Title with Hindi Country & Flag */}
              <h3 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-white drop-shadow-sm">
                {location.title || 'Makrandpur Bantha, Uttar Pradesh, भारत 🇮🇳'}
              </h3>

              {/* Subtitle / Postal Address */}
              {location.subtitle && (
                <p className="text-[11px] sm:text-xs text-white/90 font-medium leading-snug line-clamp-2 drop-shadow-sm">
                  {location.subtitle}
                </p>
              )}

              {/* Coordinates with Degree Symbol */}
              {settings.showCoordinates && (
                <p className="text-[11px] sm:text-xs font-sans text-white/95 font-medium leading-tight drop-shadow-sm">
                  {coordString}
                </p>
              )}

              {/* Timestamp with Day name & GMT offset */}
              {settings.showTimestamp && (
                <p className="text-[10px] sm:text-[11px] text-white/85 font-sans leading-tight drop-shadow-sm">
                  {location.timestamp}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
