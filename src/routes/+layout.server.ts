import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) return { user: null, unreadCount: 0, unreadMessages: 0, pendingRequests: 0 };

  const db = await getDb();
  const userId = new ObjectId(locals.user.id);

  // Konversations-IDs fuer unread-message-Count
  const convIds = await db
    .collection('conversations')
    .find({ participantIds: userId })
    .map(c => c._id)
    .toArray();

  // Eigene Fahrt-IDs fuer pending-request-Count
  const myRideIds = await db
    .collection('rides')
    .find({ driverId: userId, status: 'active' })
    .map(r => r._id)
    .toArray();

  const [unreadCount, unreadMessages, pendingRequests] = await Promise.all([
    db.collection('notifications').countDocuments({ userId, isRead: false }),
    convIds.length > 0
      ? db.collection('messages').countDocuments({
          conversationId: { $in: convIds },
          senderId: { $ne: userId },
          readBy: { $ne: userId }
        })
      : Promise.resolve(0),
    myRideIds.length > 0
      ? db.collection('bookings').countDocuments({
          rideId: { $in: myRideIds },
          status: 'pending'
        })
      : Promise.resolve(0)
  ]);

  return { user: locals.user, unreadCount, unreadMessages, pendingRequests };
};
