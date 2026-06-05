<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/time';
  import { CATEGORY_EMOJI } from '$lib/images';
  import type { EventCategory } from '$lib/types';

  let { data, form } = $props();

  // Tab wird aus URL-Param gelesen (server gibt data.tab zurueck)
  const activeTab = $derived(data.tab ?? 'requests');

  function setTab(tab: string) {
    goto(`?tab=${tab}`, { replaceState: true, noScroll: true });
  }

  // Optimistisches State fuer Request-Aktionen
  let processing = $state<string | null>(null);

  // Status-Styling
  const STATUS_COLOR: Record<string, string> = {
    pending:              'bg-amber-100 text-amber-700',
    accepted:             'bg-green-100 text-green-700',
    confirmed:            'bg-green-100 text-green-700',
    rejected:             'bg-red-100 text-red-600',
    cancelled_by_passenger: 'bg-gray-100 text-gray-500',
    cancelled_by_driver:  'bg-orange-100 text-orange-700',
    cancelled:            'bg-gray-100 text-gray-500',
    'no-show':            'bg-red-100 text-red-700',
    completed:            'bg-blue-100 text-blue-700'
  };

  const STATUS_ICON: Record<string, string> = {
    pending:   '⏳',
    accepted:  '✅',
    confirmed: '✅',
    rejected:  '❌',
    cancelled_by_passenger: '🚫',
    cancelled_by_driver:    '🚫',
    cancelled:              '🚫',
    'no-show': '👻',
    completed: '🏁'
  };

  // Notification-Typen
  const NOTIF_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
    booking_requested:    { icon: '🙋', color: 'text-blue-700',   bg: 'bg-blue-50' },
    booking_accepted:     { icon: '✅', color: 'text-green-700',  bg: 'bg-green-50' },
    booking_rejected:     { icon: '❌', color: 'text-red-600',    bg: 'bg-red-50' },
    booking_cancelled_passenger: { icon: '🚫', color: 'text-orange-700', bg: 'bg-orange-50' },
    ride_cancelled:       { icon: '🚗', color: 'text-red-700',    bg: 'bg-red-50' },
    times_updated:        { icon: '🕐', color: 'text-blue-600',   bg: 'bg-blue-50' },
    new_message:          { icon: '💬', color: 'text-violet-600', bg: 'bg-violet-50' },
    rating_received:      { icon: '⭐', color: 'text-amber-600',  bg: 'bg-amber-50' }
  };

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Gerade eben';
    if (m < 60) return `vor ${m} Min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `vor ${h} Std`;
    const d = Math.floor(h / 24);
    return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // Tabs mit Badges
  const tabs = $derived([
    {
      id: 'requests',
      label: 'Anfragen',
      badge: data.counts.incoming
    },
    {
      id: 'notifications',
      label: 'Benachrichtigungen',
      badge: data.counts.unreadNotifications
    },
    {
      id: 'chats',
      label: 'Chats',
      badge: data.counts.unreadMessages
    }
  ]);
</script>

<svelte:head>
  <title>Inbox – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen">

  <!-- Header -->
  <div class="sticky top-0 z-30 bg-white border-b border-gray-100">
    <div class="px-4 pt-12 pb-0">
      <h1 class="text-2xl font-bold text-gray-900 mb-3">Inbox</h1>

      <!-- Tabs -->
      <div class="flex border-b border-gray-100 -mx-4 px-4 gap-0 overflow-x-auto">
        {#each tabs as tab}
          <button
            type="button"
            onclick={() => setTab(tab.id)}
            class="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0
              {activeTab === tab.id
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'}"
          >
            {tab.label}
            {#if tab.badge > 0}
              <span class="min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1
                {activeTab === tab.id ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-600'}">
                {Math.min(tab.badge, 9)}{tab.badge > 9 ? '+' : ''}
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 px-4 py-4 pb-24">

    <!-- ─── TAB: ANFRAGEN ─────────────────────────────────────── -->
    {#if activeTab === 'requests'}

      <!-- Globale Fehler / Erfolg -->
      {#if form?.error}
        <div class="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{form.error}</div>
      {/if}
      {#if form?.acceptSuccess}
        <div class="mb-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">Anfrage angenommen!</div>
      {/if}
      {#if form?.rejectSuccess}
        <div class="mb-3 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl px-4 py-3 text-sm">Anfrage abgelehnt.</div>
      {/if}

      <!-- Eingehende Anfragen (Fahrer-Sicht) -->
      {#if data.incomingRequests.length > 0}
        <div class="mb-5">
          <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            Eingehende Anfragen ({data.incomingRequests.length})
          </h2>
          <div class="flex flex-col gap-3">
            {#each data.incomingRequests as req}
              <div class="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <!-- Header -->
                <div class="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-100">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{CATEGORY_EMOJI[req.ride.eventCategory as EventCategory] ?? '✨'}</span>
                    <div>
                      <p class="text-xs text-amber-700 font-semibold">{req.ride.eventName}</p>
                      <p class="text-[10px] text-amber-600">{relativeTime(req.createdAt)}</p>
                    </div>
                  </div>
                  <span class="text-xs font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full">Offen</span>
                </div>

                <!-- Body -->
                <div class="px-4 py-3">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                      {initials(req.passengerName)}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-900 text-sm">{req.passengerName} moechte mitfahren</p>
                      <p class="text-xs text-gray-400 truncate">Abholort: {req.pickupLocation}</p>
                      <p class="text-xs font-semibold text-gray-700 mt-0.5">CHF {req.bookedPrice.toFixed(2)}</p>
                    </div>
                  </div>

                  <!-- Quick Actions -->
                  <div class="flex gap-2">
                    <form
                      method="POST"
                      action="?/accept"
                      use:enhance={() => {
                        processing = req.bookingId;
                        return ({ update }) => { processing = null; update(); };
                      }}
                      class="flex-1"
                    >
                      <input type="hidden" name="bookingId" value={req.bookingId} />
                      <button
                        type="submit"
                        disabled={processing === req.bookingId}
                        class="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {processing === req.bookingId ? '...' : '✓ Annehmen'}
                      </button>
                    </form>

                    <form
                      method="POST"
                      action="?/reject"
                      use:enhance={() => {
                        processing = req.bookingId;
                        return ({ update }) => { processing = null; update(); };
                      }}
                      class="flex-1"
                    >
                      <input type="hidden" name="bookingId" value={req.bookingId} />
                      <button
                        type="submit"
                        disabled={processing === req.bookingId}
                        class="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        ✕ Ablehnen
                      </button>
                    </form>

                    {#if req.conversationId}
                      <a
                        href="/my/chats/{req.conversationId}"
                        class="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 transition-colors shrink-0"
                        aria-label="Chat oeffnen"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                      </a>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Meine Anfragen (Mitfahrer-Sicht) -->
      <div>
        <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
          Meine Anfragen
        </h2>

        {#if data.myRequests.length === 0}
          <div class="text-center py-10">
            <div class="text-4xl mb-3">🎪</div>
            <p class="font-semibold text-gray-700">Noch keine Buchungsanfragen</p>
            <p class="text-sm text-gray-400 mt-1">Finde eine Fahrt und buche deine erste Mitfahrt.</p>
            <a href="/" class="inline-block mt-4 bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
              Fahrten entdecken
            </a>
          </div>
        {:else}
          <div class="flex flex-col gap-2">
            {#each data.myRequests as req}
              <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div class="px-4 py-3 flex items-center gap-3">
                  <span class="text-xl shrink-0">{STATUS_ICON[req.status] ?? '📋'}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-900 text-sm truncate">{req.eventName}</p>
                    <p class="text-xs text-gray-400">Fahrer: {req.driverName}</p>
                    <p class="text-[10px] text-gray-300 mt-0.5">{relativeTime(req.createdAt)}</p>
                  </div>
                  <div class="flex flex-col items-end gap-1.5 shrink-0">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {STATUS_COLOR[req.status] ?? 'bg-gray-100 text-gray-600'}">
                      {req.statusLabel}
                    </span>
                    {#if req.conversationId && (req.status === 'accepted' || req.status === 'pending' || req.status === 'confirmed')}
                      <a
                        href="/my/chats/{req.conversationId}"
                        class="text-[10px] font-semibold text-rose-500 hover:text-rose-600"
                      >
                        Chat →
                      </a>
                    {/if}
                    {#if req.status !== 'cancelled_by_passenger' && req.status !== 'cancelled_by_driver' && req.status !== 'cancelled'}
                      <a
                        href="/rides/{req.rideId}"
                        class="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Fahrt →
                      </a>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if data.incomingRequests.length === 0 && data.myRequests.length === 0}
        <div class="text-center py-16">
          <div class="text-5xl mb-3">📬</div>
          <p class="font-semibold text-gray-700">Keine Anfragen</p>
          <p class="text-sm text-gray-400 mt-1">Hier erscheinen Mitfahranfragen und deine Buchungsstatus.</p>
        </div>
      {/if}

    <!-- ─── TAB: BENACHRICHTIGUNGEN ──────────────────────────── -->
    {:else if activeTab === 'notifications'}

      {#if data.notifications.length === 0}
        <div class="text-center py-16">
          <div class="text-5xl mb-3">🔔</div>
          <p class="font-semibold text-gray-700">Keine Benachrichtigungen</p>
          <p class="text-sm text-gray-400 mt-1">Hier erscheinen alle wichtigen Updates.</p>
        </div>
      {:else}
        <!-- Mark all read button -->
        {#if data.counts.unreadNotifications > 0}
          <form method="POST" action="?/markAllRead" use:enhance class="mb-3">
            <button
              type="submit"
              class="w-full text-xs text-gray-500 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors font-medium"
            >
              Alle als gelesen markieren ({data.counts.unreadNotifications})
            </button>
          </form>
        {/if}

        <div class="flex flex-col gap-2">
          {#each data.notifications as notif}
            {@const config = NOTIF_CONFIG[notif.type] ?? { icon: '🔔', color: 'text-gray-700', bg: 'bg-gray-50' }}
            <div class="relative bg-white rounded-xl border overflow-hidden
              {notif.isRead ? 'border-gray-100' : 'border-blue-100'}">
              {#if !notif.isRead}
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-rose-400 rounded-l-xl"></div>
              {/if}
              <div class="px-4 py-3 flex items-start gap-3">
                <div class="w-9 h-9 rounded-full {config.bg} flex items-center justify-center text-base shrink-0">
                  {config.icon}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 text-sm leading-snug">{notif.title}</p>
                  <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p class="text-[10px] text-gray-300 mt-1">{relativeTime(notif.createdAt)}</p>

                  <!-- Aktionen -->
                  <div class="flex gap-3 mt-2">
                    {#if notif.conversationId}
                      <a href="/my/chats/{notif.conversationId}" class="text-xs font-semibold text-rose-500 hover:text-rose-600">
                        Chat oeffnen
                      </a>
                    {/if}
                    {#if notif.rideId}
                      <a href="/rides/{notif.rideId}" class="text-xs text-gray-400 hover:text-gray-600">
                        Fahrt ansehen
                      </a>
                    {/if}
                    {#if !notif.isRead}
                      <form method="POST" action="?/markRead" use:enhance class="ml-auto">
                        <input type="hidden" name="notificationId" value={notif._id} />
                        <button type="submit" class="text-xs text-gray-300 hover:text-gray-500">
                          Als gelesen markieren
                        </button>
                      </form>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    <!-- ─── TAB: CHATS ────────────────────────────────────────── -->
    {:else if activeTab === 'chats'}

      {#if data.conversations.length === 0}
        <div class="text-center py-16">
          <div class="text-5xl mb-3">💬</div>
          <p class="font-semibold text-gray-700">Noch keine Chats</p>
          <p class="text-sm text-gray-400 mt-1">Sobald du eine Mitfahrt buchst, kannst du mit dem Fahrer chatten.</p>
        </div>
      {:else}
        <div class="flex flex-col gap-2">
          {#each data.conversations as conv}
            <a
              href="/my/chats/{conv._id}"
              class="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 active:bg-gray-50 transition-colors
                {conv.unread > 0 ? 'border-rose-100' : 'border-gray-100'}"
            >
              <!-- Avatar -->
              {#if conv.otherUser?.avatarUrl}
                <img
                  src={conv.otherUser.avatarUrl}
                  alt={conv.otherUser.name}
                  class="w-11 h-11 rounded-full object-cover shrink-0 ring-2 {conv.unread > 0 ? 'ring-rose-200' : 'ring-gray-100'}"
                />
              {:else}
                <div class="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold shrink-0">
                  {conv.otherUser ? initials(conv.otherUser.name) : '?'}
                </div>
              {/if}

              <!-- Text -->
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="font-semibold text-gray-900 text-sm truncate">
                    {conv.otherUser?.name ?? 'Unbekannt'}
                  </p>
                  {#if conv.lastMessageAt}
                    <p class="text-[10px] text-gray-400 shrink-0">{relativeTime(conv.lastMessageAt)}</p>
                  {/if}
                </div>
                {#if conv.eventName}
                  <p class="text-[10px] text-gray-400 mb-0.5">{CATEGORY_EMOJI[conv.eventCategory as EventCategory] ?? '✨'} {conv.eventName}</p>
                {/if}
                <p class="text-xs text-gray-500 truncate">
                  {#if conv.lastMessageIsMe}Du: {/if}{conv.lastMessageText ?? 'Neue Unterhaltung'}
                </p>
              </div>

              <!-- Unread badge -->
              {#if conv.unread > 0}
                <span class="min-w-[20px] h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
                  {Math.min(conv.unread, 9)}{conv.unread > 9 ? '+' : ''}
                </span>
              {/if}
            </a>
          {/each}
        </div>
      {/if}

    {/if}

  </div>
</div>
