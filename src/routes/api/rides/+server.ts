import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = await connectDB();
	const rides = await db.collection('rides').find({}).sort({ createdAt: -1 }).toArray();
	return json(rides.map((r) => ({ ...r, _id: r._id.toString() })));
};

export const POST: RequestHandler = async ({ request }) => {
	const db = await connectDB();
	const data = await request.json();

	const required = [
		'eventName',
		'startLocation',
		'departureTime',
		'pickupTime',
		'arrivalTime',
		'seats',
		'pricePerPerson',
		'driverName'
	];

	for (const field of required) {
		if (!data[field] && data[field] !== 0) {
			return json({ error: `Feld "${field}" ist erforderlich` }, { status: 400 });
		}
	}

	const ride = {
		eventName: data.eventName,
		startLocation: data.startLocation,
		departureTime: data.departureTime,
		pickupTime: data.pickupTime,
		arrivalTime: data.arrivalTime,
		seats: Number(data.seats),
		seatsAvailable: Number(data.seats),
		pricePerPerson: Number(data.pricePerPerson),
		driverName: data.driverName,
		createdAt: new Date()
	};

	const result = await db.collection('rides').insertOne(ride);
	return json({ _id: result.insertedId.toString(), ...ride }, { status: 201 });
};
