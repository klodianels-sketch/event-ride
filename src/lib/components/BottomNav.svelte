<script lang="ts">
  import { page } from '$app/state';

  let { unreadCount = 0, unreadMessages = 0, pendingRequests = 0 } = $props<{
    unreadCount?: number;
    unreadMessages?: number;
    pendingRequests?: number;
  }>();

  function isActive(href: string) {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }

  // Kombinierter Badge fuer Inbox: offene Anfragen + ungelesene Notifs + ungelesene Nachrichten
  const inboxBadge = $derived(Math.min(pendingRequests + unreadCount + unreadMessages, 99));
  const notifBadge = $derived(Math.min(unreadCount, 9));
</script>

<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex items-center justify-around px-1 py-1.5 z-50">

  <!-- Home -->
  <a href="/" class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors {isActive('/') ? 'text-rose-600' : 'text-gray-400'}">
    <svg class="w-6 h-6" fill={isActive('/') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
      <path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"/>
    </svg>
    <span class="text-[10px] font-medium">Home</span>
  </a>

  <!-- Suche -->
  <a href="/search" class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors {isActive('/search') ? 'text-rose-600' : 'text-gray-400'}">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
      <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
    </svg>
    <span class="text-[10px] font-medium">Suche</span>
  </a>

  <!-- Anbieten FAB -->
  <a href="/rides/new" class="flex flex-col items-center -mt-3">
    <div class="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-200">
      <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
      </svg>
    </div>
  </a>

  <!-- Inbox -->
  <a href="/inbox" class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors {isActive('/inbox') ? 'text-rose-600' : 'text-gray-400'}">
    <div class="relative">
      <svg class="w-6 h-6" fill={isActive('/inbox') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      {#if inboxBadge > 0}
        <span class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
          {inboxBadge > 9 ? '9+' : inboxBadge}
        </span>
      {/if}
    </div>
    <span class="text-[10px] font-medium">Inbox</span>
  </a>

  <!-- Profil -->
  <a href="/my/profile" class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors {isActive('/my/profile') ? 'text-rose-600' : 'text-gray-400'}">
    <div class="relative">
      <svg class="w-6 h-6" fill={isActive('/my/profile') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      {#if notifBadge > 0}
        <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white"></span>
      {/if}
    </div>
    <span class="text-[10px] font-medium">Profil</span>
  </a>

</nav>
