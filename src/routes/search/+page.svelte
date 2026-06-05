<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import RideCard from '$lib/components/RideCard.svelte';

  let { data } = $props();

  let searchInput = $state('');
  let recentSearches = $state<string[]>([]);
  let pickupCoords = $state<{ lat: number; lon: number } | null>(null);

  const CATEGORIES = [
    { key: 'music',    emoji: '🎵', label: 'Musik',     color: 'from-rose-400 to-pink-500'    },
    { key: 'festival', emoji: '🎪', label: 'Festival',  color: 'from-amber-400 to-orange-500' },
    { key: 'nightlife',emoji: '🌙', label: 'Nightlife', color: 'from-purple-500 to-violet-600'},
    { key: 'sport',    emoji: '⚡', label: 'Sport',     color: 'from-blue-500 to-cyan-500'    },
    { key: 'hiking',   emoji: '🏔️', label: 'Outdoor',   color: 'from-green-500 to-emerald-600'},
    { key: 'culture',  emoji: '🎭', label: 'Kultur',    color: 'from-indigo-500 to-blue-600'  },
  ];

  onMount(() => {
    if (!browser) return;
    searchInput = data.search ?? '';
    try {
      const saved = JSON.parse(sessionStorage.getItem('er_recentSearches') ?? '[]');
      if (Array.isArray(saved)) recentSearches = saved.slice(0, 5);
    } catch { /* ignore */ }

    const coords = sessionStorage.getItem('er_pickupCoords');
    if (coords) {
      try { pickupCoords = JSON.parse(coords); } catch { /* ignore */ }
    }

    // Aktuelle Suche als Recent speichern
    if (data.search && data.search.trim()) {
      saveRecentSearch(data.search.trim());
    }
  });

  function saveRecentSearch(term: string) {
    if (!browser) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    recentSearches = updated;
    sessionStorage.setItem('er_recentSearches', JSON.stringify(updated));
  }

  function removeRecentSearch(term: string) {
    recentSearches = recentSearches.filter(s => s !== term);
    if (browser) sessionStorage.setItem('er_recentSearches', JSON.stringify(recentSearches));
  }
</script>

<svelte:head>
  <title>Suchen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
  <!-- Header ────────────────────────────────────────────────── -->
  <div class="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
    <h1 class="text-2xl font-bold text-gray-900 mb-3">Suchen</h1>
    <form method="GET" class="flex gap-2">
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <input
          name="q"
          type="text"
          bind:value={searchInput}
          placeholder="Event, Ort oder Kuenstler..."
          autocomplete="off"
          class="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        {#if searchInput}
          <button
            type="button"
            onclick={() => { searchInput = ''; }}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        {/if}
      </div>
      <button type="submit" class="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">
        Suchen
      </button>
    </form>
  </div>

  <div class="px-4 flex-1 bg-gray-50">
    {#if data.search}
      <!-- ── Suchergebnisse ──────────────────────────────────── -->
      <div class="pt-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-gray-900">
            Ergebnisse fuer &ldquo;{data.search}&rdquo;
          </h2>
          {#if data.rides.length > 0}
            <span class="text-sm text-gray-400 font-medium">{data.rides.length}</span>
          {/if}
        </div>

        {#if data.rides.length === 0}
          <div class="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
            <div class="text-4xl mb-3">🔍</div>
            <p class="font-semibold text-gray-800 mb-1">Nichts gefunden</p>
            <p class="text-gray-400 text-sm mb-5">Keine Fahrten fuer &ldquo;{data.search}&rdquo;.</p>
            <a href="/rides/new" class="bg-rose-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-rose-700 transition-colors">
              Fahrt fuer dieses Event anbieten
            </a>
          </div>
        {:else}
          <div class="flex flex-col gap-4 pb-8">
            {#each data.rides as ride (ride._id)}
              <RideCard {ride} {pickupCoords} />
            {/each}
          </div>
        {/if}
      </div>

    {:else}
      <!-- ── Entdecken ──────────────────────────────────────── -->

      <!-- Zuletzt gesucht -->
      {#if recentSearches.length > 0}
        <div class="pt-5 pb-2">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-bold text-gray-900 text-sm">Zuletzt gesucht</h2>
            <button
              type="button"
              onclick={() => {
                recentSearches = [];
                if (browser) sessionStorage.removeItem('er_recentSearches');
              }}
              class="text-xs text-gray-400 hover:text-gray-600"
            >
              Alles loeschen
            </button>
          </div>
          <div class="flex flex-col gap-1">
            {#each recentSearches as term}
              <div class="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                <a href="/search?q={encodeURIComponent(term)}" class="flex items-center gap-2.5 flex-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span class="text-sm text-gray-700">{term}</span>
                </a>
                <button
                  type="button"
                  onclick={() => removeRecentSearch(term)}
                  class="text-gray-300 hover:text-gray-500 ml-2 p-1"
                  aria-label="Suche entfernen"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Kategorien entdecken -->
      <div class="pt-5 pb-2">
        <h2 class="font-bold text-gray-900 mb-3">Entdecken</h2>
        <div class="grid grid-cols-2 gap-3">
          {#each CATEGORIES as cat}
            <a
              href="/?cat={cat.key}"
              class="bg-gradient-to-br {cat.color} rounded-2xl p-4 flex flex-col justify-between min-h-[90px] hover:opacity-95 active:scale-[0.98] transition-all"
            >
              <span class="text-3xl">{cat.emoji}</span>
              <span class="text-white font-bold text-base mt-2">{cat.label}</span>
            </a>
          {/each}
        </div>
      </div>

      <!-- Tipps -->
      <div class="py-5">
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <p class="text-sm font-semibold text-gray-800 mb-2">Suchtipps</p>
          <ul class="text-sm text-gray-500 flex flex-col gap-1">
            <li>• Eventname: <span class="text-gray-700 font-medium">Openair Frauenfeld</span></li>
            <li>• Veranstaltungsort: <span class="text-gray-700 font-medium">Zurich</span></li>
            <li>• Abfahrtsort: <span class="text-gray-700 font-medium">Winterthur</span></li>
          </ul>
        </div>
      </div>

    {/if}
  </div>
</div>
