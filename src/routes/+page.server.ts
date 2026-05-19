import type { PageServerLoad } from './$types';
import { getDb } from '$lib/db';

export const load: PageServerLoad = async ({ url }) => {
  const db = await getDb();
  const search = url.searchParams.get('q') || '';

  const filter: Record<string, unknown> = { status: 'active', seatsAvailable: { $gt: 0 } };
  if (search) {
    filter['$or'] = [
      { eventName: { $regex: search, $options: 'i' } },
      { eventLocation: { $regex: search, $options: 'i' } }
    ];
  }

  const rides = await db
    .collection('rides')
    .find(filter)
    .sort({ departureTime: 1 })
    .limit(20)
    .toArray();

  return {
    rides: rides.map(r => ({
      _id: r._id.toString(),
      driverName: r.driverName as string,
      driverPhoto: r.driverPhoto as string | undefined,
      eventName: r.eventName as string,
      eventLocation: r.eventLocation as string,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      estimatedArrivalTime: (r.estimatedArrivalTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number
    })),
    search
  };
};
