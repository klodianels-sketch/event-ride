import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { DEFAULT_NOTIFICATION_SETTINGS } from '$lib/types';

const ALL_INTERESTS = [
  'Musik', 'Festival', 'Nightlife', 'Sport', 'Wandern', 'Ski',
  'Kultur', 'Film', 'Food', 'Reisen', 'Natur', 'Tanz'
];

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(locals.user.id) });
  if (!user) throw redirect(302, '/auth/login');

  return {
    profile: {
      firstName: user.firstName as string,
      lastName: user.lastName as string,
      email: user.email as string,
      avatarUrl: (user.avatarUrl ?? user.profilePicture) as string | undefined,
      bio: user.bio as string | undefined,
      region: user.region as string | undefined,
      phone: user.phone as string | undefined,
      interests: (user.interests as string[] | undefined) ?? [],
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(user.notificationSettings as object | undefined ?? {})
      }
    },
    allInterests: ALL_INTERESTS
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const fd = await request.formData();
    const firstName = (fd.get('firstName') as string ?? '').trim();
    const lastName  = (fd.get('lastName')  as string ?? '').trim();
    const bio       = (fd.get('bio')       as string ?? '').trim();
    const region    = (fd.get('region')    as string ?? '').trim();
    const phone     = (fd.get('phone')     as string ?? '').trim();
    const avatarUrl = (fd.get('avatarUrl') as string ?? '').trim();
    const interests = fd.getAll('interests').map(i => String(i).trim()).filter(Boolean);

    if (!firstName || !lastName) {
      return fail(400, { error: 'Vor- und Nachname sind Pflicht.' });
    }

    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: new ObjectId(locals.user.id) },
      {
        $set: {
          firstName, lastName,
          bio: bio || undefined,
          region: region || undefined,
          phone: phone || undefined,
          avatarUrl: avatarUrl || undefined,
          interests,
          updatedAt: new Date()
        }
      }
    );

    return { success: true, action: 'profile_updated' };
  },

  updateNotifications: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const fd = await request.formData();

    const notificationSettings = {
      newBookingRequest:   fd.get('newBookingRequest')   === 'on',
      bookingStatusChange: fd.get('bookingStatusChange') === 'on',
      newMessage:          fd.get('newMessage')          === 'on',
      rideUpdates:         fd.get('rideUpdates')         === 'on',
    };

    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: new ObjectId(locals.user.id) },
      { $set: { notificationSettings, updatedAt: new Date() } }
    );

    return { success: true, action: 'notifications_updated' };
  }
};
