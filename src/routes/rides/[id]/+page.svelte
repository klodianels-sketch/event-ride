<script lang="ts">
  import RideCard from '$lib/components/RideCard.svelte';
  import { formatDate } from '$lib/time';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.ride.eventName} – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
  <div class="relative">
    {#if data.ride.eventImage}
      <img src={data.ride.eventImage} alt={data.ride.eventName} class="w-full h-52 object-cover rounded-b-3xl" />
    {:else}
      <div class="w-full h-52 bg-gradient-to-br from-rose-400 to-rose-600 rounded-b-3xl flex items-center justify-center">
        <span class="text-white text-5xl">🎵</span>
      </div>
    {/if}
    <a href="/" class="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow">
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
    <button class="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow">
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
      </svg>
    </button>
  </div>

  <div class="px-4 pt-4">
    <h1 class="text-xl font-bold text-gray-900">{data.ride.eventName}</h1>
    <p class="text-sm text-gray-500 mt-0.5">{data.ride.eventLocation} · {formatDate(data.ride.departureTime)}</p>
  </div>

  <div class="px-4 mt-4">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      </svg>
      <input type="text" placeholder="Dein Abholstandort" class="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
    </div>
  </div>

  <div class="px-4 mt-6">
    <h2 class="font-bold text-gray-900 text-lg mb-3">Aktuelle Mitfahrgelegenheiten</h2>
    {#if data.allRides.length === 0}
      <p class="text-gray-500 text-sm text-center py-8">Noch keine Fahrten für diesen Event</p>
    {:else}
      <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {#each data.allRides as ride}
          <div class="min-w-[280px]">
            <RideCard {ride} />
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="px-4 mt-6 flex flex-col items-center gap-3">
    <div class="flex items-center gap-3 w-full">
      <div class="flex-1 h-px bg-gray-200"></div>
      <span class="text-gray-400 text-sm">Oder</span>
      <div class="flex-1 h-px bg-gray-200"></div>
    </div>
    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
    <a href="/rides/new" class="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm text-center hover:bg-gray-800 transition-colors">
      Mitfahrgelegenheit anbieten
    </a>
  </div>

  <div class="h-8"></div>
</div>
