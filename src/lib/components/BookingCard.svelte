<script lang="ts">
  import { browser } from '$app/environment';
  import { formatTime, formatDate } from '$lib/time';
  import type { PublicBookingDTO } from '$lib/dto';

  let { booking } = $props<{ booking: PublicBookingDTO }>();

  const STATUS_LABELS: Record<string, string> = {
    pending:                'Anfrage gesendet',
    accepted:               'Bestätigt',
    confirmed:              'Bestätigt',
    rejected:               'Abgelehnt',
    cancelled:              'Storniert',
    cancelled_by_passenger: 'Storniert',
    cancelled_by_driver:    'Vom Fahrer storniert',
    'no-show':              'Nicht erschienen',
    completed:              'Abgeschlossen'
  };

  const STATUS_COLORS: Record<string, string> = {
    pending:                'bg-blue-100 text-blue-700',
    accepted:               'bg-green-100 text-green-700',
    confirmed:              'bg-green-100 text-green-700',
    rejected:               'bg-red-100 text-red-700',
    cancelled:              'bg-gray-100 text-gray-600',
    cancelled_by_passenger: 'bg-gray-100 text-gray-600',
    cancelled_by_driver:    'bg-orange-100 text-orange-700',
    'no-show':              'bg-gray-100 text-gray-500',
    completed:              'bg-blue-100 text-blue-700'
  };

  const isAccepted = $derived(booking.status === 'accepted' || booking.status === 'confirmed');
  const isPending = $derived(booking.status === 'pending');
  const hasRideEnded = $derived(
    browser && booking.ride?.departureTime
      ? new Date(booking.ride.departureTime).getTime() < Date.now()
      : false
  );

  function countdownText(pickupTimeStr?: string): string {
    if (!browser || !pickupTimeStr) return '';
    const diff = new Date(pickupTimeStr).getTime() - Date.now();
    if (diff < 0) return '';
    const totalMinutes = Math.floor(diff / 60000);
    if (totalMinutes < 60) return `in ${totalMinutes} Min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return `in ${hours}h ${minutes}m`;
    return `in ${Math.floor(hours / 24)} Tag${Math.floor(hours / 24) !== 1 ? 'en' : ''}`;
  }

  const countdown = $derived(
    isAccepted ? countdownText(booking.estimatedPickupTime) : ''
  );
</script>

<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

  <!-- Event-Header ────────────────────────────────────────── -->
  {#if booking.ride}
    <div class="bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3.5">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <p class="font-bold text-white leading-tight">{booking.ride.eventName}</p>
          <p class="text-rose-100 text-xs mt-0.5">{booking.ride.eventLocation}</p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0 ml-2">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full {STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-600'}">
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
          {#if countdown}
            <span class="text-white/80 text-xs">{countdown}</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <div class="p-4 flex flex-col gap-3">

    <!-- Fahrer und Abfahrt ──────────────────────────────── -->
    {#if booking.ride}
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center gap-1.5 text-gray-500">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          {booking.ride.driverName}
        </div>
        <span class="text-gray-400 text-xs">
          {formatDate(booking.ride.departureTime)}, {formatTime(booking.ride.departureTime)} Uhr
        </span>
      </div>
    {/if}

    <!-- Pending-Hinweis ────────────────────────────────── -->
    {#if isPending}
      <div class="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3 text-sm">
        <p class="font-semibold text-blue-800 mb-0.5">Anfrage ausstehend</p>
        <p class="text-blue-600 text-xs leading-relaxed">
          Der Fahrer entscheidet über deine Anfrage.
          Genaue Zeiten bekommst du nach der Bestätigung.
        </p>
      </div>
    {/if}

    <!-- Zeitblock (nur wenn accepted) ──────────────────── -->
    {#if isAccepted && booking.estimatedPickupTime && booking.recommendedReadyTime && booking.latestReadyTime}
      <div class="bg-rose-50 border border-rose-100 rounded-xl p-3.5">
        <p class="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2.5">Deine Abholzeiten</p>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-rose-300 shrink-0"></div>
              <span class="text-sm text-gray-600">Empfohlen bereit ab</span>
            </div>
            <span class="font-bold text-rose-700">{formatTime(booking.recommendedReadyTime)}</span>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
              <span class="text-sm text-gray-600">Fahrer kommt ca.</span>
            </div>
            <span class="font-bold text-gray-900">
              {formatTime(booking.estimatedPickupTime)}
              {#if booking.timeAccuracy === 'fallback'}
                <span class="text-xs text-gray-400 ml-1">(~)</span>
              {/if}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
              <span class="text-sm text-gray-600">Fahrer wartet maximal bis</span>
            </div>
            <span class="font-semibold text-amber-600">{formatTime(booking.latestReadyTime)}</span>
          </div>
          {#if booking.estimatedArrivalAtEvent}
            <div class="flex items-center justify-between border-t border-rose-100 pt-2 mt-0.5">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-gray-300 shrink-0"></div>
                <span class="text-sm text-gray-600">Ankunft Event ca.</span>
              </div>
              <span class="font-semibold text-gray-700">~{formatTime(booking.estimatedArrivalAtEvent)}</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Abholort und Preis ─────────────────────────────── -->
    <div class="flex items-center justify-between text-sm">
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span class="text-gray-500 truncate">{booking.pickupLocation}</span>
      </div>
      <span class="font-bold text-gray-900 shrink-0 ml-3">
        {booking.bookedPrice != null
          ? `CHF ${booking.bookedPrice.toFixed(2)}`
          : booking.ride ? `CHF ${booking.ride.pricePerPerson.toFixed(2)}` : ''}
      </span>
    </div>

    <!-- Bewerten-Link (nach Fahrt) ─────────────────────── -->
    {#if hasRideEnded && isAccepted && booking.ride?._id}
      <a
        href="/rides/{booking.ride._id}/rate?bookingId={booking._id}"
        class="w-full border border-rose-200 text-rose-600 py-2.5 rounded-xl font-semibold text-sm text-center hover:bg-rose-50 transition-colors"
      >
        ★ Fahrer bewerten
      </a>
    {/if}

    <!-- No-Show Hinweis ────────────────────────────────── -->
    {#if booking.noShowPolicySnapshot && isAccepted}
      <p class="text-xs text-gray-400 border-t border-gray-100 pt-2.5">
        Fairplay: Fahrer wartet max. {booking.noShowPolicySnapshot.waitMinutes} Min.
        {#if booking.noShowPolicySnapshot.penaltyPercent > 0}
          Bei Nichterscheinen: {booking.noShowPolicySnapshot.penaltyPercent}% Gebühr.
        {/if}
      </p>
    {/if}

  </div>
</div>
