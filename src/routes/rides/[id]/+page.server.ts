import { error, redirect } from '@sveltejs/kit';
import { connectDB } from '$lib/db';
import { ObjectId } from 'mongodb';
import type { Ride } from '$lib/types';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const db = await connectDB();
	try {
		const raw = await db.collection('rides').findOne({ _id: new ObjectId(params.id) });
		if (!raw) error(404, 'Fahrt nicht gefunden');
		const ride: Ride = { ...(raw as unknown as Ride), _id: raw._id.toString() };
		return { ride };
	} catch {
		error(404, 'Fahrt nicht gefunden');
	}
};

export const actions: Actions = {
	book: async ({ params }) => {
		const db = await connectDB();
		try {
			const ride = await db.collection('rides').findOne({ _id: new ObjectId(params.id) });
			if (!ride) error(404, 'Fahrt nicht gefunden');
			if (ride.seatsAvailable <= 0) {
				error(400, 'Keine freien Plätze mehr verfügbar');
			}

			await db
				.collection('rides')
				.updateOne({ _id: new ObjectId(params.id) }, { $inc: { seatsAvailable: -1 } });

			redirect(303, `/rides/${params.id}/success`);
		} catch (e) {
			// Redirect-Fehler durchlassen
			throw e;
		}
	}
};
