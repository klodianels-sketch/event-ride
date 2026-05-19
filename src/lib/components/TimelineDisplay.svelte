<script lang="ts">
  import { formatTime } from '$lib/time';

  let { mustArriveBy, estimatedPickupTime, latestArrivalTime, estimatedEventArrival } = $props<{
    mustArriveBy: Date | string;
    estimatedPickupTime: Date | string;
    latestArrivalTime: Date | string;
    estimatedEventArrival: Date | string;
  }>();
</script>

<div class="bg-rose-50 rounded-2xl p-4 flex flex-col gap-3">
  <p class="font-semibold text-gray-900 text-sm">Dein Zeitplan</p>
  <div class="flex flex-col gap-2">
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Sei bis spätestens</p>
        <p class="font-bold text-gray-900">{formatTime(mustArriveBy)} Uhr an deinem Treffpunkt</p>
      </div>
    </div>
    <div class="ml-4 w-0.5 h-4 bg-rose-200"></div>
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-white border-2 border-rose-300 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Fahrer kommt ca.</p>
        <p class="font-bold text-gray-900">{formatTime(estimatedPickupTime)} Uhr</p>
      </div>
    </div>
    <div class="ml-4 w-0.5 h-4 bg-rose-200"></div>
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-white border-2 border-rose-300 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Fahrer darf ab</p>
        <p class="font-bold text-gray-900">{formatTime(latestArrivalTime)} Uhr weiterfahren</p>
      </div>
    </div>
    <div class="ml-4 w-0.5 h-4 bg-rose-200"></div>
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 3l14 9-14 9V3z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Geschätzte Ankunft am Event</p>
        <p class="font-bold text-gray-900">{formatTime(estimatedEventArrival)} Uhr</p>
      </div>
    </div>
  </div>
</div>
