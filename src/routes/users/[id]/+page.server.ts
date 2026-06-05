import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ params, locals }) => {
  const db = await getDb();

  let userId: ObjectId;
  try { userId = new ObjectId(params.id); }
  catch { throw error(404, 'Nutzer nicht gefunden'); }

  const [user, driverRatings, passengerRatings, ridesCount] = await Promise.all([
    db.collection('users').findOne({ _id: userId, isDisabled: { $ne: true } }),
    db.collection('ratings').find({ toUserId: userId, fromRole: 'passenger' }).sort({ createdAt: -1 }).limit(5).toArray(),
    db.collection('ratings').find({ toUserId: userId, fromRole: 'driver' }).sort({ createdAt: -1 }).limit(5).toArray(),
    db.collection('rides').countDocuments({ driverId: userId, status: { $ne: 'cancelled' } })
  ]);

  if (!user) throw error(404, 'Nutzer nicht gefunden');

  function avg(arr: { stars: number }[]) {
    if (arr.length === 0) return null;
    return Math.round((arr.reduce((s, r) => s + r.stars, 0) / arr.length) * 10) / 10;
  }

  const isOwnProfile = locals.user?.id === userId.toString();

  return {
    user: {
      _id: userId.toString(),
      firstName: user.firstName as string,
      lastName: user.lastName as string,
      avatarUrl: (user.avatarUrl ?? user.profilePicture) as string | undefined,
      bio: user.bio as string | undefined,
      region: user.region as string | undefined,
      interests: (user.interests as string[] | undefined) ?? [],
      createdAt: (user.createdAt as Date).toISOString()
    },
    ratings: {
      asDriver: { count: driverRatings.length, avg: avg(driverRatings as any) },
      asPassenger: { count: passengerRatings.length, avg: avg(passengerRatings as any) },
      recent: [...driverRatings, ...passengerRatings]
        .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
        .slice(0, 4)
        .map(r => ({
          stars: r.stars as number,
          comment: r.comment as string | undefined,
          fromRole: r.fromRole as string,
          createdAt: (r.createdAt as Date).toISOString()
        }))
    },
    ridesCount,
    isOwnProfile
  };
};
