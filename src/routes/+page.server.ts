import type { PageServerLoad } from './$types';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { toPublicRideDTO } from '$lib/dto';
import { ensureRideCoords } from '$lib/ride-repair.server';

export const load: PageServerLoad = async ({ url }) => {
  const db = await getDb();
  const search = url.searchParams.get('q') ?? '';

  const now = new Date();
  const filter: Record<string, unknown> = {
    status: 'active',
    seatsAvailable: { $gt: 0 },
    departureTime: { $gt: now }   // nur zukünftige Fahrten öffentlich anzeigen
  };
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
    .limit(30)
    .toArray();

  // Fire-and-forget: Koordinaten für ältere Fahrten im Hintergrund reparieren.
  const ridesNeedingRepair = rides.filter(r => !r.startCoords || !r.eventLocationCoords);
  if (ridesNeedingRepair.length > 0) {
    (async () => {
      for (const ride of ridesNeedingRepair.slice(0, 5)) {
        try {
          await ensureRideCoords(ride, db);
          await new Promise(resolve => setTimeout(resolve, 1100));
        } catch (err) {
          console.error('[home] coord repair error:', err);
        }
      }
    })();
  }

  // Teilnehmer-Counts für alle Rides (eine Aggregation statt N Queries)
  const rideIds = rides.map(r => r._id as ObjectId);
  const bookingAgg = rideIds.length > 0
    ? await db.collection('bookings').aggregate([
        { $match: { rideId: { $in: rideIds }, status: { $in: ['accepted', 'confirmed', 'pending'] } } },
        { $group: { _id: { rideId: '$rideId', status: '$status' }, count: { $sum: 1 } } }
      ]).toArray()
    : [];

  const acceptedCountMap: Record<string, number> = {};
  const pendingCountMap: Record<string, number> = {};
  for (const row of bookingAgg) {
    const key = (row._id as { rideId: ObjectId; status: string }).rideId.toString();
    const status = (row._id as { rideId: ObjectId; status: string }).status;
    if (status === 'accepted' || status === 'confirmed') {
      acceptedCountMap[key] = (acceptedCountMap[key] ?? 0) + (row.count as number);
    } else if (status === 'pending') {
      pendingCountMap[key] = (pendingCountMap[key] ?? 0) + (row.count as number);
    }
  }

  return {
    rides: rides.map(r => toPublicRideDTO(r, {
      acceptedCount: acceptedCountMap[r._id.toString()] ?? 0,
      pendingCount: pendingCountMap[r._id.toString()] ?? 0
    })),
    ridesNeedingRepair: ridesNeedingRepair.length,
    search
  };
};
