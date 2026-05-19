import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) redirect(302, '/auth/login');

    const data = await request.formData();
    const eventName = (data.get('eventName') as string || '').trim();
    const eventLocation = (data.get('eventLocation') as string || '').trim();
    const startLocation = (data.get('startLocation') as string || '').trim();
    const departureDatetime = data.get('departureTime') as string || '';
    const arrivalDatetime = data.get('estimatedArrivalTime') as string || '';
    const seatsRaw = parseInt(data.get('seats') as string || '0');
    const priceRaw = parseFloat(data.get('pricePerPerson') as string || '0');

    if (!eventName || !eventLocation || !startLocation || !departureDatetime || !arrivalDatetime) {
      return fail(400, { error: 'Alle Pflichtfelder müssen ausgefüllt sein.' });
    }

    const departureTime = new Date(departureDatetime);
    const estimatedArrivalTime = new Date(arrivalDatetime);

    if (isNaN(departureTime.getTime()) || isNaN(estimatedArrivalTime.getTime())) {
      return fail(400, { error: 'Ungültige Zeitangaben.' });
    }

    if (departureTime.getTime() - Date.now() < 60 * 60 * 1000) {
      return fail(400, { error: 'Die Abfahrtszeit muss mindestens 1 Stunde in der Zukunft liegen.' });
    }

    if (seatsRaw < 1 || seatsRaw > 8) {
      return fail(400, { error: 'Bitte 1 bis 8 Sitzplätze angeben.' });
    }

    if (priceRaw < 1 || priceRaw > 200) {
      return fail(400, { error: 'Der Preis muss zwischen CHF 1 und CHF 200 liegen.' });
    }

    const db = await getDb();
    const result = await db.collection('rides').insertOne({
      driverId: new ObjectId(locals.user.id),
      driverName: `${locals.user.firstName} ${locals.user.lastName}`,
      driverPhoto: locals.user.profilePicture,
      eventName,
      eventLocation,
      startLocation,
      departureTime,
      estimatedArrivalTime,
      seats: seatsRaw,
      seatsAvailable: seatsRaw,
      pricePerPerson: priceRaw,
      fairplayWindowMinutes: 10,
      status: 'active',
      createdAt: new Date()
    });

    redirect(302, `/rides/${result.insertedId}/publish-success`);
  }
};
