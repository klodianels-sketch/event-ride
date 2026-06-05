<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { formatTime, formatDate } from '$lib/time';
  import { haversineSeconds } from '$lib/routing';

  let { data, form } = $props();
  let loading = $state(false);
  let agreed = $state(false);

  let pickupInput = $state('');
  let pickupCoords = $state<{ lat: number; lon: number } | null>(null);
  let suggestions = $state<any[]>([]);
  let showSuggestions = $state(false);
  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    if (!browser) return;
    if (data.prefilledCoords) {
      pickupCoords = data.prefilledCoords;
      const saved = sessionStorage.getItem('er_pickupLabel');
      if (saved) pickupInput = saved;
    } else {
      const saved = sessionStorage.getItem('er_pickupLabel');
      const savedCoords = sessionStorage.getItem('er_pickupCoords');
      if (saved) pickupInput = saved;
      if (savedCoords) {
        try { pickupCoords = JSON.parse(savedCoords); } catch { /* ignore */ }
      }
    }
  });

  // Haversine-Vorschau (unverbindlich, nur zur Orientierung)
  const preview = $derived.by(() => {
    if (!pickupCoords || !data.ride.startCoordsRough || !data.ride.eventLocationCoords) return null;
    const { lat: sLat, lon: sLon } = data.ride.startCoordsRough;
    const { lat: eLat, lon: eLon } = data.ride.eventLocationCoords;
    const { lat: pLat, lon: pLon } = pickupCoords;
    const toPickup = haversineSeconds(sLat, sLon, pLat, pLon);
    const pickupToEvent = haversineSeconds(pLat, pLon, eLat, eLon);
    const departure = new Date(data.ride.departureTime);
    const estimatedPickupTime = new Date(departure.getTime() + toPickup * 1000);
    const recommendedReadyTime = new Date(estimatedPickupTime.getTime() - 5 * 60_000);
    const latestAllowedPickupTime = new Date(
      estimatedPickupTime.getTime() + data.ride.noShowPolicy.waitMinutes * 60_000
    );
    const estimatedArrival = new Date(estimatedPickupTime.getTime() + 120_000 + pickupToEvent * 1000);
    return { estimatedPickupTime, recommendedReadyTime, latestAllowedPickupTime, estimatedArrival };
  });

  function onPickupInput() {
    pickupCoords = null;
    if (typingTimer) clearTimeout(typingTimer);
    showSuggestions = true;
    if (pickupInput.length < 3) { suggestions = []; return; }
    typingTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(pickupInput)}&bbox=5.9,45.8,10.5,47.8&limit=5`,
          { signal: AbortSignal.timeout(5000) }
        );
        const json = await res.json();
        suggestions = json.features ?? [];
      } catch { suggestions = []; }
    }, 300);
  }

  function selectSuggestion(s: any) {
    const p = s.properties;
    pickupInput = [p.name, p.street, p.city ?? p.county].filter(Boolean).join(', ');
    const [lon, lat] = s.geometry.coordinates as [number, number];
    pickupCoords = { lat, lon };
    suggestions = [];
    showSuggestions = false;
  }

  function initials(name: string) {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<svelte:head>
  <title>Mitfahren – {data.ride.eventName}</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="flex flex-col min-h-screen" onclick={() => (showSuggestions = false)}>

  <!-- Header ────────────────────────────────────────────── -->
  <div class="bg-gradient-to-b from-rose-600 to-rose-500 px-4 pt-12 pb-5">
    <a href="/rides/{data.ride._id}" class="text-rose-200 text-sm flex items-center gap-1 mb-4">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Zurück
    </a>
    <p class="text-rose-200 text-xs font-semibold uppercase tracking-widest">Mitfahrt anfragen</p>
    <h1 class="text-2xl font-bold text-white mt-1">{data.ride.eventName}</h1>
    <p class="text-rose-200 text-xs mt-0.5">{data.ride.eventLocation}</p>
  </div>

  <div class="px-4 py-5 flex flex-col gap-4">

    <!-- Fahrt-Übersicht ─────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div class="flex items-center gap-3 mb-3">
        {#if data.ride.driverPhoto}
          <img src={data.ride.driverPhoto} alt={data.ride.driverName} class="w-12 h-12 rounded-full object-cover" />
        {:else}
          <div class="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
            {initials(data.ride.driverName)}
          </div>
        {/if}
        <div>
          <p class="font-semibold text-gray-900">{data.ride.driverName}</p>
          <p class="text-xs text-gray-400">ab {data.ride.startLocation}</p>
        </div>
      </div>
      <div class="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p class="text-gray-400 text-xs">Abfahrt</p>
          <p class="font-medium">{formatDate(data.ride.departureTime)}</p>
          <p class="font-medium">{formatTime(data.ride.departureTime)} Uhr</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs">Plätze / Preis</p>
          <p class="font-medium">{data.ride.seatsAvailable} frei</p>
          <p class="font-bold text-gray-900">CHF {data.ride.pricePerPerson.toFixed(2)}</p>
        </div>
      </div>
    </div>

    <!-- Hinweis: Anfrage-Flow ──────────────────────────── -->
    <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
      <svg class="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="text-xs text-blue-700 leading-relaxed">
        Deine Anfrage geht direkt an den Fahrer. Er nimmt sie an oder lehnt sie ab.
        Genaue Abholzeiten erhältst du erst nach der Bestätigung.
      </p>
    </div>

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {form.error}
      </div>
    {/if}

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <form
      method="POST"
      use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }}
      class="flex flex-col gap-4"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Abholort ──────────────────────────────────────── -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="relative" onclick={(e) => e.stopPropagation()}>
        <label for="pickupLocation" class="block text-sm font-semibold text-gray-700 mb-1.5">
          Dein Abholort
        </label>
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 {pickupCoords ? 'text-green-500' : 'text-rose-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
          <input
            id="pickupLocation"
            name="pickupLocation"
            type="text"
            bind:value={pickupInput}
            oninput={onPickupInput}
            onfocus={() => { if (pickupInput.length >= 3) showSuggestions = true; }}
            autocomplete="off"
            required
            placeholder="z.B. Winterthur Bahnhof"
            class="w-full pl-9 pr-4 py-3 rounded-xl border {pickupCoords ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'} focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
          />
        </div>
        {#if !pickupCoords && pickupInput.length > 0}
          <p class="text-xs text-amber-600 mt-1">Bitte eine Adresse aus der Liste wählen.</p>
        {/if}
        {#if showSuggestions && suggestions.length > 0}
          <ul class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {#each suggestions as s (s.properties.osm_id ?? s.properties.name)}
              <li>
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); selectSuggestion(s); }}
                  class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span class="font-medium">{s.properties.name ?? ''}</span>
                  {#if s.properties.city || s.properties.county}
                    <span class="text-gray-400 ml-1 text-xs">
                      {[s.properties.city, s.properties.county].filter(Boolean).join(', ')}
                    </span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- Zeitvorschau (unverbindlich) ──────────────────── -->
      {#if preview}
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
            Zeitvorschau <span class="font-normal text-gray-400">(Schätzung — gilt erst nach Bestätigung)</span>
          </p>
          <div class="flex flex-col gap-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Empfohlen bereit ab</span>
              <span class="font-bold text-rose-600">{formatTime(preview.recommendedReadyTime)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Fahrer kommt ca.</span>
              <span class="font-semibold text-gray-900">~{formatTime(preview.estimatedPickupTime)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Fahrer wartet maximal bis</span>
              <span class="font-semibold text-amber-600">{formatTime(preview.latestAllowedPickupTime)}</span>
            </div>
            <div class="flex justify-between border-t border-gray-200 pt-2 mt-0.5">
              <span class="text-gray-600">Ankunft Event ca.</span>
              <span class="font-semibold text-gray-700">~{formatTime(preview.estimatedArrival)}</span>
            </div>
          </div>
        </div>
      {:else if pickupCoords && !data.ride.startCoordsRough}
        <div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
          Zeitvorschau wird nach Bestätigung verfügbar sein.
        </div>
      {/if}

      <!-- Fairplay-Regel ────────────────────────────────── -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p class="text-sm font-semibold text-amber-800 mb-1.5">Fairplay-Regeln</p>
        <ul class="text-xs text-amber-700 leading-relaxed flex flex-col gap-1">
          <li>• Sei <strong>5 Minuten vor</strong> der Abholzeit an deinem Abholort bereit.</li>
          <li>• Der Fahrer wartet maximal <strong>{data.ride.noShowPolicy.waitMinutes} Minuten</strong> nach der Abholzeit.</li>
          <li>• Bei Nichterscheinen behält der Fahrer <strong>{data.ride.noShowPolicy.penaltyPercent} %</strong> des Fahrpreises (<strong>CHF {(data.ride.pricePerPerson * data.ride.noShowPolicy.penaltyPercent / 100).toFixed(2)}</strong>).</li>
        </ul>
      </div>

      <label class="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="agreeTerms"
          bind:checked={agreed}
          class="mt-0.5 w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-300"
        />
        <span class="text-sm text-gray-600 leading-relaxed">
          Ich bin pünktlich an meinem Abholort und akzeptiere die Fairplay-Regeln.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !agreed}
        class="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {#if loading}
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Wird gesendet...
        {:else}
          Anfrage senden – CHF {data.ride.pricePerPerson.toFixed(2)}
        {/if}
      </button>

    </form>
  </div>
</div>
