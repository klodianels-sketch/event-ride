<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  let avatarPreview = $state(data.profile.avatarUrl ?? '');
  let selectedInterests = $state<string[]>([...data.profile.interests]);

  function toggleInterest(interest: string) {
    if (selectedInterests.includes(interest)) {
      selectedInterests = selectedInterests.filter(i => i !== interest);
    } else {
      selectedInterests = [...selectedInterests, interest];
    }
  }
</script>

<svelte:head>
  <title>Einstellungen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen pb-24">
  <!-- Header -->
  <div class="flex items-center gap-3 px-4 pt-12 pb-4 bg-white border-b border-gray-100">
    <a href="/my/profile" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
    <h1 class="text-lg font-bold text-gray-900">Profil bearbeiten</h1>
  </div>

  <div class="px-4 pt-4 flex flex-col gap-4">

    <!-- Feedback -->
    {#if form?.success}
      <div class="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
        {form.action === 'profile_updated'       ? 'Profil gespeichert.' : ''}
        {form.action === 'notifications_updated' ? 'Benachrichtigungseinstellungen gespeichert.' : ''}
      </div>
    {/if}
    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{form.error}</div>
    {/if}

    <!-- Avatar-Vorschau -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-3">
      {#if avatarPreview}
        <img src={avatarPreview} alt="Avatar" class="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100" />
      {:else}
        <div class="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-2xl">
          {data.profile.firstName?.[0] ?? ''}{data.profile.lastName?.[0] ?? ''}
        </div>
      {/if}
      <p class="text-xs text-gray-400 text-center">Avatar-URL unten eingeben</p>
    </div>

    <!-- Profil-Formular -->
    <form
      method="POST"
      action="?/updateProfile"
      use:enhance
      class="flex flex-col gap-4"
    >
      <!-- Versteckte Interessen -->
      {#each selectedInterests as interest}
        <input type="hidden" name="interests" value={interest} />
      {/each}

      <div class="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <h2 class="font-semibold text-gray-900 text-sm">Persönliche Infos</h2>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 font-medium block mb-1" for="firstName">Vorname</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={data.profile.firstName}
              required
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500 font-medium block mb-1" for="lastName">Nachname</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={data.profile.lastName}
              required
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </div>

        <div>
          <label class="text-xs text-gray-500 font-medium block mb-1" for="region">Wohnort / Region</label>
          <input
            id="region"
            name="region"
            type="text"
            value={data.profile.region ?? ''}
            placeholder="z.B. Zürich"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>

        <div>
          <label class="text-xs text-gray-500 font-medium block mb-1" for="bio">Kurzbeschreibung</label>
          <textarea
            id="bio"
            name="bio"
            rows="3"
            value={data.profile.bio ?? ''}
            placeholder="Ein paar Sätze über dich…"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          ></textarea>
        </div>

        <div>
          <label class="text-xs text-gray-500 font-medium block mb-1" for="phone">Telefon (optional, nur für Buchungspartner)</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={data.profile.phone ?? ''}
            placeholder="+41 79 000 00 00"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>

        <div>
          <label class="text-xs text-gray-500 font-medium block mb-1" for="avatarUrl">Profilbild-URL</label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            bind:value={avatarPreview}
            placeholder="https://…"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <p class="text-[10px] text-gray-400 mt-1">z.B. von https://i.pravatar.cc/150?u=deine@email.ch</p>
        </div>
      </div>

      <!-- Interessen -->
      <div class="bg-white rounded-2xl border border-gray-100 p-4">
        <h2 class="font-semibold text-gray-900 text-sm mb-3">Interessen</h2>
        <div class="flex flex-wrap gap-2">
          {#each data.allInterests as interest}
            <button
              type="button"
              onclick={() => toggleInterest(interest)}
              class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all {selectedInterests.includes(interest)
                ? 'bg-rose-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
              {interest}
            </button>
          {/each}
        </div>
      </div>

      <button
        type="submit"
        class="w-full bg-rose-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-colors"
      >
        Profil speichern
      </button>
    </form>

    <!-- Benachrichtigungseinstellungen -->
    <form
      method="POST"
      action="?/updateNotifications"
      use:enhance
      class="bg-white rounded-2xl border border-gray-100 p-4"
    >
      <h2 class="font-semibold text-gray-900 text-sm mb-3">Benachrichtigungen</h2>
      <div class="flex flex-col gap-3">
        {#each [
          { name: 'newBookingRequest',   label: 'Neue Buchungsanfragen',      checked: data.profile.notificationSettings.newBookingRequest   },
          { name: 'bookingStatusChange', label: 'Statusänderungen bei Buchungen', checked: data.profile.notificationSettings.bookingStatusChange },
          { name: 'newMessage',          label: 'Neue Chat-Nachrichten',      checked: data.profile.notificationSettings.newMessage          },
          { name: 'rideUpdates',         label: 'Abholzeit-Updates',          checked: data.profile.notificationSettings.rideUpdates         },
        ] as setting}
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-gray-700">{setting.label}</span>
            <div class="relative">
              <input
                type="checkbox"
                name={setting.name}
                checked={setting.checked}
                class="sr-only peer"
              />
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div class="w-10 h-6 bg-gray-200 peer-checked:bg-rose-500 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-rose-300"></div>
              <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        {/each}
      </div>
      <button
        type="submit"
        class="w-full mt-4 border border-gray-200 text-gray-700 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors"
      >
        Einstellungen speichern
      </button>
    </form>

  </div>
</div>
