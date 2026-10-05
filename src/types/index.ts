export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null; // in meters
  altitude: number | null; // in meters
  speed: number | null;
  heading: number | null;
  title: string; // e.g. "Makrandpur Bantha, Uttar Pradesh, India"
  subtitle: string; // e.g. "H22V+R9G" or road / landmark
  plusCode: string; // e.g. "7MR2H22V+R9"
  shortPlusCode: string; // e.g. "H22V+R9G"
  timestamp: string; // formatted date & time
  isoTimestamp: string;
  source: 'gps' | 'manual' | 'search';
}

export type StampTheme = 'gps-classic' | 'dark-frosted' | 'light-minimal' | 'cyber-amber' | 'compact-card';

export type MapType = 'google' | 'google-satellite' | 'google-terrain' | 'streets' | 'satellite' | 'osm';

export type StampSize = 'normal' | 'large' | 'extra-large';

export interface GeotagSettings {
  theme: StampTheme;
  mapType: MapType;
  stampSize?: StampSize;
  showMap: boolean;
  showCoordinates: boolean;
  showPlusCode: boolean;
  showTimestamp: boolean;
  showWatermark: boolean;
  watermarkText: string;
  mapZoom: number; // 13 - 18
  position: 'bottom-center' | 'bottom-left' | 'top-center';
  photoQuality: number; // 0.85 - 1.0
  addBorder: boolean;
}

export interface SavedPhoto {
  id: string;
  dataUrl: string;
  thumbnailUrl: string;
  timestamp: number;
  location: LocationData;
  settings: GeotagSettings;
  width: number;
  height: number;
}
