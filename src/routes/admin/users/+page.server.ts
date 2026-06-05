import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '$lib/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const db = await getDb();
  const filter = url.searchParams.get('filter') ?? 'all';

  const query: Record<string, unknown> = {};
  if (filter === 'disabled') query.isDisabled = true;
  if (filter === 'admin')    query.role = 'admin';

  const users = await db
    .collection('users')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return {
    users: users.map(u => ({
      _id: u._id.toString(),
      firstName: u.firstName as string,
      lastName: u.lastName as string,
      email: u.email as string,
      role: (u.role as string) ?? 'user',
      isDisabled: (u.isDisabled as boolean) ?? false,
      disabledReason: u.disabledReason as string | undefined,
      totalRatings: (u.totalRatings as number) ?? 0,
      rating: (u.rating as number) ?? 0,
      createdAt: (u.createdAt as Date).toISOString()
    })),
    filter
  };
};

export const actions: Actions = {
  // Nutzer sperren (soft disable)
  disable: async ({ request, locals }) => {
    requireAdmin(locals.user);

    const formData = await request.formData();
    const userId = (formData.get('userId') as string ?? '').trim();
    const reason = (formData.get('reason') as string ?? '').trim() || 'Kein Grund angegeben';

    let targetId: ObjectId;
    try { targetId = new ObjectId(userId); }
    catch { return fail(400, { error: 'Ungueltige User-ID.' }); }

    // Admin kann sich selbst nicht sperren
    if (targetId.toString() === locals.user!.id) {
      return fail(400, { error: 'Du kannst dein eigenes Konto nicht sperren.' });
    }

    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: targetId },
      {
        $set: {
          isDisabled: true,
          disabledAt: new Date(),
          disabledBy: new ObjectId(locals.user!.id),
          disabledReason: reason
        }
      }
    );

    return { success: true, action: 'disabled' };
  },

  // Nutzer entsperren
  enable: async ({ request, locals }) => {
    requireAdmin(locals.user);

    const formData = await request.formData();
    const userId = (formData.get('userId') as string ?? '').trim();

    let targetId: ObjectId;
    try { targetId = new ObjectId(userId); }
    catch { return fail(400, { error: 'Ungueltige User-ID.' }); }

    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: targetId },
      { $set: { isDisabled: false }, $unset: { disabledAt: '', disabledBy: '', disabledReason: '' } }
    );

    return { success: true, action: 'enabled' };
  },

  // Nutzer zum Admin machen
  makeAdmin: async ({ request, locals }) => {
    requireAdmin(locals.user);

    const formData = await request.formData();
    const userId = (formData.get('userId') as string ?? '').trim();

    let targetId: ObjectId;
    try { targetId = new ObjectId(userId); }
    catch { return fail(400, { error: 'Ungueltige User-ID.' }); }

    const db = await getDb();
    await db.collection('users').updateOne({ _id: targetId }, { $set: { role: 'admin' } });

    return { success: true, action: 'made_admin' };
  },

  // Admin-Rechte entfernen
  removeAdmin: async ({ request, locals }) => {
    requireAdmin(locals.user);

    const formData = await request.formData();
    const userId = (formData.get('userId') as string ?? '').trim();

    let targetId: ObjectId;
    try { targetId = new ObjectId(userId); }
    catch { return fail(400, { error: 'Ungueltige User-ID.' }); }

    // Letzter Admin darf nicht degradiert werden
    const db = await getDb();
    const adminCount = await db.collection('users').countDocuments({ role: 'admin', isDisabled: { $ne: true } });
    if (adminCount <= 1) {
      return fail(400, { error: 'Es muss mindestens ein Admin verbleiben.' });
    }

    await db.collection('users').updateOne({ _id: targetId }, { $set: { role: 'user' } });

    return { success: true, action: 'removed_admin' };
  }
};
