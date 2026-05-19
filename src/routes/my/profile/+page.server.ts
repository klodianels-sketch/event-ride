import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(locals.user.id) });

  const ratings = await db
    .collection('ratings')
    .find({ toUserId: new ObjectId(locals.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  const ridesCount = await db.collection('rides').countDocuments({ driverId: new ObjectId(locals.user.id) });
  const bookingsCount = await db.collection('bookings').countDocuments({ passengerId: new ObjectId(locals.user.id) });

  return {
    profile: {
      firstName: user?.firstName as string,
      lastName: user?.lastName as string,
      email: user?.email as string,
      profilePicture: user?.profilePicture as string | undefined,
      rating: user?.rating as number || 0,
      totalRatings: user?.totalRatings as number || 0,
      createdAt: (user?.createdAt as Date)?.toISOString()
    },
    ratings: ratings.map(r => ({
      _id: r._id.toString(),
      stars: r.stars as number,
      comment: r.comment as string | undefined,
      role: r.role as string,
      createdAt: (r.createdAt as Date).toISOString()
    })),
    stats: { ridesCount, bookingsCount }
  };
};
