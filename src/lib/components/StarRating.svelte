<script lang="ts">
  let { value = 0, interactive = false, onchange } = $props<{
    value?: number;
    interactive?: boolean;
    onchange?: (stars: number) => void;
  }>();

  let hovered = $state(0);

  function handleClick(star: number) {
    if (interactive && onchange) onchange(star);
  }
</script>

<div class="flex gap-1">
  {#each [1, 2, 3, 4, 5] as star}
    <button
      type="button"
      disabled={!interactive}
      onclick={() => handleClick(star)}
      onmouseenter={() => { if (interactive) hovered = star; }}
      onmouseleave={() => { if (interactive) hovered = 0; }}
      class="text-2xl transition-colors {!interactive ? 'cursor-default' : 'cursor-pointer'} {(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-200'}"
    >
      ★
    </button>
  {/each}
</div>
