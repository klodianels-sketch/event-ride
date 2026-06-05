import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { createNotification } from '$lib/notifications.server';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();
  const userId = new ObjectId(locals.user.id);

  let convId: ObjectId;
  try { convId = new ObjectId(params.id); }
  catch { throw error(404, 'Unterhaltung nicht gefunden'); }

  const conv = await db.collection('conversations').findOne({
    _id: convId,
    participantIds: userId
  });
  if (!conv) throw error(404, 'Unterhaltung nicht gefunden oder kein Zugriff');

  // Alle Teilnehmer-Infos laden
  const participants = await db
    .collection('users')
    .find({ _id: { $in: conv.participantIds as ObjectId[] } })
    .project({ firstName: 1, lastName: 1, avatarUrl: 1, profilePicture: 1 })
    .toArray();

  const otherUser = participants.find(p => p._id.toString() !== locals.user!.id);

  // Ride-Infos falls vorhanden
  const ride = conv.rideId
    ? await db.collection('rides').findOne(
        { _id: conv.rideId as ObjectId },
        { projection: { eventName: 1, eventCategory: 1, departureTime: 1, _id: 1 } }
      )
    : null;

  // Nachrichten laden
  const messages = await db
    .collection('messages')
    .find({ conversationId: convId })
    .sort({ createdAt: 1 })
    .limit(100)
    .toArray();

  // Als gelesen markieren
  await db.collection('messages').updateMany(
    { conversationId: convId, senderId: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  return {
    conversation: {
      _id: convId.toString(),
      rideId: conv.rideId?.toString(),
      eventName: (ride?.eventName as string | undefined) ?? undefined,
      eventCategory: (ride?.eventCategory as string | undefined) ?? undefined,
      departureTime: ride?.departureTime ? (ride.departureTime as Date).toISOString() : undefined
    },
    otherUser: otherUser ? {
      _id: otherUser._id.toString(),
      name: `${otherUser.firstName} ${otherUser.lastName}`,
      avatarUrl: (otherUser.avatarUrl ?? otherUser.profilePicture) as string | undefined
    } : null,
    messages: messages.map(m => ({
      _id: m._id.toString(),
      senderId: m.senderId.toString(),
      text: m.text as string,
      isMe: m.senderId.toString() === locals.user!.id,
      createdAt: (m.createdAt as Date).toISOString()
    })),
    myId: locals.user.id
  };
};

export const actions: Actions = {
  send: async ({ request, params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const fd = await request.formData();
    const text = (fd.get('text') as string ?? '').trim();
    if (!text || text.length > 1000) {
      return fail(400, { error: 'Nachricht zu lang oder leer.' });
    }

    const db = await getDb();
    const userId = new ObjectId(locals.user.id);

    let convId: ObjectId;
    try { convId = new ObjectId(params.id); }
    catch { return fail(400, { error: 'Ungueltige Konversation.' }); }

    const conv = await db.collection('conversations').findOne({
      _id: convId,
      participantIds: userId
    });
    if (!conv) return fail(403, { error: 'Kein Zugriff.' });

    const now = new Date();

    await db.collection('messages').insertOne({
      conversationId: convId,
      senderId: userId,
      text,
      readBy: [userId],
      createdAt: now
    });

    await db.collection('conversations').updateOne(
      { _id: convId },
      {
        $set: {
          lastMessageAt: now,
          lastMessageText: text.length > 60 ? text.slice(0, 60) + '…' : text,
          lastMessageSenderId: userId,
          updatedAt: now
        }
      }
    );

    // Notification an anderen Teilnehmer
    const recipientId = (conv.participantIds as ObjectId[]).find(p => p.toString() !== locals.user!.id);
    if (recipientId) {
      const senderName = `${locals.user.firstName} ${locals.user.lastName}`;
      await createNotification(db, {
        userId: recipientId,
        type: 'new_message',
        title: `Neue Nachricht von ${senderName}`,
        message: text.length > 80 ? text.slice(0, 80) + '…' : text,
        conversationId: convId
      });
    }

    return { success: true };
  }
};
