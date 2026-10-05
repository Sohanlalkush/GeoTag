import { useCallback, useEffect, useRef, useState } from 'react';
import { LocationData } from '../types';
import { computePlusCode } from '../utils/plusCode';
import { formatGeoTimestamp, reverseGeocode } from '../utils/reverseGeocode';

// Default initial location modeled after user's reference image
const DEFAULT_INITIAL_LOCATION: LocationData = {
  latitude: 26.553478,
  longitude: 80.030596,
  accuracy: 10,
  altitude: 128,
  speed: null,
  heading: null,
  title: 'Makrandpur Bantha, Uttar Pradesh, भारत 🇮🇳',
  subtitle: 'Makrandpur Bantha, Uttar Pradesh 209101, भारत',
  plusCode: '7MR2H22V+R9',
  shortPlusCode: 'H22V+R9G',
  timestamp: formatGeoTimestamp(new Date(), true),
  isoTimestamp: new Date().toISOString(),
  source: 'gps',
};

export type GPSStatus = 'acquiring' | 'active' | 'manual' | 'denied' | 'unsupported';

export function useGeolocation() {
  const [location, setLocation] = useState<LocationData>(DEFAULT_INITIAL_LOCATION);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('acquiring');
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isManualRef = useRef<boolean>(false);
  isManualRef.current = isManualOverride;

  // Auto-update timestamp every second for live preview
  useEffect(() => {
    const timer = setInterval(() => {
      setLocation((prev) => {
        // If manual override has custom frozen timestamp, keep it, otherwise update to current time
        if (prev.source === 'manual') return prev;
        return {
          ...prev,
          timestamp: formatGeoTimestamp(),
          isoTimestamp: new Date().toISOString(),
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update reverse geocode if moved by > 20 meters
  const updateAddressForCoords = useCallback(async (lat: number, lng: number, acc: number | null) => {
    const { fullCode, shortCode } = computePlusCode(lat, lng);
    const geo = await reverseGeocode(lat, lng);

    setLocation((prev) => {
      if (isManualRef.current) return prev;
      return {
        ...prev,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        title: geo.title,
        subtitle: geo.subtitle || shortCode,
        plusCode: fullCode,
        shortPlusCode: shortCode,
        source: 'gps',
      };
    });
  }, []);

  // Start Geolocation watch
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('acquiring');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;
        if (!isManualRef.current) {
          setGpsStatus('active');
          setErrorMessage(null);

          const last = lastCoordsRef.current;
          const movedSignificantly =
            !last ||
            Math.abs(last.lat - latitude) > 0.0002 ||
            Math.abs(last.lng - longitude) > 0.0002;

          if (movedSignificantly) {
            lastCoordsRef.current = { lat: latitude, lng: longitude };
            updateAddressForCoords(latitude, longitude, accuracy);
          } else {
            setLocation((prev) => ({
              ...prev,
              latitude,
              longitude,
              accuracy,
              altitude: altitude ?? prev.altitude,
              speed: speed ?? prev.speed,
              heading: heading ?? prev.heading,
            }));
          }
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setErrorMessage('Location permission was denied. You can manually set your location.');
        } else {
          setGpsStatus('acquiring');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateAddressForCoords]);

  // Method to manually update location (from the edit tag modal!)
  const updateManualLocation = useCallback(
    async (partial: Partial<LocationData> & { recomputeAddress?: boolean }) => {
      setIsManualOverride(true);
      setGpsStatus('manual');

      let updatedLat = partial.latitude ?? location.latitude;
      let updatedLng = partial.longitude ?? location.longitude;

      let newTitle = partial.title ?? location.title;
      let newSubtitle = partial.subtitle ?? location.subtitle;
      let newPlusCode = partial.plusCode ?? location.plusCode;
      let newShortPlusCode = partial.shortPlusCode ?? location.shortPlusCode;

      if (
        partial.recomputeAddress ||
        (partial.latitude !== undefined && partial.latitude !== location.latitude) ||
        (partial.longitude !== undefined && partial.longitude !== location.longitude)
      ) {
        const { fullCode, shortCode } = computePlusCode(updatedLat, updatedLng);
        newPlusCode = fullCode;
        newShortPlusCode = shortCode;

        if (partial.recomputeAddress) {
          const geo = await reverseGeocode(updatedLat, updatedLng);
          newTitle = geo.title;
          newSubtitle = geo.subtitle || shortCode;
        }
      }

      setLocation((prev) => ({
        ...prev,
        ...partial,
        latitude: updatedLat,
        longitude: updatedLng,
        title: newTitle,
        subtitle: newSubtitle,
        plusCode: newPlusCode,
        shortPlusCode: newShortPlusCode,
        source: 'manual',
        timestamp: partial.timestamp || prev.timestamp,
      }));
    },
    [location]
  );

  // Method to reset back to live GPS
  const resetToLiveGps = useCallback(() => {
    setIsManualOverride(false);
    lastCoordsRef.current = null;
    if (navigator.geolocation) {
      setGpsStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus('active');
          const { latitude, longitude, accuracy } = pos.coords;
          lastCoordsRef.current = { lat: latitude, lng: longitude };
          updateAddressForCoords(latitude, longitude, accuracy);
        },
        () => {
          setGpsStatus('acquiring');
        },
        { enableHighAccuracy: true }
      );
    }
  }, [updateAddressForCoords]);

  return {
    location,
    gpsStatus,
    isManualOverride,
    errorMessage,
    updateManualLocation,
    resetToLiveGps,
  };
}
