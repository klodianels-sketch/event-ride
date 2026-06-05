<script lang="ts">
  import { formatDate } from '$lib/time';

  let { data } = $props();

  function stars(avg: number | null): string {
    if (avg === null) return '';
    const full = Math.round(avg);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  const INTERESTS_EMOJI: Record<string, string> = {
    musik: '🎵', festival: '🎪', nightlife: '🌙', sport: '⚡',
    wandern: '🏔️', ski: '⛷️', kultur: '🎭', film: '🎬',
    food: '🍕', reisen: '✈️', natur: '🌿', tanz: '💃'
  };
</script>

<svelte:head>
  <title>{data.user.firstName} {data.user.lastName} – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen pb-24">
  <!-- Hero -->
  <div class="bg-gradient-to-b from-gray-800 to-gray-700 px-4 pt-12 pb-8">
    <a href="/" class="inline-flex items-center gap-1.5 text-white/70 text-sm mb-4 hover:text-white transition-colors">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Zurück
    </a>
    <div class="flex items-center gap-4">
      {#if data.user.avatarUrl}
        <img
          src={data.user.avatarUrl}
          alt="{data.user.firstName} {data.user.lastName}"
          class="w-20 h-20 rounded-full object-cover ring-4 ring-white/20 shrink-0"
        />
      {:else}
        <div class="w-20 h-20 rounded-full bg-white/10 ring-4 ring-white/20 flex items-center justify-center text-white font-bold text-2xl shrink-0">
          {data.user.firstName[0]}{data.user.lastName[0]}
        </div>
      {/if}
      <div>
        <p class="text-white font-bold text-xl">{data.user.firstName} {data.user.lastName}</p>
        {#if data.user.region}
          <p class="text-gray-300 text-sm mt-0.5">📍 {data.user.region}</p>
        {/if}
        <p class="text-gray-400 text-xs mt-0.5">Dabei seit {formatDate(data.user.createdAt)}</p>
      </div>
    </div>
    {#if data.user.bio}
      <p class="text-gray-200 text-sm mt-4 leading-relaxed">{data.user.bio}</p>
    {/if}
    {#if data.user.interests.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-3">
        {#each data.user.interests as interest}
          <span class="bg-white/10 text-gray-200 text-xs px-2.5 py-1 rounded-full">
            {INTERESTS_EMOJI[interest.toLowerCase()] ?? ''} {interest}
          </span>
        {/each}
      </div>
    {/if}
  </div>

  <div class="px-4 pt-4 flex flex-col gap-4">
    <!-- Stats -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-white rounded-xl border border-gray-100 p-3 text-center">
        <p class="text-lg font-bold text-gray-900">{data.ridesCount}</p>
        <p class="text-[10px] text-gray-500">Fahrten</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-3 text-center">
        {#if data.ratings.asDriver.avg !== null}
          <p class="text-lg font-bold text-amber-500">{data.ratings.asDriver.avg.toFixed(1)}</p>
          <p class="text-[10px] text-gray-500">Als Fahrer</p>
        {:else}
          <p class="text-lg font-bold text-gray-300">—</p>
          <p class="text-[10px] text-gray-500">Als Fahrer</p>
        {/if}
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-3 text-center">
        {#if data.ratings.asPassenger.avg !== null}
          <p class="text-lg font-bold text-amber-500">{data.ratings.asPassenger.avg.toFixed(1)}</p>
          <p class="text-[10px] text-gray-500">Als Mitfahrer</p>
        {:else}
          <p class="text-lg font-bold text-gray-300">—</p>
          <p class="text-[10px] text-gray-500">Als Mitfahrer</p>
        {/if}
      </div>
    </div>

    <!-- Bewertungen -->
    {#if data.ratings.recent.length > 0}
      <div>
        <h2 class="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">Bewertungen</h2>
        <div class="flex flex-col gap-2">
          {#each data.ratings.recent as r}
            <div class="bg-white rounded-xl border border-gray-100 p-3.5">
              <div class="flex items-center justify-between mb-1">
                <span class="text-amber-400 text-sm">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                <span class="text-[10px] text-gray-400">
                  {r.fromRole === 'passenger' ? 'Mitfahrer' : 'Fahrer'} · {formatDate(r.createdAt)}
                </span>
              </div>
              {#if r.comment}
                <p class="text-sm text-gray-600 italic">"{r.comment}"</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="bg-gray-50 rounded-xl p-6 text-center">
        <p class="text-2xl mb-2">⭐</p>
        <p class="text-sm text-gray-500">Noch keine Bewertungen</p>
      </div>
    {/if}

    {#if data.isOwnProfile}
      <a href="/my/profile/settings" class="w-full bg-rose-600 text-white py-3.5 rounded-2xl font-bold text-sm text-center block hover:bg-rose-700 transition-colors">
        Profil bearbeiten
      </a>
    {/if}
  </div>
</div>
