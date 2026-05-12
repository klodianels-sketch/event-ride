<script lang="ts">
	import RideForm from '$lib/components/RideForm.svelte';
	import type { ActionData } from './$types';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();
</script>

<svelte:head>
	<title>EventRide – Neue Fahrt anbieten</title>
</svelte:head>

<!-- Zurück-Link -->
<a href="/" class="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-rose-600">
	← Zurück zur Übersicht
</a>

<div class="rounded-2xl bg-white p-6 shadow-md">
	<h1 class="mb-1 text-2xl font-black text-gray-800">Fahrt anbieten</h1>
	<p class="mb-6 text-sm text-gray-500">Fülle alle Felder aus, um eine Mitfahrgelegenheit zu erstellen.</p>

	<form method="POST" class="space-y-6">
		<RideForm error={form?.error} fields={form?.fields} />

		<button
			type="submit"
			class="w-full rounded-full bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 active:scale-95"
		>
			Fahrt erstellen →
		</button>
	</form>
</div>
