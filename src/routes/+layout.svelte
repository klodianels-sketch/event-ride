<script lang="ts">
  import '../app.css';
  import BottomNav from '$lib/components/BottomNav.svelte';

  let { data, children } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex justify-center">
  <div class="w-full max-w-[430px] bg-white min-h-screen relative pb-20">
    {@render children()}
    
    <BottomNav />
    
  </div>
</div>