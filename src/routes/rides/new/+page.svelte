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

  let suggestions = $state<any[]>([]);
  let activeField = $state<'start' | 'event' | null>(null);
  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  let mapContainer: HTMLElement;
  let map: any = null;
  let marker: any = null;
  let L: any = null;

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
  }

  async function getMyLocation() {
    if (!browser) return;
    if (!navigator.geolocation) {
      locationError = 'Geolocation wird von diesem Browser nicht unterstützt.';
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
          ? 'Standortzugriff verweigert. Bitte erlaube ihn in den Browser-Einstellungen.'
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
<div class="flex flex-col min-h-screen px-4 pt-12 pb-8" onclick={closeSuggestions}>
  <button type="button" onclick={() => history.back()} class="text-gray-400 text-sm self-start">
    ← Zurück
  </button>
  <h1 class="text-2xl font-bold text-gray-900 mt-4 mb-6">Fahrt anbieten</h1>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <form
    method="POST"
    use:enhance={() => {
      loading = true;
      return ({ update }) => { loading = false; update(); };
    }}
    class="flex flex-col gap-4"
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Event Name -->
    <div>
      <label for="eventName" class="block text-sm font-medium text-gray-700 mb-1.5">
        Event Name
      </label>
      <input
        id="eventName"
        name="eventName"
        type="text"
        required
        placeholder="z.B. Openair Frauenfeld"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
      />
    </div>

    <!-- Event Ort mit Autocomplete -->
    <div class="relative">
      <label for="eventLocation" class="block text-sm font-medium text-gray-700 mb-1.5">
        Event Ort
      </label>
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
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
      />
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

    <!-- Startort mit GPS + Autocomplete -->
    <div class="relative">
      <label for="startLocation" class="block text-sm font-medium text-gray-700 mb-1.5">
        Dein Startort
      </label>
      <div class="flex gap-2">
        <input
          id="startLocation"
          name="startLocation"
          type="text"
          bind:value={startLocationValue}
          oninput={() => handleField('start')}
          onfocus={() => { if (startLocationValue.length >= 3) activeField = 'start'; }}
          autocomplete="off"
          required
          placeholder="z.B. Zürich HB"
          class="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
        />
        <button
          type="button"
          onclick={(e) => { e.stopPropagation(); getMyLocation(); }}
          disabled={locationLoading}
          title="Aktuellen Standort verwenden"
          aria-label="Aktuellen Standort verwenden"
          class="px-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center"
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

    <!-- Leaflet Karte -->
    <div bind:this={mapContainer} class="h-48 w-full rounded-xl border border-gray-200 overflow-hidden"></div>

    <!-- Abfahrtszeit -->
    <div>
      <label for="departureTime" class="block text-sm font-medium text-gray-700 mb-1.5">
        Abfahrtsdatum und -zeit
      </label>
      <input
        id="departureTime"
        name="departureTime"
        type="datetime-local"
        required
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
      />
    </div>

    <!-- Sitzplätze -->
    <div>
      <label for="seats" class="block text-sm font-medium text-gray-700 mb-1.5">
        Freie Sitzplätze
      </label>
      <input
        id="seats"
        name="seats"
        type="number"
        min="1"
        max="8"
        required
        placeholder="z.B. 3"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
      />
    </div>

    <!-- Preis -->
    <div>
      <label for="pricePerPerson" class="block text-sm font-medium text-gray-700 mb-1.5">
        Kostenbeteiligung p.P. (CHF)
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
          placeholder="20.00"
          class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
        />
      </div>
    </div>

    <button
      type="submit"
      disabled={loading}
      class="mt-2 w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60"
    >
      {loading ? 'Wird veröffentlicht...' : 'Fahrt jetzt veröffentlichen'}
    </button>
  </form>
</div>
