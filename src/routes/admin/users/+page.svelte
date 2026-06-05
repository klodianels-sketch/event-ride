<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { formatDate } from '$lib/time';

  let { data, form } = $props();

  // Sperren-Formular: zeigt Reason-Eingabe inline
  let disablingId = $state<string | null>(null);
  let disableReason = $state('');

  type User = (typeof data.users)[0];

  function fullName(u: User) { return `${u.firstName} ${u.lastName}`; }
</script>

<svelte:head>
  <title>Nutzer – Admin – EventRide</title>
</svelte:head>

<div class="px-4 pt-5 pb-24">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl font-bold text-gray-900">Nutzer</h1>
    <span class="text-xs text-gray-400">{data.users.length} angezeigt</span>
  </div>

  <!-- Feedback ───────────────────────────────────────────────── -->
  {#if form?.success}
    <div class="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
      {form.action === 'disabled'      ? 'Nutzer gesperrt.'           : ''}
      {form.action === 'enabled'       ? 'Nutzer entsperrt.'          : ''}
      {form.action === 'made_admin'    ? 'Admin-Rechte vergeben.'     : ''}
      {form.action === 'removed_admin' ? 'Admin-Rechte entzogen.'     : ''}
    </div>
  {/if}
  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{form.error}</div>
  {/if}

  <!-- Filter ─────────────────────────────────────────────────── -->
  <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
    {#each [['all', 'Alle'], ['disabled', 'Gesperrt'], ['admin', 'Admins']] as [val, label] (val)}
      <a
        href={`${page.url.pathname}?filter=${val}`}
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
          {data.filter === val ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      >
        {label}
      </a>
    {/each}
  </div>

  <!-- Nutzerliste ─────────────────────────────────────────────── -->
  <div class="flex flex-col gap-3">
    {#each data.users as u (u._id)}
      <div class="bg-white rounded-xl border {u.isDisabled ? 'border-red-200' : 'border-gray-100'} p-4">
        <!-- Info-Zeile ──────────────────────────────────────── -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900">{fullName(u)}</p>
            <p class="text-xs text-gray-400 truncate">{u.email}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {u.totalRatings > 0 ? `★ ${u.rating.toFixed(1)} (${u.totalRatings})` : 'Keine Bewertungen'}
              · Dabei seit {formatDate(u.createdAt)}
            </p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full
              {u.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}">
              {u.role === 'admin' ? 'Admin' : 'User'}
            </span>
            {#if u.isDisabled}
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Gesperrt
              </span>
            {/if}
          </div>
        </div>

        {#if u.isDisabled && u.disabledReason}
          <p class="text-xs text-red-500 mb-2">Grund: {u.disabledReason}</p>
        {/if}

        <!-- Sperren-Formular inline ─────────────────────────── -->
        {#if disablingId === u._id}
          <div class="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
            <p class="text-xs font-semibold text-red-800 mb-1.5">Sperrgrund angeben</p>
            <input
              type="text"
              bind:value={disableReason}
              placeholder="z.B. Mehrfach gemeldetes Verhalten"
              class="w-full text-xs px-3 py-2 rounded-lg border border-red-200 bg-white mb-2 focus:outline-none focus:ring-1 focus:ring-red-300"
            />
            <div class="flex gap-2">
              <form
                method="POST"
                action="?/disable"
                use:enhance={() => { return ({ update }) => { disablingId = null; disableReason = ''; update(); }; }}
                class="flex-1"
              >
                <input type="hidden" name="userId" value={u._id} />
                <input type="hidden" name="reason" value={disableReason} />
                <button type="submit" class="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                  Sperren
                </button>
              </form>
              <button
                type="button"
                onclick={() => { disablingId = null; disableReason = ''; }}
                class="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        {/if}

        <!-- Aktions-Buttons ─────────────────────────────────── -->
        <div class="flex flex-wrap gap-2">
          {#if u.isDisabled}
            <form method="POST" action="?/enable" use:enhance>
              <input type="hidden" name="userId" value={u._id} />
              <button type="submit" class="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-100 transition-colors">
                Entsperren
              </button>
            </form>
          {:else}
            <button
              type="button"
              onclick={() => { disablingId = u._id; disableReason = ''; }}
              class="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors"
            >
              Sperren
            </button>
          {/if}

          {#if u.role !== 'admin'}
            <form method="POST" action="?/makeAdmin" use:enhance>
              <input type="hidden" name="userId" value={u._id} />
              <button type="submit" class="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-100 transition-colors">
                Admin machen
              </button>
            </form>
          {:else}
            <form method="POST" action="?/removeAdmin" use:enhance>
              <input type="hidden" name="userId" value={u._id} />
              <button type="submit" class="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Admin entfernen
              </button>
            </form>
          {/if}
        </div>
      </div>
    {/each}

    {#if data.users.length === 0}
      <p class="text-center text-sm text-gray-400 py-8">Keine Nutzer gefunden.</p>
    {/if}
  </div>
</div>
