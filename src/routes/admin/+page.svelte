<script lang="ts">
  import { formatDate } from '$lib/time';

  let { data } = $props();

  const STATUS_COLOR: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700'
  };
</script>

<svelte:head>
  <title>Admin – EventRide</title>
</svelte:head>

<div class="px-4 pt-6 pb-24">
  <h1 class="text-xl font-bold text-gray-900 mb-5">Dashboard</h1>

  <!-- Statistiken ─────────────────────────────────────────────── -->
  <div class="grid grid-cols-2 gap-3 mb-6">
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-900">{data.stats.totalUsers}</p>
      <p class="text-xs text-gray-500 mt-0.5">Nutzer total</p>
      {#if data.stats.disabledUsers > 0}
        <p class="text-xs text-red-500 mt-1">{data.stats.disabledUsers} gesperrt</p>
      {/if}
    </div>
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-900">{data.stats.totalRides}</p>
      <p class="text-xs text-gray-500 mt-0.5">Fahrten total</p>
      <p class="text-xs text-green-600 mt-1">{data.stats.activeRides} aktiv</p>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-900">{data.stats.totalBookings}</p>
      <p class="text-xs text-gray-500 mt-0.5">Buchungen total</p>
      {#if data.stats.pendingBookings > 0}
        <p class="text-xs text-blue-600 mt-1">{data.stats.pendingBookings} ausstehend</p>
      {/if}
    </div>
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-900">{data.stats.totalConversations}</p>
      <p class="text-xs text-gray-500 mt-0.5">Konversationen</p>
      <p class="text-xs text-violet-600 mt-1">{data.stats.totalMessages} Nachrichten</p>
    </div>
  </div>

  <!-- Schnellzugriff ───────────────────────────────────────────── -->
  <div class="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-6 flex gap-4">
    <a href="/admin/users" class="text-xs text-rose-600 font-semibold hover:underline">Nutzer</a>
    <a href="/admin/rides" class="text-xs text-rose-600 font-semibold hover:underline">Fahrten</a>
    <a href="/admin/bookings" class="text-xs text-rose-600 font-semibold hover:underline">Buchungen</a>
  </div>

  <!-- Letzte Fahrten ───────────────────────────────────────────── -->
  <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Letzte Fahrten</h2>
  <div class="flex flex-col gap-2">
    {#each data.recentRides as ride}
      <div class="bg-white rounded-xl border border-gray-100 px-4 py-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{ride.eventName}</p>
            <p class="text-xs text-gray-400">{ride.driverName} · {formatDate(ride.departureTime)}</p>
          </div>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 {STATUS_COLOR[ride.status] ?? 'bg-gray-100 text-gray-600'}">
            {ride.status}
          </span>
        </div>
      </div>
    {/each}
  </div>
</div>
