<script lang="ts">
	interface Props {
		message: string;
		type?: 'success' | 'error';
	}

	let { message, type = 'success' }: Props = $props();
</script>

<div
	class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium {type === 'success'
		? 'bg-green-50 text-green-800'
		: 'bg-red-50 text-red-800'}"
	role="alert"
>
	<span class="text-lg">{type === 'success' ? '✅' : '❌'}</span>
	<span>{message}</span>
</div>
