<script lang="ts">
  import { formatTime, formatDate } from '$lib/time';
  import type { PublicBookingDTO } from '$lib/dto';

  let { booking } = $props<{ booking: PublicBookingDTO }>();

  const statusLabels: Record<string, string> = {
    pending: 'Ausstehend',
    confirmed: 'Bestaetigt',
    cancelled: 'Storniert',
    'no-show': 'Nicht erschienen',
    completed: 'Abgeschlossen'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    'no-show': 'bg-gray-100 text-gray-600',
    completed: 'bg-blue-100 text-blue-700'
  };
</script>

<div class="bg-white rounded-2xl shadow-md overflow-hidden">
  {#if booking.ride}
    <div class="bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3 flex items-start justify-between">
      <div>
        <p class="font-bold text-white text-sm">{booking.ride.eventName}</p>
        <p class="text-rose-100 text-xs">{booking.ride.eventLocation}</p>
      </div>
      <span class="text-xs font-semibold px-2 py-1 rounded-full {statusColors[booking.status] ?? 'bg-gray-100 text-gray-600'} shrink-0 ml-2">
        {statusLabels[booking.status] ?? booking.status}
      </span>
    </div>
  {/if}

  <div class="p-4 flex flex-col gap-2">
    {#if booking.ride}
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Fahrer</span>
        <span class="font-medium text-gray-800">{booking.ride.driverName}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Abfahrt</span>
        <span class="font-medium text-gray-800">
          {formatDate(booking.ride.departureTime)}, {formatTime(booking.ride.departureTime)}
        </span>
      </div>
    {/if}

    <div class="bg-rose-50 rounded-xl p-3 mt-1 flex flex-col gap-1.5">
      <p class="text-xs font-semibold text-rose-700 mb-0.5">Deine Abholzeiten</p>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">Bereit empfohlen ab</span>
        <span class="font-bold text-rose-700">{formatTime(booking.recommendedReadyTime)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">Fahrer kommt ca.</span>
        <span class="font-semibold text-gray-900">
          {formatTime(booking.estimatedPickupTime)}
          {#if booking.timeAccuracy === 'fallback'}
            <span class="text-xs text-gray-400">(~)</span>
          {/if}
        </span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">Spaetestens bereit</span>
        <span class="font-semibold text-amber-600">{formatTime(booking.latestReadyTime)}</span>
      </div>
      {#if booking.estimatedArrivalAtEvent}
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">Ankunft Event</span>
          <span class="font-semibold text-gray-800">~{formatTime(booking.estimatedArrivalAtEvent)}</span>
        </div>
      {/if}
    </div>

    <div class="flex items-center justify-between text-sm mt-1">
      <span class="text-gray-500 truncate max-w-[55%]">{booking.pickupLocation}</span>
      <span class="font-bold text-gray-900">
        {booking.bookedPrice != null
          ? `CHF ${booking.bookedPrice.toFixed(2)}`
          : booking.ride ? `CHF ${booking.ride.pricePerPerson.toFixed(2)}` : ''}
      </span>
    </div>
  </div>
</div>
