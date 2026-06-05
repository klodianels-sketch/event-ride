<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount, onDestroy } from 'svelte';
  import { invalidateAll } from '$app/navigation';

  let { data, form } = $props();

  let messageText = $state('');
  let messagesEl = $state<HTMLDivElement | null>(null);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  // Auto-Scroll ans Ende bei neuen Nachrichten
  $effect(() => {
    // Reaktiv auf data.messages — scrollt bei jeder Änderung
    void data.messages.length;
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  // Polling: alle 5 Sekunden neue Nachrichten laden
  onMount(() => {
    pollInterval = setInterval(() => invalidateAll(), 5000);
  });
  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDay(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const diff = today.getDate() - d.getDate();
    if (diff === 0) return 'Heute';
    if (diff === 1) return 'Gestern';
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  // Gruppe nach Tag für Datumsanzeige
  function showDaySeparator(messages: typeof data.messages, index: number): boolean {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].createdAt);
    const curr = new Date(messages[index].createdAt);
    return prev.toDateString() !== curr.toDateString();
  }

  const CAT_EMOJI: Record<string, string> = {
    music: '🎵', festival: '🎪', nightlife: '🌙',
    sport: '⚡', hiking: '🏔️', culture: '🎭', other: '✨'
  };
</script>

<svelte:head>
  <title>Chat – EventRide</title>
</svelte:head>

<div class="flex flex-col h-screen">

  <!-- Header ──────────────────────────────────────────────────── -->
  <div class="shrink-0 flex items-center gap-3 px-4 pt-12 pb-3 bg-white border-b border-gray-100">
    <a href="/my/chats" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0">
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
    <div class="flex items-center gap-2.5 flex-1 min-w-0">
      {#if data.otherUser?.avatarUrl}
        <img src={data.otherUser.avatarUrl} alt={data.otherUser.name} class="w-9 h-9 rounded-full object-cover shrink-0" />
      {:else}
        <div class="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
          {data.otherUser?.name?.split(' ').map(n => n[0]).join('') ?? '?'}
        </div>
      {/if}
      <div class="min-w-0">
        <p class="font-semibold text-gray-900 text-sm truncate">{data.otherUser?.name ?? 'Unbekannt'}</p>
        {#if data.conversation.eventName}
          <p class="text-xs text-rose-600 truncate">
            {CAT_EMOJI[data.conversation.eventCategory ?? 'other']} {data.conversation.eventName}
          </p>
        {/if}
      </div>
    </div>
    {#if data.conversation.rideId}
      <a
        href="/rides/{data.conversation.rideId}"
        class="shrink-0 text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-full hover:bg-gray-200 transition-colors font-medium"
      >
        Fahrt
      </a>
    {/if}
  </div>

  <!-- Nachrichten ──────────────────────────────────────────────── -->
  <div bind:this={messagesEl} class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-gray-50">

    {#if data.messages.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center">
        <div class="text-4xl mb-3">👋</div>
        <p class="text-gray-500 text-sm">Schreib die erste Nachricht!</p>
        <p class="text-gray-400 text-xs mt-1">z.B. Treffpunkt, Gepäck, Fragen</p>
      </div>
    {:else}
      {#each data.messages as msg, i}
        <!-- Tagestrennlinie -->
        {#if showDaySeparator(data.messages, i)}
          <div class="flex items-center gap-3 my-2">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-[10px] text-gray-400 font-medium">{formatDay(msg.createdAt)}</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>
        {/if}

        <!-- Nachricht -->
        <div class="flex {msg.isMe ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[75%]">
            <div class="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed {msg.isMe
              ? 'bg-rose-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-900 rounded-tl-sm shadow-sm border border-gray-100'}">
              {msg.text}
            </div>
            <p class="text-[10px] text-gray-400 mt-0.5 {msg.isMe ? 'text-right' : 'text-left'}">
              {formatTime(msg.createdAt)}
            </p>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Eingabe ─────────────────────────────────────────────────── -->
  <div class="shrink-0 px-4 py-3 bg-white border-t border-gray-100 pb-safe">
    {#if form?.error}
      <p class="text-xs text-red-500 mb-2">{form.error}</p>
    {/if}
    <form
      method="POST"
      action="?/send"
      use:enhance={() => {
        return ({ update }) => {
          messageText = '';
          update();
        };
      }}
      class="flex gap-2"
    >
      <input
        type="text"
        name="text"
        bind:value={messageText}
        placeholder="Nachricht schreiben…"
        maxlength="1000"
        autocomplete="off"
        class="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
      />
      <button
        type="submit"
        disabled={!messageText.trim()}
        class="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-rose-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </button>
    </form>
  </div>

</div>
