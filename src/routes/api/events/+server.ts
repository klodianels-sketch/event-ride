import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';

// Event-Namen-Vorschläge für das Autosuggest beim Erstellen einer Fahrt
// Sucht in der rides-Collection nach passenden Event-Namen (case-insensitive)
export const GET: RequestHandler = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return json({ suggestions: [] });
  }

  const db = await getDb();

  // Distinct event names matching the query, sorted by frequency
  const pipeline = [
    {
      $match: {
        eventName: { $regex: q, $options: 'i' }
      }
    },
    {
      $group: {
        _id: '$eventName',
        count: { $sum: 1 },
        category: { $first: '$eventCategory' },
        location: { $first: '$eventLocation' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ];

  const results = await db.collection('rides').aggregate(pipeline).toArray();

  return json({
    suggestions: results.map(r => ({
      name: r._id as string,
      category: r.category as string | undefined,
      location: r.location as string | undefined,
      count: r.count as number
    }))
  });
};
