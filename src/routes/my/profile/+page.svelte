<script lang="ts">
  import { formatDate } from '$lib/time';
  import { enhance } from '$app/forms';

  let { data } = $props();

  function initials(first: string, last: string) {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  }

  function stars(avg: number | null): string {
    if (avg === null) return '';
    const full = Math.round(avg);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  const ROLE_LABEL: Record<string, string> = {
    passenger: 'Von Mitfahrer',
    driver: 'Von Fahrer'
  };

  const INTERESTS_EMOJI: Record<string, string> = {
    musik: '🎵', festival: '🎪', nightlife: '🌙', sport: '⚡',
    wandern: '🏔️', ski: '⛷️', kultur: '🎭', film: '🎬',
    food: '🍕', reisen: '✈️', natur: '🌿', tanz: '💃'
  };
</script>

<svelte:head>
  <title>Profil – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen pb-24">

  <!-- Hero-Header ──────────────────────────────────────────── -->
  <div class="bg-gradient-to-b from-rose-600 to-rose-500 px-4 pt-12 pb-6">
    <div class="flex items-start justify-between mb-4">
      <h1 class="text-white text-xl font-bold">Mein Profil</h1>
      <a
        href="/my/profile/settings"
        class="flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        Bearbeiten
      </a>
    </div>

    <!-- Avatar + Info ──────────────────────────────────────── -->
    <div class="flex items-center gap-4">
      {#if data.profile.avatarUrl}
        <img
          src={data.profile.avatarUrl}
          alt="{data.profile.firstName} {data.profile.lastName}"
          class="w-20 h-20 rounded-full object-cover ring-4 ring-white/30 shrink-0"
        />
      {:else}
        <div class="w-20 h-20 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center text-white font-bold text-2xl shrink-0">
          {initials(data.profile.firstName, data.profile.lastName)}
        </div>
      {/if}
      <div class="flex-1 min-w-0">
        <p class="text-white font-bold text-lg leading-tight">
          {data.profile.firstName} {data.profile.lastName}
        </p>
        {#if data.profile.region}
          <p class="text-rose-200 text-sm flex items-center gap-1 mt-0.5">
            <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            {data.profile.region}
          </p>
        {/if}
        {#if data.profile.createdAt}
          <p class="text-rose-200/70 text-xs mt-0.5">Dabei seit {formatDate(data.profile.createdAt)}</p>
        {/if}
        {#if data.profile.role === 'admin'}
          <span class="inline-block mt-1 text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
            ADMIN
          </span>
        {/if}
      </div>
    </div>

    {#if data.profile.bio}
      <p class="text-white/80 text-sm mt-3 leading-relaxed">{data.profile.bio}</p>
    {/if}

    <!-- Interessen-Chips ───────────────────────────────────── -->
    {#if data.profile.interests.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-3">
        {#each data.profile.interests as interest}
          <span class="bg-white/15 text-white text-xs px-2.5 py-1 rounded-full font-medium">
            {INTERESTS_EMOJI[interest.toLowerCase()] ?? ''} {interest}
          </span>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Stats ──────────────────────────────────────────────── -->
  <div class="px-4 -mt-3 z-10 relative">
    <div class="grid grid-cols-2 gap-3">
      <a href="/my/rides" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:border-rose-200 transition-colors">
        <p class="text-2xl font-bold text-gray-900">{data.stats.ridesCount}</p>
        <p class="text-xs text-gray-500 mt-0.5">Angebotene Fahrten</p>
      </a>
      <a href="/my/bookings" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:border-rose-200 transition-colors">
        <p class="text-2xl font-bold text-gray-900">{data.stats.bookingsCount}</p>
        <p class="text-xs text-gray-500 mt-0.5">Mitgefahren</p>
      </a>
    </div>
  </div>

  <div class="px-4 mt-4 flex flex-col gap-4">

    <!-- Ratings Split ──────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
        {#if data.ratings.asDriver.avg !== null}
          <p class="text-2xl font-bold text-amber-500">{data.ratings.asDriver.avg.toFixed(1)}</p>
          <p class="text-amber-400 text-sm leading-none mt-0.5">{stars(data.ratings.asDriver.avg)}</p>
          <p class="text-xs text-gray-400 mt-1">{data.ratings.asDriver.count}× als Fahrer</p>
        {:else}
          <p class="text-2xl font-bold text-gray-200">—</p>
          <p class="text-xs text-gray-400 mt-1">Als Fahrer</p>
        {/if}
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
        {#if data.ratings.asPassenger.avg !== null}
          <p class="text-2xl font-bold text-amber-500">{data.ratings.asPassenger.avg.toFixed(1)}</p>
          <p class="text-amber-400 text-sm leading-none mt-0.5">{stars(data.ratings.asPassenger.avg)}</p>
          <p class="text-xs text-gray-400 mt-1">{data.ratings.asPassenger.count}× als Mitfahrer</p>
        {:else}
          <p class="text-2xl font-bold text-gray-200">—</p>
          <p class="text-xs text-gray-400 mt-1">Als Mitfahrer</p>
        {/if}
      </div>
    </div>

    <!-- Schnell-Navigation ─────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <a href="/inbox" class="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
            <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-900">Inbox</span>
        </div>
        <div class="flex items-center gap-2">
          {#if data.unreadNotifications > 0}
            <span class="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {Math.min(data.unreadNotifications, 9)}{data.unreadNotifications > 9 ? '+' : ''}
            </span>
          {/if}
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </a>
      <a href="/my/rides" class="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1m0-11h8m4 11v-4a4 4 0 00-4-4h-1"/>
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-900">Meine Fahrten</span>
        </div>
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
      <a href="/my/bookings" class="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-900">Meine Buchungen</span>
        </div>
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
      {#if data.profile.role === 'admin'}
        <a href="/admin" class="flex items-center justify-between px-4 py-3.5 hover:bg-rose-50 transition-colors border-b border-gray-50">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
              <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <span class="text-sm font-medium text-rose-700 font-semibold">Admin-Bereich</span>
          </div>
          <svg class="w-4 h-4 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      {/if}
      <a href="/my/profile/settings" class="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-900">Einstellungen</span>
        </div>
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
    </div>

    <!-- Neueste Bewertungen ─────────────────────────────────── -->
    {#if data.ratings.recent.length > 0}
      <div>
        <h2 class="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">Neueste Bewertungen</h2>
        <div class="flex flex-col gap-2">
          {#each data.ratings.recent.slice(0, 3) as rating}
            <div class="bg-white rounded-xl border border-gray-100 p-4">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-amber-400 text-sm">{'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}</span>
                  <span class="text-xs text-gray-500 font-medium">{rating.stars}/5</span>
                </div>
                <span class="text-[10px] text-gray-400">{formatDate(rating.createdAt)}</span>
              </div>
              <p class="text-[10px] text-gray-400 mb-1">{ROLE_LABEL[rating.fromRole] ?? rating.fromRole}</p>
              {#if rating.comment}
                <p class="text-sm text-gray-600 italic">"{rating.comment}"</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Abmelden ────────────────────────────────────────────── -->
    <form method="POST" action="/auth/logout" use:enhance class="pb-4">
      <button
        type="submit"
        class="w-full border border-gray-200 text-gray-500 py-3.5 rounded-2xl font-medium text-sm hover:bg-gray-50 transition-colors"
      >
        Abmelden
      </button>
    </form>

  </div>
</div>
