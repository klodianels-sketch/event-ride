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

  const driverId = ride.driverId as ObjectId;
  const isDriver = locals.user?.id === driverId.toString();

  // Parallel: Fahrer-Infos, Buchungen, eigene Buchung, weitere Fahrten
  const [driver, allBookings, allRidesRaw] = await Promise.all([
    db.collection('users').findOne(
      { _id: driverId },
      { projection: { avatarUrl: 1, profilePicture: 1, bio: 1, region: 1, rating: 1, totalRatings: 1 } }
    ),
    db.collection('bookings').find({
      rideId,
      status: { $in: ['accepted', 'confirmed', 'pending'] }
    }).toArray(),
    db.collection('rides')
      .find({ eventName: ride.eventName, status: 'active', seatsAvailable: { $gt: 0 }, _id: { $ne: rideId } })
      .sort({ departureTime: 1 })
      .limit(4)
      .toArray()
  ]);

  // Buchungsstatus des eingeloggten Nutzers
  let myBooking: { status: string; conversationId?: string; _id: string } | null = null;
  if (locals.user) {
    const passengerId = new ObjectId(locals.user.id);
    const existing = allBookings.find(b =>
      (b.passengerId as ObjectId).toString() === passengerId.toString() &&
      !['cancelled', 'rejected', 'cancelled_by_driver', 'cancelled_by_passenger'].includes(b.status as string)
    ) ?? await db.collection('bookings').findOne({
      rideId, passengerId,
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

  const acceptedBookings = allBookings.filter(b =>
    b.status === 'accepted' || b.status === 'confirmed'
  );
  const pendingBookings = allBookings.filter(b => b.status === 'pending');
  const acceptedCount = acceptedBookings.length;
  const pendingCount = pendingBookings.length;

  // Privacy-sichere Teilnehmerliste:
  // Sichtbar fuer: Fahrer (alle), bestaetigte Mitfahrer (nur confirmed), Anfragende (nur Count)
  // Format: Vorname + Nachname-Initial (z.B. "Stefan M.")
  const myBookingIsAccepted = myBooking?.status === 'accepted' || myBooking?.status === 'confirmed';
  let confirmedPassengers: Array<{ displayName: string }> = [];

  if (isDriver || myBookingIsAccepted) {
    // Passagier-User-Daten laden (nur Vorname + Nachname fuer Display)
    const passengerIds = acceptedBookings.map(b => b.passengerId as ObjectId);
    if (passengerIds.length > 0) {
      const passengerUsers = await db.collection('users')
        .find({ _id: { $in: passengerIds } })
        .project({ firstName: 1, lastName: 1 })
        .toArray();
      const nameMap = Object.fromEntries(passengerUsers.map(u => [u._id.toString(), u]));
      confirmedPassengers = acceptedBookings.map(b => {
        const u = nameMap[(b.passengerId as ObjectId).toString()];
        if (!u) return { displayName: b.passengerName as string };
        // Vorname + Nachname-Initial: "Stefan M."
        const lastName = (u.lastName as string ?? '');
        return { displayName: `${u.firstName as string} ${lastName[0] ?? ''}.`.trim() };
      });
    }
  }

  // Abstrahierte Routeninfo: Zwischenorte aus angenommenen Buchungen (nur Stadtebene)
  const routeStops = isDriver
    ? acceptedBookings.map(b => b.pickupLocation as string)
    : acceptedBookings.map(b => {
        // Nur erste Komponente (Stadt/Quartier), nie exakte Adresse
        const loc = b.pickupLocation as string;
        return loc.split(',')[0].trim();
      });

  return {
    ride: toPublicRideDTO(ride, { acceptedCount, pendingCount, confirmedPassengers }),
    driverInfo: driver ? {
      _id: driverId.toString(),
      avatarUrl: (driver.avatarUrl ?? driver.profilePicture) as string | undefined,
      bio: driver.bio as string | undefined,
      region: driver.region as string | undefined,
      rating: driver.rating as number | undefined,
      totalRatings: driver.totalRatings as number | undefined
    } : { _id: driverId.toString() },
    myBooking,
    isDriver,
    isLoggedIn: !!locals.user,
    allRides: allRidesRaw.map(r => toPublicRideDTO(r)),
    routeStops,
    pendingCount: isDriver ? pendingCount : null
  };
};
