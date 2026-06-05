<script lang="ts">
  import { page } from '$app/state';

  let { children } = $props();

  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/users', label: 'Nutzer' },
    { href: '/admin/rides', label: 'Fahrten' },
    { href: '/admin/bookings', label: 'Buchungen' }
  ];

  function isActive(href: string) {
    return href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(href);
  }
</script>

<!-- Admin-Topbar ─────────────────────────────────────────────── -->
<div class="bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
  <div class="flex items-center gap-3">
    <span class="text-xs font-bold bg-rose-600 px-2 py-0.5 rounded">ADMIN</span>
    <nav class="flex gap-4">
      {#each navLinks as link}
        <a
          href={link.href}
          class="text-xs font-semibold transition-colors {isActive(link.href) ? 'text-white' : 'text-gray-400 hover:text-gray-200'}"
        >
          {link.label}
        </a>
      {/each}
    </nav>
  </div>
  <a href="/" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">← App</a>
</div>

{@render children()}
