<script lang="ts">
  import { cn } from '~/lib/utils'
  import { Button } from '~/lib/components/ui/button'
  import { FileText } from 'lucide-svelte'
  import * as Tooltip from '~/lib/components/ui/tooltip'
  let className: string | undefined | null = undefined
  export let tracksListInfos
  export let aspectRatio: 'portrait' | 'square' = 'square'
  export { className as class }
</script>

<div class={cn('hover:bg-secondary mb-4x space-y-4 rounded-md p-2', className)} {...$$restProps}>
  <div>
    <div class="overflow-hidden rounded-md">
      <img
        class={cn(
          'h-auto w-auto object-cover',
          aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'
        )}
        src={tracksListInfos.imageUrl}
        alt={tracksListInfos.title}
      />
    </div>
  </div>
  <div class="space-y-1 text-sm">
    <h3 class="font-medium leading-none">{tracksListInfos.title}</h3>
    <p class="text-muted-foreground text-xs">
      {tracksListInfos.owner}
    </p>
  </div>
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button
          href={`/extract/playlist?playlistTracksUrl=${tracksListInfos.tracksUrl}&playlistName=${tracksListInfos.title}`}
          class="relative"
        >
          <FileText class="h-4 w-4" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <p>Extract as text file</p>
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
</div>
