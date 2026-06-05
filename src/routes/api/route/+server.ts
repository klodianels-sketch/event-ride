import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { haversineKm, TRAVEL_BUFFER_FACTOR } from '$lib/routing';

const USER_AGENT = 'EventRideApp/1.0 (ZHAW Student Project)';

function parseCoord(s: string): [number, number] | null {
  const parts = s.split(',');
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lon)) return null;
  return [lat, lon];
}

// Proxied OSRM-Anfrage mit Polyline-Geometrie für Karten-Vorschau beim Erstellen einer Fahrt.
// Gibt [lat, lon]-Paare zurück (Leaflet-Format).
export const GET: RequestHandler = async ({ url }) => {
  const startStr = url.searchParams.get('start') ?? '';
  const endStr   = url.searchParams.get('end')   ?? '';
  const wpStr    = url.searchParams.get('waypoints') ?? '';

  const start = parseCoord(startStr);
  const end   = parseCoord(endStr);
  if (!start || !end) {
    return json({ error: 'start und end sind erforderlich' }, { status: 400 });
  }

  const midpoints: [number, number][] = wpStr
    ? wpStr.split('|').map(parseCoord).filter((c): c is [number, number] => c !== null)
    : [];

  const allPoints = [start, ...midpoints, end];
  // OSRM erwartet lon,lat (GeoJSON-Reihenfolge)
  const coordStr = allPoints.map(([lat, lon]) => `${lon},${lat}`).join(';');

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
      { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(9000) }
    );
    const data = (await res.json()) as {
      routes?: Array<{
        duration: number;
        distance: number;
        geometry: { coordinates: [number, number][] };
      }>;
    };

    if (!Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error('OSRM: kein Ergebnis');
    }

    const route = data.routes[0];
    // GeoJSON ist [lon, lat] → Leaflet braucht [lat, lon]
    const geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);

    return json({
      geometry,
      durationSeconds: Math.round(route.duration * TRAVEL_BUFFER_FACTOR),
      distanceMeters:  Math.round(route.distance),
      accuracy: 'exact'
    });
  } catch {
    // Haversine-Fallback: gerade Linie durch alle Punkte
    let totalSeconds = 0;
    let totalMeters  = 0;
    for (let i = 0; i < allPoints.length - 1; i++) {
      const [lat1, lon1] = allPoints[i];
      const [lat2, lon2] = allPoints[i + 1];
      const km = haversineKm(lat1, lon1, lat2, lon2);
      totalMeters  += km * 1000;
      totalSeconds += (km / 55) * 3600;
    }
    return json({
      geometry: allPoints,
      durationSeconds: Math.round(totalSeconds * TRAVEL_BUFFER_FACTOR),
      distanceMeters:  Math.round(totalMeters),
      accuracy: 'fallback'
    });
  }
};
