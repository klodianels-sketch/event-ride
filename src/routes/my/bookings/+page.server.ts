import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');

  const db = await getDb();
  const bookings = await db
    .collection('bookings')
    .find({ passengerId: new ObjectId(locals.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  const enriched = await Promise.all(
    bookings.map(async b => {
      const ride = await db.collection('rides').findOne({ _id: b.rideId });
      return {
        _id: b._id.toString(),
        pickupLocation: b.pickupLocation as string,
        estimatedPickupTime: (b.estimatedPickupTime as Date).toISOString(),
        mustArriveBy: (b.mustArriveBy as Date).toISOString(),
        latestArrivalTime: (b.latestArrivalTime as Date).toISOString(),
        status: b.status as string,
        paymentStatus: b.paymentStatus as string,
        ride: ride ? {
          eventName: ride.eventName as string,
          eventLocation: ride.eventLocation as string,
          departureTime: (ride.departureTime as Date).toISOString(),
          estimatedArrivalTime: (ride.estimatedArrivalTime as Date).toISOString(),
          driverName: ride.driverName as string,
          pricePerPerson: ride.pricePerPerson as number
        } : undefined
      };
    })
  );

  return { bookings: enriched };
};
