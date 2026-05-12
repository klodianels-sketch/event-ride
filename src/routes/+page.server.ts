import { connectDB } from '$lib/db';
import type { Ride } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = await connectDB();
	const raw = await db.collection('rides').find({}).sort({ createdAt: -1 }).toArray();
	const rides: Ride[] = raw.map((r) => ({ ...(r as unknown as Ride), _id: r._id.toString() }));
	return { rides };
};
