import type { PageServerLoad } from './$types';
import { getDb } from '$lib/db';
import { toPublicRideDTO } from '$lib/dto';
import { ensureRideCoords } from '$lib/ride-repair.server';

export const load: PageServerLoad = async ({ url }) => {
  const db = await getDb();
  const search = url.searchParams.get('q') ?? '';

  const filter: Record<string, unknown> = { status: 'active', seatsAvailable: { $gt: 0 } };
  if (search) {
    filter['$or'] = [
      { eventName: { $regex: search, $options: 'i' } },
      { eventLocation: { $regex: search, $options: 'i' } },
      { startLocation: { $regex: search, $options: 'i' } }
    ];
  }

  const rides = await db
    .collection('rides')
    .find(filter)
    .sort({ departureTime: 1 })
    .limit(20)
    .toArray();

  // Fire-and-forget: Koordinaten fuer alte Fahrten im Hintergrund reparieren.
  // Die aktuelle Antwort geht sofort raus. Beim naechsten Seitenlade sind die Daten da.
  const ridesNeedingRepair = rides.filter(r => !r.startCoords || !r.eventLocationCoords);
  if (ridesNeedingRepair.length > 0) {
    (async () => {
      for (const ride of ridesNeedingRepair.slice(0, 5)) {
        try {
          await ensureRideCoords(ride, db);
          // Nominatim-Rate-Limit: 1 Req/s
          await new Promise(resolve => setTimeout(resolve, 1100));
        } catch (err) {
          console.error('[home] coord repair error:', err);
        }
      }
    })();
  }

  return {
    rides: rides.map(toPublicRideDTO),
    ridesNeedingRepair: ridesNeedingRepair.length,
    search
  };
};
