import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/auth';

// Alle /admin/* Routen sind durch diesen Guard geschuetzt.
// requireAdmin wirft 403, wenn der Nutzer kein Admin ist.
export const load: LayoutServerLoad = ({ locals }) => {
  requireAdmin(locals.user);
  return {};
};
