<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatDate, formatTime } from '$lib/time';

  let { data, form } = $props();

  let deactivatingId = $state<string | null>(null);
  let deactivateReason = $state('');

  const STATUS_COLOR: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700'
  };

  const CAT_EMOJI: Record<string, string> = {
    music: '🎵', festival: '🎪', nightlife: '🌙',
    sport: '⚡', hiking: '🏔️', culture: '🎭', other: '✨'
  };
</script>

<svelte:head>
  <title>Fahrten – Admin – EventRide</title>
</svelte:head>

<div class="px-4 pt-5 pb-24">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl font-bold text-gray-900">Fahrten</h1>
    <span class="text-xs text-gray-400">{data.rides.length} angezeigt</span>
  </div>

  <!-- Feedback ───────────────────────────────────────────────── -->
  {#if form?.success}
    <div class="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
      {form.action === 'deactivated' ? 'Fahrt deaktiviert.'     : ''}
      {form.action === 'restored'    ? 'Fahrt wiederhergestellt.' : ''}
    </div>
  {/if}
  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{form.error}</div>
  {/if}

  <!-- Suche ──────────────────────────────────────────────────── -->
  <form method="GET" class="mb-3">
    <input type="hidden" name="filter" value={data.filter} />
    <input
      type="search"
      name="q"
      value={data.search}
      placeholder="Event, Fahrer, Ort suchen..."
      class="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
    />
  </form>

  <!-- Filter ─────────────────────────────────────────────────── -->
  <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
    {#each [['all', 'Alle'], ['active', 'Aktiv'], ['cancelled', 'Storniert'], ['completed', 'Abgeschlossen']] as [val, label]}
      <a
        href="?filter={val}{data.search ? `&q=${data.search}` : ''}"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
          {data.filter === val ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      >
        {label}
      </a>
    {/each}
  </div>

  <!-- Ride-Liste ──────────────────────────────────────────────── -->
  <div class="flex flex-col gap-3">
    {#each data.rides as ride}
      <div class="bg-white rounded-xl border {ride.status === 'cancelled' ? 'border-red-100' : 'border-gray-100'} p-4">

        <!-- Info ──────────────────────────────────────────────── -->
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {CAT_EMOJI[ride.eventCategory] ?? '✨'} {ride.eventName}
            </p>
            <p class="text-xs text-gray-500">{ride.eventLocation}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {ride.driverName} · {formatDate(ride.departureTime)} {formatTime(ride.departureTime)}
              · {ride.seats - ride.seatsAvailable}/{ride.seats} Plätze · CHF {ride.pricePerPerson.toFixed(2)}
            </p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 {STATUS_COLOR[ride.status] ?? 'bg-gray-100 text-gray-600'}">
            {ride.status}
          </span>
        </div>

        {#if ride.moderationReason}
          <p class="text-xs text-red-500 mb-2">Grund: {ride.moderationReason}</p>
        {/if}

        <!-- Deaktivierungs-Formular inline ─────────────────── -->
        {#if deactivatingId === ride._id}
          <div class="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
            <p class="text-xs font-semibold text-red-800 mb-1.5">Grund der Deaktivierung</p>
            <input
              type="text"
              bind:value={deactivateReason}
              placeholder="z.B. Verdächtiger Inhalt"
              class="w-full text-xs px-3 py-2 rounded-lg border border-red-200 bg-white mb-2 focus:outline-none"
            />
            <div class="flex gap-2">
              <form
                method="POST"
                action="?/deactivate"
                use:enhance={() => { return ({ update }) => { deactivatingId = null; deactivateReason = ''; update(); }; }}
                class="flex-1"
              >
                <input type="hidden" name="rideId" value={ride._id} />
                <input type="hidden" name="reason" value={deactivateReason} />
                <button type="submit" class="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                  Deaktivieren
                </button>
              </form>
              <button
                type="button"
                onclick={() => { deactivatingId = null; deactivateReason = ''; }}
                class="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        {/if}

        <!-- Aktions-Buttons ─────────────────────────────────── -->
        <div class="flex gap-2">
          {#if ride.status === 'active'}
            <button
              type="button"
              onclick={() => { deactivatingId = ride._id; deactivateReason = ''; }}
              class="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors"
            >
              Deaktivieren
            </button>
          {:else if ride.status === 'cancelled'}
            <form method="POST" action="?/restore" use:enhance>
              <input type="hidden" name="rideId" value={ride._id} />
              <button type="submit" class="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-100 transition-colors">
                Wiederherstellen
              </button>
            </form>
          {/if}
          <a
            href="/rides/{ride._id}"
            target="_blank"
            class="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Ansehen
          </a>
        </div>
      </div>
    {/each}

    {#if data.rides.length === 0}
      <p class="text-center text-sm text-gray-400 py-8">Keine Fahrten gefunden.</p>
    {/if}
  </div>
</div>
