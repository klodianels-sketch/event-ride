<script lang="ts">
	interface Props {
		error?: string;
		fields?: Record<string, string>;
	}

	let { error = '', fields = {} }: Props = $props();

	const inputClass =
		'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 transition';
</script>

<div class="space-y-4">
	{#if error}
		<div class="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
			<span>❌</span>
			<span>{error}</span>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="sm:col-span-2">
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="eventName"
				>Event-Name</label
			>
			<input
				id="eventName"
				name="eventName"
				type="text"
				required
				placeholder="z.B. Openair Frauenfeld 2026"
				value={fields.eventName ?? ''}
				class={inputClass}
			/>
		</div>

		<div class="sm:col-span-2">
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="startLocation"
				>Abfahrtsort</label
			>
			<input
				id="startLocation"
				name="startLocation"
				type="text"
				required
				placeholder="z.B. Winterthur, Hauptbahnhof"
				value={fields.startLocation ?? ''}
				class={inputClass}
			/>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="departureTime"
				>Abfahrtszeit</label
			>
			<input
				id="departureTime"
				name="departureTime"
				type="text"
				required
				placeholder="z.B. 15:00 Uhr"
				value={fields.departureTime ?? ''}
				class={inputClass}
			/>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="pickupTime"
				>Treffpunkt-Zeit</label
			>
			<input
				id="pickupTime"
				name="pickupTime"
				type="text"
				required
				placeholder="z.B. 15:50 Uhr"
				value={fields.pickupTime ?? ''}
				class={inputClass}
			/>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="arrivalTime"
				>Ankunftszeit</label
			>
			<input
				id="arrivalTime"
				name="arrivalTime"
				type="text"
				required
				placeholder="z.B. 17:00 Uhr"
				value={fields.arrivalTime ?? ''}
				class={inputClass}
			/>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="seats"
				>Anzahl Sitzplätze</label
			>
			<input
				id="seats"
				name="seats"
				type="number"
				required
				min="1"
				max="8"
				placeholder="z.B. 3"
				value={fields.seats ?? ''}
				class={inputClass}
			/>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="pricePerPerson"
				>Preis pro Person (CHF)</label
			>
			<input
				id="pricePerPerson"
				name="pricePerPerson"
				type="number"
				required
				min="0"
				step="0.50"
				placeholder="z.B. 15"
				value={fields.pricePerPerson ?? ''}
				class={inputClass}
			/>
		</div>

		<div class="sm:col-span-2">
			<label class="mb-1 block text-xs font-semibold text-gray-500 uppercase" for="driverName"
				>Dein Name (Fahrer)</label
			>
			<input
				id="driverName"
				name="driverName"
				type="text"
				required
				placeholder="z.B. Max"
				value={fields.driverName ?? ''}
				class={inputClass}
			/>
		</div>
	</div>
</div>
