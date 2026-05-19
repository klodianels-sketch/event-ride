import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { calcPickupTimes } from '$lib/time';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user) redirect(302, `/auth/login?redirect=/rides/${params.id}/book`);

  const db = await getDb();
  const rideIdStr = url.searchParams.get('rideId') || params.id;

  let rideId: ObjectId;
  try {
    rideId = new ObjectId(rideIdStr);
  } catch {
    error(404, 'Fahrt nicht gefunden');
  }

  const ride = await db.collection('rides').findOne({ _id: rideId, status: 'active' });
  if (!ride) error(404, 'Fahrt nicht gefunden oder nicht mehr verfügbar');

  return {
    ride: {
      _id: ride._id.toString(),
      driverName: ride.driverName as string,
      driverPhoto: ride.driverPhoto as string | undefined,
      eventName: ride.eventName as string,
      eventLocation: ride.eventLocation as string,
      startLocation: ride.startLocation as string,
      departureTime: (ride.departureTime as Date).toISOString(),
      estimatedArrivalTime: (ride.estimatedArrivalTime as Date).toISOString(),
      seats: ride.seats as number,
      seatsAvailable: ride.seatsAvailable as number,
      pricePerPerson: ride.pricePerPerson as number
    },
    eventId: params.id
  };
};

export const actions: Actions = {
  default: async ({ request, params, locals, url }) => {
    if (!locals.user) redirect(302, '/auth/login');

    const data = await request.formData();
    const pickupLocation = (data.get('pickupLocation') as string || '').trim();
    const agreeTerms = data.get('agreeTerms');
    const rideIdStr = (data.get('rideId') as string) || url.searchParams.get('rideId') || params.id;

    if (!pickupLocation) {
      return fail(400, { error: 'Bitte gib deinen Abholort an.' });
    }
    if (!agreeTerms) {
      return fail(400, { error: 'Du musst den AGB zustimmen.' });
    }

    const db = await getDb();
    let rideId: ObjectId;
    try {
      rideId = new ObjectId(rideIdStr);
    } catch {
      return fail(400, { error: 'Ungültige Fahrt.' });
    }

    const ride = await db.collection('rides').findOne({ _id: rideId, status: 'active' });
    if (!ride) return fail(400, { error: 'Fahrt nicht gefunden.' });

    const departureTime = ride.departureTime as Date;
    if (Date.now() + 30 * 60 * 1000 > departureTime.getTime()) {
      return fail(400, { error: 'Diese Fahrt startet in weniger als 30 Minuten. Eine Buchung ist nicht mehr möglich.' });
    }

    if ((ride.seatsAvailable as number) <= 0) {
      return fail(400, { error: 'Keine freien Plätze mehr verfügbar.' });
    }

    if (ride.driverId.toString() === locals.user.id) {
      return fail(400, { error: 'Du kannst deine eigene Fahrt nicht buchen.' });
    }

    const passengerId = new ObjectId(locals.user.id);
    const existingBooking = await db.collection('bookings').findOne({
      rideId,
      passengerId,
      status: { $nin: ['cancelled'] }
    });
    if (existingBooking) {
      return fail(400, { error: 'Du hast diese Fahrt bereits gebucht.' });
    }

    if (pickupLocation.toLowerCase() === (ride.startLocation as string).toLowerCase()) {
      return fail(400, { error: 'Dein Abholort darf nicht gleich dem Startort des Fahrers sein.' });
    }

    const { estimatedPickupTime, mustArriveBy, latestArrivalTime } = calcPickupTimes(departureTime);

    await db.collection('bookings').insertOne({
      rideId,
      passengerId,
      passengerName: `${locals.user.firstName} ${locals.user.lastName}`,
      pickupLocation,
      estimatedPickupTime,
      mustArriveBy,
      latestArrivalTime,
      status: 'confirmed',
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    await db.collection('rides').updateOne({ _id: rideId }, { $inc: { seatsAvailable: -1 } });

    redirect(302, `/rides/${params.id}/success?rideId=${rideIdStr}`);
  }
};
