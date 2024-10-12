<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { FileText } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { extractPlaylist } from '../../services/generate_playlist_service';

	let className: string | undefined | null = undefined;
	export let album;
	export let aspectRatio: 'portrait' | 'square' = 'square';
	export { className as class };
	export let fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
</script>

<div class={cn('hover:bg-secondary mb-4x space-y-4 rounded-md p-2', className)} {...$$restProps}>
	<div>
		<div class="overflow-hidden rounded-md">
			<img
				class={cn(
					'h-auto w-auto object-cover',
					aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'
				)}
				src={album.images[0].url}
				alt={album.name}
			/>
		</div>
	</div>
	<div class="space-y-1 text-sm">
		<h3 class="font-medium leading-none">{album.name}</h3>
		<p class="text-muted-foreground text-xs">
			{album.type === 'playlist'
				? album.owner.display_name
				: album.artists.map((artist) => artist.name)}
		</p>
	</div>
	<Tooltip.Root>
		<Tooltip.Trigger>
			<Button
				on:click={async () => {
					extractPlaylist(fetch, album.tracks.href, album.name);
				}}
				class="relative"
			>
				<FileText class="h-4 w-4" />
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>Extract as text file</p>
		</Tooltip.Content>
	</Tooltip.Root>
</div>
