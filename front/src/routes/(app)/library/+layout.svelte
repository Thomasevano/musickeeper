<script lang="ts">
	import type { LayoutData } from './$types';
	import Navigation from '$components/Navigation.svelte';
	export let data: LayoutData;
</script>

<svelte:head>
	<title>Library - MusicKeeper</title>
</svelte:head>

<Navigation />
{#if data}
	<div class="grid lg:grid-cols-8">
		<slot />
	</div>
{/if}
