<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatTime, formatDate } from '$lib/time';

  let { data, form } = $props();
  let loading = $state(false);
  let agreed = $state(false);

  function initials(name: string) {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<svelte:head>
  <title>Mitfahren – {data.ride.eventName}</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="mb-6">
    <a href="/rides/{data.eventId}" class="text-gray-400 text-sm">← Zurück</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Mitfahrt buchen</h1>
  </div>

  <div class="bg-white rounded-2xl shadow-md p-4 mb-4">
    <div class="flex items-center gap-3 mb-3">
      {#if data.ride.driverPhoto}
        <img src={data.ride.driverPhoto} alt={data.ride.driverName} class="w-14 h-14 rounded-full object-cover" />
      {:else}
        <div class="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
          {initials(data.ride.driverName)}
        </div>
      {/if}
      <div>
        <p class="font-semibold text-gray-900">{data.ride.driverName}</p>
        <span class="flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-semibold px-2 py-0.5 rounded-full w-fit mt-0.5">
          {data.ride.seatsAvailable} Plätze frei
        </span>
      </div>
    </div>
    <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Event</span>
        <span class="font-medium text-gray-800">{data.ride.eventName}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Start</span>
        <span class="font-medium text-gray-800">{formatTime(data.ride.departureTime)} · {data.ride.startLocation}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Datum</span>
        <span class="font-medium text-gray-800">{formatDate(data.ride.departureTime)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Preis</span>
        <span class="font-bold text-gray-900">CHF {data.ride.pricePerPerson.toFixed(2)}</span>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }} class="flex flex-col gap-4">
    <input type="hidden" name="rideId" value={data.ride._id} />

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Dein Abholort</label>
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        <input name="pickupLocation" type="text" required placeholder="z.B. Winterthur Bahnhof" class="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p class="text-sm font-semibold text-amber-800 mb-1">Wichtiger Hinweis</p>
      <p class="text-xs text-amber-700 leading-relaxed">
        Fairplay-Regel: Sei pünktlich an deinem Abholort. Der Fahrer wartet maximal 10 Minuten.
        Bei Nichterscheinen behält der Fahrer den vollen Betrag. Bei Stornierung weniger als
        2 Stunden vor Abfahrt werden 50% einbehalten.
      </p>
    </div>

    <label class="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" name="agreeTerms" bind:checked={agreed} class="mt-0.5 w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-300" />
      <span class="text-sm text-gray-600">Ich akzeptiere die <a href="#" class="text-rose-600 underline">AGB</a> und die Fairplay-Regel</span>
    </label>

    <button type="submit" disabled={loading || !agreed} class="mt-2 w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50">
      {loading ? 'Wird gebucht...' : 'Mitfahrgelegenheit buchen'}
    </button>
  </form>
</div>
