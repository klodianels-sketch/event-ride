import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { toPublicRideDTO } from '$lib/dto';

export const load: PageServerLoad = async ({ params }) => {
  const db = await getDb();

  let rideId: ObjectId;
  try {
    rideId = new ObjectId(params.id);
  } catch {
    throw error(404, 'Fahrt nicht gefunden');
  }

  const ride = await db.collection('rides').findOne({ _id: rideId });
  if (!ride) throw error(404, 'Fahrt nicht gefunden');

  // Alle aktiven Fahrten zum gleichen Event (fuer Auswahl auf der Detail-Seite)
  const allRides = await db
    .collection('rides')
    .find({ eventName: ride.eventName, status: 'active', seatsAvailable: { $gt: 0 } })
    .sort({ departureTime: 1 })
    .toArray();

  return {
    ride: toPublicRideDTO(ride),
    allRides: allRides.map(toPublicRideDTO)
  };
};
