<script lang="ts">
  import { formatTime, formatDate } from '$lib/time';

  let { booking } = $props<{
    booking: {
      _id: string;
      pickupLocation: string;
      estimatedPickupTime: Date | string;
      mustArriveBy: Date | string;
      latestArrivalTime: Date | string;
      status: string;
      paymentStatus: string;
      ride?: {
        eventName: string;
        eventLocation: string;
        departureTime: Date | string;
        estimatedArrivalTime: Date | string;
        driverName: string;
        pricePerPerson: number;
      };
    };
  }>();

  const statusLabels: Record<string, string> = {
    pending: 'Ausstehend',
    confirmed: 'Bestätigt',
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

<div class="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3">
  {#if booking.ride}
    <div class="flex items-start justify-between">
      <div>
        <p class="font-semibold text-gray-900">{booking.ride.eventName}</p>
        <p class="text-sm text-gray-500">{booking.ride.eventLocation}</p>
      </div>
      <span class="text-xs font-semibold px-2 py-1 rounded-full {statusColors[booking.status] || 'bg-gray-100 text-gray-600'}">
        {statusLabels[booking.status] || booking.status}
      </span>
    </div>

    <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Fahrer</span>
        <span class="font-medium text-gray-800">{booking.ride.driverName}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Abfahrt</span>
        <span class="font-medium text-gray-800">{formatTime(booking.ride.departureTime)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Sei bereit bis</span>
        <span class="font-semibold text-rose-600">{formatTime(booking.mustArriveBy)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Fahrer kommt ca.</span>
        <span class="font-medium text-gray-800">{formatTime(booking.estimatedPickupTime)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Dein Abholort</span>
        <span class="font-medium text-gray-800 text-right max-w-[160px]">{booking.pickupLocation}</span>
      </div>
    </div>

    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Preis</span>
      <span class="font-bold text-gray-900">CHF {booking.ride.pricePerPerson.toFixed(2)}</span>
    </div>
  {/if}
</div>
