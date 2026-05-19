<script lang="ts">
  import StarRating from '$lib/components/StarRating.svelte';
  import { formatDate } from '$lib/time';
  import { enhance } from '$app/forms';

  let { data } = $props();

  function initials(firstName: string, lastName: string) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
</script>

<svelte:head>
  <title>Mein Profil – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Profil</h1>

  <div class="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center mb-6">
    {#if data.profile.profilePicture}
      <img src={data.profile.profilePicture} alt="Profilbild" class="w-20 h-20 rounded-full object-cover mb-3" />
    {:else}
      <div class="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-2xl mb-3">
        {initials(data.profile.firstName, data.profile.lastName)}
      </div>
    {/if}
    <p class="font-bold text-gray-900 text-lg">{data.profile.firstName} {data.profile.lastName}</p>
    <p class="text-sm text-gray-500">{data.profile.email}</p>
    {#if data.profile.totalRatings > 0}
      <div class="flex items-center gap-2 mt-2">
        <StarRating value={Math.round(data.profile.rating)} />
        <span class="text-sm text-gray-500">({data.profile.totalRatings} Bewertungen)</span>
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-4 mb-6">
    <a href="/my/rides" class="bg-white rounded-2xl shadow-md p-4 text-center">
      <p class="text-2xl font-bold text-gray-900">{data.stats.ridesCount}</p>
      <p class="text-sm text-gray-500 mt-1">Angebotene Fahrten</p>
    </a>
    <a href="/my/bookings" class="bg-white rounded-2xl shadow-md p-4 text-center">
      <p class="text-2xl font-bold text-gray-900">{data.stats.bookingsCount}</p>
      <p class="text-sm text-gray-500 mt-1">Buchungen</p>
    </a>
  </div>

  {#if data.ratings.length > 0}
    <h2 class="font-bold text-gray-900 mb-3">Bewertungen</h2>
    <div class="flex flex-col gap-3 mb-6">
      {#each data.ratings as rating}
        <div class="bg-white rounded-2xl shadow-sm p-4">
          <div class="flex items-center justify-between mb-1">
            <StarRating value={rating.stars} />
            <span class="text-xs text-gray-400">{formatDate(rating.createdAt)}</span>
          </div>
          {#if rating.comment}
            <p class="text-sm text-gray-600 mt-1">"{rating.comment}"</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <form method="POST" action="/auth/logout" use:enhance>
    <button type="submit" class="w-full border border-gray-200 text-gray-600 py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors">
      Abmelden
    </button>
  </form>
</div>
