import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/db';
import { ObjectId } from 'mongodb';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const db = await connectDB();
	try {
		const ride = await db.collection('rides').findOne({ _id: new ObjectId(params.id) });
		if (!ride) return json({ error: 'Fahrt nicht gefunden' }, { status: 404 });
		return json({ ...ride, _id: ride._id.toString() });
	} catch {
		return json({ error: 'Ungültige ID' }, { status: 400 });
	}
};
