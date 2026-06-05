<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  interface Toast {
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message?: string;
    href?: string;
    duration?: number;
  }

  let toasts = $state<Toast[]>([]);

  // Globale Toast-Funktion — aufrufbar von ueberall via window.showToast
  function showToast(t: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    const toast: Toast = { id, duration: 4500, ...t };
    toasts = [...toasts, toast];
    setTimeout(() => dismiss(id), toast.duration);
  }

  function dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id);
  }

  onMount(() => {
    if (!browser) return;
    (window as any).showToast = showToast;
  });

  const ICONS: Record<Toast['type'], string> = {
    success: '✅',
    info:    '💬',
    warning: '⚠️',
    error:   '❌'
  };

  const COLORS: Record<Toast['type'], string> = {
    success: 'border-green-200 bg-green-50',
    info:    'border-blue-200 bg-blue-50',
    warning: 'border-amber-200 bg-amber-50',
    error:   'border-red-200 bg-red-50'
  };

  const TEXT_COLORS: Record<Toast['type'], string> = {
    success: 'text-green-800',
    info:    'text-blue-800',
    warning: 'text-amber-800',
    error:   'text-red-800'
  };
</script>

<div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-[400px] pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div
      class="flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg pointer-events-auto
        {COLORS[toast.type]} transition-all"
      role="alert"
    >
      <span class="text-base leading-none mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm {TEXT_COLORS[toast.type]} leading-snug">{toast.title}</p>
        {#if toast.message}
          <p class="text-xs mt-0.5 {TEXT_COLORS[toast.type]} opacity-80 leading-relaxed">{toast.message}</p>
        {/if}
        {#if toast.href}
          <a href={toast.href} class="text-xs font-semibold underline {TEXT_COLORS[toast.type]} mt-1 inline-block">
            Anzeigen →
          </a>
        {/if}
      </div>
      <button
        type="button"
        onclick={() => dismiss(toast.id)}
        class="shrink-0 {TEXT_COLORS[toast.type]} opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="Schliessen"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  {/each}
</div>
