import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { toPublicBookingDTO } from '$lib/dto';
import { calcPassengerCancellationFee } from '$lib/cancellation-policy';
import { createNotification } from '$lib/notifications.server';
import { planRoute } from '$lib/ride-planner';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();
  const bookings = await db
    .collection('bookings')
    .find({ passengerId: new ObjectId(locals.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  const enriched = await Promise.all(
    bookings.map(async b => {
      const ride = await db.collection('rides').findOne({ _id: b.rideId });
      const dto = toPublicBookingDTO(b, ride);
      return {
        ...dto,
        conversationId: b.conversationId?.toString() as string | undefined
      };
    })
  );

  return { bookings: enriched };
};

export const actions: Actions = {
  // ── Offene Anfrage stornieren (pending) ───────────────────────
  // Immer kostenlos, kein Sitz-Abzug rueckgaengig machen (war noch nicht reserviert)
  cancelPending: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    let bookingId: ObjectId;
    try { bookingId = new ObjectId(bookingIdStr); }
    catch { return fail(400, { error: 'Ungueltige Buchungs-ID.' }); }

    const db = await getDb();
    const passengerId = new ObjectId(locals.user.id);

    const booking = await db.collection('bookings').findOne({
      _id: bookingId,
      passengerId,
      status: 'pending'
    });
    if (!booking) return fail(404, { error: 'Anfrage nicht gefunden oder bereits verarbeitet.' });

    const ride = await db.collection('rides').findOne({ _id: booking.rideId });

    await db.collection('bookings').updateOne(
      { _id: bookingId },
      {
        $set: {
          status: 'cancelled_by_passenger',
          cancellationFee: 0,
          cancellationReason: 'Mitfahrer hat Anfrage storniert',
          cancelledAt: new Date()
        }
      }
    );

    // Fahrer benachrichtigen
    if (ride) {
      createNotification(db, {
        userId: ride.driverId as ObjectId,
        type: 'booking_cancelled_passenger',
        title: 'Anfrage storniert',
        message: `${locals.user.firstName} ${locals.user.lastName} hat die Anfrage fuer "${ride.eventName as string}" zurueckgezogen.`,
        rideId: ride._id as ObjectId,
        bookingId
      }).catch(err => console.error('[cancelPending] Notification fehlgeschlagen:', err));
    }

    return { cancelSuccess: true };
  },

  // ── Bestaetigte Mitfahrt stornieren (accepted) ────────────────
  // Stornogebuehr moeglich bei Storno < 24h vor Abfahrt
  cancelAccepted: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    let bookingId: ObjectId;
    try { bookingId = new ObjectId(bookingIdStr); }
    catch { return fail(400, { error: 'Ungueltige Buchungs-ID.' }); }

    const db = await getDb();
    const passengerId = new ObjectId(locals.user.id);

    const booking = await db.collection('bookings').findOne({
      _id: bookingId,
      passengerId,
      status: { $in: ['accepted', 'confirmed'] }
    });
    if (!booking) return fail(404, { error: 'Buchung nicht gefunden oder nicht stornierbar.' });

    const ride = await db.collection('rides').findOne({ _id: booking.rideId });
    if (!ride) return fail(404, { error: 'Fahrt nicht gefunden.' });

    const departureTime = ride.departureTime as Date;
    const bookedPrice = booking.bookedPrice as number;

    const { fee, isFree } = calcPassengerCancellationFee(bookedPrice, departureTime);

    // Sitz freigeben und Buchung stornieren
    await Promise.all([
      db.collection('rides').updateOne(
        { _id: ride._id },
        { $inc: { seatsAvailable: 1 } }
      ),
      db.collection('bookings').updateOne(
        { _id: bookingId },
        {
          $set: {
            status: 'cancelled_by_passenger',
            cancellationFee: fee,
            cancellationReason: isFree
              ? 'Mitfahrer hat rechtzeitig storniert'
              : 'Mitfahrer hat spaet storniert',
            cancelledAt: new Date(),
            paymentStatus: isFree ? 'refunded' : 'forfeited'
          }
        }
      )
    ]);

    // Fahrer benachrichtigen
    createNotification(db, {
      userId: ride.driverId as ObjectId,
      type: 'booking_cancelled_passenger',
      title: 'Mitfahrt storniert',
      message: `${locals.user.firstName} ${locals.user.lastName} hat die Mitfahrt fuer "${ride.eventName as string}" storniert.${fee > 0 ? ` Stornogebuehr: CHF ${fee.toFixed(2)}.` : ''}`,
      rideId: ride._id as ObjectId,
      bookingId
    }).catch(err => console.error('[cancelAccepted] Notification fehlgeschlagen:', err));

    // Route fuer verbleibende Mitfahrer neu berechnen (fire-and-forget)
    recalcRouteAfterCancel(db, ride._id as ObjectId, bookingId).catch(
      err => console.error('[cancelAccepted] Route-Neuberechnung fehlgeschlagen:', err)
    );

    return { cancelSuccess: true, fee, isFree };
  }
};

// Neu berechnet die Route und Zeiten aller verbleibenden akzeptierten Mitfahrer
async function recalcRouteAfterCancel(
  db: Awaited<ReturnType<typeof import('$lib/db').getDb>>,
  rideId: ObjectId,
  cancelledBookingId: ObjectId
): Promise<void> {
  const ride = await db.collection('rides').findOne({ _id: rideId });
  if (!ride) return;

  const remaining = await db
    .collection('bookings')
    .find({
      rideId,
      _id: { $ne: cancelledBookingId },
      status: { $in: ['accepted', 'confirmed'] }
    })
    .toArray();

  const stops = remaining
    .filter(b => b.pickupCoords)
    .map(b => ({
      bookingId: b._id.toString(),
      coords: b.pickupCoords as { lat: string; lon: string },
      pickupLocation: b.pickupLocation as string
    }));

  const startCoords =
    (ride.startCoords as { lat: string; lon: string }) ??
    { lat: '47.3769', lon: '8.5417' };
  const eventCoords =
    (ride.eventLocationCoords as { lat: string; lon: string }) ??
    { lat: '47.3769', lon: '8.5417' };

  const plan = await planRoute(
    startCoords,
    eventCoords,
    ride.departureTime as Date,
    stops,
    (ride.fairplayWindowMinutes as number) ?? 15
  );

  const newRouteVersion = ((ride.routeVersion as number) ?? 0) + 1;

  await db.collection('rides').updateOne(
    { _id: rideId },
    { $set: { estimatedArrivalTime: plan.rideEstimatedArrivalTime, routeVersion: newRouteVersion } }
  );

  for (const stop of plan.stops) {
    await db.collection('bookings').updateOne(
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
    );
  }
}
