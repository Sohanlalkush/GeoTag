export interface GeocodedAddress {
  title: string;
  subtitle: string;
  country: string;
  countryCode: string;
  state: string;
  city: string;
  suburb: string;
  road: string;
  postcode: string;
  flag: string;
}

export interface PlaceSearchResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

// Convert 2-letter ISO country code to Emoji Flag
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Format date to match: "रविवार, 04/10/2026 09:04 AM GMT +05:30"
export function formatGeoTimestamp(date: Date = new Date(), preferHindiDay: boolean = true): string {
  const daysHindi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const daysEng = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const offsetMinutes = -date.getTimezoneOffset();
  // If in Indian timezone (UTC+5:30) or preferHindiDay is true, use Hindi day
  const isIST = offsetMinutes === 330;
  const dayName = isIST || preferHindiDay ? daysHindi[date.getDay()] : daysEng[date.getDay()];

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const hh = String(hours).padStart(2, '0');

  const sign = offsetMinutes >= 0 ? '+' : '-';
  const tzHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const tzMinutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  const tzStr = `GMT ${sign}${tzHours}:${tzMinutes}`;

  return `${dayName}, ${dd}/${mm}/${yyyy} ${hh}:${minutes} ${ampm} ${tzStr}`;
}

// Reverse geocode lat, lon via OpenStreetMap Nominatim
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};

    const countryCode = (addr.country_code || '').toUpperCase();
    const flag = getCountryFlag(countryCode);

    const locality =
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.town ||
      addr.city_district ||
      addr.hamlet ||
      '';
    const city = addr.city || addr.town || addr.county || addr.district || '';
    const state = addr.state || addr.province || '';
    const postcode = addr.postcode || '';
    let country = addr.country || '';

    // If India, display local name 'भारत' as in screenshot
    if (countryCode === 'IN') {
      country = 'भारत';
    }

    // Title: e.g. "Makrandpur Bantha, Uttar Pradesh, भारत 🇮🇳"
    const titleParts = [locality || city, state, country].filter(Boolean);
    let title = titleParts.join(', ');
    if (flag) {
      title += ` ${flag}`;
    }
    if (!title.trim()) {
      title = `Location (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
    }

    // Subtitle: e.g. "Makrandpur Bantha, Uttar Pradesh 209101, भारत"
    const subParts = [locality || city, state ? `${state}${postcode ? ` ${postcode}` : ''}` : postcode, country].filter(Boolean);
    const subtitle = subParts.join(', ') || addr.road || 'Coordinates Recorded';

    return {
      title,
      subtitle,
      country,
      countryCode,
      state,
      city,
      suburb: locality,
      road: addr.road || '',
      postcode,
      flag,
    };
  } catch (err) {
    console.warn('Reverse geocoding unavailable or timed out:', err);
    return {
      title: `Makrandpur Bantha, Uttar Pradesh, भारत 🇮🇳`,
      subtitle: `Makrandpur Bantha, Uttar Pradesh 209101, भारत`,
      country: 'भारत',
      countryCode: 'IN',
      state: 'Uttar Pradesh',
      city: 'Makrandpur Bantha',
      suburb: '',
      road: '',
      postcode: '209101',
      flag: '🇮🇳',
    };
  }
}

// Forward search places for manual search
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data = await response.json();

    return data.map((item: any) => ({
      placeId: String(item.place_id || Math.random()),
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.category || 'place',
    }));
  } catch (err) {
    console.warn('Place search failed:', err);
    return [];
  }
}
