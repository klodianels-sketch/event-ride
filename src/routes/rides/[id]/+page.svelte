<script lang="ts">
  import RideCard from '$lib/components/RideCard.svelte';
  import { formatDate, formatTime } from '$lib/time';
  import { getCategoryImage, CATEGORY_GRADIENT, CATEGORY_EMOJI, CATEGORY_LABEL } from '$lib/images';
  import type { EventCategory } from '$lib/types';

  let { data } = $props();

  const cat = $derived((data.ride.eventCategory as EventCategory) ?? 'other');
  const gradient = $derived(CATEGORY_GRADIENT[cat] ?? CATEGORY_GRADIENT.other);
  const emoji    = $derived(CATEGORY_EMOJI[cat]    ?? CATEGORY_EMOJI.other);
  const label    = $derived(CATEGORY_LABEL[cat]    ?? CATEGORY_LABEL.other);
  const heroImg  = $derived(data.ride.eventImage ?? getCategoryImage(data.ride.eventCategory, 0));

  function stars(r: number | null | undefined): string {
    if (!r) return '';
    const full = Math.round(r);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  const STATUS_LABEL: Record<string, { text: string; color: string }> = {
    pending:  { text: 'Anfrage ausstehend', color: 'bg-amber-100 text-amber-700' },
    accepted: { text: 'Buchung bestätigt', color: 'bg-green-100 text-green-700' },
    confirmed:{ text: 'Buchung bestätigt', color: 'bg-green-100 text-green-700' },
  };

  // Teilnehmerstatus-Text (privacy-safe)
  const participantLabel = $derived(() => {
    const acc = data.ride.acceptedCount ?? 0;
    const pend = data.ride.pendingCount ?? 0;
    if (acc === 0 && pend === 0) return null;
    const parts: string[] = [];
    if (acc > 0) parts.push(`${acc} bestätigt`);
    if (pend > 0) parts.push(`${pend} anfragend`);
    return parts.join(' · ');
  });
</script>

<svelte:head>
  <title>{data.ride.eventName} – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen pb-24">

  <!-- Hero-Bild ─────────────────────────────────────────────── -->
  <div class="relative h-64 bg-gradient-to-br {gradient} overflow-hidden">
    <img
      src={heroImg}
      alt={data.ride.eventName}
      class="absolute inset-0 w-full h-full object-cover"
      loading="eager"
      onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

    <!-- Navigation -->
    <a
      href="/"
      class="absolute top-12 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow"
      aria-label="Zurück"
    >
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>

    <!-- Kategorie-Badge -->
    <div class="absolute top-12 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur px-2.5 py-1 rounded-full">
      <span class="text-base leading-none">{emoji}</span>
      <span class="text-white text-xs font-semibold">{label}</span>
    </div>

    <!-- Event-Titel unten -->
    <div class="absolute bottom-0 left-0 right-0 px-4 pb-4">
      <p class="text-white font-bold text-xl leading-tight drop-shadow">{data.ride.eventName}</p>
      <p class="text-white/70 text-sm mt-0.5 flex items-center gap-1">
        <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        {data.ride.eventLocation} · {formatDate(data.ride.departureTime)}
      </p>
    </div>
  </div>

  <div class="px-4 pt-4 flex flex-col gap-4">

    <!-- Mein Buchungsstatus ───────────────────────────────────── -->
    {#if data.myBooking}
      {@const statusInfo = STATUS_LABEL[data.myBooking.status]}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="font-semibold text-gray-900 text-sm">Meine Buchung</p>
          {#if statusInfo}
            <span class="text-xs font-bold px-2.5 py-1 rounded-full {statusInfo.color}">{statusInfo.text}</span>
          {/if}
        </div>
        <div class="flex gap-2">
          <a
            href="/my/bookings"
            class="flex-1 text-center bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Buchungsdetails
          </a>
          {#if data.myBooking.conversationId}
            <a
              href="/my/chats/{data.myBooking.conversationId}"
              class="flex-1 text-center bg-rose-50 text-rose-700 border border-rose-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Chat
            </a>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Infos & Buchungs-CTA ────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <!-- Zeiten -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-gray-50 rounded-xl p-3">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Abfahrt</p>
          <p class="font-bold text-gray-900 text-base">{formatTime(data.ride.departureTime)}</p>
          <p class="text-xs text-gray-500 mt-0.5">{formatDate(data.ride.departureTime)}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Ankunft Event ca.</p>
          <p class="font-bold text-gray-900 text-base">{formatTime(data.ride.estimatedArrivalTime)}</p>
          <p class="text-xs text-rose-500 mt-0.5">ab Startort</p>
        </div>
      </div>

      <!-- Plätze + Preis + Teilnehmer -->
      <div class="flex items-center justify-between py-3 border-t border-gray-50">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span class="text-sm text-gray-600">
              <span class="font-bold text-gray-900">{data.ride.seatsAvailable}</span> von {data.ride.seats} Plätzen frei
            </span>
          </div>
          {#if participantLabel()}
            <p class="text-xs text-gray-400 pl-6">{participantLabel()}</p>
          {/if}
        </div>
        <span class="font-bold text-xl text-gray-900">CHF {data.ride.pricePerPerson.toFixed(2)}</span>
      </div>

      <!-- Buchungs-Button -->
      {#if data.isDriver}
        <div class="mt-3 bg-blue-50 text-blue-700 rounded-xl px-4 py-3 text-sm font-semibold text-center">
          Das ist deine Fahrt
        </div>
      {:else if data.myBooking}
        <div class="mt-3 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold text-center">
          Du bist bereits angemeldet
        </div>
      {:else if !data.isLoggedIn}
        <a
          href="/auth/login?redirect=/rides/{data.ride._id}"
          class="block mt-3 w-full bg-rose-600 text-white py-3.5 rounded-2xl font-bold text-sm text-center hover:bg-rose-700 transition-colors"
        >
          Anmelden &amp; Mitfahren
        </a>
      {:else if data.ride.seatsAvailable <= 0}
        <div class="mt-3 bg-gray-100 text-gray-400 rounded-xl px-4 py-3 text-sm font-semibold text-center">
          Keine Plätze mehr frei
        </div>
      {:else if data.ride.status !== 'active'}
        <div class="mt-3 bg-red-50 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold text-center">
          Fahrt nicht mehr verfügbar
        </div>
      {:else}
        <a
          href="/rides/{data.ride._id}/book"
          class="block mt-3 w-full bg-rose-600 text-white py-3.5 rounded-2xl font-bold text-sm text-center hover:bg-rose-700 transition-colors"
        >
          Mitfahren — CHF {data.ride.pricePerPerson.toFixed(2)}
        </a>
      {/if}
    </div>

    <!-- Bestätigte Mitfahrer (privacy-safe) ────────────────────── -->
    {#if data.ride.confirmedPassengers && data.ride.confirmedPassengers.length > 0}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mitfahrende</p>
        <div class="flex flex-wrap gap-2">
          {#each data.ride.confirmedPassengers as p}
            <span class="flex items-center gap-1.5 bg-gray-50 border border-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
              <span class="w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                {p.displayName[0]}
              </span>
              {p.displayName}
            </span>
          {/each}
        </div>
        {#if data.pendingCount && data.pendingCount > 0 && data.isDriver}
          <p class="text-xs text-amber-600 mt-2">+ {data.pendingCount} offene Anfrage{data.pendingCount > 1 ? 'n' : ''}</p>
        {/if}
      </div>
    {/if}

    <!-- Route-Info (abstrakt, privacy-safe) ─────────────────────── -->
    {#if data.routeStops && data.routeStops.length > 0}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Route</p>
        <div class="flex flex-col gap-0">
          <!-- Start -->
          <div class="flex items-start gap-3">
            <div class="flex flex-col items-center shrink-0 mt-0.5">
              <div class="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <div class="w-0.5 h-6 bg-gray-200 mt-0.5"></div>
            </div>
            <div class="pb-3">
              <p class="text-sm font-medium text-gray-800">{data.ride.startLocation}</p>
              <p class="text-xs text-gray-400">Startort · {formatTime(data.ride.departureTime)}</p>
            </div>
          </div>
          <!-- Zwischenorte (abstrahiert) -->
          {#each data.routeStops as stop, i}
            <div class="flex items-start gap-3">
              <div class="flex flex-col items-center shrink-0 mt-0.5">
                <div class="w-2 h-2 rounded-full bg-gray-300 border-2 border-white ring-1 ring-gray-200"></div>
                {#if i < data.routeStops.length - 1}
                  <div class="w-0.5 h-6 bg-gray-200 mt-0.5"></div>
                {:else}
                  <div class="w-0.5 h-6 bg-gray-200 mt-0.5"></div>
                {/if}
              </div>
              <div class="pb-3">
                <p class="text-sm text-gray-600">{stop}</p>
                <p class="text-xs text-gray-400">Abholpunkt</p>
              </div>
            </div>
          {/each}
          <!-- Ziel -->
          <div class="flex items-start gap-3">
            <div class="flex flex-col items-center shrink-0 mt-0.5">
              <div class="w-2.5 h-2.5 rounded-full bg-gray-800"></div>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800">{data.ride.eventLocation}</p>
              <p class="text-xs text-gray-400">Ziel · ca. {formatTime(data.ride.estimatedArrivalTime)}</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Fahrer-Karte ────────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fahrer</p>
      <!-- Bug-Fix: war data.ride._id, muss driverId sein -->
      <a href="/users/{data.driverInfo?._id ?? data.ride.driverId}" class="flex items-center gap-3">
        {#if data.driverInfo?.avatarUrl}
          <img
            src={data.driverInfo.avatarUrl}
            alt={data.ride.driverName}
            class="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
          />
        {:else if data.ride.driverPhoto}
          <img
            src={data.ride.driverPhoto}
            alt={data.ride.driverName}
            class="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
          />
        {:else}
          <div class="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm ring-2 ring-gray-100">
            {initials(data.ride.driverName)}
          </div>
        {/if}
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900">{data.ride.driverName}</p>
          {#if data.driverInfo?.region}
            <p class="text-xs text-gray-400">📍 {data.driverInfo.region}</p>
          {/if}
          {#if data.ride.driverRating}
            <div class="flex items-center gap-1 mt-0.5">
              <span class="text-amber-400 text-xs">{stars(data.ride.driverRating)}</span>
              <span class="text-xs text-gray-500">{data.ride.driverRating.toFixed(1)}</span>
              {#if data.driverInfo?.totalRatings}
                <span class="text-xs text-gray-400">({data.driverInfo.totalRatings})</span>
              {/if}
            </div>
          {/if}
        </div>
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
      {#if data.driverInfo?.bio}
        <p class="text-sm text-gray-500 mt-3 leading-relaxed border-t border-gray-50 pt-3">
          "{data.driverInfo.bio}"
        </p>
      {/if}
      <div class="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        Abfahrt ab <span class="font-medium text-gray-600">{data.ride.startLocation}</span>
      </div>
    </div>

    <!-- Weitere Fahrten zum gleichen Event ─────────────────────── -->
    {#if data.allRides.length > 0}
      <div>
        <h2 class="font-semibold text-gray-900 mb-3">Weitere Fahrten zu diesem Event</h2>
        <div class="flex flex-col gap-3">
          {#each data.allRides as ride}
            <RideCard {ride} />
          {/each}
        </div>
      </div>
    {/if}

    <!-- Eigene Fahrt anbieten ───────────────────────────────────── -->
    <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 text-center border border-gray-100">
      <p class="text-sm text-gray-600 mb-3">Auch zum gleichen Event unterwegs?</p>
      <a
        href="/rides/new"
        class="inline-block bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors"
      >
        Eigene Mitfahrgelegenheit anbieten
      </a>
    </div>

  </div>
</div>
