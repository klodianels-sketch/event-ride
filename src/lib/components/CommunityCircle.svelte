<script lang="ts">
  let { name, initial, color = 'bg-rose-100', textColor = 'text-rose-600' } = $props<{
    name: string;
    initial: string;
    color?: string;
    textColor?: string;
  }>();
</script>

<div class="flex flex-col items-center gap-1.5 flex-shrink-0">
  <div class="w-14 h-14 rounded-full {color} flex items-center justify-center">
    <span class="font-bold text-base {textColor}">{initial}</span>
  </div>
  <span class="text-xs text-gray-600 text-center max-w-[60px] leading-tight">{name}</span>
</div>
