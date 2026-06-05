// Rückwärtskompatibilität — direkter Import aus geocoding.ts / routing.ts bevorzugt
export { geocode as getCoordinates, reverseGeocode } from '$lib/geocoding';
export type { GeocodingResult } from '$lib/geocoding';
export { osrmRoute as getRouteDurationRaw } from '$lib/routing';

// Legacy-Wrapper mit identischer Signatur wie zuvor
export async function getRouteDuration(
  lon1: string,
  lat1: string,
  lon2: string,
  lat2: string
): Promise<number> {
  const { osrmRoute } = await import('$lib/routing');
  const result = await osrmRoute([
    { lat: lat1, lon: lon1 },
    { lat: lat2, lon: lon2 }
  ]);
  return result.totalSeconds;
}
