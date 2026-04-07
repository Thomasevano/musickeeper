<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Check, X } from '@lucide/svelte'

  let { hasBeenListened }: { hasBeenListened: boolean } = $props()
</script>

{#if hasBeenListened}
  <Badge variant="secondary" class="gap-1 text-green-600 dark:text-green-400">
    <Check class="size-3" />
    Listened
  </Badge>
{:else}
  <Badge variant="outline" class="gap-1 text-muted-foreground">
    <X class="size-3" />
    Not listened
  </Badge>
{/if}
