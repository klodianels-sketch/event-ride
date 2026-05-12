<script lang="ts">
	interface Ride {
		_id: string;
		eventName: string;
		startLocation: string;
		departureTime: string;
		pickupTime: string;
		arrivalTime: string;
		seats: number;
		seatsAvailable: number;
		pricePerPerson: number;
		driverName: string;
	}

	interface Props {
		ride: Ride;
	}

	let { ride }: Props = $props();
</script>

<a
	href="/rides/{ride._id}"
	class="block rounded-2xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg"
>
	<div class="mb-3 flex items-start justify-between">
		<div>
			<span class="text-xs font-semibold tracking-wide text-rose-500 uppercase"
				>{ride.eventName}</span
			>
			<h2 class="mt-1 text-lg font-bold text-gray-800">ab {ride.startLocation}</h2>
		</div>
		<span
			class="rounded-full px-3 py-1 text-sm font-semibold {ride.seatsAvailable > 0
				? 'bg-green-100 text-green-700'
				: 'bg-red-100 text-red-600'}"
		>
			{ride.seatsAvailable > 0 ? `${ride.seatsAvailable} Plätze frei` : 'Ausgebucht'}
		</span>
	</div>

	<div class="mb-4 flex items-center gap-4 text-sm text-gray-500">
		<span>🕒 Abfahrt {ride.departureTime}</span>
		<span>→</span>
		<span>🏁 Ankunft {ride.arrivalTime}</span>
	</div>

	<div class="flex items-center justify-between border-t border-gray-100 pt-3">
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600"
			>
				{ride.driverName[0].toUpperCase()}
			</div>
			<span class="text-sm font-medium text-gray-700">{ride.driverName}</span>
		</div>
		<div class="text-right">
			<span class="text-lg font-bold text-rose-600">CHF {ride.pricePerPerson.toFixed(2)}</span>
			<span class="block text-xs text-gray-400">pro Person</span>
		</div>
	</div>
</a>
