<script lang="ts">
  import { formatDate, formatTime } from '$lib/time';

  let { data } = $props();

  const statusLabels: Record<string, string> = {
    active: 'Aktiv',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen'
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700'
  };
</script>

<svelte:head>
  <title>Meine Fahrten – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Meine Fahrten</h1>
    <a href="/rides/new" class="bg-rose-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
      + Neue Fahrt
    </a>
  </div>

  {#if data.rides.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-gray-500 text-sm mb-4">Du hast noch keine Fahrten angeboten</p>
      <a href="/rides/new" class="bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
        Erste Fahrt anbieten
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each data.rides as ride}
        <div class="bg-white rounded-2xl shadow-md p-4">
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="font-semibold text-gray-900">{ride.eventName}</p>
              <p class="text-sm text-gray-500">{ride.eventLocation}</p>
            </div>
            <span class="text-xs font-semibold px-2 py-1 rounded-full {statusColors[ride.status] || 'bg-gray-100 text-gray-600'}">
              {statusLabels[ride.status] || ride.status}
            </span>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Abfahrt</span>
              <span class="font-medium">{formatDate(ride.departureTime)}, {formatTime(ride.departureTime)}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Startort</span>
              <span class="font-medium">{ride.startLocation}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Plätze</span>
              <span class="font-medium">{ride.seatsAvailable}/{ride.seats} frei</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Preis p.P.</span>
              <span class="font-bold">CHF {ride.pricePerPerson.toFixed(2)}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
