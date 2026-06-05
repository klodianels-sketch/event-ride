<script lang="ts">
  import { formatTime, formatDate } from '$lib/time';
  import { getCategoryImage, CATEGORY_GRADIENT, CATEGORY_EMOJI, CATEGORY_LABEL } from '$lib/images';
  import type { PublicRideDTO } from '$lib/dto';
  import type { EventCategory } from '$lib/types';

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

  const cat = $derived(ride.eventCategory ?? 'other');
  const gradient = $derived(CATEGORY_GRADIENT[cat as EventCategory] ?? CATEGORY_GRADIENT.other);
  const emoji    = $derived(CATEGORY_EMOJI[cat as EventCategory]    ?? CATEGORY_EMOJI.other);
  const label    = $derived(CATEGORY_LABEL[cat as EventCategory]    ?? CATEGORY_LABEL.other);

  // Bild: eventImage aus DB hat Priorität, dann Kategorie-Default
  const headerImage = $derived(
    ride.eventImage ?? getCategoryImage(ride.eventCategory, 0)
  );

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function ratingStars(rating: number): string {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  const bookHref = $derived(
    pickupCoords
      ? `/rides/${ride._id}/book?plat=${pickupCoords.lat}&plon=${pickupCoords.lon}`
      : `/rides/${ride._id}/book`
  );

  const isPersonalized = $derived(preview !== null);
</script>

<div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 active:scale-[0.99] transition-transform">
  <!-- Event-Header mit Foto ───────────────────────────────── -->
  <a href="/rides/{ride._id}" class="block">
    <div class="relative h-28 bg-gradient-to-r {gradient} overflow-hidden">
      <!-- Kategorie-Foto -->
      <img
        src={headerImage}
        alt={ride.eventName}
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <!-- Dunkler Overlay für Lesbarkeit -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

      <!-- Badges oben -->
      <div class="absolute top-3 right-3 flex flex-col items-end gap-1">
        <span class="text-xl leading-none">{emoji}</span>
        <span class="text-white/80 text-[10px] font-medium bg-black/30 px-1.5 py-0.5 rounded-full">
          {formatDate(ride.departureTime)}
        </span>
      </div>

      <!-- Event-Name unten -->
      <div class="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
        <p class="font-bold text-white text-sm leading-snug drop-shadow">{ride.eventName}</p>
        <div class="flex items-center gap-1 mt-0.5">
          <svg class="w-2.5 h-2.5 text-white/70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <p class="text-white/70 text-[10px] truncate">{ride.eventLocation}</p>
        </div>
      </div>
    </div>
  </a>

  <div class="p-3.5 flex flex-col gap-3">
    <!-- Fahrer ──────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <a href="/users/{ride.driverId}" class="flex items-center gap-2.5">
        {#if ride.driverPhoto}
          <img src={ride.driverPhoto} alt={ride.driverName} class="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100" />
        {:else}
          <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs ring-2 ring-gray-100">
            {initials(ride.driverName)}
          </div>
        {/if}
        <div>
          <p class="font-semibold text-gray-900 text-sm leading-none">{ride.driverName}</p>
          <p class="text-xs text-gray-400 mt-0.5">ab {ride.startLocation}</p>
        </div>
      </a>
      <div class="flex flex-col items-end gap-0.5">
        {#if ride.driverRating && ride.driverRating > 0}
          <span class="text-amber-400 text-xs tracking-tight" title="{ride.driverRating.toFixed(1)} Sterne">
            {ratingStars(ride.driverRating)}
          </span>
        {/if}
        <span class="flex items-center gap-1 text-xs font-semibold text-gray-500">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          {ride.seatsAvailable} frei
        </span>
      </div>
    </div>

    <!-- Zeitblock ───────────────────────────────────────────── -->
    <div class="bg-gray-50 rounded-xl p-2.5 flex flex-col gap-1.5 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-gray-400 text-xs">Abfahrt</span>
        <span class="font-semibold text-gray-800 text-xs">{formatTime(ride.departureTime)}</span>
      </div>
      {#if isPersonalized && preview}
        <div class="border-t border-gray-100 pt-1.5 mt-0.5 flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span class="text-gray-500 flex items-center gap-1 text-xs">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
              Abholung ca.
            </span>
            <span class="font-bold text-rose-600 text-xs">~{formatTime(preview.estimatedPickupTime)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500 text-xs">Ankunft Event</span>
            <span class="font-semibold text-gray-700 text-xs">~{formatTime(preview.estimatedArrivalAtEvent)}</span>
          </div>
          {#if preview.detourMinutes > 1}
            <div class="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-1">
              <span>Umweg für dich</span>
              <span>+{preview.detourMinutes} Min</span>
            </div>
          {/if}
        </div>
      {:else}
        <div class="flex items-center justify-between">
          <span class="text-gray-400 text-xs">Ankunft Event ca.</span>
          <span class="font-semibold text-gray-700 text-xs">{formatTime(ride.estimatedArrivalTime)}</span>
        </div>
        {#if !pickupCoords}
          <p class="text-[10px] text-gray-400 border-t border-gray-100 pt-1.5 mt-0.5">
            Abholort setzen → persönliche Zeiten
          </p>
        {/if}
      {/if}
    </div>

    <!-- Preis und CTA ──────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{label}</span>
        <span class="font-bold text-gray-900">CHF {ride.pricePerPerson.toFixed(2)}</span>
      </div>
      <a
        href={bookHref}
        class="bg-rose-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-rose-700 active:bg-rose-800 transition-colors"
      >
        Mitfahren
      </a>
    </div>
  </div>
</div>
