<script lang="ts">
  import RideCard from '$lib/components/RideCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Suchen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-4">Suchen</h1>

  <form method="GET" class="mb-6">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
      </svg>
      <input
        name="q"
        type="text"
        value={data.search ?? ''}
        placeholder="Event oder Ort suchen..."
        class="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
      />
    </div>
    <button type="submit" class="mt-3 w-full bg-rose-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-rose-700 transition-colors">
      Suchen
    </button>
  </form>

  {#if data.search}
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-bold text-gray-900">
        Ergebnisse fuer &ldquo;{data.search}&rdquo;
      </h2>
      {#if data.rides.length > 0}
        <span class="text-sm text-gray-400">{data.rides.length}</span>
      {/if}
    </div>

    {#if data.rides.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
        </div>
        <p class="text-gray-500 text-sm">Keine Fahrten fuer &ldquo;{data.search}&rdquo; gefunden.</p>
        <a href="/rides/new" class="mt-4 bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 transition-colors">
          Fahrt anbieten
        </a>
      </div>
    {:else}
      <div class="flex flex-col gap-4">
        {#each data.rides as ride (ride._id)}
          <RideCard {ride} />
        {/each}
      </div>
    {/if}
  {:else}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
        </svg>
      </div>
      <p class="text-gray-500 text-sm">Event-Name oder Ort eingeben und auf Suchen druecken.</p>
    </div>
  {/if}
</div>
