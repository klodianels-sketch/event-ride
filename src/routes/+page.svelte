<script lang="ts">
  import RideCard from '$lib/components/RideCard.svelte';
  import CommunityCircle from '$lib/components/CommunityCircle.svelte';

  let { data } = $props();

  const communities = [
    { name: 'ZHAW', initial: 'Z', color: 'bg-blue-100', textColor: 'text-blue-600' },
    { name: 'Ski Club', initial: 'S', color: 'bg-sky-100', textColor: 'text-sky-600' },
    { name: 'O.S.G.', initial: 'O', color: 'bg-green-100', textColor: 'text-green-600' },
    { name: 'Wandern', initial: 'W', color: 'bg-emerald-100', textColor: 'text-emerald-600' },
    { name: 'Festival', initial: 'F', color: 'bg-rose-100', textColor: 'text-rose-600' },
    { name: 'Sport', initial: 'SP', color: 'bg-orange-100', textColor: 'text-orange-600' }
  ];

  let searchValue = $state(data.search ?? '');
</script>

<svelte:head>
  <title>EventRide – Mitfahrgelegenheiten für Events</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
  <div class="px-4 pt-12 pb-4">
    <p class="text-gray-500 text-sm">Willkommen bei</p>
    <h1 class="text-2xl font-bold text-gray-900">EventRide 🎵</h1>
  </div>

  <div class="px-4 pb-4">
    <form method="GET" class="flex gap-2">
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <input
          name="q"
          type="text"
          bind:value={searchValue}
          placeholder="Event oder Ort suchen..."
          class="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      </div>
      <button type="submit" class="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">
        Suchen
      </button>
    </form>
  </div>

  <div class="px-4 pb-4">
    <div class="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
      {#each communities as c}
        <CommunityCircle name={c.name} initial={c.initial} color={c.color} textColor={c.textColor} />
      {/each}
    </div>
  </div>

  <div class="px-4 flex-1">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-bold text-gray-900 text-lg">Mitfahrgelegenheiten</h2>
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </div>

    {#if data.rides.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25"/>
          </svg>
        </div>
        <p class="text-gray-500 text-sm">Keine Fahrten gefunden</p>
        <a href="/rides/new" class="mt-4 bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 transition-colors">
          Erste Fahrt anbieten
        </a>
      </div>
    {:else}
      <div class="flex flex-col gap-4 pb-6">
        {#each data.rides as ride}
          <RideCard {ride} eventId={ride._id} />
        {/each}
      </div>
    {/if}
  </div>
</div>
