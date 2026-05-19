<script lang="ts">
  import BookingCard from '$lib/components/BookingCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Meine Buchungen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Meine Buchungen</h1>

  {#if data.bookings.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-gray-500 text-sm mb-4">Du hast noch keine Fahrten gebucht</p>
      <a href="/" class="bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
        Fahrten entdecken
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each data.bookings as booking}
        <BookingCard {booking} />
      {/each}
    </div>
  {/if}
</div>
