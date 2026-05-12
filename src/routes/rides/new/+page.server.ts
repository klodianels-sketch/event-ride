import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { connectDB } from '$lib/db';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const fields = {
			eventName: formData.get('eventName') as string,
			startLocation: formData.get('startLocation') as string,
			departureTime: formData.get('departureTime') as string,
			pickupTime: formData.get('pickupTime') as string,
			arrivalTime: formData.get('arrivalTime') as string,
			seats: formData.get('seats') as string,
			pricePerPerson: formData.get('pricePerPerson') as string,
			driverName: formData.get('driverName') as string
		};

		// Pflichtfelder prüfen
		for (const [key, value] of Object.entries(fields)) {
			if (!value || value.trim() === '') {
				return fail(400, { error: `Bitte fülle alle Pflichtfelder aus.`, fields });
			}
		}

		const seats = Number(fields.seats);
		const price = Number(fields.pricePerPerson);

		if (isNaN(seats) || seats < 1 || seats > 8) {
			return fail(400, { error: 'Anzahl Sitzplätze muss zwischen 1 und 8 liegen.', fields });
		}
		if (isNaN(price) || price < 0) {
			return fail(400, { error: 'Preis muss eine positive Zahl sein.', fields });
		}

		try {
			const db = await connectDB();
			const result = await db.collection('rides').insertOne({
				eventName: fields.eventName.trim(),
				startLocation: fields.startLocation.trim(),
				departureTime: fields.departureTime.trim(),
				pickupTime: fields.pickupTime.trim(),
				arrivalTime: fields.arrivalTime.trim(),
				seats,
				seatsAvailable: seats,
				pricePerPerson: price,
				driverName: fields.driverName.trim(),
				createdAt: new Date()
			});

			redirect(303, `/?created=${result.insertedId.toString()}`);
		} catch (err) {
			if (isRedirect(err)) throw err;
			console.error('[rides/new] DB insert failed:', err);
			return fail(500, { error: 'Datenbankfehler. Bitte versuche es erneut.', fields });
		}
	}
};
