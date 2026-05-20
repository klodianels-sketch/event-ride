<script lang="ts">
  import { formatTime, formatDate } from '$lib/time';

  let { data } = $props();
  const b = $derived(data.booking);
</script>

<svelte:head>
  <title>Buchung erfolgreich – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="flex flex-col items-center text-center mb-8">
    <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
      <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-gray-900">Buchung bestaetigt!</h1>
    {#if b?.ride}
      <p class="text-gray-500 text-sm mt-2">{b.ride.eventName} · {b.ride.eventLocation}</p>
    {/if}
  </div>

  {#if b}
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Deine Abholzeiten</p>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">Empfohlen bereit ab</span>
          <span class="text-sm font-bold text-rose-600">
            {formatTime(b.recommendedReadyTime)}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">Fahrer kommt ca.</span>
          <span class="text-sm font-semibold text-gray-900">
            {formatTime(b.estimatedPickupTime)}
            {#if b.timeAccuracy === 'fallback'}
              <span class="text-xs text-gray-400 ml-1">(Schaetzung)</span>
            {/if}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">Spaetestens bereit</span>
          <span class="text-sm font-semibold text-amber-600">
            {formatTime(b.latestReadyTime)}
          </span>
        </div>
        {#if b.estimatedArrivalAtEvent}
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">Ankunft Event</span>
            <span class="text-sm font-semibold text-gray-900">
              ~{formatTime(b.estimatedArrivalAtEvent)}
            </span>
          </div>
        {/if}
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">Dein Abholort</span>
          <span class="text-sm font-medium text-gray-800 text-right max-w-[180px]">{b.pickupLocation}</span>
        </div>
      </div>
    </div>

    {#if b.ride}
      <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5 text-sm mb-4">
        <div class="flex justify-between">
          <span class="text-gray-500">Fahrer</span>
          <span class="font-medium">{b.ride.driverName}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Abfahrt</span>
          <span class="font-medium">{formatDate(b.ride.departureTime)}, {formatTime(b.ride.departureTime)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Preis</span>
          <span class="font-bold">{b.bookedPrice ? `CHF ${b.bookedPrice.toFixed(2)}` : `CHF ${b.ride.pricePerPerson.toFixed(2)}`}</span>
        </div>
      </div>
    {/if}

    {#if b.noShowPolicySnapshot}
      <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 mb-4">
        Fairplay: Sei puenktlich. Fahrer wartet max. {b.noShowPolicySnapshot.waitMinutes} Min.
        Bei No-Show: {b.noShowPolicySnapshot.penaltyPercent}% Gebuehr.
      </div>
    {/if}
  {:else}
    <p class="text-center text-gray-400 text-sm">Buchungsdetails nicht verfuegbar.</p>
  {/if}

  <a href="/my/bookings" class="mt-4 text-center text-rose-600 font-semibold text-sm">
    Alle meine Buchungen →
  </a>
</div>
