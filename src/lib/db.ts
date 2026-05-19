import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

export async function getDb() {
  const c = await getClient();
  return c.db('event-ride');
}
