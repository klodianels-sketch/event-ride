import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// Chats-Liste ist jetzt Teil der zentralen Inbox
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');
  throw redirect(302, '/inbox?tab=chats');
};
