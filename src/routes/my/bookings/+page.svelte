<script lang="ts">
  import { enhance } from '$app/forms';
  import BookingCard from '$lib/components/BookingCard.svelte';
  import { browser } from '$app/environment';
  // Stornogebuehr-Konstante muss mit CANCELLATION_POLICY.passengerLate.value uebereinstimmen
  const LATE_CANCEL_FEE_PERCENT = 20;
  const FREE_WINDOW_HOURS = 24;

  let { data, form } = $props();

  // Welche Buchung wird gerade storniert?
  let cancellingId = $state<string | null>(null);
  let cancellingType = $state<'pending' | 'accepted' | null>(null);

  function canCancel(booking: (typeof data.bookings)[0]): boolean {
    return (
      booking.status === 'pending' ||
      booking.status === 'accepted' ||
      booking.status === 'confirmed'
    );
  }

  function getHoursUntilDeparture(booking: (typeof data.bookings)[0]): number {
    if (!booking.ride?.departureTime) return Infinity;
    return (new Date(booking.ride.departureTime).getTime() - Date.now()) / (1000 * 60 * 60);
  }

  function getCancellationFee(booking: (typeof data.bookings)[0]): number {
    if (booking.status === 'pending') return 0;
    const hours = getHoursUntilDeparture(booking);
    if (hours >= FREE_WINDOW_HOURS) return 0;
    return Math.round((booking.bookedPrice ?? 0) * (LATE_CANCEL_FEE_PERCENT / 100) * 100) / 100;
  }

  function startCancel(booking: (typeof data.bookings)[0]) {
    cancellingId = booking._id;
    cancellingType = (booking.status === 'pending') ? 'pending' : 'accepted';
  }
</script>

<svelte:head>
  <title>Meine Buchungen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Meine Buchungen</h1>

  {#if form?.cancelSuccess}
    <div class="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
      {#if (form.fee ?? 0) > 0}
        Mitfahrt storniert. Stornogebühr: CHF {((form.fee as number) ?? 0).toFixed(2)}.
      {:else}
        Erfolgreich storniert — kostenlos.
      {/if}
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  {#if data.bookings.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="text-5xl mb-4">🎪</div>
      <p class="font-semibold text-gray-800 mb-1">Noch keine Buchungen</p>
      <p class="text-gray-400 text-sm mb-5">Finde deine nächste Eventfahrt.</p>
      <a href="/" class="bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
        Fahrten entdecken
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each data.bookings as booking}
        {@const isCancellable = canCancel(booking)}
        {@const fee = getCancellationFee(booking)}
        {@const isFree = fee === 0}
        {@const isConfirming = cancellingId === booking._id}

        <div class="flex flex-col">
          <!-- Eigentliche Buchungskarte -->
          <BookingCard {booking} />

          <!-- Chat-Link falls vorhanden -->
          {#if booking.conversationId && canCancel(booking)}
            <div class="border-x border-gray-100 bg-white -mt-1 px-4 py-2">
              <a
                href="/my/chats/{booking.conversationId}"
                class="flex items-center gap-2 text-rose-600 text-xs font-semibold hover:text-rose-700 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Chat mit Fahrer öffnen
              </a>
            </div>
          {/if}

          <!-- Storno-Sektion — nur für aktive Buchungen -->
          {#if isCancellable}
            <div class="border-x border-b border-gray-100 rounded-b-2xl bg-white -mt-1 pt-1">
              {#if isConfirming}
                <!-- Bestätigungs-Panel ───────────────────── -->
                <div class="px-4 pb-4 pt-3">
                  {#if cancellingType === 'accepted' && !isFree}
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                      <p class="text-xs font-semibold text-amber-800 mb-0.5">Stornogebühr anfallend</p>
                      <p class="text-xs text-amber-700 leading-relaxed">
                        Weniger als {FREE_WINDOW_HOURS}h vor Abfahrt: <strong>CHF {fee.toFixed(2)}</strong> ({LATE_CANCEL_FEE_PERCENT}% von CHF {(booking.bookedPrice ?? 0).toFixed(2)}).
                      </p>
                    </div>
                  {:else}
                    <p class="text-xs text-gray-500 mb-3">
                      {cancellingType === 'pending'
                        ? 'Offene Anfrage kostenlos zurückziehen?'
                        : 'Mitfahrt kostenlos stornieren (mehr als 24h vor Abfahrt).'}
                    </p>
                  {/if}
                  <div class="flex gap-2">
                    <form
                      method="POST"
                      action={cancellingType === 'pending' ? '?/cancelPending' : '?/cancelAccepted'}
                      use:enhance={() => {
                        return ({ update }) => { cancellingId = null; cancellingType = null; update(); };
                      }}
                      class="flex-1"
                    >
                      <input type="hidden" name="bookingId" value={booking._id} />
                      <button
                        type="submit"
                        class="w-full {!isFree && cancellingType === 'accepted' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'} text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                      >
                        {!isFree && cancellingType === 'accepted' ? `Stornieren (CHF ${fee.toFixed(2)})` : 'Ja, stornieren'}
                      </button>
                    </form>
                    <button
                      type="button"
                      onclick={() => { cancellingId = null; cancellingType = null; }}
                      class="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Behalten
                    </button>
                  </div>
                </div>
              {:else}
                <!-- Stornieren-Trigger ──────────────────── -->
                <button
                  type="button"
                  onclick={() => startCancel(booking)}
                  class="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-2.5 text-center"
                >
                  {booking.status === 'pending' ? 'Anfrage zurückziehen' : 'Mitfahrt stornieren'}
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
