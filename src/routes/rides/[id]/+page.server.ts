import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { toPublicRideDTO } from '$lib/dto';

export const load: PageServerLoad = async ({ params, locals }) => {
  const db = await getDb();

  let rideId: ObjectId;
  try { rideId = new ObjectId(params.id); }
  catch { throw error(404, 'Fahrt nicht gefunden'); }

  const ride = await db.collection('rides').findOne({ _id: rideId });
  if (!ride) throw error(404, 'Fahrt nicht gefunden');

  // Fahrer-Infos (Avatar, Bio, Region)
  const driver = await db.collection('users').findOne(
    { _id: ride.driverId as ObjectId },
    { projection: { avatarUrl: 1, profilePicture: 1, bio: 1, region: 1, rating: 1, totalRatings: 1 } }
  );

  // Buchungsstatus des aktuell eingeloggten Nutzers
  let myBooking: {
    status: string;
    conversationId?: string;
    _id: string;
  } | null = null;

  if (locals.user) {
    const passengerId = new ObjectId(locals.user.id);
    const existing = await db.collection('bookings').findOne({
      rideId,
      passengerId,
      status: { $nin: ['cancelled', 'rejected', 'cancelled_by_driver', 'cancelled_by_passenger'] }
    });
    if (existing) {
      myBooking = {
        _id: existing._id.toString(),
        status: existing.status as string,
        conversationId: existing.conversationId?.toString()
      };
    }
  }

  // Alle weiteren aktiven Fahrten zum gleichen Event
  const allRides = await db
    .collection('rides')
    .find({ eventName: ride.eventName, status: 'active', seatsAvailable: { $gt: 0 }, _id: { $ne: rideId } })
    .sort({ departureTime: 1 })
    .limit(5)
    .toArray();

  return {
    ride: toPublicRideDTO(ride),
    driverInfo: driver ? {
      avatarUrl: (driver.avatarUrl ?? driver.profilePicture) as string | undefined,
      bio: driver.bio as string | undefined,
      region: driver.region as string | undefined,
      rating: driver.rating as number | undefined,
      totalRatings: driver.totalRatings as number | undefined
    } : null,
    myBooking,
    isDriver: locals.user?.id === (ride.driverId as ObjectId).toString(),
    isLoggedIn: !!locals.user,
    allRides: allRides.map(toPublicRideDTO)
  };
};
