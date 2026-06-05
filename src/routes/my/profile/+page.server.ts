import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();
  const userId = new ObjectId(locals.user.id);

  const [user, allRatings, ridesCount, bookingsCount, unreadNotifications] = await Promise.all([
    db.collection('users').findOne({ _id: userId }),
    db.collection('ratings').find({ toUserId: userId }).sort({ createdAt: -1 }).limit(10).toArray(),
    db.collection('rides').countDocuments({ driverId: userId }),
    db.collection('bookings').countDocuments({
      passengerId: userId,
      status: { $in: ['accepted', 'confirmed', 'completed'] }
    }),
    db.collection('notifications').countDocuments({ userId, isRead: false })
  ]);

  const driverRatings = allRatings.filter(r => r.fromRole === 'passenger');
  const passengerRatings = allRatings.filter(r => r.fromRole === 'driver');

  function avg(arr: { stars: number }[]) {
    if (arr.length === 0) return null;
    return Math.round((arr.reduce((s, r) => s + r.stars, 0) / arr.length) * 10) / 10;
  }

  return {
    profile: {
      firstName: user?.firstName as string,
      lastName: user?.lastName as string,
      email: user?.email as string,
      avatarUrl: (user?.avatarUrl ?? user?.profilePicture) as string | undefined,
      bio: user?.bio as string | undefined,
      region: user?.region as string | undefined,
      phone: user?.phone as string | undefined,
      interests: (user?.interests as string[] | undefined) ?? [],
      role: (user?.role as string) ?? 'user',
      createdAt: (user?.createdAt as Date | undefined)?.toISOString()
    },
    ratings: {
      asDriver: { count: driverRatings.length, avg: avg(driverRatings as any) },
      asPassenger: { count: passengerRatings.length, avg: avg(passengerRatings as any) },
      recent: allRatings.map(r => ({
        _id: r._id.toString(),
        stars: r.stars as number,
        comment: r.comment as string | undefined,
        fromRole: (r.fromRole ?? r.role) as string,
        createdAt: (r.createdAt as Date).toISOString()
      }))
    },
    stats: { ridesCount, bookingsCount },
    unreadNotifications
  };
};
