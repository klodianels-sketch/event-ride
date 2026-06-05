<script lang="ts">
  import { formatDate } from '$lib/time';

  let { data } = $props();

  const STATUS_COLOR: Record<string, string> = {
    pending:                 'bg-amber-100 text-amber-700',
    accepted:                'bg-green-100 text-green-700',
    confirmed:               'bg-green-100 text-green-700',
    rejected:                'bg-red-100 text-red-600',
    cancelled_by_passenger:  'bg-gray-100 text-gray-600',
    cancelled_by_driver:     'bg-orange-100 text-orange-700',
    cancelled:               'bg-gray-100 text-gray-500',
    'no-show':               'bg-red-100 text-red-700',
    completed:               'bg-blue-100 text-blue-700'
  };

  const FILTERS = [
    ['all', 'Alle'], ['pending', 'Ausstehend'], ['accepted', 'Angenommen'],
    ['rejected', 'Abgelehnt'], ['cancelled_by_passenger', 'Vom Mitf. storniert'],
    ['cancelled_by_driver', 'Vom Fahrer storniert'], ['completed', 'Abgeschlossen']
  ];
</script>

<svelte:head>
  <title>Buchungen – Admin – EventRide</title>
</svelte:head>

<div class="px-4 pt-5 pb-24">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl font-bold text-gray-900">Buchungen</h1>
    <span class="text-xs text-gray-400">{data.bookings.length} angezeigt</span>
  </div>

  <!-- Suche -->
  <form method="GET" class="mb-3">
    <input type="hidden" name="filter" value={data.filter} />
    <input
      type="search"
      name="q"
      value={data.search}
      placeholder="Mitfahrer oder Abholort suchen…"
      class="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
    />
  </form>

  <!-- Filter -->
  <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
    {#each FILTERS as [val, label]}
      <a
        href="?filter={val}{data.search ? `&q=${data.search}` : ''}"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
          {data.filter === val ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      >
        {label}
      </a>
    {/each}
  </div>

  <!-- Liste -->
  <div class="flex flex-col gap-3">
    {#each data.bookings as b}
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{b.passengerName}</p>
            <p class="text-xs text-gray-500 truncate">🎪 {b.eventName} · Fahrer: {b.driverName}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              📍 {b.pickupLocation} · CHF {b.bookedPrice.toFixed(2)}
              {#if b.cancellationFee && b.cancellationFee > 0}
                · Gebühr: CHF {b.cancellationFee.toFixed(2)}
              {/if}
            </p>
            <p class="text-[10px] text-gray-300 mt-0.5">{formatDate(b.createdAt)}</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 {STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-600'}">
            {b.statusLabel}
          </span>
        </div>
      </div>
    {/each}

    {#if data.bookings.length === 0}
      <p class="text-center text-sm text-gray-400 py-8">Keine Buchungen gefunden.</p>
    {/if}
  </div>
</div>
