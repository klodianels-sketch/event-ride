<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatDate, formatTime } from '$lib/time';

  let { data } = $props();

  const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; href?: string }> = {
    booking_received:           { icon: '📬', color: 'text-blue-600',  bg: 'bg-blue-50' },
    booking_accepted:           { icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
    booking_rejected:           { icon: '❌', color: 'text-red-500',   bg: 'bg-red-50' },
    booking_cancelled_passenger:{ icon: '↩️', color: 'text-amber-600', bg: 'bg-amber-50' },
    ride_cancelled:             { icon: '🚫', color: 'text-red-600',   bg: 'bg-red-50' },
    times_updated:              { icon: '🕐', color: 'text-rose-600',  bg: 'bg-rose-50' },
    rating_pending:             { icon: '⭐', color: 'text-amber-500', bg: 'bg-amber-50' },
    new_message:                { icon: '💬', color: 'text-violet-600', bg: 'bg-violet-50', href: '/my/chats' }
  };

  const DEFAULT_CONFIG = { icon: '🔔', color: 'text-gray-500', bg: 'bg-gray-50' };

  function cfg(type: string) {
    return TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
  }

  function relativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} Std`;
    return formatDate(isoStr);
  }

  const unreadCount = $derived(data.notifications.filter(n => !n.isRead).length);
</script>

<svelte:head>
  <title>Benachrichtigungen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">

  <!-- Header ─────────────────────────────────────────────── -->
  <div class="flex items-center justify-between mb-5">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Benachrichtigungen</h1>
      {#if unreadCount > 0}
        <p class="text-xs text-rose-600 font-semibold mt-0.5">{unreadCount} ungelesen</p>
      {/if}
    </div>
    {#if unreadCount > 0}
      <form method="POST" action="?/markAllRead" use:enhance>
        <button
          type="submit"
          class="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
        >
          Alle gelesen
        </button>
      </form>
    {/if}
  </div>

  {#if data.notifications.length === 0}
    <!-- Empty State ─────────────────────────────────────── -->
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-5">
        <svg class="w-10 h-10 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
        </svg>
      </div>
      <p class="font-bold text-gray-900 text-lg mb-2">Alles ruhig hier</p>
      <p class="text-gray-400 text-sm leading-relaxed max-w-[260px]">
        Hier erscheinen Benachrichtigungen über deine Buchungen und Fahrten.
      </p>
      <div class="mt-6 flex flex-col gap-3 w-full">
        <a href="/" class="w-full bg-rose-600 text-white py-3.5 rounded-2xl font-bold text-sm text-center">
          Fahrten entdecken
        </a>
        <a href="/my/bookings" class="w-full border border-gray-200 text-gray-700 py-3.5 rounded-2xl font-semibold text-sm text-center">
          Meine Buchungen
        </a>
      </div>
    </div>

  {:else}
    <!-- Notification List ──────────────────────────────── -->
    <div class="flex flex-col gap-2.5">
      {#each data.notifications as n}
        {@const c = cfg(n.type)}
        <div class="bg-white rounded-2xl border {n.isRead ? 'border-gray-100' : 'border-rose-100'} p-4 flex items-start gap-3 {n.isRead ? '' : 'shadow-sm'}">

          <!-- Icon ──────────────────────────────────────── -->
          <div class="w-9 h-9 rounded-full {c.bg} flex items-center justify-center shrink-0 text-base">
            {c.icon}
          </div>

          <!-- Content ───────────────────────────────────── -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
              <span class="text-[10px] text-gray-400 shrink-0 mt-0.5">{relativeTime(n.createdAt)}</span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>

            <!-- Action Links ───────────────────────────── -->
            <div class="flex items-center gap-3 mt-2">
              {#if n.rideId && (n.type === 'booking_accepted' || n.type === 'times_updated')}
                <a
                  href="/my/bookings"
                  class="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Buchung ansehen
                </a>
              {:else if n.type === 'booking_received'}
                <a
                  href="/my/rides"
                  class="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Anfrage prüfen
                </a>
              {:else if n.type === 'ride_cancelled' || n.type === 'booking_rejected'}
                <a
                  href="/"
                  class="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Neue Fahrt finden
                </a>
              {:else if n.type === 'rating_pending' && n.rideId && n.bookingId}
                <a
                  href="/rides/{n.rideId}/rate?bookingId={n.bookingId}"
                  class="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Jetzt bewerten
                </a>
              {/if}

              {#if !n.isRead}
                <form method="POST" action="?/markRead" use:enhance>
                  <input type="hidden" name="notificationId" value={n._id} />
                  <button type="submit" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Als gelesen markieren
                  </button>
                </form>
              {/if}
            </div>
          </div>

          <!-- Unread Indicator ──────────────────────────── -->
          {#if !n.isRead}
            <div class="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5"></div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

</div>
