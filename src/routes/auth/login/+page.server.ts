import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import bcrypt from 'bcrypt';
import { createSession } from '$lib/auth';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(302, '/');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = (data.get('email') as string || '').trim().toLowerCase();
    const password = data.get('password') as string || '';

    if (!email || !password) {
      return fail(400, { error: 'E-Mail und Passwort sind erforderlich.' });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return fail(400, { error: 'E-Mail oder Passwort ist falsch.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash as string);
    if (!valid) {
      return fail(400, { error: 'E-Mail oder Passwort ist falsch.' });
    }

    const token = await createSession(user._id);
    cookies.set('sessionToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    redirect(302, '/');
  }
};
