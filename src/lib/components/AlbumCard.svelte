<script lang="ts">
	import { cn } from '$lib/utils';
	import { generatePlaylistFile } from '../../services/generate_playlist_service';
	import { Button } from '$lib/components/ui/button';
	import { Download } from 'lucide-svelte';

	let className: string | undefined | null = undefined;
	export let album;
	export let aspectRatio: 'portrait' | 'square' = 'square';
	export let width: number;
	export let height: number;
	export { className as class };
	export let fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
</script>

<div class={cn('space-y-3', className)} {...$$restProps}>
	<div>
		<div class="overflow-hidden rounded-md">
			<img
				class={cn(
					'h-auto w-auto object-cover transition-all hover:scale-105',
					aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'
				)}
				src={album.images[0].url}
				alt={album.name}
				{width}
				{height}
			/>
		</div>
	</div>
	<Button
		on:click={async () => {
			await generatePlaylistFile(fetch, album.tracks.href, album.name);
		}}
	>
		<Download class="mr-2 h-4 w-4" />
		To Text
	</Button>
	<div class="space-y-1 text-sm">
		<h3 class="font-medium leading-none">{album.name}</h3>
		<p class="text-muted-foreground text-xs">
			{album.type === 'playlist' ? album.description : album.artists[0]}
		</p>
	</div>
</div>
