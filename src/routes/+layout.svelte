<script lang="ts">
  import '../app.css';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';

  let { data, children } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex justify-center">
  <div class="w-full max-w-[430px] bg-white min-h-screen relative pb-20">
    {@render children()}
    <BottomNav
      unreadCount={data.unreadCount ?? 0}
      unreadMessages={data.unreadMessages ?? 0}
      pendingRequests={data.pendingRequests ?? 0}
    />
  </div>
</div>
<ToastContainer />
