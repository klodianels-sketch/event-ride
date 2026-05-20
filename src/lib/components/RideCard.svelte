<script lang="ts">
  import { formatTime, formatDate } from '$lib/time';
  import type { PublicRideDTO } from '$lib/dto';

  interface Preview {
    estimatedPickupTime: Date;
    estimatedArrivalAtEvent: Date;
    detourMinutes: number;
  }

  let {
    ride,
    preview = null,
    pickupCoords = null
  } = $props<{
    ride: PublicRideDTO;
    preview?: Preview | null;
    pickupCoords?: { lat: number; lon: number } | null;
  }>();

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // Buchungs-Link: wenn Abholort gesetzt, als URL-Params weitergeben
  const bookHref = $derived(
    pickupCoords
      ? `/rides/${ride._id}/book?plat=${pickupCoords.lat}&plon=${pickupCoords.lon}`
      : `/rides/${ride._id}/book`
  );
</script>

<div class="bg-white rounded-2xl shadow-md overflow-hidden">
  <!-- Event Header ─────────────────────────────────── -->
  <div class="bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3">
    <p class="font-bold text-white text-base leading-tight">{ride.eventName}</p>
    <p class="text-rose-100 text-xs mt-0.5">{ride.eventLocation}</p>
  </div>

  <div class="p-4 flex flex-col gap-3">
    <!-- Fahrer ───────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        {#if ride.driverPhoto}
          <img src={ride.driverPhoto} alt={ride.driverName} class="w-10 h-10 rounded-full object-cover" />
        {:else}
          <div class="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
            {initials(ride.driverName)}
          </div>
        {/if}
        <div>
          <p class="font-semibold text-gray-900 text-sm">{ride.driverName}</p>
          <p class="text-xs text-gray-500">ab {ride.startLocation}</p>
        </div>
      </div>
      <span class="flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-semibold px-2.5 py-1 rounded-full">
        {ride.seatsAvailable} Pl.
      </span>
    </div>

    <!-- Zeitinfo ─────────────────────────────────────── -->
    <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Abfahrt</span>
        <span class="font-semibold text-gray-800">
          {formatTime(ride.departureTime)} · {formatDate(ride.departureTime)}
        </span>
      </div>

      {#if preview}
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500 flex items-center gap-1">
            Abholung
            <span class="text-gray-400 text-xs" title="Geschaetzt (Haversine-Berechnung)">~</span>
          </span>
          <span class="font-semibold text-rose-600">{formatTime(preview.estimatedPickupTime)}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">Ankunft Event</span>
          <span class="font-semibold text-gray-800">~{formatTime(preview.estimatedArrivalAtEvent)}</span>
        </div>
        {#if preview.detourMinutes > 0}
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>Umweg fuer dich</span>
            <span>ca. {preview.detourMinutes} Min</span>
          </div>
        {/if}
      {:else}
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">Ankunft ca.</span>
          <span class="font-semibold text-gray-800">{formatTime(ride.estimatedArrivalTime)}</span>
        </div>
        {#if !pickupCoords}
          <p class="text-xs text-gray-400 pt-0.5">Abholort setzen fuer persoenliche Zeitangaben</p>
        {/if}
      {/if}
    </div>

    <!-- Preis und CTA ────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <span class="font-bold text-gray-900">CHF {ride.pricePerPerson.toFixed(2)}</span>
      <a
        href={bookHref}
        class="bg-rose-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-700 transition-colors"
      >
        Mitfahren
      </a>
    </div>
  </div>
</div>
