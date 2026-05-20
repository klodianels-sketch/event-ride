import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { geocode } from '$lib/geocoding';
import { planRoute } from '$lib/ride-planner';
import { toPublicRideDTO } from '$lib/dto';
import { ensureRideCoords } from '$lib/ride-repair.server';

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

  // Synchron reparieren falls Koordinaten fehlen — eine Fahrt, vertretbare Latenz
  if (!ride.startCoords || !ride.eventLocationCoords) {
    const repaired = await ensureRideCoords(ride, db);
    if (repaired.startCoords) (ride as any).startCoords = repaired.startCoords;
    if (repaired.eventCoords) (ride as any).eventLocationCoords = repaired.eventCoords;
    if (repaired.startCoordsRough) (ride as any).startCoordsRough = repaired.startCoordsRough;
  }

  // Optional: Abholort aus URL-Params vorbefuellen (von Startseite uebergeben)
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

    if (!pickupLocation) {
      return fail(400, { error: 'Bitte gib deinen Abholort an.' });
    }
    if (!agreeTerms) {
      return fail(400, { error: 'Du musst den Fairplay-Regeln zustimmen.' });
    }

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
      return fail(400, {
        error: 'Diese Fahrt startet in weniger als 30 Minuten. Buchung ist nicht mehr moeglich.'
      });
    }
    if ((ride.seatsAvailable as number) <= 0) {
      return fail(400, { error: 'Keine freien Plaetze mehr verfuegbar.' });
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

    // ── On-Demand Koordinaten-Reparatur ──────────────────────────────────
    // Wenn Koordinaten fehlen (alte Fahrt), jetzt synchron geocodieren.
    let startCoords = (ride.startCoords as { lat: string; lon: string }) ?? null;
    let eventCoords = (ride.eventLocationCoords as { lat: string; lon: string }) ?? null;

    if (!startCoords || !eventCoords) {
      const repaired = await ensureRideCoords(ride, db);
      if (repaired.startCoords) startCoords = repaired.startCoords;
      if (repaired.eventCoords) eventCoords = repaired.eventCoords;
    }

    // Abholort geocodieren
    const pickupResult = await geocode(pickupLocation);
    if (!pickupResult) {
      return fail(400, {
        error:
          'Dein Abholort konnte nicht gefunden werden. Bitte die Schreibweise pruefen oder eine bekanntere Ortschaft eingeben.'
      });
    }
    const pickupCoords = { lat: pickupResult.lat, lon: pickupResult.lon };

    // ── Routing ──────────────────────────────────────────────────────────
    const fairplayWindowMinutes = (ride.fairplayWindowMinutes as number) ?? 10;
    const noShowPolicy = (ride.noShowPolicy as { waitMinutes: number; penaltyPercent: number }) ?? {
      waitMinutes: 15,
      penaltyPercent: 100
    };

    // Alle bestehenden Buchungen laden (mit Koordinaten fuer Multi-Stop)
    const existingBookings = await db
      .collection('bookings')
      .find({ rideId, status: { $nin: ['cancelled', 'no-show'] } })
      .toArray();

    const NEW_STOP_ID = '__new__';

    // Bestehende Stopps mit vorhandenen Koordinaten — fehlende ueberspringen
    const existingStops = existingBookings
      .filter(b => b.pickupCoords)
      .map(b => ({
        bookingId: b._id.toString(),
        coords: b.pickupCoords as { lat: string; lon: string },
        pickupLocation: b.pickupLocation as string
      }));

    const allStops = [
      ...existingStops,
      { bookingId: NEW_STOP_ID, coords: pickupCoords, pickupLocation }
    ];

    // planRoute braucht startCoords und eventCoords.
    // Falls beide nach Reparatur immer noch fehlen (Geocoding-Ausfall),
    // fahren wir mit Haversine-Fallback weiter — ride-planner handhabt das intern.
    const routeStartCoords = startCoords ?? { lat: '47.3769', lon: '8.5417' }; // Fallback: Zuerich
    const routeEventCoords = eventCoords ?? { lat: '47.3769', lon: '8.5417' };

    const plan = await planRoute(
      routeStartCoords,
      routeEventCoords,
      departureTime,
      allStops,
      Math.max(fairplayWindowMinutes, noShowPolicy.waitMinutes)
    );

    const newStop = plan.stops.find(s => s.bookingId === NEW_STOP_ID);
    if (!newStop) {
      return fail(500, { error: 'Routenplanung fehlgeschlagen. Bitte nochmals versuchen.' });
    }

    // ── Atomisches Seat-Dekrement ─────────────────────────────────────────
    const updateResult = await db.collection('rides').updateOne(
      { _id: rideId, seatsAvailable: { $gt: 0 } },
      {
        $inc: { seatsAvailable: -1, routeVersion: 1 },
        $set: { estimatedArrivalTime: plan.rideEstimatedArrivalTime }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return fail(400, {
        error: 'Jemand war einen Moment schneller — kein Platz mehr frei. Bitte probiere es nochmals.'
      });
    }

    const newRouteVersion = ((ride.routeVersion as number) ?? 0) + 1;

    // Neue Buchung einfuegen
    const inserted = await db.collection('bookings').insertOne({
      rideId,
      passengerId,
      passengerName: `${locals.user.firstName} ${locals.user.lastName}`,
      pickupLocation,
      pickupCoords,
      estimatedPickupTime: newStop.estimatedPickupTime,
      recommendedReadyTime: newStop.recommendedReadyTime,
      latestReadyTime: newStop.latestReadyTime,
      estimatedArrivalAtEvent: newStop.estimatedArrivalAtEvent,
      bookedPrice: ride.pricePerPerson as number,
      routeVersion: newRouteVersion,
      timeAccuracy: newStop.timeAccuracy,
      noShowPolicySnapshot: noShowPolicy,
      status: 'confirmed',
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    // Bestehende Buchungen mit neuen Zeiten aktualisieren (nicht-kritisch, kein await notwendig)
    const updatedStops = plan.stops.filter(s => s.bookingId !== NEW_STOP_ID);
    for (const stop of updatedStops) {
      db.collection('bookings')
        .updateOne(
          { _id: new ObjectId(stop.bookingId) },
          {
            $set: {
              estimatedPickupTime: stop.estimatedPickupTime,
              recommendedReadyTime: stop.recommendedReadyTime,
              latestReadyTime: stop.latestReadyTime,
              estimatedArrivalAtEvent: stop.estimatedArrivalAtEvent,
              routeVersion: newRouteVersion,
              timeAccuracy: stop.timeAccuracy
            }
          }
        )
        .catch(err => console.error('[booking] stop update error:', err));
    }

    throw redirect(302, `/rides/${params.id}/success?bid=${inserted.insertedId}`);
  }
};
