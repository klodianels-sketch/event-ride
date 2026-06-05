<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  let selectedStars = $state(0);
  let hoveredStar = $state(0);
  let comment = $state('');
  let loading = $state(false);

  const displayStars = $derived(hoveredStar || selectedStars);
</script>

<svelte:head>
  <title>Bewerten – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">

  <!-- Header ─────────────────────────────────────────────── -->
  <button type="button" onclick={() => history.back()} class="text-gray-400 text-sm flex items-center gap-1 mb-6 self-start">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
    </svg>
    Zurück
  </button>

  <div class="mb-6">
    <p class="text-xs font-semibold text-rose-600 uppercase tracking-widest mb-1">Bewertung</p>
    <h1 class="text-2xl font-bold text-gray-900">
      {data.fromRole === 'passenger' ? 'Fahrer bewerten' : 'Mitfahrer bewerten'}
    </h1>
    <p class="text-gray-500 text-sm mt-1">
      {data.toName} · {data.eventName}
    </p>
  </div>

  {#if data.alreadyRated}
    <!-- Bereits bewertet ──────────────────────────────── -->
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-5xl mb-4">✅</div>
      <p class="font-bold text-gray-900 mb-2">Bereits bewertet</p>
      <p class="text-gray-400 text-sm">Du hast diese Person für diese Fahrt bereits bewertet.</p>
    </div>
  {:else}
    <!-- Bewertungsformular ────────────────────────────── -->
    {#if form?.error}
      <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }}
      class="flex flex-col gap-5"
    >
      <input type="hidden" name="bookingId" value={data.bookingIdStr} />

      <!-- Sterne-Auswahl ──────────────────────────────── -->
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-3">Deine Bewertung</label>
        <div class="flex gap-2 justify-center">
          {#each [1, 2, 3, 4, 5] as star}
            <button
              type="button"
              onmouseenter={() => hoveredStar = star}
              onmouseleave={() => hoveredStar = 0}
              onclick={() => selectedStars = star}
              class="text-4xl transition-transform active:scale-90 {displayStars >= star ? 'text-amber-400' : 'text-gray-200'}"
              aria-label="{star} Stern{star !== 1 ? 'e' : ''}"
            >
              ★
            </button>
          {/each}
        </div>
        {#if selectedStars > 0}
          <p class="text-center text-sm text-gray-500 mt-2">
            {['', 'Schlecht', 'Naja', 'OK', 'Gut', 'Ausgezeichnet'][selectedStars]}
          </p>
        {:else}
          <p class="text-center text-xs text-gray-400 mt-2">Stern anklicken</p>
        {/if}
        <!-- Hidden input fuer Formular -->
        <input type="hidden" name="stars" value={selectedStars} />
      </div>

      <!-- Kommentar ───────────────────────────────────── -->
      <div>
        <label for="comment" class="block text-sm font-semibold text-gray-700 mb-1.5">
          Kommentar <span class="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          bind:value={comment}
          maxlength="300"
          rows="3"
          placeholder="Wie war die Fahrt? Was hat gut geklappt?"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm resize-none"
        ></textarea>
        <p class="text-xs text-gray-400 text-right mt-1">{comment.length}/300</p>
      </div>

      <!-- Submit ──────────────────────────────────────── -->
      <button
        type="submit"
        disabled={loading || selectedStars === 0}
        class="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {#if loading}
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Wird gespeichert...
        {:else}
          Bewertung abschicken
        {/if}
      </button>

    </form>
  {/if}

  <!-- Bewertungsrichtlinien ──────────────────────────── -->
  <div class="mt-6 bg-gray-50 rounded-xl px-4 py-3">
    <p class="text-xs text-gray-400 leading-relaxed">
      Bewertungen sind anonym und werden im Profil als Durchschnitt angezeigt.
      Kommentare müssen fair und respektvoll sein.
    </p>
  </div>
</div>
