import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/auth';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const token = cookies.get('sessionToken');
    if (token) {
      await deleteSession(token);
      cookies.delete('sessionToken', { path: '/' });
    }
    redirect(302, '/auth/login');
  }
};
