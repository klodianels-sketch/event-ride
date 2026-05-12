import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/db';
import { ObjectId } from 'mongodb';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params }) => {
	const db = await connectDB();
	try {
		const ride = await db.collection('rides').findOne({ _id: new ObjectId(params.id) });
		if (!ride) return json({ error: 'Fahrt nicht gefunden' }, { status: 404 });
		if (ride.seatsAvailable <= 0) {
			return json({ error: 'Keine freien Plätze mehr verfügbar' }, { status: 400 });
		}

		await db
			.collection('rides')
			.updateOne({ _id: new ObjectId(params.id) }, { $inc: { seatsAvailable: -1 } });

		return json({ success: true, message: 'Platz erfolgreich reserviert' });
	} catch {
		return json({ error: 'Ungültige ID' }, { status: 400 });
	}
};
