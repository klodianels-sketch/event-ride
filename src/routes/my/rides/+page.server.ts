import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');

  const db = await getDb();
  const rides = await db
    .collection('rides')
    .find({ driverId: new ObjectId(locals.user.id) })
    .sort({ departureTime: -1 })
    .toArray();

  return {
    rides: rides.map(r => ({
      _id: r._id.toString(),
      eventName: r.eventName as string,
      eventLocation: r.eventLocation as string,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      estimatedArrivalTime: (r.estimatedArrivalTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number,
      status: r.status as string
    }))
  };
};
