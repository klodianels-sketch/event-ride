import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ params }) => {
  const db = await getDb();

  let rideId: ObjectId;
  try {
    rideId = new ObjectId(params.id);
  } catch {
    error(404, 'Fahrt nicht gefunden');
  }

  const ride = await db.collection('rides').findOne({ _id: rideId });
  if (!ride) error(404, 'Fahrt nicht gefunden');

  const allRides = await db
    .collection('rides')
    .find({ eventName: ride.eventName, status: 'active', seatsAvailable: { $gt: 0 } })
    .sort({ departureTime: 1 })
    .toArray();

  return {
    ride: {
      _id: ride._id.toString(),
      driverName: ride.driverName as string,
      driverPhoto: ride.driverPhoto as string | undefined,
      eventName: ride.eventName as string,
      eventLocation: ride.eventLocation as string,
      eventImage: ride.eventImage as string | undefined,
      startLocation: ride.startLocation as string,
      departureTime: (ride.departureTime as Date).toISOString(),
      estimatedArrivalTime: (ride.estimatedArrivalTime as Date).toISOString(),
      seats: ride.seats as number,
      seatsAvailable: ride.seatsAvailable as number,
      pricePerPerson: ride.pricePerPerson as number,
      status: ride.status as string
    },
    allRides: allRides.map(r => ({
      _id: r._id.toString(),
      driverName: r.driverName as string,
      driverPhoto: r.driverPhoto as string | undefined,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      estimatedArrivalTime: (r.estimatedArrivalTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number
    }))
  };
};
