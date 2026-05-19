<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Anmelden – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-6 pt-16 pb-8">
  <div class="mb-8">
    <a href="/" class="text-gray-400 text-sm">← Zurück</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Willkommen zurück</h1>
    <p class="text-gray-500 text-sm mt-1">Melde dich an, um Fahrten zu buchen</p>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }} class="flex flex-col gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
      <input name="email" type="email" required placeholder="max@beispiel.ch" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Passwort</label>
      <input name="password" type="password" required placeholder="Dein Passwort" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <button type="submit" disabled={loading} class="mt-2 w-full bg-gray-900 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60">
      {loading ? 'Wird angemeldet...' : 'Anmelden'}
    </button>
  </form>

  <p class="text-center text-sm text-gray-500 mt-6">
    Noch kein Konto?
    <a href="/auth/register" class="text-rose-600 font-semibold">Registrieren</a>
  </p>
</div>
