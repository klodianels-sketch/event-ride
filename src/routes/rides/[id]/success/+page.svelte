<script lang="ts">
  import { formatTime, formatDate } from '$lib/time';

  let { data } = $props();
  const b = $derived(data.booking);
  const isPending = $derived(b?.status === 'pending');
</script>

<svelte:head>
  <title>{isPending ? 'Anfrage gesendet' : 'Buchung bestätigt'} – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">

  <!-- Status Header ─────────────────────────────────────── -->
  <div class="flex flex-col items-center text-center mb-6">
    {#if isPending}
      <div class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
        <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">Anfrage gesendet!</h1>
      <p class="text-gray-500 text-sm mt-2 max-w-[260px] leading-relaxed">
        Der Fahrer wurde benachrichtigt und entscheidet über deine Anfrage.
      </p>
    {:else}
      <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">Buchung bestätigt!</h1>
    {/if}
    {#if b?.ride}
      <p class="text-gray-400 text-xs mt-1">{b.ride.eventName} · {b.ride.eventLocation}</p>
    {/if}
  </div>

  {#if b}
    <!-- Buchungsdetails ──────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
      <div class="flex flex-col gap-2 text-sm">
        {#if b.ride}
          <div class="flex justify-between">
            <span class="text-gray-400">Fahrer</span>
            <span class="font-medium text-gray-800">{b.ride.driverName}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Abfahrt</span>
            <span class="font-medium text-gray-800">
              {formatDate(b.ride.departureTime)}, {formatTime(b.ride.departureTime)} Uhr
            </span>
          </div>
        {/if}
        <div class="flex justify-between">
          <span class="text-gray-400">Dein Abholort</span>
          <span class="font-medium text-gray-800 text-right max-w-[55%]">{b.pickupLocation}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Preis</span>
          <span class="font-bold text-gray-900">
            {b.bookedPrice != null ? `CHF ${b.bookedPrice.toFixed(2)}` : (b.ride ? `CHF ${b.ride.pricePerPerson.toFixed(2)}` : '')}
          </span>
        </div>
      </div>
    </div>

    <!-- Abholzeiten (nur wenn accepted) ─────────────────── -->
    {#if !isPending && b.estimatedPickupTime && b.recommendedReadyTime && b.latestReadyTime}
      <div class="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
        <p class="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">Deine Abholzeiten</p>
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Empfohlen bereit ab</span>
            <span class="font-bold text-rose-600">{formatTime(b.recommendedReadyTime)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Fahrer kommt ca.</span>
            <span class="font-semibold text-gray-900">
              {formatTime(b.estimatedPickupTime)}
              {#if b.timeAccuracy === 'fallback'}<span class="text-xs text-gray-400 ml-1">(Schätzung)</span>{/if}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Fahrer wartet maximal bis</span>
            <span class="font-semibold text-amber-600">{formatTime(b.latestReadyTime)}</span>
          </div>
          {#if b.estimatedArrivalAtEvent}
            <div class="flex justify-between items-center border-t border-rose-100 pt-2 mt-1">
              <span class="text-sm text-gray-600">Ankunft Event ca.</span>
              <span class="font-semibold text-gray-800">~{formatTime(b.estimatedArrivalAtEvent)}</span>
            </div>
          {/if}
        </div>
      </div>
    {:else if isPending}
      <!-- Pending-Hinweis -->
      <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Was passiert als nächstes?</p>
        <ul class="text-sm text-gray-600 flex flex-col gap-1.5">
          <li class="flex items-start gap-2">
            <span class="text-blue-400 mt-0.5">①</span>
            Der Fahrer sieht deine Anfrage und entscheidet.
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-400 mt-0.5">②</span>
            Bei Annahme bekommst du genaue Abholzeiten.
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-400 mt-0.5">③</span>
            Sei 5 Min. vor der Abholzeit an deinem Abholort.
          </li>
        </ul>
      </div>
    {/if}

    <!-- Fairplay Erinnerung ─────────────────────────────── -->
    {#if b.noShowPolicySnapshot}
      <div class="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 mb-4">
        Fairplay: Sei pünktlich. Fahrer wartet max.
        {b.noShowPolicySnapshot.waitMinutes} Min. Bei Nichterscheinen:
        {b.noShowPolicySnapshot.penaltyPercent}% Gebühr.
      </div>
    {/if}
  {:else}
    <p class="text-center text-gray-400 text-sm">Buchungsdetails nicht verfügbar.</p>
  {/if}

  <a href="/my/bookings" class="mt-2 text-center text-rose-600 font-semibold text-sm">
    Meine Buchungen anzeigen →
  </a>
</div>
