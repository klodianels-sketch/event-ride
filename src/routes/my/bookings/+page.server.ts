import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { toPublicBookingDTO } from '$lib/dto';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');

  const db = await getDb();
  const bookings = await db
    .collection('bookings')
    .find({ passengerId: new ObjectId(locals.user!.id) })
    .sort({ createdAt: -1 })
    .toArray();

  const enriched = await Promise.all(
    bookings.map(async b => {
      const ride = await db.collection('rides').findOne({ _id: b.rideId });
      return toPublicBookingDTO(b, ride);
    })
  );

  return { bookings: enriched };
};
