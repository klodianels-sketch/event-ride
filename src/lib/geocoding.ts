const USER_AGENT = 'EventRideApp/1.0 (ZHAW Student Project)';

export interface GeocodingResult {
  lat: string;
  lon: string;
  roughCity: string;
}

export async function geocode(query: string): Promise<GeocodingResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const addr = data[0].address ?? {};
    const roughCity =
      addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? query.split(',')[0].trim();
    return { lat: data[0].lat as string, lon: data[0].lon as string, roughCity };
  } catch (err) {
    console.error('[geocoding] geocode error:', err);
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    const data = await res.json();
    if (!data?.address) return null;
    const addr = data.address;
    const street = addr.road ?? '';
    const num = addr.house_number ? ` ${addr.house_number}` : '';
    const city = addr.city ?? addr.town ?? addr.village ?? '';
    if (street) return `${street}${num}, ${city}`.trim().replace(/,\s*$/, '');
    return city || ((data.display_name as string | undefined)?.split(',')[0].trim() ?? null);
  } catch (err) {
    console.error('[geocoding] reverseGeocode error:', err);
    return null;
  }
}
