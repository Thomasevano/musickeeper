<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import AlbumCard from '$components/AlbumCard.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Button from '$lib/components/ui/button/button.svelte';
	import { writable, type Writable } from 'svelte/store';
	import type { PaginatedPlaylistsInfos } from '../../../../types';
	import { loadMorePlaylistsInfos } from '$helpers';

	export let data: PageData;

	const { tokens, spotifyUserPlaylistsInfos } = data;

	const paginatedUserPlaylistsInfos: Writable<PaginatedPlaylistsInfos> =
		writable(spotifyUserPlaylistsInfos);

	let loadingRef: HTMLElement | undefined;
	onMount(async () => {
		if (!loadingRef) {
			return;
		}

		const loadingObserver = new IntersectionObserver((entries) => {
			const element = entries[0];

			if (element.isIntersecting) {
				(async function () {
					loadMorePlaylistsInfos(tokens, paginatedUserPlaylistsInfos, $paginatedUserPlaylistsInfos);
				})();
			}
		});

		loadingObserver.observe(loadingRef);
	});
</script>

<div class="lg:col-span-7 lg:border-l">
	<div class="h-full px-4 py-6 lg:px-8">
		<div class="flex flex-col justify-between md:flex-row">
			<div class="mb-6 space-y-2 md:mb-0">
				<h2 class="text-2xl font-semibold tracking-tight">Playlists</h2>
				<p class="text-muted-foreground text-sm">Extract your Spotidy playlists as text files</p>
			</div>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button href={`/api/archive/playlists`} target="_blank" class="relative">
						Extract all {$paginatedUserPlaylistsInfos.total} playlists
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Extract all playlists</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</div>
		<Separator class="my-4" />
		<div
			class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
		>
			{#if $paginatedUserPlaylistsInfos.playlistsInfos.length > 0}
				{#each $paginatedUserPlaylistsInfos.playlistsInfos as playlistInfos}
					<AlbumCard
						{fetch}
						tracksListInfos={playlistInfos}
						class="w-[180px]"
						aspectRatio="square"
					/>
				{/each}
			{:else}
				<p>No Playlists Yet!</p>
			{/if}
			{#if $paginatedUserPlaylistsInfos.nextUrl}
				<div class="loading-indicator" bind:this={loadingRef}>Loading...</div>
			{/if}
		</div>
	</div>
</div>
