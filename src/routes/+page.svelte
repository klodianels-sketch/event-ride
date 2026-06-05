<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import RideCard from '$lib/components/RideCard.svelte';
  import { haversineSeconds } from '$lib/routing';
  import type { PublicRideDTO } from '$lib/dto';
  import type { EventCategory } from '$lib/types';

  let { data } = $props();

  // ── Abholort ─────────────────────────────────────────────────
  let pickupInput = $state('');
  let pickupCoords = $state<{ lat: number; lon: number } | null>(null);
  let pickupConfirmed = $state('');
  let pickupSuggestions = $state<any[]>([]);
  let pickupGpsLoading = $state(false);
  let pickupGpsError = $state('');
  let pickupTypingTimer: ReturnType<typeof setTimeout> | null = null;
  let showPickupDropdown = $state(false);

  // ── Kategorie-Filter ─────────────────────────────────────────
  let activeCategory = $state<EventCategory | 'all'>('all');

  type CatChip = { key: EventCategory | 'all'; emoji: string; label: string };
  const CHIPS: CatChip[] = [
    { key: 'all',      emoji: '🗺️', label: 'Alle'      },
    { key: 'music',    emoji: '🎵', label: 'Musik'     },
    { key: 'festival', emoji: '🎪', label: 'Festival'  },
    { key: 'nightlife',emoji: '🌙', label: 'Nightlife' },
    { key: 'sport',    emoji: '⚡', label: 'Sport'     },
    { key: 'hiking',   emoji: '🏔️', label: 'Outdoor'   },
    { key: 'culture',  emoji: '🎭', label: 'Kultur'    },
  ];

  const filteredRides = $derived(
    activeCategory === 'all'
      ? data.rides
      : data.rides.filter((r: PublicRideDTO) => r.eventCategory === activeCategory)
  );

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
      pickupGpsError = 'Standortermittlung ist in diesem Browser nicht verfuegbar.';
      return;
    }
    pickupGpsLoading = true;
    pickupGpsError = '';
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
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
          ? 'Standortzugriff verweigert. Bitte die Einstellung im Browser pruefen.'
          : 'Standort konnte nicht ermittelt werden.';
    } finally {
      pickupGpsLoading = false;
    }
  }

  // ── Haversine-Vorschau (Client) ──────────────────────────────
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

  const anyMissingCoords = $derived(
    pickupCoords !== null && filteredRides.some((r: PublicRideDTO) => !r.startCoordsRough || !r.eventLocationCoords)
  );

  // Aktive Kategorie Label fuer den Listentitel
  const activeCatLabel = $derived(
    CHIPS.find(c => c.key === activeCategory)?.label ?? 'Fahrten'
  );

  // 20-Minuten-Detour-Filter: Filtert Fahrten mit zu grossem Umweg heraus
  // Wenn Abholort gesetzt ist und detourMinutes > 20, wird die Fahrt ausgeblendet
  const MAX_DETOUR_MINUTES = 20;
  let detourFilterActive = $state(false);

  const ridesWithPreview = $derived(
    filteredRides.map((ride: PublicRideDTO) => ({
      ride,
      preview: calcPreview(ride)
    }))
  );

  const displayedRides = $derived(
    detourFilterActive && pickupCoords
      ? ridesWithPreview.filter(({ preview }) => !preview || preview.detourMinutes <= MAX_DETOUR_MINUTES)
      : ridesWithPreview
  );

  const hiddenByDetourFilter = $derived(
    detourFilterActive && pickupCoords
      ? ridesWithPreview.length - displayedRides.length
      : 0
  );
</script>

<svelte:head>
  <title>EventRide – Mitfahren zu Events</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="flex flex-col min-h-screen" onclick={() => { showPickupDropdown = false; }}>

  <!-- Header ──────────────────────────────────────────────────── -->
  <div class="bg-gradient-to-b from-rose-600 to-rose-500 px-4 pt-12 pb-5">
    <div class="flex items-center justify-between mb-3">
      <div>
        <p class="text-rose-200 text-xs font-semibold tracking-widest uppercase">EventRide</p>
        <h1 class="text-white text-2xl font-bold leading-tight">
          {#if data.user}
            Hallo, {data.user.firstName}!
          {:else}
            Entdecke Events 🎉
          {/if}
        </h1>
      </div>
      {#if data.user}
        <a href="/my/profile" class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/30 hover:ring-white/60 transition-all">
          {#if data.user.avatarUrl}
            <img src={data.user.avatarUrl} alt="{data.user.firstName}" class="w-full h-full object-cover" />
          {:else}
            <div class="w-full h-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {data.user.firstName[0]}{data.user.lastName[0]}
            </div>
          {/if}
        </a>
      {:else}
        <a href="/auth/login" class="bg-white text-rose-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-rose-50 transition-colors">
          Anmelden
        </a>
      {/if}
    </div>

    <!-- Abholort-Widget ─────────────────────────────────────────── -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div onclick={(e) => e.stopPropagation()}>
      {#if pickupConfirmed && pickupCoords}
        <div class="bg-white/15 backdrop-blur rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-white/70 text-xs">Dein Abholort</p>
              <p class="text-white font-semibold text-sm truncate">{pickupConfirmed}</p>
            </div>
          </div>
          <button
            type="button"
            onclick={clearPickup}
            class="text-white/70 text-xs font-semibold shrink-0 hover:text-white transition-colors px-2 py-1"
          >
            Aendern
          </button>
        </div>
        {#if anyMissingCoords}
          <p class="text-rose-200 text-xs mt-1.5 px-1">Zeiten werden beim naechsten Laden aktualisiert.</p>
        {:else}
          <p class="text-rose-200 text-xs mt-1.5 px-1">Abholzeiten unten sind auf deinen Standort angepasst.</p>
        {/if}
      {:else}
        <!-- Abholort-Eingabe -->
        <div class="relative">
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              <input
                type="text"
                bind:value={pickupInput}
                oninput={onPickupInput}
                onfocus={() => { if (pickupInput.length >= 3) showPickupDropdown = true; }}
                placeholder="Abholort eingeben..."
                autocomplete="off"
                class="w-full pl-9 pr-3 py-3 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 shadow-sm"
              />
            </div>
            <button
              type="button"
              onclick={(e) => { e.stopPropagation(); getPickupFromGps(); }}
              disabled={pickupGpsLoading}
              title="Aktuellen Standort verwenden"
              aria-label="GPS-Standort verwenden"
              class="px-3 bg-white rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center shadow-sm"
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
                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-2"
                  >
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <div>
                      <span class="font-medium">{s.properties.name ?? ''}</span>
                      {#if s.properties.city || s.properties.county}
                        <span class="text-gray-400 ml-1 text-xs">
                          {[s.properties.city, s.properties.county].filter(Boolean).join(', ')}
                        </span>
                      {/if}
                    </div>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        {#if pickupGpsError}
          <p class="text-rose-200 text-xs mt-1.5 px-1">{pickupGpsError}</p>
        {:else}
          <p class="text-rose-200/80 text-xs mt-1.5 px-1">Abholort eingeben → Zeiten werden personalisiert</p>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Kategorie-Chips ─────────────────────────────────────────── -->
  <div class="px-4 py-3 overflow-x-auto flex gap-2 scrollbar-hide border-b border-gray-100 bg-white">
    {#each CHIPS as chip}
      <button
        type="button"
        onclick={() => { activeCategory = chip.key; }}
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all {activeCategory === chip.key
          ? 'bg-rose-600 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      >
        <span>{chip.emoji}</span>
        <span>{chip.label}</span>
      </button>
    {/each}
  </div>

  <!-- Suche ──────────────────────────────────────────────────── -->
  <div class="px-4 pt-4 pb-2 bg-white">
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

  <!-- Fahrten-Feed ────────────────────────────────────────────── -->
  <div class="px-4 pt-3 flex-1 bg-white">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-bold text-gray-900">
        {data.search
          ? `Ergebnisse für „${data.search}"`
          : activeCategory === 'all'
            ? 'Mitfahrgelegenheiten'
            : activeCatLabel}
      </h2>
      <div class="flex items-center gap-2">
        {#if filteredRides.length > 0}
          <span class="text-sm text-gray-400 font-medium">{displayedRides.length}</span>
        {/if}
        <!-- 20-Min-Filter Toggle (nur wenn Abholort gesetzt) -->
        {#if pickupCoords}
          <button
            type="button"
            onclick={() => { detourFilterActive = !detourFilterActive; }}
            class="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors {detourFilterActive
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300'}"
            title="Nur Fahrten ≤20 Min Umweg anzeigen"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.02 0-.71-.71M6.34 6.34l-.71-.71"/>
            </svg>
            Auf Route
          </button>
        {/if}
      </div>
    </div>

    {#if hiddenByDetourFilter > 0}
      <p class="text-xs text-gray-400 mb-3 flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {hiddenByDetourFilter} Fahrt{hiddenByDetourFilter > 1 ? 'en' : ''} mit grossem Umweg ausgeblendet
      </p>
    {/if}

    {#if displayedRides.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        {#if detourFilterActive && pickupCoords && ridesWithPreview.length > 0}
          <div class="text-5xl mb-4">🗺️</div>
          <p class="font-semibold text-gray-800 mb-1">Keine passenden Fahrten</p>
          <p class="text-gray-400 text-sm mb-4">Alle Fahrten haben einen Umweg von mehr als 20 Minuten.</p>
          <button
            type="button"
            onclick={() => { detourFilterActive = false; }}
            class="text-rose-600 font-semibold text-sm mb-4"
          >
            Filter aufheben
          </button>
        {:else if activeCategory !== 'all'}
          <div class="text-5xl mb-4">{CHIPS.find(c => c.key === activeCategory)?.emoji}</div>
          <p class="font-semibold text-gray-800 mb-1">Noch keine {activeCatLabel}-Fahrten</p>
          <p class="text-gray-400 text-sm mb-4">Sei der Erste und biete eine Fahrt an.</p>
          <button
            type="button"
            onclick={() => { activeCategory = 'all'; }}
            class="text-rose-600 font-semibold text-sm mb-2"
          >
            Alle Fahrten anzeigen
          </button>
        {:else if data.search}
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
          </div>
          <p class="font-semibold text-gray-800 mb-1">Keine Fahrten gefunden</p>
          <p class="text-gray-400 text-sm mb-4">Für „{data.search}" gibt es noch nichts.</p>
          <a href="/" class="text-rose-600 font-semibold text-sm mb-2">Alle Fahrten anzeigen</a>
        {:else}
          <div class="text-5xl mb-4">🚗</div>
          <p class="font-semibold text-gray-800 mb-1">Noch keine Fahrten verfügbar</p>
          <p class="text-gray-400 text-sm mb-5">Leg los und biete die erste Fahrt an!</p>
        {/if}
        <a href="/rides/new" class="bg-rose-600 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-rose-700 transition-colors">
          Fahrt anbieten
        </a>
      </div>
    {:else}
      <div class="flex flex-col gap-4 pb-8">
        {#each displayedRides as { ride, preview } (ride._id)}
          <RideCard {ride} {preview} {pickupCoords} />
        {/each}
      </div>
    {/if}
  </div>
</div>
