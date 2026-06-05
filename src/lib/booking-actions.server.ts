import { ObjectId } from 'mongodb';
import { planRoute } from '$lib/ride-planner';
import { createNotification, createNotifications } from '$lib/notifications.server';
import type { getDb } from '$lib/db';

type Db = Awaited<ReturnType<typeof getDb>>;

export async function acceptBooking(
  db: Db,
  bookingId: ObjectId,
  driverId: ObjectId
): Promise<{ success: boolean; error?: string }> {
  const booking = await db.collection('bookings').findOne({ _id: bookingId, status: 'pending' });
  if (!booking) return { success: false, error: 'Anfrage nicht gefunden oder bereits verarbeitet.' };

  const ride = await db.collection('rides').findOne({ _id: booking.rideId, driverId });
  if (!ride) return { success: false, error: 'Keine Berechtigung fuer diese Aktion.' };

  const seatUpdate = await db.collection('rides').updateOne(
    { _id: ride._id, seatsAvailable: { $gt: 0 } },
    { $inc: { seatsAvailable: -1 } }
  );
  if (seatUpdate.modifiedCount === 0) {
    await db.collection('bookings').updateOne(
      { _id: bookingId },
      { $set: { status: 'rejected', cancellationReason: 'Keine freien Plaetze', cancelledAt: new Date() } }
    );
    return { success: false, error: 'Keine freien Plaetze mehr. Anfrage automatisch abgelehnt.' };
  }

  const existingAccepted = await db.collection('bookings').find({
    rideId: ride._id,
    status: { $in: ['accepted', 'confirmed'] },
    _id: { $ne: bookingId }
  }).toArray();

  const existingStops = existingAccepted
    .filter(b => b.pickupCoords)
    .map(b => ({
      bookingId: b._id.toString(),
      coords: b.pickupCoords as { lat: string; lon: string },
      pickupLocation: b.pickupLocation as string
    }));

  const allStops = [
    ...existingStops,
    {
      bookingId: bookingId.toString(),
      coords: booking.pickupCoords as { lat: string; lon: string },
      pickupLocation: booking.pickupLocation as string
    }
  ];

  const startCoords = (ride.startCoords as { lat: string; lon: string }) ?? { lat: '47.3769', lon: '8.5417' };
  const eventCoords = (ride.eventLocationCoords as { lat: string; lon: string }) ?? { lat: '47.3769', lon: '8.5417' };
  const fairplayWindow = Math.max(
    (ride.fairplayWindowMinutes as number) ?? 15,
    (ride.noShowPolicy as { waitMinutes?: number } | undefined)?.waitMinutes ?? 15
  );

  const plan = await planRoute(startCoords, eventCoords, ride.departureTime as Date, allStops, fairplayWindow);
  const newRouteVersion = ((ride.routeVersion as number) ?? 0) + 1;

  await db.collection('rides').updateOne(
    { _id: ride._id },
    { $set: { estimatedArrivalTime: plan.rideEstimatedArrivalTime, routeVersion: newRouteVersion } }
  );

  const thisStop = plan.stops.find(s => s.bookingId === bookingId.toString());
  await db.collection('bookings').updateOne(
    { _id: bookingId },
    {
      $set: {
        status: 'accepted',
        estimatedPickupTime: thisStop?.estimatedPickupTime,
        recommendedReadyTime: thisStop?.recommendedReadyTime,
        latestReadyTime: thisStop?.latestReadyTime,
        estimatedArrivalAtEvent: thisStop?.estimatedArrivalAtEvent,
        routeVersion: newRouteVersion,
        timeAccuracy: thisStop?.timeAccuracy ?? 'fallback'
      }
    }
  );

  const otherUpdates = plan.stops.filter(s => s.bookingId !== bookingId.toString());
  for (const stop of otherUpdates) {
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
      .catch(err => console.error('[acceptBooking] Zeit-Update fehlgeschlagen:', err));
  }

  createNotification(db, {
    userId: booking.passengerId as ObjectId,
    type: 'booking_accepted',
    title: 'Anfrage angenommen!',
    message: `Deine Anfrage fuer "${ride.eventName as string}" wurde bestaetigt.${thisStop ? ` Abholung ca. ${thisStop.estimatedPickupTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} Uhr.` : ''}`,
    rideId: ride._id as ObjectId,
    bookingId
  }).catch(err => console.error('[acceptBooking] Notification fehlgeschlagen:', err));

  if (otherUpdates.length > 0) {
    createNotifications(
      db,
      otherUpdates
        .map(stop => ({
          userId: existingAccepted.find(b => b._id.toString() === stop.bookingId)?.passengerId as ObjectId,
          type: 'times_updated' as const,
          title: 'Abholzeiten aktualisiert',
          message: `Neuer Mitfahrer bestaetigt — deine Abholzeit fuer "${ride.eventName as string}" hat sich leicht angepasst.`,
          rideId: ride._id as ObjectId,
          bookingId: new ObjectId(stop.bookingId)
        }))
        .filter(n => n.userId)
    ).catch(err => console.error('[acceptBooking] Times-updated Notifications fehlgeschlagen:', err));
  }

  return { success: true };
}

export async function rejectBooking(
  db: Db,
  bookingId: ObjectId,
  driverId: ObjectId
): Promise<{ success: boolean; error?: string }> {
  const booking = await db.collection('bookings').findOne({ _id: bookingId, status: 'pending' });
  if (!booking) return { success: false, error: 'Anfrage nicht gefunden.' };

  const ride = await db.collection('rides').findOne({ _id: booking.rideId, driverId });
  if (!ride) return { success: false, error: 'Keine Berechtigung fuer diese Aktion.' };

  await db.collection('bookings').updateOne(
    { _id: bookingId },
    { $set: { status: 'rejected', cancelledAt: new Date() } }
  );

  createNotification(db, {
    userId: booking.passengerId as ObjectId,
    type: 'booking_rejected',
    title: 'Anfrage abgelehnt',
    message: `Deine Anfrage fuer "${ride.eventName as string}" wurde leider nicht angenommen. Schau nach anderen Fahrten!`,
    rideId: ride._id as ObjectId,
    bookingId
  }).catch(err => console.error('[rejectBooking] Notification fehlgeschlagen:', err));

  return { success: true };
}
