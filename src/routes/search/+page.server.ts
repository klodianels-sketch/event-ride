import type { PageServerLoad } from './$types';
import { getDb } from '$lib/db';
import { toPublicRideDTO } from '$lib/dto';

export const load: PageServerLoad = async ({ url }) => {
  const search = url.searchParams.get('q') ?? '';

  if (!search.trim()) {
    return { rides: [], search };
  }

  const db = await getDb();

  const rides = await db
    .collection('rides')
    .find({
      status: 'active',
      seatsAvailable: { $gt: 0 },
      departureTime: { $gt: new Date() },
      $or: [
        { eventName: { $regex: search, $options: 'i' } },
        { eventLocation: { $regex: search, $options: 'i' } },
        { startLocation: { $regex: search, $options: 'i' } }
      ]
    })
    .sort({ departureTime: 1 })
    .limit(30)
    .toArray();

  return {
    rides: rides.map(toPublicRideDTO),
    search
  };
};
