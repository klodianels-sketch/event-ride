<script lang="ts">
  import { formatTime } from '$lib/time';

  let { ride, eventId } = $props<{
    ride: {
      _id: string;
      driverName: string;
      driverPhoto?: string;
      seatsAvailable: number;
      departureTime: Date | string;
      estimatedArrivalTime: Date | string;
      pricePerPerson: number;
      startLocation: string;
    };
    eventId?: string;
  }>();

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<div class="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3">
  <div class="flex items-start justify-between">
    <div class="flex items-center gap-3">
      {#if ride.driverPhoto}
        <img src={ride.driverPhoto} alt={ride.driverName} class="w-12 h-12 rounded-full object-cover" />
      {:else}
        <div class="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
          {initials(ride.driverName)}
        </div>
      {/if}
      <div>
        <p class="font-semibold text-gray-900">{ride.driverName}</p>
        <p class="text-sm text-gray-500">{ride.startLocation}</p>
      </div>
    </div>
    <span class="flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-semibold px-2 py-1 rounded-full">
      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
      {ride.seatsAvailable} Plätze frei
    </span>
  </div>

  <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Start</span>
      <span class="font-semibold text-gray-800">{formatTime(ride.departureTime)}</span>
    </div>
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Holt dich ab</span>
      <span class="font-semibold text-gray-800">ca. {formatTime(new Date(new Date(ride.departureTime).getTime() + 20 * 60 * 1000))}</span>
    </div>
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Späteste Ankunft</span>
      <span class="font-semibold text-gray-800">{formatTime(ride.estimatedArrivalTime)}</span>
    </div>
  </div>

  <div class="flex items-center justify-between">
    <span class="font-bold text-gray-900">CHF {ride.pricePerPerson.toFixed(2)}</span>
    <a
      href={eventId ? `/rides/${eventId}/book?rideId=${ride._id}` : `/rides/${ride._id}/book`}
      class="bg-rose-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-700 transition-colors"
    >
      Mitfahren
    </a>
  </div>
</div>
