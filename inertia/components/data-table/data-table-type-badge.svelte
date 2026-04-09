<script lang="ts">
  import Music from '@lucide/svelte/icons/music'
  import Disc3 from '@lucide/svelte/icons/disc-3'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import type { SearchType } from '../../../src/domain/music_item'

  let { type }: { type: SearchType } = $props()
</script>

{#if type === 'track'}
  <Badge variant="outline" class="gap-1 text-blue-600 dark:text-blue-400">
    <Music class="size-3" />
    Track
  </Badge>
{:else}
  <Badge variant="outline" class="gap-1 text-purple-600 dark:text-purple-400">
    <Disc3 class="size-3" />
    Album
  </Badge>
{/if}
