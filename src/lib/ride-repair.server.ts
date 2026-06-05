// Server-only Helfer: geocodiert fehlende Koordinaten einer Fahrt on-demand und speichert sie in der DB.
// Aufgerufen bei Seitenlade (fire-and-forget) und beim Buchen (synchron).
import type { WithId, Document, Db } from 'mongodb';
import { geocode } from '$lib/geocoding';

export interface RepairedCoords {
  startCoords: { lat: string; lon: string } | null;
  eventCoords: { lat: string; lon: string } | null;
  startCoordsRough: { lat: string; lon: string } | null;
}

export async function ensureRideCoords(
  ride: WithId<Document>,
  db: Db
): Promise<RepairedCoords> {
  const existing = {
    startCoords: (ride.startCoords as { lat: string; lon: string }) ?? null,
    eventCoords: (ride.eventLocationCoords as { lat: string; lon: string }) ?? null,
    startCoordsRough: (ride.startCoordsRough as { lat: string; lon: string }) ?? null
  };

  // Nichts zu tun wenn alles vorhanden
  if (existing.startCoords && existing.eventCoords) return existing;

  const startQuery =
    (ride.startLocationExact as string | undefined) ||
    (ride.startLocation as string | undefined) ||
    '';
  const eventQuery = (ride.eventLocation as string | undefined) || '';

  // Geocoding nur wenn Koordinaten fehlen
  const [startResult, eventResult] = await Promise.all([
    !existing.startCoords && startQuery ? geocode(startQuery) : Promise.resolve(null),
    !existing.eventCoords && eventQuery ? geocode(eventQuery) : Promise.resolve(null)
  ]);

  const update: Record<string, unknown> = {};
  const result = { ...existing };

  if (startResult && !result.startCoords) {
    result.startCoords = { lat: startResult.lat, lon: startResult.lon };
    update.startCoords = result.startCoords;

    if (!result.startCoordsRough) {
      // Stadtebene: roughCity separat geocodieren wenn es ein anderer String ist
      const roughQuery = startResult.roughCity;
      const roughResult =
        roughQuery.toLowerCase() !== startQuery.toLowerCase()
          ? await geocode(roughQuery).catch(() => null)
          : startResult;
      if (roughResult) {
        result.startCoordsRough = { lat: roughResult.lat, lon: roughResult.lon };
        update.startCoordsRough = result.startCoordsRough;
        // startLocation (grobes Label) korrigieren falls noch leer
        if (!(ride.startLocation as string | undefined)) {
          update.startLocation = roughResult.roughCity;
        }
      }
    }
  }

  if (eventResult && !result.eventCoords) {
    result.eventCoords = { lat: eventResult.lat, lon: eventResult.lon };
    update.eventLocationCoords = result.eventCoords;
  }

  if (Object.keys(update).length > 0) {
    try {
      await db.collection('rides').updateOne({ _id: ride._id }, { $set: update });
    } catch (err) {
      console.error('[ride-repair] DB update failed:', err);
    }
  }

  return result;
}
