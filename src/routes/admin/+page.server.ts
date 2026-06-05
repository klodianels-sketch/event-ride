import type { PageServerLoad } from './$types';
import { getDb } from '$lib/db';
import { requireAdmin } from '$lib/auth';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const db = await getDb();

  const [
    totalUsers, totalRides, totalBookings,
    disabledUsers, activeRides, pendingBookings,
    totalConversations, totalMessages
  ] = await Promise.all([
    db.collection('users').countDocuments(),
    db.collection('rides').countDocuments(),
    db.collection('bookings').countDocuments(),
    db.collection('users').countDocuments({ isDisabled: true }),
    db.collection('rides').countDocuments({ status: 'active' }),
    db.collection('bookings').countDocuments({ status: 'pending' }),
    db.collection('conversations').countDocuments(),
    db.collection('messages').countDocuments()
  ]);

  const recentRides = await db
    .collection('rides')
    .find()
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  return {
    stats: {
      totalUsers, totalRides, totalBookings,
      disabledUsers, activeRides, pendingBookings,
      totalConversations, totalMessages
    },
    recentRides: recentRides.map(r => ({
      _id: r._id.toString(),
      eventName: r.eventName as string,
      driverName: r.driverName as string,
      status: r.status as string,
      departureTime: (r.departureTime as Date).toISOString(),
      createdAt: (r.createdAt as Date).toISOString()
    }))
  };
};
