<script lang="ts">
	// Erfolgsseite nach der Buchung
</script>

<svelte:head>
	<title>EventRide – Buchung erfolgreich!</title>
</svelte:head>

<div class="flex flex-col items-center py-12 text-center">
	<div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl">
		✅
	</div>

	<h1 class="text-3xl font-black text-gray-800">Platz reserviert!</h1>
	<p class="mt-3 max-w-sm text-gray-500">
		Deine Mitfahrgelegenheit wurde erfolgreich gebucht. Viel Spass am Event!
	</p>

	<div class="mt-8 flex flex-col gap-3 sm:flex-row">
		<a
			href="/"
			class="rounded-full bg-rose-600 px-6 py-3 text-sm font-bold text-white hover:bg-rose-700"
		>
			← Zurück zur Übersicht
		</a>
		<a
			href="/rides/new"
			class="rounded-full border border-rose-200 px-6 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
		>
			Eigene Fahrt anbieten
		</a>
	</div>
</div>
