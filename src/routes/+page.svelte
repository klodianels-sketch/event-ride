<script lang="ts">
	import RideCard from '$lib/components/RideCard.svelte';
	import SuccessBanner from '$lib/components/SuccessBanner.svelte';
	import type { Ride } from '$lib/types';
	import { page } from '$app/stores';

	let { data }: { data: { rides: Ride[] } } = $props();

	// Erfolgsmeldung anzeigen wenn gerade eine Fahrt erstellt wurde
	let justCreated = $derived($page.url.searchParams.has('created'));
</script>

<svelte:head>
	<title>EventRide – Alle Mitfahrgelegenheiten</title>
</svelte:head>

<!-- Hero-Bereich -->
<div class="mb-8 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-400 px-6 py-8 text-white">
	<h1 class="text-3xl font-black">🚗 Mitfahren zum Event</h1>
	<p class="mt-2 text-rose-100">Finde eine Mitfahrgelegenheit oder biete deinen Mitfahrern Platz.</p>
</div>

{#if justCreated}
	<div class="mb-6">
		<SuccessBanner message="Deine Fahrt wurde erfolgreich erstellt!" type="success" />
	</div>
{/if}

<!-- Fahrten-Liste -->
{#if data.rides.length === 0}
	<div class="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
		<div class="text-5xl">🚘</div>
		<h2 class="mt-4 text-lg font-semibold text-gray-600">Noch keine Fahrten verfügbar</h2>
		<p class="mt-1 text-sm text-gray-400">Sei der Erste und biete eine Mitfahrgelegenheit an!</p>
		<a
			href="/rides/new"
			class="mt-6 inline-block rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700"
		>
			Jetzt Fahrt anbieten
		</a>
	</div>
{:else}
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
			{data.rides.length} {data.rides.length === 1 ? 'Fahrt' : 'Fahrten'} verfügbar
		</h2>
	</div>
	<div class="space-y-4">
		{#each data.rides as ride (ride._id)}
			<RideCard {ride} />
		{/each}
	</div>
{/if}
