import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import type { SessionUser } from '$lib/types';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(userId: ObjectId): Promise<string> {
  const db = await getDb();
  const token = randomUUID();
  await db.collection('sessions').insertOne({
    userId,
    token,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
  });
  return token;
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const db = await getDb();
  const session = await db.collection('sessions').findOne({
    token,
    expiresAt: { $gt: new Date() }
  });
  if (!session) return null;

  const user = await db.collection('users').findOne({ _id: session.userId });
  if (!user) return null;

  return {
    id: user._id.toString(),
    firstName: user.firstName as string,
    lastName: user.lastName as string,
    email: user.email as string,
    profilePicture: user.profilePicture as string | undefined
  };
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await db.collection('sessions').deleteOne({ token });
}
