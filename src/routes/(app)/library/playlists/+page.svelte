<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import AlbumCard from '$lib/components/AlbumCard.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { spotifyUserPlaylists } from '$lib/store';
	import { PUBLIC_SPOTIFY_BASE_URL } from '$env/static/public';

	export let data: PageData;

	let isMorePlaylist: Boolean = true;

	spotifyUserPlaylists.set(data.userPlaylists);

	async function loadMore() {
		if (!$spotifyUserPlaylists.next) {
			isMorePlaylist = false;
			return;
		}
		const res = await fetch(
			$spotifyUserPlaylists.next.replace(`${PUBLIC_SPOTIFY_BASE_URL}`, '/api/spotify')
		);
		if (res.ok) {
			const resJSON = await res.json();
			spotifyUserPlaylists.set({
				...resJSON,
				items: [...$spotifyUserPlaylists.items, ...resJSON.items]
			});
		}
	}

	let loadingRef: HTMLElement | undefined;
	onMount(async () => {
		if (!loadingRef) {
			return;
		}

		const loadingObserver = new IntersectionObserver((entries) => {
			const element = entries[0];

			if (element.isIntersecting) {
				(async function () {
					await loadMore();
				})();
			}
		});

		loadingObserver.observe(loadingRef);
	});
</script>

<div class="col-span-3 lg:col-span-4 lg:border-l">
	<div class="h-full px-4 py-6 lg:px-8">
		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<h2 class="text-2xl font-semibold tracking-tight">Your Playlists</h2>
				<p class="text-muted-foreground text-sm">Extract playlists as .txt files</p>
			</div>
		</div>
		<Separator class="my-4" />
		<div class="relative">
			<div class="overflow-x-auto">
				<div class="flex flex-wrap space-x-4 pb-4">
					{#if $spotifyUserPlaylists.items.length > 0}
						{#each $spotifyUserPlaylists.items as album}
							<AlbumCard
								{fetch}
								{album}
								class="w-[150px]"
								aspectRatio="square"
								width={150}
								height={150}
							/>
						{/each}
					{:else}
						<p>No Playlists Yet!</p>
					{/if}
				</div>
			</div>
		</div>
		{#if isMorePlaylist}
			<div class="loading-indicator" bind:this={loadingRef}>Loading...</div>
		{/if}
	</div>
</div>
