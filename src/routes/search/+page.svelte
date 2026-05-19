<script lang="ts">
  let query = $state('');
</script>

<svelte:head>
  <title>Suchen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-4">Suchen</h1>
  <form method="GET" action="/">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
      </svg>
      <input name="q" type="text" bind:value={query} placeholder="Event oder Ort suchen..." autofocus class="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
    </div>
    <button type="submit" class="mt-3 w-full bg-rose-600 text-white py-3 rounded-xl font-semibold text-sm">Suchen</button>
  </form>
</div>
