import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { geocode } from '$lib/geocoding';
import { toPublicRideDTO } from '$lib/dto';
import { ensureRideCoords } from '$lib/ride-repair.server';
import { createNotification } from '$lib/notifications.server';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user) throw redirect(302, `/auth/login?redirect=/rides/${params.id}/book`);

  const db = await getDb();

  let rideId: ObjectId;
  try {
    rideId = new ObjectId(params.id);
  } catch {
    throw error(404, 'Fahrt nicht gefunden');
  }

  const ride = await db.collection('rides').findOne({ _id: rideId, status: 'active' });
  if (!ride) throw error(404, 'Fahrt nicht gefunden oder nicht mehr verfuegbar');

  if (!ride.startCoords || !ride.eventLocationCoords) {
    const repaired = await ensureRideCoords(ride, db);
    if (repaired.startCoords) ride['startCoords'] = repaired.startCoords;
    if (repaired.eventCoords) ride['eventLocationCoords'] = repaired.eventCoords;
    if (repaired.startCoordsRough) ride['startCoordsRough'] = repaired.startCoordsRough;
  }

  const prefilledLat = url.searchParams.get('plat');
  const prefilledLon = url.searchParams.get('plon');

  return {
    ride: toPublicRideDTO(ride),
    prefilledCoords:
      prefilledLat && prefilledLon
        ? { lat: parseFloat(prefilledLat), lon: parseFloat(prefilledLon) }
        : null
  };
};

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const pickupLocation = (formData.get('pickupLocation') as string ?? '').trim();
    const agreeTerms = formData.get('agreeTerms');

    if (!pickupLocation) return fail(400, { error: 'Bitte gib deinen Abholort an.' });
    if (!agreeTerms) return fail(400, { error: 'Bitte die Fairplay-Regel bestaetigen.' });

    const db = await getDb();

    let rideId: ObjectId;
    try {
      rideId = new ObjectId(params.id);
    } catch {
      return fail(400, { error: 'Ungueltige Fahrt-ID.' });
    }

    const ride = await db.collection('rides').findOne({ _id: rideId, status: 'active' });
    if (!ride) return fail(404, { error: 'Fahrt nicht gefunden oder nicht mehr aktiv.' });

    const departureTime = ride.departureTime as Date;
    if (Date.now() + 30 * 60 * 1000 > departureTime.getTime()) {
      return fail(400, { error: 'Diese Fahrt startet in weniger als 30 Minuten. Anfragen sind nicht mehr moeglich.' });
    }
    if ((ride.seatsAvailable as number) <= 0) {
      return fail(400, { error: 'Keine freien Plaetze mehr verfuegbar.' });
    }
    if (ride.driverId.toString() === locals.user.id) {
      return fail(400, { error: 'Du kannst nicht an deiner eigenen Fahrt teilnehmen.' });
    }

    const passengerId = new ObjectId(locals.user.id);

    // Verhindere Doppelbuchung (pending oder accepted)
    const existingBooking = await db.collection('bookings').findOne({
      rideId,
      passengerId,
      status: { $nin: ['cancelled', 'rejected'] }
    });
    if (existingBooking) {
      return fail(400, { error: 'Du hast fuer diese Fahrt bereits eine Anfrage gestellt.' });
    }

    // Abholort geocodieren — validiert die Adresse und speichert Koordinaten fuer spaetere Routenberechnung
    const pickupResult = await geocode(pickupLocation);
    if (!pickupResult) {
      return fail(400, {
        error: 'Dein Abholort konnte nicht gefunden werden. Bitte die Schreibweise pruefen.'
      });
    }

    const noShowPolicy = (ride.noShowPolicy as { waitMinutes: number; penaltyPercent: number }) ?? {
      waitMinutes: 15,
      penaltyPercent: 80
    };

    // Conversation erstellen (falls noch keine zwischen Fahrer und Mitfahrer für diese Fahrt)
    const driverId = ride.driverId as ObjectId;
    let conversationId: ObjectId | undefined;
    const existingConv = await db.collection('conversations').findOne({
      rideId,
      participantIds: { $all: [passengerId, driverId] }
    });
    if (existingConv) {
      conversationId = existingConv._id as ObjectId;
    } else {
      const convResult = await db.collection('conversations').insertOne({
        rideId,
        participantIds: [passengerId, driverId],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      conversationId = convResult.insertedId;
    }

    const passengerFullName = `${locals.user.firstName} ${locals.user.lastName}`;

    // Anfrage erstellen — KEIN Sitz-Abzug, KEINE Routenberechnung
    // Zeiten werden erst bei Annahme durch den Fahrer berechnet
    const inserted = await db.collection('bookings').insertOne({
      rideId,
      passengerId,
      passengerName: passengerFullName,
      pickupLocation,
      pickupCoords: { lat: pickupResult.lat, lon: pickupResult.lon },
      bookedPrice: ride.pricePerPerson as number,
      noShowPolicySnapshot: noShowPolicy,
      conversationId,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    // Fahrer sofort benachrichtigen (fire-and-forget)
    createNotification(db, {
      userId: driverId,
      type: 'booking_received',
      title: `${passengerFullName} möchte mitfahren`,
      message: `Neue Anfrage für „${ride.eventName as string}". Abholort: ${pickupLocation}`,
      rideId,
      bookingId: inserted.insertedId,
      conversationId
    }).catch(err => console.error('[book] Fahrer-Notification fehlgeschlagen:', err));

    throw redirect(302, `/rides/${params.id}/success?bid=${inserted.insertedId}`);
  }
};
