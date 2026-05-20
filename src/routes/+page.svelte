<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import RideCard from '$lib/components/RideCard.svelte';
  import { haversineSeconds } from '$lib/routing';
  import type { PublicRideDTO } from '$lib/dto';

  let { data } = $props();

  // ── Mitfahrer-Abholort ───────────────────────────────────────────────
  let pickupInput = $state('');
  let pickupCoords = $state<{ lat: number; lon: number } | null>(null);
  let pickupConfirmed = $state('');
  let pickupSuggestions = $state<any[]>([]);
  let pickupGpsLoading = $state(false);
  let pickupGpsError = $state('');
  let pickupTypingTimer: ReturnType<typeof setTimeout> | null = null;
  let showPickupDropdown = $state(false);

  onMount(() => {
    if (!browser) return;
    const label = sessionStorage.getItem('er_pickupLabel');
    const coords = sessionStorage.getItem('er_pickupCoords');
    if (label) { pickupConfirmed = label; pickupInput = label; }
    if (coords) {
      try { pickupCoords = JSON.parse(coords); } catch { /* ignore */ }
    }
  });

  function savePickup(label: string, coords: { lat: number; lon: number }) {
    pickupConfirmed = label;
    pickupCoords = coords;
    pickupInput = label;
    pickupSuggestions = [];
    showPickupDropdown = false;
    if (browser) {
      sessionStorage.setItem('er_pickupLabel', label);
      sessionStorage.setItem('er_pickupCoords', JSON.stringify(coords));
    }
  }

  function clearPickup() {
    pickupConfirmed = '';
    pickupCoords = null;
    pickupInput = '';
    if (browser) {
      sessionStorage.removeItem('er_pickupLabel');
      sessionStorage.removeItem('er_pickupCoords');
    }
  }

  function onPickupInput() {
    if (pickupTypingTimer) clearTimeout(pickupTypingTimer);
    showPickupDropdown = true;
    // Koordinaten zuruecksetzen bis Nutzer neu aus Liste waehlt
    pickupCoords = null;
    pickupConfirmed = '';
    if (pickupInput.length < 3) { pickupSuggestions = []; return; }
    pickupTypingTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(pickupInput)}&bbox=5.9,45.8,10.5,47.8&limit=5`,
          { signal: AbortSignal.timeout(5000) }
        );
        const json = await res.json();
        pickupSuggestions = json.features ?? [];
      } catch { pickupSuggestions = []; }
    }, 300);
  }

  function selectPickupSuggestion(s: any) {
    const p = s.properties;
    const label = [p.name, p.street, p.city ?? p.county].filter(Boolean).join(', ');
    const [lon, lat] = s.geometry.coordinates as [number, number];
    savePickup(label, { lat, lon });
  }

  async function getPickupFromGps() {
    if (!browser || !navigator.geolocation) {
      pickupGpsError = 'Geolocation ist in diesem Browser nicht verfuegbar.';
      return;
    }
    pickupGpsLoading = true;
    pickupGpsError = '';
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      // Ohne User-Agent (Browser-Einschraenkung) — Nominatim meist tolerant
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      const d = await res.json();
      const addr = d?.address ?? {};
      const street = addr.road ?? '';
      const num = addr.house_number ? ` ${addr.house_number}` : '';
      const city = addr.city ?? addr.town ?? addr.village ?? '';
      const label = street
        ? `${street}${num}, ${city}`.trim().replace(/,\s*$/, '')
        : city || 'Mein Standort';
      savePickup(label, { lat: latitude, lon: longitude });
    } catch (err: any) {
      pickupGpsError =
        err?.code === 1
          ? 'Standortzugriff verweigert. Bitte Einstellung im Browser pruefen.'
          : 'Standort konnte nicht ermittelt werden.';
    } finally {
      pickupGpsLoading = false;
    }
  }

  // ── Personalisierte Vorschau ─────────────────────────────────────────
  // Haversine-Schaetzung, client-seitig, kein OSRM
  function calcPreview(ride: PublicRideDTO) {
    if (!pickupCoords || !ride.startCoordsRough || !ride.eventLocationCoords) return null;
    const { lat: sLat, lon: sLon } = ride.startCoordsRough;
    const { lat: eLat, lon: eLon } = ride.eventLocationCoords;
    const { lat: pLat, lon: pLon } = pickupCoords;
    const toPickup = haversineSeconds(sLat, sLon, pLat, pLon);
    const pickupToEvent = haversineSeconds(pLat, pLon, eLat, eLon);
    const directToEvent = haversineSeconds(sLat, sLon, eLat, eLon);
    const departure = new Date(ride.departureTime);
    const estimatedPickupTime = new Date(departure.getTime() + toPickup * 1000);
    const estimatedArrivalAtEvent = new Date(
      estimatedPickupTime.getTime() + 120_000 + pickupToEvent * 1000
    );
    const detourMinutes = Math.max(0, Math.round((toPickup + pickupToEvent - directToEvent) / 60));
    return { estimatedPickupTime, estimatedArrivalAtEvent, detourMinutes };
  }

  // Zeigt an ob ein Ride Preview-faehig ist (hat Koordinaten)
  function rideHasCoords(ride: PublicRideDTO): boolean {
    return !!(ride.startCoordsRough && ride.eventLocationCoords);
  }

  // Ob irgendein Ride noch keine Koordinaten hat (fuer Hinweistext)
  const anyMissingCoords = $derived(
    pickupCoords !== null && data.rides.some(r => !rideHasCoords(r))
  );
</script>

<svelte:head>
  <title>EventRide – Mitfahrgelegenheiten fuer Events</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="flex flex-col min-h-screen"
  onclick={() => { showPickupDropdown = false; }}
>
  <div class="px-4 pt-12 pb-3">
    <p class="text-gray-500 text-sm">Willkommen bei</p>
    <h1 class="text-2xl font-bold text-gray-900">EventRide</h1>
  </div>

  <!-- Abholort-Widget ─────────────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="px-4 pb-3" onclick={(e) => e.stopPropagation()}>
    <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3">
      <p class="text-xs font-semibold text-rose-700 mb-2 uppercase tracking-wide">Dein Abholort</p>

      {#if pickupConfirmed && pickupCoords}
        <!-- Zustand: Abholort gesetzt ─────────── -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <svg class="w-4 h-4 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span class="text-sm font-medium text-gray-900 truncate">{pickupConfirmed}</span>
          </div>
          <button
            type="button"
            onclick={clearPickup}
            class="text-xs text-rose-600 font-semibold shrink-0 hover:text-rose-800 transition-colors"
          >
            Aendern
          </button>
        </div>
        <p class="text-xs text-rose-600 mt-1.5 leading-relaxed">
          {#if anyMissingCoords}
            Personalisierte Zeiten laden beim naechsten Refresh.
          {:else}
            Fahrtzeiten unten sind auf deinen Abholort angepasst.
          {/if}
        </p>
      {:else}
        <!-- Zustand: Kein Abholort ──────────── -->
        <div class="relative">
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              <input
                type="text"
                bind:value={pickupInput}
                oninput={onPickupInput}
                placeholder="z.B. Winterthur Bahnhof"
                autocomplete="off"
                class="w-full pl-9 pr-3 py-2.5 bg-white border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <button
              type="button"
              onclick={(e) => { e.stopPropagation(); getPickupFromGps(); }}
              disabled={pickupGpsLoading}
              title="Aktuellen Standort verwenden"
              aria-label="GPS-Standort verwenden"
              class="px-3 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50 flex items-center"
            >
              {#if pickupGpsLoading}
                <svg class="w-4 h-4 text-rose-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              {:else}
                <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                </svg>
              {/if}
            </button>
          </div>

          {#if showPickupDropdown && pickupSuggestions.length > 0}
            <ul class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {#each pickupSuggestions as s (s.properties.osm_id ?? s.properties.name)}
                <li>
                  <button
                    type="button"
                    onclick={(e) => { e.stopPropagation(); selectPickupSuggestion(s); }}
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

        {#if pickupGpsError}
          <p class="text-xs text-red-600 mt-1">{pickupGpsError}</p>
        {/if}
        {#if !pickupGpsError}
          <p class="text-xs text-rose-400 mt-1.5">
            Abholort setzen, um personalisierte Abholzeiten zu sehen.
          </p>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Suche ──────────────────────────────────────────────────────────── -->
  <div class="px-4 pb-4">
    <form method="GET" class="flex gap-2">
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <input
          name="q"
          type="text"
          value={data.search ?? ''}
          placeholder="Event oder Ort suchen..."
          class="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      </div>
      <button
        type="submit"
        class="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors"
      >
        Suchen
      </button>
    </form>
  </div>

  <!-- Fahrten-Liste ──────────────────────────────────────────────────── -->
  <div class="px-4 flex-1">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-bold text-gray-900 text-lg">
        {data.search ? `Ergebnisse fuer "${data.search}"` : 'Mitfahrgelegenheiten'}
      </h2>
      {#if data.rides.length > 0}
        <span class="text-sm text-gray-400">{data.rides.length}</span>
      {/if}
    </div>

    {#if data.rides.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25"/>
          </svg>
        </div>
        {#if data.search}
          <p class="text-gray-500 text-sm">Keine Fahrten fuer "{data.search}" gefunden.</p>
          <a href="/" class="mt-3 text-rose-600 font-semibold text-sm">Alle Fahrten anzeigen</a>
        {:else}
          <p class="text-gray-500 text-sm">Noch keine Fahrten verfuegbar.</p>
        {/if}
        <a href="/rides/new" class="mt-4 bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 transition-colors">
          Erste Fahrt anbieten
        </a>
      </div>
    {:else}
      <div class="flex flex-col gap-4 pb-6">
        {#each data.rides as ride (ride._id)}
          {@const preview = calcPreview(ride)}
          <RideCard {ride} {preview} {pickupCoords} />
        {/each}
      </div>
    {/if}
  </div>
</div>
