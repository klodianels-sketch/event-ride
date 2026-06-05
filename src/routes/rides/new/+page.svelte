<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';

  let { form } = $props();

  // ── Form-State ─────────────────────────────────────────────────
  let loading       = $state(false);
  let locationLoading = $state(false);
  let locationError   = $state('');
  let startLocationValue = $state('');
  let eventLocationValue = $state('');
  let eventNameValue     = $state('');
  let selectedCategory   = $state('other');

  // ── Koordinaten (für Route-Preview und Marker) ────────────────
  let startCoords = $state<{ lat: number; lon: number } | null>(null);
  let eventCoords = $state<{ lat: number; lon: number } | null>(null);

  // ── Keyboard-Navigation für Suggestion-Listen ────────────────
  let focusedSuggestionIdx = $state(-1);

  function resetSuggestionFocus() { focusedSuggestionIdx = -1; }

  function handleSuggestionKeydown<T>(
    e: KeyboardEvent,
    list: T[],
    selectFn: (item: T) => void,
    closeFn: () => void
  ) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedSuggestionIdx = Math.min(focusedSuggestionIdx + 1, list.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedSuggestionIdx = Math.max(focusedSuggestionIdx - 1, -1);
    } else if (e.key === 'Enter' && focusedSuggestionIdx >= 0) {
      e.preventDefault();
      selectFn(list[focusedSuggestionIdx]);
      resetSuggestionFocus();
    } else if (e.key === 'Escape') {
      closeFn();
      resetSuggestionFocus();
    }
  }

  // ── Zwischenstopps ────────────────────────────────────────────
  interface Waypoint { id: string; label: string; lat: number; lon: number }
  let waypoints     = $state<Waypoint[]>([]);
  let wpInput       = $state('');
  let wpSuggestions = $state<PhotonFeature[]>([]);
  let showWpSuggestions = $state(false);
  let wpTypingTimer: ReturnType<typeof setTimeout> | null = null;
  let showWpInput   = $state(false);

  // ── Route-Vorschau ────────────────────────────────────────────
  interface RoutePreview {
    geometry: [number, number][];
    durationSeconds: number;
    distanceMeters: number;
    accuracy: 'exact' | 'fallback';
  }
  let routePreview = $state<RoutePreview | null>(null);
  let routeLoading = $state(false);

  // ── Location Suggestions ──────────────────────────────────────
  interface PhotonFeature {
    properties: { name?: string; street?: string; city?: string; county?: string; osm_id?: number };
    geometry: { coordinates: [number, number] };
  }
  let suggestions  = $state<PhotonFeature[]>([]);
  let activeField  = $state<'start' | 'event' | null>(null);
  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Event-Autosuggest ─────────────────────────────────────────
  let eventSuggestions   = $state<Array<{ name: string; category?: string; location?: string }>>([]);
  let showEventSuggestions = $state(false);
  let eventTypingTimer: ReturnType<typeof setTimeout> | null = null;

  const CATEGORIES = [
    { key: 'music',    emoji: '🎵', label: 'Musik'    },
    { key: 'festival', emoji: '🎪', label: 'Festival' },
    { key: 'nightlife',emoji: '🌙', label: 'Nightlife'},
    { key: 'sport',    emoji: '⚡', label: 'Sport'    },
    { key: 'hiking',   emoji: '🏔️', label: 'Outdoor'  },
    { key: 'culture',  emoji: '🎭', label: 'Kultur'   },
    { key: 'other',    emoji: '✨', label: 'Weiteres' },
  ];
  const CATEGORY_MAP: Record<string, string> = {
    music:'🎵', festival:'🎪', nightlife:'🌙', sport:'⚡', hiking:'🏔️', culture:'🎭', other:'✨'
  };

  // ── Leaflet ───────────────────────────────────────────────────
  let mapContainer: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let map: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let L: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let startMarker: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventMarker: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeLayer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wpMarkers: any[] = [];

  onMount(async () => {
    if (!browser) return;
    const mod = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    L = mod.default ?? mod;
    map = L.map(mapContainer, { zoomControl: true }).setView([47.3769, 8.5417], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    // Falls schon Koordinaten vorhanden, Route sofort zeichnen
    if (startCoords && eventCoords) triggerRouteUpdate();
  });

  onDestroy(() => { if (map) map.remove(); });

  // ── Icon-Helfer ───────────────────────────────────────────────
  function makeIcon(color: string, size = 14) {
    return L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: ''
    });
  }

  function setStartMarker(lat: number, lon: number) {
    if (!map || !L) return;
    map.setView([lat, lon], 13);
    if (startMarker) startMarker.remove();
    startMarker = L.marker([lat, lon], { icon: makeIcon('#e11d48') }).addTo(map);
  }

  function setEventMarker(lat: number, lon: number) {
    if (!map || !L) return;
    if (eventMarker) eventMarker.remove();
    eventMarker = L.marker([lat, lon], { icon: makeIcon('#1f2937') }).addTo(map);
  }

  function redrawWaypointMarkers() {
    wpMarkers.forEach(m => m.remove());
    wpMarkers = [];
    if (!map || !L) return;
    for (const wp of waypoints) {
      wpMarkers.push(L.marker([wp.lat, wp.lon], { icon: makeIcon('#f59e0b', 12) }).addTo(map));
    }
  }

  function drawRoute(geometry: [number, number][]) {
    if (!map || !L || geometry.length < 2) return;
    if (routeLayer) routeLayer.remove();
    routeLayer = L.polyline(geometry, { color: '#e11d48', weight: 3.5, opacity: 0.7 }).addTo(map);
    const bounds = routeLayer.getBounds();
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14, animate: true });
  }

  // ── Route berechnen ───────────────────────────────────────────
  async function triggerRouteUpdate() {
    if (!startCoords || !eventCoords) return;
    routeLoading = true;
    try {
      const wpStr = waypoints.map(w => `${w.lat},${w.lon}`).join('|');
      const params = new URLSearchParams({
        start: `${startCoords.lat},${startCoords.lon}`,
        end:   `${eventCoords.lat},${eventCoords.lon}`,
        ...(wpStr ? { waypoints: wpStr } : {})
      });
      const res  = await fetch(`/api/route?${params}`);
      const data = await res.json() as RoutePreview & { error?: string };
      if (!data.error && data.geometry) {
        routePreview = { geometry: data.geometry, durationSeconds: data.durationSeconds, distanceMeters: data.distanceMeters, accuracy: data.accuracy };
        drawRoute(data.geometry);
        redrawWaypointMarkers();
      }
    } catch {
      // Leise scheitern — Karte zeigt dann nur Marker
    } finally {
      routeLoading = false;
    }
  }

  // ── Routendauer/Distanz formatieren ──────────────────────────
  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m} Min`;
    return m > 0 ? `${h} Std ${m} Min` : `${h} Std`;
  }
  function formatDistance(meters: number): string {
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(0)} km`;
  }

  // ── Location-Suggestions ─────────────────────────────────────
  function handleField(field: 'start' | 'event') {
    const value = field === 'start' ? startLocationValue : eventLocationValue;
    activeField = field;
    resetSuggestionFocus();
    if (typingTimer) clearTimeout(typingTimer);
    if (value.length < 3) { suggestions = []; return; }
    typingTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&bbox=5.9,45.8,10.5,47.8&limit=5`,
          { signal: AbortSignal.timeout(5000) }
        );
        const json = await res.json() as { features?: PhotonFeature[] };
        suggestions = json.features ?? [];
      } catch { suggestions = []; }
    }, 300);
  }

  function selectSuggestion(s: PhotonFeature) {
    const p = s.properties;
    const label = [p.name, p.street, p.city ?? p.county].filter(Boolean).join(', ');
    const [lon, lat] = s.geometry.coordinates;
    if (activeField === 'start') {
      startLocationValue = label;
      startCoords = { lat, lon };
      setStartMarker(lat, lon);
      if (eventCoords) triggerRouteUpdate();
    } else if (activeField === 'event') {
      eventLocationValue = label;
      eventCoords = { lat, lon };
      setEventMarker(lat, lon);
      if (startCoords) triggerRouteUpdate();
    }
    suggestions = [];
    activeField = null;
  }

  // ── Waypoint-Suggestions ──────────────────────────────────────
  function handleWpInput() {
    showWpSuggestions = true;
    if (wpTypingTimer) clearTimeout(wpTypingTimer);
    if (wpInput.length < 3) { wpSuggestions = []; return; }
    wpTypingTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(wpInput)}&bbox=5.9,45.8,10.5,47.8&limit=5`,
          { signal: AbortSignal.timeout(5000) }
        );
        const json = await res.json() as { features?: PhotonFeature[] };
        wpSuggestions = json.features ?? [];
      } catch { wpSuggestions = []; }
    }, 300);
  }

  function selectWpSuggestion(s: PhotonFeature) {
    const p = s.properties;
    const label = [p.name, p.street, p.city ?? p.county].filter(Boolean).join(', ');
    const [lon, lat] = s.geometry.coordinates;
    waypoints = [...waypoints, { id: crypto.randomUUID(), label, lat, lon }];
    wpInput = '';
    wpSuggestions = [];
    showWpSuggestions = false;
    showWpInput = false;
    if (startCoords && eventCoords) triggerRouteUpdate();
  }

  function removeWaypoint(id: string) {
    waypoints = waypoints.filter(w => w.id !== id);
    if (startCoords && eventCoords) triggerRouteUpdate();
  }

  // ── Event-Autosuggest ─────────────────────────────────────────
  function onEventNameInput() {
    showEventSuggestions = true;
    if (eventTypingTimer) clearTimeout(eventTypingTimer);
    if (eventNameValue.length < 2) { eventSuggestions = []; return; }
    eventTypingTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/events?q=${encodeURIComponent(eventNameValue)}`);
        const data = await res.json() as { suggestions?: typeof eventSuggestions };
        eventSuggestions = data.suggestions ?? [];
      } catch { eventSuggestions = []; }
    }, 250);
  }

  function selectEventSuggestion(s: { name: string; category?: string; location?: string }) {
    eventNameValue = s.name;
    if (s.location && !eventLocationValue) eventLocationValue = s.location;
    if (s.category) selectedCategory = s.category;
    eventSuggestions = [];
    showEventSuggestions = false;
  }

  // ── GPS-Standort ──────────────────────────────────────────────
  async function getMyLocation() {
    if (!browser || !navigator.geolocation) {
      locationError = 'Standortermittlung wird von diesem Browser nicht unterstützt.';
      return;
    }
    locationLoading = true;
    locationError = '';
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { 'User-Agent': 'EventRideApp/1.0 (ZHAW Student Project)' } }
      );
      const data = await res.json() as { address?: Record<string, string>; display_name?: string };
      const addr = data?.address ?? {};
      const street = addr['road'] ?? '';
      const num  = addr['house_number'] ? ` ${addr['house_number']}` : '';
      const city = addr['city'] ?? addr['town'] ?? addr['village'] ?? '';
      startLocationValue = street
        ? `${street}${num}, ${city}`.trim().replace(/,\s*$/, '')
        : city || String(data.display_name ?? '').split(',')[0].trim();
      startCoords = { lat: latitude, lon: longitude };
      setStartMarker(latitude, longitude);
      if (eventCoords) triggerRouteUpdate();
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      locationError = code === 1
        ? 'Standortzugriff verweigert. Bitte in den Browser-Einstellungen erlauben.'
        : 'Standort konnte nicht ermittelt werden.';
    } finally {
      locationLoading = false;
    }
  }

  function closeAllDropdowns() {
    suggestions = [];
    activeField = null;
    showEventSuggestions = false;
    showWpSuggestions = false;
    showWpInput = false;
    resetSuggestionFocus();
  }

  // ── Berechnete Werte ──────────────────────────────────────────
  const routeReady = $derived(startCoords !== null && eventCoords !== null);
  const waypointsJson = $derived(JSON.stringify(waypoints.map(({ label, lat, lon }) => ({ label, lat, lon }))));
</script>

<svelte:head>
  <title>Fahrt anbieten – EventRide</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="flex flex-col min-h-screen bg-gray-50" onclick={closeAllDropdowns}>

  <!-- Header ──────────────────────────────────────────────────── -->
  <div class="bg-gradient-to-b from-gray-900 to-gray-800 px-4 pt-12 pb-6">
    <a href="/" class="text-gray-400 text-sm flex items-center gap-1.5 mb-5 hover:text-gray-200 transition-colors w-fit">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Zurück
    </a>
    <div class="flex items-end justify-between">
      <div>
        <p class="text-gray-400 text-xs font-semibold uppercase tracking-widest">Neue Fahrt</p>
        <h1 class="text-2xl font-bold text-white mt-1">Fahrt anbieten</h1>
        <p class="text-gray-400 text-sm mt-1">Teile deine Strecke zum Event.</p>
      </div>
      <div class="w-10 h-10 rounded-full bg-rose-600/20 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="px-4 py-5 flex flex-col gap-6" onclick={(e) => e.stopPropagation()}>

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3.5 text-sm flex items-start gap-2.5">
        <svg class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
        </svg>
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return ({ update }) => { loading = false; update(); };
      }}
      class="flex flex-col gap-6"
    >
      <!-- Waypoints als verstecktes Feld -->
      <input type="hidden" name="waypoints" value={waypointsJson} />

      <!-- ── ABSCHNITT 1: Event ─────────────────────────────────── -->
      <section class="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="px-4 pt-4 pb-1">
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Event</p>
        </div>
        <div class="px-4 pb-4 flex flex-col gap-4">

          <!-- Kategorie -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Event-Typ</label>
            <div class="flex flex-wrap gap-1.5">
              {#each CATEGORIES as cat}
                <label class="cursor-pointer">
                  <input type="radio" name="eventCategory" value={cat.key} bind:group={selectedCategory} class="sr-only" />
                  <span class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all {selectedCategory === cat.key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}">
                    {cat.emoji} {cat.label}
                  </span>
                </label>
              {/each}
            </div>
          </div>

          <!-- Event-Name mit Autosuggest -->
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="relative" onclick={(e) => e.stopPropagation()}>
            <label for="eventName" class="block text-sm font-semibold text-gray-700 mb-1.5">
              Event-Name <span class="text-rose-500">*</span>
            </label>
            <input
              id="eventName" name="eventName" type="text" required
              bind:value={eventNameValue}
              oninput={onEventNameInput}
              onfocus={() => { if (eventNameValue.length >= 2) showEventSuggestions = true; }}
              onkeydown={(e) => handleSuggestionKeydown(e, eventSuggestions, selectEventSuggestion, () => { showEventSuggestions = false; })}
              autocomplete="off"
              aria-autocomplete="list"
              aria-expanded={showEventSuggestions && eventSuggestions.length > 0}
              placeholder="z.B. Openair Frauenfeld"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm transition-colors"
            />
            {#if showEventSuggestions && eventSuggestions.length > 0}
              <ul
                role="listbox"
                class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-56 overflow-y-auto"
              >
                {#each eventSuggestions as s, i}
                  <li role="option" aria-selected={focusedSuggestionIdx === i}>
                    <button
                      type="button"
                      onclick={() => { resetSuggestionFocus(); selectEventSuggestion(s); }}
                      class="w-full text-left px-4 py-2.5 border-b border-gray-100 last:border-0 flex items-center gap-3 transition-colors {focusedSuggestionIdx === i ? 'bg-rose-50' : 'hover:bg-gray-50'}"
                    >
                      <span class="text-base shrink-0">{CATEGORY_MAP[s.category ?? 'other'] ?? '✨'}</span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                        {#if s.location}<p class="text-xs text-gray-400 truncate">{s.location}</p>{/if}
                      </div>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <!-- Event-Ort -->
          <div class="relative">
            <label for="eventLocation" class="block text-sm font-semibold text-gray-700 mb-1.5">
              Veranstaltungsort <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <input
                id="eventLocation" name="eventLocation" type="text"
                bind:value={eventLocationValue}
                oninput={() => handleField('event')}
                onfocus={() => { if (eventLocationValue.length >= 3) activeField = 'event'; }}
                onkeydown={(e) => handleSuggestionKeydown(e, suggestions, selectSuggestion, () => { suggestions = []; activeField = null; })}
                autocomplete="off" required
                aria-autocomplete="list"
                aria-expanded={activeField === 'event' && suggestions.length > 0}
                placeholder="z.B. Frauenfeld, TG"
                class="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm transition-colors"
              />
            </div>
            {#if activeField === 'event' && suggestions.length > 0}
              <ul
                role="listbox"
                class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-56 overflow-y-auto"
              >
                {#each suggestions as s, i (s.properties.osm_id ?? s.properties.name)}
                  <li role="option" aria-selected={focusedSuggestionIdx === i}>
                    <button
                      type="button"
                      onclick={(e) => { e.stopPropagation(); resetSuggestionFocus(); selectSuggestion(s); }}
                      class="w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 flex items-center gap-2 transition-colors {focusedSuggestionIdx === i ? 'bg-rose-50 text-rose-700' : 'hover:bg-gray-50 text-gray-800'}"
                    >
                      <svg class="w-3.5 h-3.5 shrink-0 {focusedSuggestionIdx === i ? 'text-rose-400' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <div class="min-w-0">
                        <span class="font-medium truncate block">{s.properties.name ?? ''}</span>
                        {#if s.properties.city || s.properties.county}
                          <span class="text-gray-400 text-xs truncate block">{[s.properties.city, s.properties.county].filter(Boolean).join(', ')}</span>
                        {/if}
                      </div>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      </section>

      <!-- ── ABSCHNITT 2: Route ─────────────────────────────────── -->
      <section class="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="px-4 pt-4 pb-1">
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Deine Route</p>
        </div>
        <div class="px-4 pb-4 flex flex-col gap-4">

          <!-- Startort -->
          <!-- relative wrapper ist der Positionierungskontext für das Dropdown -->
          <div class="relative">
            <label for="startLocation" class="block text-sm font-semibold text-gray-700 mb-1">
              Dein Startort <span class="text-rose-500">*</span>
            </label>
            <p class="text-xs text-gray-400 mb-1.5">Nur deine Stadt wird öffentlich angezeigt — deine exakte Adresse bleibt privat.</p>
            <div class="flex gap-2">
              <div class="flex-1 relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-sm z-10 pointer-events-none"></div>
                <input
                  id="startLocation" name="startLocation" type="text"
                  bind:value={startLocationValue}
                  oninput={() => handleField('start')}
                  onfocus={() => { if (startLocationValue.length >= 3) activeField = 'start'; }}
                  onkeydown={(e) => handleSuggestionKeydown(e, suggestions, selectSuggestion, () => { suggestions = []; activeField = null; })}
                  autocomplete="off" required
                  aria-autocomplete="list"
                  aria-expanded={activeField === 'start' && suggestions.length > 0}
                  placeholder="z.B. Zürich, Stauffacherstr. 1"
                  class="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm transition-colors"
                />
              </div>
              <button
                type="button"
                onclick={(e) => { e.stopPropagation(); getMyLocation(); }}
                disabled={locationLoading}
                title="GPS-Standort verwenden"
                aria-label="GPS-Standort verwenden"
                class="px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center"
              >
                {#if locationLoading}
                  <svg class="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                {:else}
                  <svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                  </svg>
                {/if}
              </button>
            </div>
            {#if locationError}
              <p class="text-xs text-red-600 mt-1">{locationError}</p>
            {/if}
            {#if activeField === 'start' && suggestions.length > 0}
              <ul
                role="listbox"
                class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-56 overflow-y-auto"
              >
                {#each suggestions as s, i (s.properties.osm_id ?? s.properties.name)}
                  <li role="option" aria-selected={focusedSuggestionIdx === i}>
                    <button
                      type="button"
                      onclick={(e) => { e.stopPropagation(); resetSuggestionFocus(); selectSuggestion(s); }}
                      class="w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 flex items-center gap-2 transition-colors {focusedSuggestionIdx === i ? 'bg-rose-50 text-rose-700' : 'hover:bg-gray-50 text-gray-800'}"
                    >
                      <div class="w-3 h-3 rounded-full {focusedSuggestionIdx === i ? 'bg-rose-400' : 'bg-gray-300'} shrink-0"></div>
                      <div class="min-w-0">
                        <span class="font-medium truncate block">{s.properties.name ?? ''}</span>
                        {#if s.properties.city || s.properties.county}
                          <span class="text-gray-400 text-xs truncate block">{[s.properties.city, s.properties.county].filter(Boolean).join(', ')}</span>
                        {/if}
                      </div>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <!-- Zwischenstopps -->
          {#if waypoints.length > 0 || showWpInput}
            <div class="flex flex-col gap-2">
              {#each waypoints as wp (wp.id)}
                <div class="flex items-center gap-2.5">
                  <div class="flex flex-col items-center shrink-0">
                    <div class="w-0.5 h-3 bg-gray-200 ml-[1px]"></div>
                    <div class="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white shadow-sm shrink-0"></div>
                    <div class="w-0.5 h-3 bg-gray-200 ml-[1px]"></div>
                  </div>
                  <div class="flex-1 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <p class="text-sm text-gray-700 flex-1 truncate">{wp.label}</p>
                    <button
                      type="button"
                      onclick={() => removeWaypoint(wp.id)}
                      class="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      aria-label="Zwischenstopp entfernen"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              {/each}

              {#if showWpInput}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="relative" onclick={(e) => e.stopPropagation()}>
                  <input
                    type="text" bind:value={wpInput} oninput={handleWpInput}
                    onfocus={() => { if (wpInput.length >= 3) showWpSuggestions = true; }}
                    onkeydown={(e) => { if (e.key === 'Escape') { showWpInput = false; wpInput = ''; } }}
                    placeholder="Zwischenstopp eingeben..."
                    autocomplete="off"
                    class="w-full px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm"
                    autofocus
                  />
                  {#if showWpSuggestions && wpSuggestions.length > 0}
                    <ul class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      {#each wpSuggestions as s (s.properties.osm_id ?? s.properties.name)}
                        <li>
                          <button type="button" onclick={(e) => { e.stopPropagation(); selectWpSuggestion(s); }}
                            class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                            <span class="font-medium">{s.properties.name ?? ''}</span>
                            {#if s.properties.city || s.properties.county}
                              <span class="text-gray-400 ml-1 text-xs">{[s.properties.city, s.properties.county].filter(Boolean).join(', ')}</span>
                            {/if}
                          </button>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

          <!-- Zwischenstopp hinzufügen Button -->
          {#if !showWpInput}
            <button
              type="button"
              onclick={() => { showWpInput = true; }}
              class="flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 transition-colors py-1 w-fit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
              </svg>
              Zwischenstopp hinzufügen
            </button>
          {/if}

          <!-- Route-Zusammenfassung -->
          {#if routeReady}
            <div class="rounded-xl border overflow-hidden {routeLoading ? 'border-gray-100 bg-gray-50' : routePreview ? 'border-rose-100 bg-rose-50' : 'border-gray-100 bg-gray-50'}">
              <div class="px-3.5 py-3 flex items-center gap-3">
                {#if routeLoading}
                  <svg class="w-4 h-4 text-gray-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <p class="text-sm text-gray-500">Route wird berechnet…</p>
                {:else if routePreview}
                  <svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                  </svg>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-rose-700">
                      ca. {formatDuration(routePreview.durationSeconds)}
                      {#if routePreview.distanceMeters > 0}
                        · {formatDistance(routePreview.distanceMeters)}
                      {/if}
                    </p>
                    <p class="text-xs text-rose-500/80">
                      {#if waypoints.length > 0}
                        {waypoints.length} Zwischenstopp{waypoints.length > 1 ? 's' : ''} einberechnet
                        {#if routePreview.accuracy === 'fallback'} · Schätzung{/if}
                      {:else}
                        Direktroute{routePreview.accuracy === 'fallback' ? ' (Schätzung)' : ''}
                      {/if}
                    </p>
                  </div>
                {:else}
                  <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p class="text-sm text-gray-400">Route konnte nicht berechnet werden.</p>
                {/if}
              </div>
            </div>
          {:else}
            <p class="text-xs text-gray-400 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Start und Ziel eingeben, um eine Routenvorschau zu sehen.
            </p>
          {/if}

          <!-- Karte -->
          <div>
            <div bind:this={mapContainer} class="h-52 w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-100"></div>
            {#if !routeReady}
              <p class="text-[10px] text-gray-400 mt-1">Start und Ziel eingeben → Route erscheint auf der Karte.</p>
            {:else if waypoints.length > 0}
              <div class="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0"></span>Start</span>
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shrink-0"></span>Zwischenstopps</span>
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-gray-800 inline-block shrink-0"></span>Ziel</span>
              </div>
            {/if}
          </div>
        </div>
      </section>

      <!-- ── ABSCHNITT 3: Fahrtdetails ──────────────────────────── -->
      <section class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-4 pt-4 pb-1">
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Fahrtdetails</p>
        </div>
        <div class="px-4 pb-4 flex flex-col gap-4">

          <!-- Abfahrtszeit -->
          <div>
            <label for="departureTime" class="block text-sm font-semibold text-gray-700 mb-1.5">
              Abfahrt <span class="text-rose-500">*</span>
            </label>
            <input
              id="departureTime" name="departureTime" type="datetime-local" required
              class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm transition-colors"
            />
          </div>

          <!-- Plätze + Preis -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="seats" class="block text-sm font-semibold text-gray-700 mb-1.5">
                Plätze <span class="text-rose-500">*</span>
              </label>
              <input
                id="seats" name="seats" type="number" min="1" max="8" required placeholder="3"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm transition-colors"
              />
            </div>
            <div>
              <label for="pricePerPerson" class="block text-sm font-semibold text-gray-700 mb-1.5">
                Kosten / Person <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">CHF</span>
                <input
                  id="pricePerPerson" name="pricePerPerson" type="number" min="1" max="200" step="0.5" required placeholder="20"
                  class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Fairplay-Hinweis ────────────────────────────────────── -->
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <span class="text-xl shrink-0">⚖️</span>
        <div>
          <p class="text-xs font-bold text-amber-800 mb-0.5">Fairplay-Regeln</p>
          <p class="text-xs text-amber-700 leading-relaxed">
            Mitfahrende erhalten die Abholzeit rechtzeitig. Du musst nicht länger als 15 Minuten warten — bei Nichterscheinen darfst du weiterfahren.
          </p>
        </div>
      </div>

      <!-- ── Submit ─────────────────────────────────────────────── -->
      <button
        type="submit"
        disabled={loading}
        class="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 active:bg-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
      >
        {#if loading}
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Wird veröffentlicht…
        {:else}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
          </svg>
          Fahrt veröffentlichen
        {/if}
      </button>

    </form>
  </div>
</div>
