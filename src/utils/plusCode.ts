import { OpenLocationCode } from 'open-location-code';

const olc = new OpenLocationCode();

export function computePlusCode(lat: number, lng: number): { fullCode: string; shortCode: string } {
  try {
    const fullCode = olc.encode(lat, lng, 10);
    // Short code is the last 4 characters + '+' + rest or local code
    const shortCode = fullCode.length >= 8 ? fullCode.slice(4) : fullCode;
    return { fullCode, shortCode };
  } catch (err) {
    console.warn('Failed to compute plus code', err);
    return { fullCode: 'N/A', shortCode: 'N/A' };
  }
}
