<script lang="ts">
	import type { Ride } from '$lib/types';

	let { data }: { data: { ride: Ride } } = $props();
	let ride = $derived(data.ride);
</script>

<svelte:head>
	<title>EventRide – {ride.eventName}</title>
</svelte:head>

<!-- Zurück-Link -->
<a href="/" class="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-rose-600">
	← Alle Fahrten
</a>

<!-- Event-Header -->
<div class="mb-4 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-400 px-6 py-6 text-white">
	<span class="text-xs font-semibold tracking-wider uppercase opacity-75">Mitfahrgelegenheit</span>
	<h1 class="mt-1 text-2xl font-black">{ride.eventName}</h1>
	<p class="mt-1 text-rose-100">ab {ride.startLocation}</p>
</div>

<!-- Details-Karte -->
<div class="mb-4 rounded-2xl bg-white p-6 shadow-md">
	<h2 class="mb-4 text-sm font-semibold tracking-wide text-gray-400 uppercase">Reisedaten</h2>

	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
		<div class="rounded-xl bg-gray-50 p-3">
			<span class="block text-xs text-gray-400">Abfahrt</span>
			<span class="mt-1 block text-base font-bold text-gray-800">{ride.departureTime}</span>
		</div>
		<div class="rounded-xl bg-gray-50 p-3">
			<span class="block text-xs text-gray-400">Treffpunkt</span>
			<span class="mt-1 block text-base font-bold text-gray-800">{ride.pickupTime}</span>
		</div>
		<div class="rounded-xl bg-gray-50 p-3">
			<span class="block text-xs text-gray-400">Ankunft</span>
			<span class="mt-1 block text-base font-bold text-gray-800">{ride.arrivalTime}</span>
		</div>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-4">
		<div class="rounded-xl bg-gray-50 p-3">
			<span class="block text-xs text-gray-400">Freie Plätze</span>
			<span
				class="mt-1 block text-base font-bold {ride.seatsAvailable > 0
					? 'text-green-600'
					: 'text-red-500'}"
			>
				{ride.seatsAvailable} / {ride.seats}
			</span>
		</div>
		<div class="rounded-xl bg-gray-50 p-3">
			<span class="block text-xs text-gray-400">Preis pro Person</span>
			<span class="mt-1 block text-base font-bold text-rose-600"
				>CHF {ride.pricePerPerson.toFixed(2)}</span
			>
		</div>
	</div>
</div>

<!-- Fahrer-Info -->
<div class="mb-6 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-md">
	<div
		class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-xl font-black text-rose-600"
	>
		{ride.driverName[0].toUpperCase()}
	</div>
	<div>
		<span class="block text-xs text-gray-400">Fahrer</span>
		<span class="block font-bold text-gray-800">{ride.driverName}</span>
	</div>
</div>

<!-- Buchungs-Formular -->
{#if ride.seatsAvailable > 0}
	<form method="POST" action="?/book">
		<button
			type="submit"
			class="w-full rounded-full bg-rose-600 py-4 text-base font-black text-white shadow-lg transition hover:bg-rose-700 active:scale-95"
		>
			🚗 Jetzt mitfahren – CHF {ride.pricePerPerson.toFixed(2)}
		</button>
	</form>
{:else}
	<div class="w-full rounded-full bg-gray-200 py-4 text-center text-base font-black text-gray-500">
		😔 Leider ausgebucht
	</div>
{/if}
