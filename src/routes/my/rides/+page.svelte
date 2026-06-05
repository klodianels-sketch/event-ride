<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatDate, formatTime } from '$lib/time';

  let { data, form } = $props();

  const STATUS_LABEL: Record<string, string> = {
    active: 'Aktiv',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen'
  };

  const STATUS_COLOR: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700'
  };

  const CAT_EMOJI: Record<string, string> = {
    music: '🎵', festival: '🎪', nightlife: '🌙',
    sport: '⚡', hiking: '🏔️', culture: '🎭', other: '✨'
  };

  function occupancyPct(ride: any): number {
    return ride.seats > 0 ? Math.round(((ride.seats - ride.seatsAvailable) / ride.seats) * 100) : 0;
  }

  // Expandierte Anfragen-Sektion per Fahrt
  let expandedRide = $state<string | null>(null);

  function toggleExpand(rideId: string) {
    expandedRide = expandedRide === rideId ? null : rideId;
  }

  // Optimistisches State-Management für Anfragen
  let processingBooking = $state<string | null>(null);

  // Storno-Bestätigung für eine Fahrt
  let confirmCancelRideId = $state<string | null>(null);
</script>

<svelte:head>
  <title>Meine Fahrten – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="flex items-center justify-between mb-5">
    <h1 class="text-2xl font-bold text-gray-900">Meine Fahrten</h1>
    <a href="/rides/new" class="bg-rose-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
      </svg>
      Neue Fahrt
    </a>
  </div>

  <!-- Fehler-Feedback ────────────────────────────────────── -->
  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  {#if data.rides.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="text-5xl mb-4">🚗</div>
      <p class="font-semibold text-gray-800 mb-1">Noch keine Fahrten</p>
      <p class="text-gray-400 text-sm mb-5">Teile deine nächste Eventfahrt und spare Kosten.</p>
      <a href="/rides/new" class="bg-rose-600 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-rose-700 transition-colors">
        Erste Fahrt anbieten
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-5">
      {#each data.rides as ride}
        {@const pendingCount = ride.pendingRequests.length}
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <!-- Event Header ─────────────────────────────── -->
          <div class="bg-gray-900 px-4 py-3.5 flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-lg">{CAT_EMOJI[ride.eventCategory] ?? '✨'}</span>
                <p class="font-bold text-white truncate">{ride.eventName}</p>
              </div>
              <p class="text-gray-400 text-xs mt-0.5">{ride.eventLocation}</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3 {STATUS_COLOR[ride.status] ?? 'bg-gray-100 text-gray-600'}">
              {STATUS_LABEL[ride.status] ?? ride.status}
            </span>
          </div>

          <div class="p-4 flex flex-col gap-3">

            <!-- Eckdaten ──────────────────────────────── -->
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="bg-gray-50 rounded-xl p-2.5">
                <p class="text-gray-400 text-xs mb-0.5">Abfahrt</p>
                <p class="font-semibold text-gray-800 text-sm">{formatDate(ride.departureTime)}</p>
                <p class="font-semibold text-gray-800 text-sm">{formatTime(ride.departureTime)} Uhr</p>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <p class="text-gray-400 text-xs mb-0.5">Startort</p>
                <p class="font-semibold text-gray-800 text-sm">{ride.startLocation}</p>
                <p class="font-bold text-gray-900 text-sm mt-0.5">CHF {ride.pricePerPerson.toFixed(2)} p.P.</p>
              </div>
            </div>

            <!-- Auslastung ────────────────────────────── -->
            <div>
              <div class="flex justify-between text-xs text-gray-400 mb-1">
                <span>{ride.seats - ride.seatsAvailable} / {ride.seats} Plätze belegt</span>
                <span>{occupancyPct(ride)}%</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5">
                <div class="bg-rose-500 h-1.5 rounded-full transition-all" style="width: {occupancyPct(ride)}%"></div>
              </div>
            </div>

            <!-- Offene Anfragen ──────────────────────── -->
            {#if pendingCount > 0}
              <div>
                <button
                  type="button"
                  onclick={() => toggleExpand(ride._id)}
                  class="w-full flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-700"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                      {pendingCount}
                    </span>
                    Offene {pendingCount === 1 ? 'Anfrage' : 'Anfragen'}
                  </span>
                  <svg
                    class="w-4 h-4 transition-transform {expandedRide === ride._id ? 'rotate-180' : ''}"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {#if expandedRide === ride._id}
                  <div class="mt-2 flex flex-col gap-2">
                    {#each ride.pendingRequests as req}
                      <div class="border border-gray-200 rounded-xl p-3 bg-white">
                        <div class="flex items-start justify-between mb-2">
                          <div class="flex-1 min-w-0">
                            <p class="font-semibold text-gray-900 text-sm">{req.passengerName}</p>
                            <p class="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{req.pickupLocation}</p>
                          </div>
                          <div class="flex items-center gap-2 shrink-0 ml-2">
                            {#if req.conversationId}
                              <a
                                href="/my/chats/{req.conversationId}"
                                class="text-xs text-rose-500 font-semibold hover:text-rose-600"
                                aria-label="Chat öffnen"
                              >
                                Chat
                              </a>
                            {/if}
                            <span class="text-xs font-bold text-gray-900">
                              CHF {req.bookedPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div class="flex gap-2">
                          <form
                            method="POST"
                            action="?/accept"
                            use:enhance={() => {
                              processingBooking = req.bookingId;
                              return ({ update }) => { processingBooking = null; update(); };
                            }}
                            class="flex-1"
                          >
                            <input type="hidden" name="bookingId" value={req.bookingId} />
                            <button
                              type="submit"
                              disabled={processingBooking === req.bookingId}
                              class="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {processingBooking === req.bookingId ? 'Laden...' : '✓ Annehmen'}
                            </button>
                          </form>
                          <form
                            method="POST"
                            action="?/reject"
                            use:enhance={() => {
                              processingBooking = req.bookingId;
                              return ({ update }) => { processingBooking = null; update(); };
                            }}
                            class="flex-1"
                          >
                            <input type="hidden" name="bookingId" value={req.bookingId} />
                            <button
                              type="submit"
                              disabled={processingBooking === req.bookingId}
                              class="w-full border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              ✕ Ablehnen
                            </button>
                          </form>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Bestätigte Mitfahrer ─────────────────── -->
            {#if ride.acceptedPassengers.length > 0}
              <div>
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Mitfahrende ({ride.acceptedPassengers.length})
                </p>
                <div class="flex flex-col gap-1.5">
                  {#each ride.acceptedPassengers as p}
                    <div class="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                          {p.passengerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p class="text-sm font-semibold text-gray-800">{p.passengerName}</p>
                          <p class="text-xs text-gray-400 truncate max-w-[160px]">{p.pickupLocation}</p>
                        </div>
                      </div>
                      <div class="flex flex-col items-end gap-1 shrink-0 ml-2">
                        {#if p.estimatedPickupTime}
                          <p class="text-xs font-medium text-gray-700">{formatTime(p.estimatedPickupTime)}</p>
                        {/if}
                        {#if p.conversationId}
                          <a
                            href="/my/chats/{p.conversationId}"
                            class="text-xs text-rose-500 font-semibold hover:text-rose-600 transition-colors"
                            aria-label="Chat öffnen"
                          >
                            Chat
                          </a>
                        {/if}
                        <!-- No-Show Button -->
                        <form method="POST" action="?/noshow" use:enhance>
                          <input type="hidden" name="bookingId" value={p.bookingId} />
                          <button
                            type="submit"
                            class="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            title="Als nicht erschienen markieren"
                          >
                            No-Show
                          </button>
                        </form>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {:else if pendingCount === 0 && ride.seatsAvailable > 0 && ride.status === 'active'}
              <p class="text-xs text-gray-400 text-center py-1">
                Noch keine Mitfahrenden — {ride.seatsAvailable} {ride.seatsAvailable === 1 ? 'Platz' : 'Plätze'} frei
              </p>
            {/if}

            <!-- Fahrt stornieren ─────────────────────────────── -->
            {#if ride.status === 'active'}
              {#if confirmCancelRideId === ride._id}
                <div class="bg-red-50 border border-red-200 rounded-xl p-3.5 mt-1">
                  <p class="text-sm font-semibold text-red-800 mb-1">Fahrt wirklich stornieren?</p>
                  <p class="text-xs text-red-600 mb-3 leading-relaxed">
                    Alle Mitfahrenden werden benachrichtigt und kostenlos storniert.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  <div class="flex gap-2">
                    <form
                      method="POST"
                      action="?/cancelRide"
                      use:enhance={() => { return ({ update }) => { confirmCancelRideId = null; update(); }; }}
                      class="flex-1"
                    >
                      <input type="hidden" name="rideId" value={ride._id} />
                      <button type="submit" class="w-full bg-red-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
                        Ja, stornieren
                      </button>
                    </form>
                    <button
                      type="button"
                      onclick={() => confirmCancelRideId = null}
                      class="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              {:else}
                <button
                  type="button"
                  onclick={() => confirmCancelRideId = ride._id}
                  class="w-full text-xs text-gray-400 hover:text-red-500 transition-colors pt-1 pb-0.5 text-center"
                >
                  Fahrt stornieren
                </button>
              {/if}
            {/if}

          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
