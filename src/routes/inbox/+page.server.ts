import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { acceptBooking, rejectBooking } from '$lib/booking-actions.server';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Ausstehend',
  accepted: 'Angenommen',
  confirmed: 'Bestaetigt',
  rejected: 'Abgelehnt',
  cancelled_by_passenger: 'Storniert',
  cancelled_by_driver: 'Vom Fahrer storniert',
  cancelled: 'Storniert',
  'no-show': 'No-Show',
  completed: 'Abgeschlossen'
};

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();
  const userId = new ObjectId(locals.user.id);
  const tab = url.searchParams.get('tab') ?? 'requests';

  // --- Step 1: IDs needed for enrichment ---
  const [myRides, myConvDocs] = await Promise.all([
    db.collection('rides')
      .find({ driverId: userId })
      .project({ _id: 1, eventName: 1, eventCategory: 1 })
      .toArray(),
    db.collection('conversations')
      .find({ participantIds: userId })
      .project({ _id: 1 })
      .toArray()
  ]);

  const myRideIds = myRides.map(r => r._id as ObjectId);
  const myConvIds = myConvDocs.map(c => c._id as ObjectId);
  const rideMap = Object.fromEntries(myRides.map(r => [r._id.toString(), r]));

  // --- Step 2: Main parallel fetch ---
  const [
    incomingBookings,
    passengerBookings,
    notifications,
    conversations
  ] = await Promise.all([
    myRideIds.length > 0
      ? db.collection('bookings')
          .find({ rideId: { $in: myRideIds }, status: 'pending' })
          .sort({ createdAt: 1 })
          .toArray()
      : Promise.resolve([]),
    db.collection('bookings')
      .find({ passengerId: userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray(),
    db.collection('notifications')
      .find({ userId })
      .sort({ isRead: 1, createdAt: -1 })
      .limit(50)
      .toArray(),
    db.collection('conversations')
      .find({ participantIds: userId })
      .sort({ updatedAt: -1 })
      .limit(30)
      .toArray()
  ]);

  // --- Step 3: Enrich passenger bookings with ride info ---
  const paxRideIds = [...new Set(passengerBookings.map(b => b.rideId.toString()))];
  const paxRides = paxRideIds.length > 0
    ? await db.collection('rides')
        .find({ _id: { $in: paxRideIds.map(id => new ObjectId(id)) } })
        .project({ eventName: 1, driverName: 1, eventCategory: 1 })
        .toArray()
    : [];
  const paxRideMap = Object.fromEntries(paxRides.map(r => [r._id.toString(), r]));

  // --- Step 4: Enrich conversations ---
  const otherUserIds = new Set<string>();
  const convRideIdSet = new Set<string>();
  for (const c of conversations) {
    for (const pid of c.participantIds as ObjectId[]) {
      if (pid.toString() !== locals.user.id) otherUserIds.add(pid.toString());
    }
    if (c.rideId) convRideIdSet.add((c.rideId as ObjectId).toString());
  }

  const [otherUsers, convRides, unreadAgg, unreadMsgTotal] = await Promise.all([
    otherUserIds.size > 0
      ? db.collection('users')
          .find({ _id: { $in: [...otherUserIds].map(id => new ObjectId(id)) } })
          .project({ firstName: 1, lastName: 1, avatarUrl: 1, profilePicture: 1 })
          .toArray()
      : Promise.resolve([]),
    convRideIdSet.size > 0
      ? db.collection('rides')
          .find({ _id: { $in: [...convRideIdSet].map(id => new ObjectId(id)) } })
          .project({ eventName: 1, eventCategory: 1 })
          .toArray()
      : Promise.resolve([]),
    conversations.length > 0
      ? db.collection('messages').aggregate([
          {
            $match: {
              conversationId: { $in: conversations.map(c => c._id as ObjectId) },
              senderId: { $ne: userId },
              readBy: { $ne: userId }
            }
          },
          { $group: { _id: '$conversationId', count: { $sum: 1 } } }
        ]).toArray()
      : Promise.resolve([]),
    myConvIds.length > 0
      ? db.collection('messages').countDocuments({
          conversationId: { $in: myConvIds },
          senderId: { $ne: userId },
          readBy: { $ne: userId }
        })
      : Promise.resolve(0)
  ]);

  const otherMap = Object.fromEntries(otherUsers.map(u => [u._id.toString(), u]));
  const convRideMap = Object.fromEntries(convRides.map(r => [r._id.toString(), r]));
  const unreadPerConv: Record<string, number> = {};
  for (const row of unreadAgg) unreadPerConv[row._id.toString()] = row.count;

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  return {
    tab,
    counts: {
      incoming: incomingBookings.length,
      unreadNotifications: unreadNotifCount,
      unreadMessages: unreadMsgTotal
    },

    incomingRequests: incomingBookings.map(b => {
      const ride = rideMap[b.rideId.toString()];
      return {
        bookingId: b._id.toString(),
        passengerName: b.passengerName as string,
        pickupLocation: b.pickupLocation as string,
        bookedPrice: b.bookedPrice as number,
        createdAt: (b.createdAt as Date).toISOString(),
        conversationId: b.conversationId?.toString() as string | undefined,
        ride: {
          _id: b.rideId.toString(),
          eventName: (ride?.eventName as string | undefined) ?? '—',
          eventCategory: (ride?.eventCategory as string | undefined) ?? 'other'
        }
      };
    }),

    myRequests: passengerBookings.map(b => {
      const ride = paxRideMap[b.rideId.toString()];
      return {
        bookingId: b._id.toString(),
        rideId: b.rideId.toString(),
        status: b.status as string,
        statusLabel: STATUS_LABEL[b.status as string] ?? (b.status as string),
        createdAt: (b.createdAt as Date).toISOString(),
        conversationId: b.conversationId?.toString() as string | undefined,
        eventName: (ride?.eventName as string | undefined) ?? '—',
        driverName: (ride?.driverName as string | undefined) ?? '—'
      };
    }),

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
    })),

    conversations: conversations.map(c => {
      const otherId = (c.participantIds as ObjectId[]).find(p => p.toString() !== locals.user!.id);
      const other = otherId ? otherMap[otherId.toString()] : null;
      const ride = c.rideId ? convRideMap[(c.rideId as ObjectId).toString()] : null;
      return {
        _id: c._id.toString(),
        eventName: (ride?.eventName as string | undefined) ?? undefined,
        eventCategory: (ride?.eventCategory as string | undefined) ?? undefined,
        otherUser: other
          ? {
              _id: otherId!.toString(),
              name: `${other.firstName as string} ${other.lastName as string}`,
              avatarUrl: ((other.avatarUrl ?? other.profilePicture) as string | undefined)
            }
          : null,
        lastMessageAt: (c.lastMessageAt as Date | undefined)?.toISOString(),
        lastMessageText: c.lastMessageText as string | undefined,
        lastMessageIsMe: (c.lastMessageSenderId as ObjectId | undefined)?.toString() === locals.user!.id,
        unread: unreadPerConv[c._id.toString()] ?? 0
      };
    })
  };
};

export const actions: Actions = {
  accept: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    let bookingId: ObjectId;
    try { bookingId = new ObjectId(bookingIdStr); }
    catch { return fail(400, { error: 'Ungueltige Buchungs-ID.' }); }

    const db = await getDb();
    const result = await acceptBooking(db, bookingId, new ObjectId(locals.user.id));
    if (!result.success) return fail(400, { error: result.error });

    return { acceptSuccess: true };
  },

  reject: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const bookingIdStr = (formData.get('bookingId') as string ?? '').trim();

    let bookingId: ObjectId;
    try { bookingId = new ObjectId(bookingIdStr); }
    catch { return fail(400, { error: 'Ungueltige Buchungs-ID.' }); }

    const db = await getDb();
    const result = await rejectBooking(db, bookingId, new ObjectId(locals.user.id));
    if (!result.success) return fail(400, { error: result.error });

    return { rejectSuccess: true };
  },

  markRead: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const formData = await request.formData();
    const notifIdStr = (formData.get('notificationId') as string ?? '').trim();

    let notifId: ObjectId;
    try { notifId = new ObjectId(notifIdStr); }
    catch { return fail(400, { error: 'Ungueltige ID.' }); }

    const db = await getDb();
    await db.collection('notifications').updateOne(
      { _id: notifId, userId: new ObjectId(locals.user.id) },
      { $set: { isRead: true } }
    );

    return { markReadSuccess: true };
  },

  markAllRead: async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const db = await getDb();
    await db.collection('notifications').updateMany(
      { userId: new ObjectId(locals.user.id), isRead: false },
      { $set: { isRead: true } }
    );

    return { markAllReadSuccess: true };
  }
};
