<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Fahrt anbieten – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="mb-6">
    <a href="/" class="text-gray-400 text-sm">← Zurück</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Fahrt anbieten</h1>
    <p class="text-gray-500 text-sm mt-1">Biete anderen eine Mitfahrgelegenheit an</p>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }} class="flex flex-col gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Event Name</label>
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        <input name="eventName" type="text" required placeholder="z.B. Openair Frauenfeld" class="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Event Ort</label>
      <input name="eventLocation" type="text" required placeholder="z.B. Frauenfeld, TG" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Dein Startort</label>
      <input name="startLocation" type="text" required placeholder="z.B. Zürich HB" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Abfahrtsdatum und -zeit</label>
      <input name="departureTime" type="datetime-local" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Geschätzte Ankunftszeit am Event</label>
      <input name="estimatedArrivalTime" type="datetime-local" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Freie Sitzplätze</label>
      <input name="seats" type="number" min="1" max="8" required placeholder="z.B. 3" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Kostenbeteiligung p.P. (CHF)</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">CHF</span>
        <input name="pricePerPerson" type="number" min="1" max="200" step="0.5" required placeholder="20.00" class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
    </div>

    <button type="submit" disabled={loading} class="mt-4 w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60">
      {loading ? 'Wird veröffentlicht...' : 'Fahrt jetzt veröffentlichen'}
    </button>
  </form>
</div>
