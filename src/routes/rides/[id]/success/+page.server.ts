import type { PageServerLoad } from './$types';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { toPublicBookingDTO } from '$lib/dto';

export const load: PageServerLoad = async ({ url, locals }) => {
  const bookingIdStr = url.searchParams.get('bid');
  if (!bookingIdStr || !locals.user) return { booking: null };

  let bookingId: ObjectId;
  try {
    bookingId = new ObjectId(bookingIdStr);
  } catch {
    return { booking: null };
  }

  const db = await getDb();
  const booking = await db.collection('bookings').findOne({
    _id: bookingId,
    passengerId: new ObjectId(locals.user.id)
  });
  if (!booking) return { booking: null };

  const ride = await db.collection('rides').findOne({ _id: booking.rideId });

  return { booking: toPublicBookingDTO(booking, ride) };
};
