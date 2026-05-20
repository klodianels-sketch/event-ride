<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { formatTime, formatDate } from '$lib/time';
  import { haversineSeconds } from '$lib/routing';

  let { data, form } = $props();
  let loading = $state(false);
  let agreed = $state(false);

  // Abholort-State
  let pickupInput = $state('');
  let pickupCoords = $state<{ lat: number; lon: number } | null>(null);
  let suggestions = $state<any[]>([]);
  let showSuggestions = $state(false);
  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  // Vorbefuellen: zuerst URL-Params, dann sessionStorage
  onMount(() => {
    if (!browser) return;

    if (data.prefilledCoords) {
      pickupCoords = data.prefilledCoords;
      // Label aus sessionStorage laden wenn vorhanden
      const saved = sessionStorage.getItem('er_pickupLabel');
      if (saved) pickupInput = saved;
    } else {
      // Kein URL-Param — aus sessionStorage lesen
      const saved = sessionStorage.getItem('er_pickupLabel');
      const savedCoords = sessionStorage.getItem('er_pickupCoords');
      if (saved) pickupInput = saved;
      if (savedCoords) {
        try { pickupCoords = JSON.parse(savedCoords); } catch { /* ignore */ }
      }
    }
  });

  // Zeitvorschau (Haversine, nicht-bindend) — $derived.by fuer multi-statement
  const preview = $derived.by(() => {
    if (!pickupCoords || !data.ride.startCoordsRough || !data.ride.eventLocationCoords) return null;
    const { lat: sLat, lon: sLon } = data.ride.startCoordsRough;
    const { lat: eLat, lon: eLon } = data.ride.eventLocationCoords;
    const { lat: pLat, lon: pLon } = pickupCoords;
    const toPickup = haversineSeconds(sLat, sLon, pLat, pLon);
    const pickupToEvent = haversineSeconds(pLat, pLon, eLat, eLon);
    const departure = new Date(data.ride.departureTime);
    const estimatedPickupTime = new Date(departure.getTime() + toPickup * 1000);
    const recommendedReadyTime = new Date(estimatedPickupTime.getTime() - 8 * 60_000);
    const latestReadyTime = new Date(
      estimatedPickupTime.getTime() + data.ride.noShowPolicy.waitMinutes * 60_000
    );
    const estimatedArrival = new Date(estimatedPickupTime.getTime() + 120_000 + pickupToEvent * 1000);
    return { estimatedPickupTime, recommendedReadyTime, latestReadyTime, estimatedArrival };
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
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
</script>

<svelte:head>
  <title>Mitfahren – {data.ride.eventName}</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="flex flex-col min-h-screen px-4 pt-12 pb-8" onclick={() => (showSuggestions = false)}>
  <div class="mb-5">
    <a href="/rides/{data.ride._id}" class="text-gray-400 text-sm">← Zurueck</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Mitfahrt buchen</h1>
    <p class="text-rose-600 font-semibold text-sm mt-0.5">{data.ride.eventName}</p>
    <p class="text-gray-400 text-xs">{data.ride.eventLocation}</p>
  </div>

  <!-- Fahrt-Uebersicht ─────────────────────────────────────────────────── -->
  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
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
        <p class="text-xs text-gray-500">ab {data.ride.startLocation}</p>
      </div>
    </div>
    <div class="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-sm">
      <div>
        <p class="text-gray-400 text-xs">Abfahrt</p>
        <p class="font-medium">{formatDate(data.ride.departureTime)}</p>
        <p class="font-medium">{formatTime(data.ride.departureTime)}</p>
      </div>
      <div>
        <p class="text-gray-400 text-xs">Plaetze / Preis</p>
        <p class="font-medium">{data.ride.seatsAvailable} frei</p>
        <p class="font-bold text-gray-900">CHF {data.ride.pricePerPerson.toFixed(2)}</p>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
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
    <!-- Abholort mit Autocomplete ──────────────────────────────────────── -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="relative" onclick={(e) => e.stopPropagation()}>
      <label for="pickupLocation" class="block text-sm font-medium text-gray-700 mb-1.5">
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
          class="w-full pl-9 pr-4 py-3 rounded-xl border {pickupCoords ? 'border-green-300 bg-green-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
        />
      </div>
      {#if !pickupCoords && pickupInput.length > 0}
        <p class="text-xs text-amber-600 mt-1">Bitte eine Adresse aus der Liste waehlen, damit Zeiten berechnet werden koennen.</p>
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
                  <span class="text-gray-400 ml-1">
                    {[s.properties.city, s.properties.county].filter(Boolean).join(', ')}
                  </span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Zeitvorschau ──────────────────────────────────────────────────── -->
    {#if preview}
      <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2.5">
          Zeitvorschau <span class="font-normal">(Schaetzung — finale Zeiten nach Buchung)</span>
        </p>
        <div class="flex flex-col gap-1.5 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-blue-700">Empfohlen bereit ab</span>
            <span class="font-bold text-blue-900">{formatTime(preview.recommendedReadyTime)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-blue-700">Fahrer kommt ca.</span>
            <span class="font-semibold text-blue-900">~{formatTime(preview.estimatedPickupTime)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-blue-700">Spaetestens bereit</span>
            <span class="font-semibold text-amber-600">{formatTime(preview.latestReadyTime)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-blue-700">Ankunft Event ca.</span>
            <span class="font-semibold text-blue-900">~{formatTime(preview.estimatedArrival)}</span>
          </div>
        </div>
      </div>
    {:else if pickupCoords && !data.ride.startCoordsRough}
      <div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
        Zeitvorschau wird beim naechsten Laden verfuegbar sein. Genaue Zeiten erscheinen nach der Buchung.
      </div>
    {/if}

    <!-- Fairplay-Regel ─────────────────────────────────────────────────── -->
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p class="text-sm font-semibold text-amber-800 mb-1">Fairplay-Regel</p>
      <p class="text-xs text-amber-700 leading-relaxed">
        Sei <strong>8 Minuten vor</strong> der Abholzeit bereit.
        Der Fahrer wartet maximal <strong>{data.ride.noShowPolicy.waitMinutes} Minuten</strong>.
        Bei Nichterscheinen: <strong>CHF {data.ride.pricePerPerson.toFixed(2)}</strong> werden einbehalten
        ({data.ride.noShowPolicy.penaltyPercent}% des Fahrpreises).
      </p>
    </div>

    <label class="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        name="agreeTerms"
        bind:checked={agreed}
        class="mt-0.5 w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-300"
      />
      <span class="text-sm text-gray-600">
        Ich bin puenktlich an meinem Abholort und akzeptiere die Fairplay-Regel.
      </span>
    </label>

    <button
      type="submit"
      disabled={loading || !agreed}
      class="mt-2 w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Wird gebucht...' : `Jetzt buchen – CHF ${data.ride.pricePerPerson.toFixed(2)}`}
    </button>
  </form>
</div>
