import type { Db, ObjectId } from 'mongodb';
import type { NotificationType } from '$lib/types';

interface NotificationInput {
  userId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  rideId?: ObjectId;
  bookingId?: ObjectId;
  conversationId?: ObjectId;
}

export async function createNotification(
  db: Db,
  input: NotificationInput
): Promise<void> {
  await db.collection('notifications').insertOne({
    ...input,
    isRead: false,
    createdAt: new Date()
  });
}

export async function createNotifications(
  db: Db,
  inputs: NotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  await db.collection('notifications').insertMany(
    inputs.map(n => ({ ...n, isRead: false, createdAt: new Date() }))
  );
}
