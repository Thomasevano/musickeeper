<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import AlbumCard from '$lib/components/AlbumCard.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { spotifyUserPlaylists } from '$lib/store';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Button from '$lib/components/ui/button/button.svelte';
	import { loadMore } from '$helpers';

	export let data: PageData;

	let isMorePlaylist: Boolean = true;

	spotifyUserPlaylists.set(data.userPlaylists);

	let loadingRef: HTMLElement | undefined;
	onMount(async () => {
		if (!loadingRef) {
			return;
		}

		const loadingObserver = new IntersectionObserver((entries) => {
			const element = entries[0];

			if (element.isIntersecting) {
				(async function () {
					await loadMore($spotifyUserPlaylists, isMorePlaylist);
				})();
			}
		});

		loadingObserver.observe(loadingRef);
	});
</script>

<div class="">
	<div class="h-full px-4 py-6 lg:px-8">
		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<h2 class="text-2xl font-semibold tracking-tight">Playlists</h2>
				<p class="text-muted-foreground text-sm">Extract your Spotidy playlists as text files</p>
			</div>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button href={`/api/archive/playlists`} target="_blank" class="relative">
						Extract all {$spotifyUserPlaylists.total} playlists
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Extract all playlists</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</div>
		<Separator class="my-4" />
		<div class="flex flex-wrap space-x-4 pb-4">
			{#if $spotifyUserPlaylists.items.length > 0}
				{#each $spotifyUserPlaylists.items as album}
					<AlbumCard {fetch} {album} class="w-[180px]" aspectRatio="square" />
				{/each}
			{:else}
				<p>No Playlists Yet!</p>
			{/if}
		</div>
		{#if isMorePlaylist}
			<div class="loading-indicator" bind:this={loadingRef}>Loading...</div>
		{/if}
	</div>
</div>
