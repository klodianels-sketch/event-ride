import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();
  const userId = new ObjectId(locals.user.id);

  // Ungelesene zuerst, dann nach Datum — max. 50 Benachrichtigungen
  const notifications = await db
    .collection('notifications')
    .find({ userId })
    .sort({ isRead: 1, createdAt: -1 })
    .limit(50)
    .toArray();

  return {
    notifications: notifications.map(n => ({
      _id: n._id.toString(),
      type: n.type as string,
      title: n.title as string,
      message: n.message as string,
      isRead: n.isRead as boolean,
      rideId: n.rideId?.toString() as string | undefined,
      bookingId: n.bookingId?.toString() as string | undefined,
      conversationId: n.conversationId?.toString() as string | undefined,
      createdAt: (n.createdAt as Date).toISOString()
    }))
  };
};

export const actions: Actions = {
  markRead: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const notificationIdStr = (formData.get('notificationId') as string ?? '').trim();

    let notificationId: ObjectId;
    try { notificationId = new ObjectId(notificationIdStr); }
    catch { return fail(400, { error: 'Ungueltige ID.' }); }

    const db = await getDb();
    await db.collection('notifications').updateOne(
      { _id: notificationId, userId: new ObjectId(locals.user.id) },
      { $set: { isRead: true } }
    );

    return { success: true };
  },

  markAllRead: async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const db = await getDb();
    await db.collection('notifications').updateMany(
      { userId: new ObjectId(locals.user.id), isRead: false },
      { $set: { isRead: true } }
    );

    return { success: true };
  }
};
