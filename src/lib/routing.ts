export type TimeAccuracy = 'exact' | 'estimated' | 'fallback';

const USER_AGENT = 'EventRideApp/1.0 (ZHAW Student Project)';
const AVG_SPEED_KMH = 55; // konservativ fuer Schweizer Strassen inkl. Ortsdurchfahrten

// 30 % Reisezeitpuffer: Stau, Baustellen, Parkplatzsuche, Ortsdurchfahrten
export const TRAVEL_BUFFER_FACTOR = 1.3;

export function applyTravelBuffer(seconds: number): number {
  return Math.round(seconds * TRAVEL_BUFFER_FACTOR);
}

export interface RouteResult {
  totalSeconds: number;
  legSeconds: number[];
  accuracy: TimeAccuracy;
}

// Haversine-Distanz in km — laeuft im Browser und auf dem Server
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geschaetzte Fahrtdauer via Haversine inkl. 30 % Puffer — fuer konsistente Vorschau
export function haversineSeconds(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  speedKmH = AVG_SPEED_KMH
): number {
  const km = haversineKm(lat1, lon1, lat2, lon2);
  return applyTravelBuffer(Math.round((km / speedKmH) * 3600));
}

// OSRM-Mehrpunkt-Route — nur server-seitig aufrufen (kein CORS-Problem vom Server)
// waypoints: [{lat, lon}, ...] — erster ist Start, letzter ist Ziel
export async function osrmRoute(
  waypoints: Array<{ lat: string | number; lon: string | number }>
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    return { totalSeconds: 0, legSeconds: [], accuracy: 'exact' };
  }
  const coords = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=false`,
      { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (!Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error('OSRM: kein Route-Ergebnis');
    }
    const route = data.routes[0];
    const legSeconds = (route.legs as any[]).map((l: any) => applyTravelBuffer(Math.round(l.duration as number)));
    return {
      totalSeconds: applyTravelBuffer(Math.round(route.duration as number)),
      legSeconds,
      accuracy: 'exact'
    };
  } catch (err) {
    console.error('[routing] OSRM Fehler, Haversine-Fallback aktiv:', err);
    const legSeconds: number[] = [];
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      // haversineSeconds already includes TRAVEL_BUFFER_FACTOR
      const s = haversineSeconds(
        Number(waypoints[i].lat),
        Number(waypoints[i].lon),
        Number(waypoints[i + 1].lat),
        Number(waypoints[i + 1].lon)
      );
      legSeconds.push(s);
      total += s;
    }
    return { totalSeconds: total, legSeconds, accuracy: 'fallback' };
  }
}
