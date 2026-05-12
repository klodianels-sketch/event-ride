import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

const client = new MongoClient(MONGODB_URI);
let connected = false;

export async function connectDB() {
	if (!connected) {
		await client.connect();
		connected = true;
	}
	return client.db('event-ride');
}
