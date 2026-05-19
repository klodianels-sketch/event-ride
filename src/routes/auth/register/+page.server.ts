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
    const firstName = (data.get('firstName') as string || '').trim();
    const lastName = (data.get('lastName') as string || '').trim();
    const email = (data.get('email') as string || '').trim().toLowerCase();
    const password = data.get('password') as string || '';

    if (!firstName || !lastName || !email || !password) {
      return fail(400, { error: 'Alle Pflichtfelder müssen ausgefüllt sein.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, { error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
    }
    if (password.length < 8) {
      return fail(400, { error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
    }

    const db = await getDb();
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return fail(400, { error: 'Diese E-Mail-Adresse ist bereits registriert.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.collection('users').insertOne({
      firstName,
      lastName,
      email,
      passwordHash,
      rating: 0,
      totalRatings: 0,
      createdAt: new Date()
    });

    const token = await createSession(result.insertedId);
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
