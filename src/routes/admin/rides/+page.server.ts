import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '$lib/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const db = await getDb();
  const filter = url.searchParams.get('filter') ?? 'active';
  const search = url.searchParams.get('q') ?? '';

  const query: Record<string, unknown> = {};
  if (filter === 'active')    query.status = 'active';
  if (filter === 'cancelled') query.status = 'cancelled';
  if (filter === 'completed') query.status = 'completed';

  if (search) {
    query['$or'] = [
      { eventName: { $regex: search, $options: 'i' } },
      { driverName: { $regex: search, $options: 'i' } },
      { eventLocation: { $regex: search, $options: 'i' } }
    ];
  }

  const rides = await db
    .collection('rides')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return {
    rides: rides.map(r => ({
      _id: r._id.toString(),
      driverName: r.driverName as string,
      eventName: r.eventName as string,
      eventCategory: (r.eventCategory as string) ?? 'other',
      eventLocation: r.eventLocation as string,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number,
      status: r.status as string,
      moderationReason: r.moderationReason as string | undefined,
      createdAt: (r.createdAt as Date).toISOString()
    })),
    filter,
    search
  };
};

export const actions: Actions = {
  // Fahrt deaktivieren (soft — setzt status auf cancelled)
  deactivate: async ({ request, locals }) => {
    requireAdmin(locals.user);

    const formData = await request.formData();
    const rideId = (formData.get('rideId') as string ?? '').trim();
    const reason = (formData.get('reason') as string ?? '').trim() || 'Admin-Entscheidung';

    let targetId: ObjectId;
    try { targetId = new ObjectId(rideId); }
    catch { return fail(400, { error: 'Ungueltige Ride-ID.' }); }

    const db = await getDb();

    // Alle aktiven Buchungen dieser Fahrt ebenfalls stornieren
    await db.collection('bookings').updateMany(
      { rideId: targetId, status: { $in: ['pending', 'accepted', 'confirmed'] } },
      { $set: { status: 'cancelled_by_driver', cancellationReason: 'Admin-Moderation', cancelledAt: new Date() } }
    );

    await db.collection('rides').updateOne(
      { _id: targetId },
      {
        $set: {
          status: 'cancelled',
          moderationReason: reason,
          moderatedAt: new Date(),
          moderatedBy: new ObjectId(locals.user!.id)
        }
      }
    );

    return { success: true, action: 'deactivated' };
  },

  // Fahrt wiederherstellen (soft restore)
  restore: async ({ request, locals }) => {
    requireAdmin(locals.user);

    const formData = await request.formData();
    const rideId = (formData.get('rideId') as string ?? '').trim();

    let targetId: ObjectId;
    try { targetId = new ObjectId(rideId); }
    catch { return fail(400, { error: 'Ungueltige Ride-ID.' }); }

    // Nur Fahrten in der Zukunft können wieder aktiviert werden
    const db = await getDb();
    const ride = await db.collection('rides').findOne({ _id: targetId });
    if (!ride) return fail(404, { error: 'Fahrt nicht gefunden.' });
    if ((ride.departureTime as Date) < new Date()) {
      return fail(400, { error: 'Vergangene Fahrten können nicht reaktiviert werden.' });
    }

    await db.collection('rides').updateOne(
      { _id: targetId },
      {
        $set: { status: 'active' },
        $unset: { moderationReason: '', moderatedAt: '', moderatedBy: '' }
      }
    );

    return { success: true, action: 'restored' };
  }
};
