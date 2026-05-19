import type { Handle } from '@sveltejs/kit';
import { getSessionUser } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('sessionToken');
  event.locals.user = null;
  if (token) {
    event.locals.user = await getSessionUser(token);
  }
  return resolve(event);
};
