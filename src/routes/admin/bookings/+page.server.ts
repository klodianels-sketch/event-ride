import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/auth';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const db = await getDb();
  const filter = url.searchParams.get('filter') ?? 'all';
  const search = url.searchParams.get('q') ?? '';

  const query: Record<string, unknown> = {};
  const validStatuses = ['pending','accepted','rejected','cancelled_by_passenger','cancelled_by_driver','no-show','completed'];
  if (validStatuses.includes(filter)) query.status = filter;

  if (search) {
    query['$or'] = [
      { passengerName: { $regex: search, $options: 'i' } },
      { pickupLocation: { $regex: search, $options: 'i' } }
    ];
  }

  const bookings = await db
    .collection('bookings')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  // Ride-Infos nachladen
  const rideIds = [...new Set(bookings.map(b => b.rideId.toString()))];
  const rides = await db
    .collection('rides')
    .find({ _id: { $in: rideIds.map(id => new ObjectId(id)) } })
    .project({ eventName: 1, eventCategory: 1, driverName: 1 })
    .toArray();
  const rideMap = Object.fromEntries(rides.map(r => [r._id.toString(), r]));

  const STATUS_LABEL: Record<string, string> = {
    pending: 'Ausstehend', accepted: 'Angenommen', confirmed: 'Bestätigt',
    rejected: 'Abgelehnt', cancelled_by_passenger: 'Vom Mitf. storniert',
    cancelled_by_driver: 'Vom Fahrer storniert', cancelled: 'Storniert',
    'no-show': 'No-Show', completed: 'Abgeschlossen'
  };

  return {
    bookings: bookings.map(b => {
      const ride = rideMap[b.rideId.toString()];
      return {
        _id: b._id.toString(),
        passengerName: b.passengerName as string,
        pickupLocation: b.pickupLocation as string,
        bookedPrice: b.bookedPrice as number,
        status: b.status as string,
        statusLabel: STATUS_LABEL[b.status as string] ?? b.status,
        eventName: (ride?.eventName as string | undefined) ?? '—',
        driverName: (ride?.driverName as string | undefined) ?? '—',
        cancellationFee: b.cancellationFee as number | undefined,
        createdAt: (b.createdAt as Date).toISOString()
      };
    }),
    filter,
    search
  };
};
