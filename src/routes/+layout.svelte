<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>EventRide – Mitfahrgelegenheiten für Events</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Navbar -->
	<header class="border-b border-gray-100 bg-white shadow-sm">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
			<a href="/" class="flex items-center gap-2">
				<span class="text-2xl">🎪</span>
				<span class="text-xl font-black tracking-tight text-rose-600">EventRide</span>
			</a>
			<a
				href="/rides/new"
				class="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-95"
			>
				+ Fahrt anbieten
			</a>
		</div>
	</header>

	<!-- Seiteninhalt -->
	<main class="mx-auto max-w-3xl px-4 py-8">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="mt-16 border-t border-gray-100 py-6 text-center text-sm text-gray-400">
		EventRide &copy; {new Date().getFullYear()} – Gemeinsam zum Event
	</footer>
</div>
