<script lang="ts">
  import Music from '@lucide/svelte/icons/music'
  import Disc3 from '@lucide/svelte/icons/disc-3'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { MusicItemType } from '../../../src/domain/music_item'

  let { type }: { type: MusicItemType } = $props()
</script>

{#if type === 'track'}
  <Badge variant="outline" class="gap-1 text-blue-600 dark:text-blue-400">
    <Music class="size-3" aria-hidden="true" />
    Track
  </Badge>
{:else if type === 'album'}
  <Badge variant="outline" class="gap-1 text-purple-600 dark:text-purple-400">
    <Disc3 class="size-3" aria-hidden="true" />
    Album
  </Badge>
{:else if type === MusicItemType.playlist}
  <Badge variant="outline" class="gap-1 text-emerald-600 dark:text-emerald-400">
    <Music class="size-3" aria-hidden="true" />
    Playlist
  </Badge>
{:else}
  <Badge variant="outline">{type}</Badge>
{/if}
