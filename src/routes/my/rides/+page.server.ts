import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { createNotifications } from '$lib/notifications.server';
import { acceptBooking, rejectBooking } from '$lib/booking-actions.server';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();
  const driverId = new ObjectId(locals.user.id);

  const rides = await db
    .collection('rides')
    .find({ driverId })
    .sort({ departureTime: -1 })
    .toArray();

  const rideIds = rides.map(r => r._id);

  const allBookings = rideIds.length > 0
    ? await db.collection('bookings')
        .find({ rideId: { $in: rideIds }, status: { $nin: ['rejected', 'cancelled_by_passenger', 'cancelled'] } })
        .sort({ createdAt: 1 })
        .toArray()
    : [];

  type BookingSummary = {
    bookingId: string;
    passengerName: string;
    pickupLocation: string;
    estimatedPickupTime?: string;
    status: string;
    bookedPrice: number;
    createdAt: string;
    conversationId?: string;
  };

  const pendingByRide = new Map<string, BookingSummary[]>();
  const acceptedByRide = new Map<string, BookingSummary[]>();

  for (const b of allBookings) {
    const key = b.rideId.toString();
    const summary: BookingSummary = {
      bookingId: b._id.toString(),
      passengerName: b.passengerName as string,
      pickupLocation: b.pickupLocation as string,
      estimatedPickupTime: b.estimatedPickupTime
        ? (b.estimatedPickupTime as Date).toISOString()
        : undefined,
      status: b.status as string,
      bookedPrice: b.bookedPrice as number,
      createdAt: (b.createdAt as Date).toISOString(),
      conversationId: b.conversationId?.toString()
    };

    if (b.status === 'pending') {
      if (!pendingByRide.has(key)) pendingByRide.set(key, []);
      pendingByRide.get(key)!.push(summary);
    } else if (b.status === 'accepted' || b.status === 'confirmed') {
      if (!acceptedByRide.has(key)) acceptedByRide.set(key, []);
      acceptedByRide.get(key)!.push(summary);
    }
  }

  return {
    rides: rides.map(r => ({
      _id: r._id.toString(),
      eventName: r.eventName as string,
      eventCategory: (r.eventCategory as string | undefined) ?? 'other',
      eventLocation: r.eventLocation as string,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      estimatedArrivalTime: (r.estimatedArrivalTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number,
      status: r.status as string,
      pendingRequests: pendingByRide.get(r._id.toString()) ?? [],
      acceptedPassengers: acceptedByRide.get(r._id.toString()) ?? []
    }))
  };
};

export const actions: Actions = {
  // ── Anfrage annehmen ──────────────────────────────────────────
  accept: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    let bookingId: ObjectId;
    try { bookingId = new ObjectId(bookingIdStr); }
    catch { return fail(400, { error: 'Ungueltige Buchungs-ID.' }); }

    const db = await getDb();
    const result = await acceptBooking(db, bookingId, new ObjectId(locals.user.id));
    if (!result.success) return fail(400, { error: result.error });

    return { acceptSuccess: true };
  },

  // ── Anfrage ablehnen ──────────────────────────────────────────
  reject: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    let bookingId: ObjectId;
    try { bookingId = new ObjectId(bookingIdStr); }
    catch { return fail(400, { error: 'Ungueltige Buchungs-ID.' }); }

    const db = await getDb();
    const result = await rejectBooking(db, bookingId, new ObjectId(locals.user.id));
    if (!result.success) return fail(400, { error: result.error });

    return { rejectSuccess: true };
  },

  // ── No-Show markieren ─────────────────────────────────────────
  noshow: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    let bookingId: ObjectId;
    try { bookingId = new ObjectId(bookingIdStr); }
    catch { return fail(400, { error: 'Ungueltige Buchungs-ID.' }); }

    const db = await getDb();

    const booking = await db.collection('bookings').findOne({
      _id: bookingId,
      status: { $in: ['accepted', 'confirmed'] }
    });
    if (!booking) return fail(404, { error: 'Buchung nicht gefunden.' });

    const ride = await db.collection('rides').findOne({
      _id: booking.rideId,
      driverId: new ObjectId(locals.user.id)
    });
    if (!ride) return fail(403, { error: 'Keine Berechtigung fuer diese Aktion.' });

    await Promise.all([
      db.collection('bookings').updateOne(
        { _id: bookingId },
        { $set: { status: 'no-show', cancelledAt: new Date(), paymentStatus: 'forfeited' } }
      ),
      db.collection('rides').updateOne(
        { _id: ride._id },
        { $inc: { seatsAvailable: 1 } }
      )
    ]);

    return { noshowSuccess: true };
  },

  // ── Ganze Fahrt stornieren ────────────────────────────────────
  // Alle Mitfahrer werden benachrichtigt, keine Stornogebuehr fuer Mitfahrer
  cancelRide: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const rideIdStr = (formData.get('rideId') as string ?? '').trim();

    let rideId: ObjectId;
    try { rideId = new ObjectId(rideIdStr); }
    catch { return fail(400, { error: 'Ungueltige Fahrt-ID.' }); }

    const db = await getDb();

    const ride = await db.collection('rides').findOne({
      _id: rideId,
      driverId: new ObjectId(locals.user.id),
      status: 'active'
    });
    if (!ride) return fail(404, { error: 'Fahrt nicht gefunden oder bereits storniert.' });

    // Alle aktiven Buchungen dieser Fahrt laden (fuer Benachrichtigungen)
    const activeBookings = await db.collection('bookings').find({
      rideId,
      status: { $in: ['pending', 'accepted', 'confirmed'] }
    }).toArray();

    // Fahrt stornieren
    await db.collection('rides').updateOne(
      { _id: rideId },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );

    // Alle Buchungen auf cancelled_by_driver setzen (kein Seat-Release noetig, Fahrt ist weg)
    if (activeBookings.length > 0) {
      await db.collection('bookings').updateMany(
        { rideId, status: { $in: ['pending', 'accepted', 'confirmed'] } },
        {
          $set: {
            status: 'cancelled_by_driver',
            cancellationFee: 0,
            cancellationReason: 'Fahrt vom Fahrer storniert',
            cancelledAt: new Date(),
            paymentStatus: 'refunded'
          }
        }
      );

      // Alle betroffenen Mitfahrer benachrichtigen
      createNotifications(
        db,
        activeBookings.map(b => ({
          userId: b.passengerId as ObjectId,
          type: 'ride_cancelled' as const,
          title: 'Fahrt storniert',
          message: `Die Fahrt zu "${ride.eventName as string}" wurde leider vom Fahrer storniert. Deine Buchung wurde kostenlos storniert.`,
          rideId,
          bookingId: b._id as ObjectId
        }))
      ).catch(err => console.error('[cancelRide] Notifications fehlgeschlagen:', err));
    }

    return { cancelRideSuccess: true };
  }
};
