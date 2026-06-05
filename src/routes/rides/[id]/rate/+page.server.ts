import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();

  let rideId: ObjectId;
  try { rideId = new ObjectId(params.id); }
  catch { throw error(404, 'Fahrt nicht gefunden'); }

  const bookingIdStr = url.searchParams.get('bookingId');
  let bookingId: ObjectId;
  try { bookingId = new ObjectId(bookingIdStr ?? ''); }
  catch { throw error(400, 'Ungueltige Buchungs-ID'); }

  const [ride, booking] = await Promise.all([
    db.collection('rides').findOne({ _id: rideId }),
    db.collection('bookings').findOne({ _id: bookingId, rideId })
  ]);

  if (!ride || !booking) throw error(404, 'Fahrt oder Buchung nicht gefunden');

  // Nur Fahrten in der Vergangenheit koennen bewertet werden
  if ((ride.departureTime as Date) > new Date()) {
    throw error(400, 'Bewertung ist erst nach der Fahrt moeglich');
  }

  // Nur beteiligte Nutzer duerfen bewerten
  const userId = new ObjectId(locals.user.id);
  const isDriver = ride.driverId.equals(userId);
  const isPassenger = (booking.passengerId as ObjectId).equals(userId);

  if (!isDriver && !isPassenger) throw error(403, 'Keine Berechtigung');

  // Buchung muss accepted/confirmed/completed/no-show sein
  const allowedStatuses = ['accepted', 'confirmed', 'completed', 'no-show'];
  if (!allowedStatuses.includes(booking.status as string)) {
    throw error(400, 'Bewertung nur fuer angenommene oder abgeschlossene Fahrten moeglich');
  }

  // Wer wird bewertet?
  const toUserId = isPassenger ? ride.driverId : booking.passengerId;
  const toUser = await db.collection('users').findOne({ _id: toUserId });

  // Wurde bereits bewertet?
  const existingRating = await db.collection('ratings').findOne({
    rideId,
    fromUserId: userId,
    toUserId
  });

  return {
    alreadyRated: !!existingRating,
    fromRole: isPassenger ? 'passenger' : 'driver',
    toName: isPassenger
      ? `${ride.driverName}`
      : `${booking.passengerName}`,
    eventName: ride.eventName as string,
    bookingIdStr: bookingId.toString()
  };
};

export const actions: Actions = {
  default: async ({ request, params, locals, url }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const starsRaw = parseInt(formData.get('stars') as string ?? '0');
    const comment = (formData.get('comment') as string ?? '').trim().slice(0, 300);
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    if (starsRaw < 1 || starsRaw > 5) return fail(400, { error: 'Bitte 1 bis 5 Sterne waehlen.' });

    const db = await getDb();
    const userId = new ObjectId(locals.user.id);

    let rideId: ObjectId, bookingId: ObjectId;
    try {
      rideId = new ObjectId(params.id);
      bookingId = new ObjectId(bookingIdStr);
    } catch {
      return fail(400, { error: 'Ungueltige IDs.' });
    }

    const [ride, booking] = await Promise.all([
      db.collection('rides').findOne({ _id: rideId }),
      db.collection('bookings').findOne({ _id: bookingId, rideId })
    ]);

    if (!ride || !booking) return fail(404, { error: 'Fahrt oder Buchung nicht gefunden.' });

    const isDriver = (ride.driverId as ObjectId).equals(userId);
    const isPassenger = (booking.passengerId as ObjectId).equals(userId);
    if (!isDriver && !isPassenger) return fail(403, { error: 'Keine Berechtigung.' });

    const toUserId = isPassenger ? ride.driverId : booking.passengerId;

    // Doppel-Rating verhindern (unique constraint in Logik, kein DB-Index noetig fuer MVP)
    const existing = await db.collection('ratings').findOne({ rideId, fromUserId: userId, toUserId });
    if (existing) return fail(400, { error: 'Du hast diese Person fuer diese Fahrt bereits bewertet.' });

    // Rating einfuegen
    await db.collection('ratings').insertOne({
      rideId,
      bookingId,
      fromUserId: userId,
      toUserId,
      fromRole: isPassenger ? 'passenger' : 'driver',
      stars: starsRaw,
      comment: comment || undefined,
      createdAt: new Date()
    });

    // Durchschnittsbewertung des Empfaengers aktualisieren
    const allRatings = await db.collection('ratings').find({ toUserId }).toArray();
    const avg = allRatings.reduce((sum, r) => sum + (r.stars as number), 0) / allRatings.length;
    await db.collection('users').updateOne(
      { _id: toUserId },
      { $set: { rating: Math.round(avg * 10) / 10, totalRatings: allRatings.length } }
    );

    throw redirect(302, isPassenger ? '/my/bookings' : '/my/rides');
  }
};
