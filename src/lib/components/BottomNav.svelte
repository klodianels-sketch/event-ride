<script lang="ts">
  import { page } from '$app/state';

  const tabs = [
    { href: '/', icon: 'home', label: 'Home' },
    { href: '/search', icon: 'search', label: 'Suche' },
    { href: '/rides/new', icon: 'plus', label: 'Anbieten' },
    { href: '/my/notifications', icon: 'bell', label: 'Benachrichtigungen' },
    { href: '/my/profile', icon: 'user', label: 'Profil' }
  ];

  function isActive(href: string) {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }
</script>

<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50">
  {#each tabs as tab}
    <a href={tab.href} class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors {isActive(tab.href) ? 'text-rose-600' : 'text-gray-400'}">
      {#if tab.icon === 'home'}
        <svg class="w-6 h-6" fill={isActive(tab.href) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"/>
        </svg>
      {:else if tab.icon === 'search'}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
        </svg>
      {:else if tab.icon === 'plus'}
        <div class="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center -mt-5 shadow-lg">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
          </svg>
        </div>
      {:else if tab.icon === 'bell'}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-5-5.917V4a1 1 0 1 0-2 0v1.083A6 6 0 0 0 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
        </svg>
      {:else if tab.icon === 'user'}
        <svg class="w-6 h-6" fill={isActive(tab.href) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      {/if}
      {#if tab.icon !== 'plus'}
        <span class="text-[10px] font-medium">{tab.label}</span>
      {/if}
    </a>
  {/each}
</nav>
