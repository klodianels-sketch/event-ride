<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';

  let { form } = $props();

  let loading = $state(false);
  let locationLoading = $state(false);
  let locationError = $state('');

  let startLocationValue = $state('');
  let eventLocationValue = $state('');
  let eventNameValue = $state('');
  let selectedCategory = $state('other');

  let suggestions = $state<any[]>([]);
  let activeField = $state<'start' | 'event' | null>(null);
  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  // Event-Autosuggest
  let eventSuggestions = $state<Array<{ name: string; category?: string; location?: string }>>([]);
  let showEventSuggestions = $state(false);
  let eventTypingTimer: ReturnType<typeof setTimeout> | null = null;

  function onEventNameInput() {
    showEventSuggestions = true;
    if (eventTypingTimer) clearTimeout(eventTypingTimer);
    if (eventNameValue.length < 2) { eventSuggestions = []; return; }
    eventTypingTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/events?q=${encodeURIComponent(eventNameValue)}`);
        const data = await res.json();
        eventSuggestions = data.suggestions ?? [];
      } catch {
        eventSuggestions = [];
      }
    }, 250);
  }

  function selectEventSuggestion(s: { name: string; category?: string; location?: string }) {
    eventNameValue = s.name;
    if (s.location && !eventLocationValue) eventLocationValue = s.location;
    if (s.category) selectedCategory = s.category;
    eventSuggestions = [];
    showEventSuggestions = false;
  }

  const CATEGORY_MAP: Record<string, string> = {
    music: '🎵', festival: '🎪', nightlife: '🌙', sport: '⚡', hiking: '🏔️', culture: '🎭', other: '✨'
  };

  let mapContainer: HTMLElement;
  let map: any = null;
  let marker: any = null;
  let L: any = null;

  const CATEGORIES = [
    { key: 'music',    emoji: '🎵', label: 'Musik'     },
    { key: 'festival', emoji: '🎪', label: 'Festival'  },
    { key: 'nightlife',emoji: '🌙', label: 'Nightlife' },
    { key: 'sport',    emoji: '⚡', label: 'Sport'     },
    { key: 'hiking',   emoji: '🏔️', label: 'Outdoor'   },
    { key: 'culture',  emoji: '🎭', label: 'Kultur'    },
    { key: 'other',    emoji: '✨', label: 'Weiteres'  },
  ];

  onMount(async () => {
    if (!browser) return;
    const mod = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    L = mod.default ?? mod;
    map = L.map(mapContainer, { zoomControl: true }).setView([47.3769, 8.5417], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
  });

  onDestroy(() => { if (map) map.remove(); });

  function pinIcon() {
    return L.divIcon({
      html: '<div style="width:14px;height:14px;background:#e11d48;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: ''
    });
  }

  function setMarker(lat: number, lon: number) {
    if (!map || !L) return;
    map.setView([lat, lon], 14);
    if (marker) marker.remove();
    marker = L.marker([lat, lon], { icon: pinIcon() }).addTo(map);
  }

  function handleField(field: 'start' | 'event') {
    const value = field === 'start' ? startLocationValue : eventLocationValue;
    activeField = field;
    if (typingTimer) clearTimeout(typingTimer);
    if (value.length < 3) { suggestions = []; return; }
    typingTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&bbox=5.9,45.8,10.5,47.8&limit=5`,
          { signal: AbortSignal.timeout(5000) }
        );
        const json = await res.json();
        suggestions = json.features ?? [];
      } catch {
        suggestions = [];
      }
    }, 300);
  }

  function selectSuggestion(s: any) {
    const p = s.properties;
    const label = [p.name, p.street, p.city ?? p.county].filter(Boolean).join(', ');
    const [lon, lat] = s.geometry.coordinates as [number, number];
    if (activeField === 'start') {
      startLocationValue = label;
      setMarker(lat, lon);
    } else {
      eventLocationValue = label;
    }
    suggestions = [];
    activeField = null;
  }

  function closeSuggestions() {
    suggestions = [];
    activeField = null;
    showEventSuggestions = false;
  }

  async function getMyLocation() {
    if (!browser) return;
    if (!navigator.geolocation) {
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
      const data = await res.json();
      const addr = data?.address ?? {};
      const street = addr.road ?? '';
      const num = addr.house_number ? ` ${addr.house_number}` : '';
      const city = addr.city ?? addr.town ?? addr.village ?? '';
      startLocationValue = street
        ? `${street}${num}, ${city}`.trim().replace(/,\s*$/, '')
        : city || String(data.display_name ?? '').split(',')[0].trim();
      setMarker(latitude, longitude);
    } catch (err: any) {
      locationError =
        err?.code === 1
          ? 'Standortzugriff verweigert. Bitte in den Browser-Einstellungen erlauben.'
          : 'Standort konnte nicht ermittelt werden.';
    } finally {
      locationLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Fahrt anbieten – EventRide</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="flex flex-col min-h-screen" onclick={closeSuggestions}>

  <!-- Header ────────────────────────────────────────────────── -->
  <div class="bg-gradient-to-b from-gray-900 to-gray-800 px-4 pt-12 pb-5">
    <button type="button" onclick={() => history.back()} class="text-gray-400 text-sm flex items-center gap-1 mb-4">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Zurück
    </button>
    <p class="text-gray-400 text-xs font-semibold uppercase tracking-widest">Neue Fahrt</p>
    <h1 class="text-2xl font-bold text-white mt-1">Fahrt anbieten</h1>
    <p class="text-gray-400 text-sm mt-1">Teile deine Fahrt zum Event und spare Kosten.</p>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="px-4 py-6 flex flex-col gap-5" onclick={(e) => e.stopPropagation()}>

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
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
      class="flex flex-col gap-5"
    >

      <!-- Kategorie ──────────────────────────────────────────── -->
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Event-Typ
        </label>
        <div class="flex flex-wrap gap-2">
          {#each CATEGORIES as cat}
            <label class="cursor-pointer">
              <input
                type="radio"
                name="eventCategory"
                value={cat.key}
                bind:group={selectedCategory}
                class="sr-only"
              />
              <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all {selectedCategory === cat.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}">
                {cat.emoji} {cat.label}
              </span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Event Name mit Autosuggest ─────────────────────────── -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="relative" onclick={(e) => e.stopPropagation()}>
        <label for="eventName" class="block text-sm font-semibold text-gray-700 mb-1.5">
          Event-Name <span class="text-rose-500">*</span>
        </label>
        <input
          id="eventName"
          name="eventName"
          type="text"
          required
          bind:value={eventNameValue}
          oninput={onEventNameInput}
          onfocus={() => { if (eventNameValue.length >= 2) showEventSuggestions = true; }}
          onkeydown={(e) => { if (e.key === 'Escape') { showEventSuggestions = false; } }}
          autocomplete="off"
          placeholder="z.B. Openair Frauenfeld"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
        />
        {#if showEventSuggestions && eventSuggestions.length > 0}
          <ul class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {#each eventSuggestions as s}
              <li>
                <button
                  type="button"
                  onclick={() => selectEventSuggestion(s)}
                  class="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
                >
                  <span class="text-base shrink-0">{CATEGORY_MAP[s.category ?? 'other'] ?? '✨'}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    {#if s.location}
                      <p class="text-xs text-gray-400 truncate">{s.location}</p>
                    {/if}
                  </div>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- Event Ort ──────────────────────────────────────────── -->
      <div class="relative">
        <label for="eventLocation" class="block text-sm font-semibold text-gray-700 mb-1.5">
          Veranstaltungsort <span class="text-rose-500">*</span>
        </label>
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
          <input
            id="eventLocation"
            name="eventLocation"
            type="text"
            bind:value={eventLocationValue}
            oninput={() => handleField('event')}
            onfocus={() => { if (eventLocationValue.length >= 3) activeField = 'event'; }}
            autocomplete="off"
            required
            placeholder="z.B. Frauenfeld, TG"
            class="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
          />
        </div>
        {#if activeField === 'event' && suggestions.length > 0}
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

      <!-- Startort ─────────────────────────────────────────────  -->
      <div class="relative">
        <label for="startLocation" class="block text-sm font-semibold text-gray-700 mb-1.5">
          Dein Startort <span class="text-rose-500">*</span>
        </label>
        <p class="text-xs text-gray-400 mb-1.5">Nur deine Stadt wird öffentlich gezeigt — deine exakte Adresse bleibt privat.</p>
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            </svg>
            <input
              id="startLocation"
              name="startLocation"
              type="text"
              bind:value={startLocationValue}
              oninput={() => handleField('start')}
              onfocus={() => { if (startLocationValue.length >= 3) activeField = 'start'; }}
              autocomplete="off"
              required
              placeholder="z.B. Zürich, Stauffacherstr. 1"
              class="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
            />
          </div>
          <button
            type="button"
            onclick={(e) => { e.stopPropagation(); getMyLocation(); }}
            disabled={locationLoading}
            title="Aktuellen Standort verwenden"
            aria-label="Aktuellen Standort verwenden"
            class="px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center"
          >
            {#if locationLoading}
              <svg class="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            {:else}
              <svg class="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
            {/if}
          </button>
        </div>

        {#if locationError}
          <p class="text-xs text-red-600 mt-1">{locationError}</p>
        {/if}

        {#if activeField === 'start' && suggestions.length > 0}
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

      <!-- Karte ──────────────────────────────────────────────── -->
      <div>
        <p class="text-xs text-gray-400 mb-1.5">Startort auf der Karte</p>
        <div bind:this={mapContainer} class="h-44 w-full rounded-xl border border-gray-200 overflow-hidden"></div>
      </div>

      <!-- Abfahrtszeit ────────────────────────────────────────── -->
      <div>
        <label for="departureTime" class="block text-sm font-semibold text-gray-700 mb-1.5">
          Abfahrtsdatum und -zeit <span class="text-rose-500">*</span>
        </label>
        <input
          id="departureTime"
          name="departureTime"
          type="datetime-local"
          required
          class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
        />
      </div>

      <!-- Sitzplätze + Preis ──────────────────────────────────── -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="seats" class="block text-sm font-semibold text-gray-700 mb-1.5">
            Freie Plätze <span class="text-rose-500">*</span>
          </label>
          <input
            id="seats"
            name="seats"
            type="number"
            min="1"
            max="8"
            required
            placeholder="3"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
          />
        </div>
        <div>
          <label for="pricePerPerson" class="block text-sm font-semibold text-gray-700 mb-1.5">
            Kosten p.P. <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">CHF</span>
            <input
              id="pricePerPerson"
              name="pricePerPerson"
              type="number"
              min="1"
              max="200"
              step="0.5"
              required
              placeholder="20"
              class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Hinweis Fairplay ────────────────────────────────────── -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
        <p class="text-xs font-semibold text-amber-800 mb-1">Fairplay-Regeln</p>
        <p class="text-xs text-amber-700 leading-relaxed">
          Mitfahrende werden informiert, rechtzeitig bereit zu sein.
          Du musst nicht länger als 15 Minuten warten — bei Nichterscheinen darfst du weiterfahren.
        </p>
      </div>

      <!-- Submit ──────────────────────────────────────────────── -->
      <button
        type="submit"
        disabled={loading}
        class="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {#if loading}
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Wird veröffentlicht...
        {:else}
          Fahrt jetzt veröffentlichen
        {/if}
      </button>

    </form>
  </div>
</div>
