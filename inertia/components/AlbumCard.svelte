<script lang="ts">
  import { cn } from '~/lib/utils'
  import { Button } from '~/lib/components/ui/button'
  import * as Tooltip from '~/lib/components/ui/tooltip'
  let className: string | undefined | null = undefined
  export let tracksListInfos
  export let aspectRatio: 'portrait' | 'square' = 'square'
  export { className as class }
</script>

<div
  class={cn(
    'hover:bg-secondary mb-4x space-y-4 rounded-md p-2 flex flex-col justify-between',
    className
  )}
  {...$$restProps}
>
  <div>
    <div class="overflow-hidden rounded-md">
      <img
        class={cn(
          'h-auto w-auto object-cover',
          aspectRatio === 'portrait' ? 'aspect-3/4' : 'aspect-square'
        )}
        src={tracksListInfos.imageUrl}
        alt={tracksListInfos.title}
      />
    </div>
    <div class="mt-2.5 text-sm space-y-1">
      <h3 class="font-medium leading-none">{tracksListInfos.title}</h3>
      <p class="text-muted-foreground text-sm">
        {tracksListInfos.owner}
      </p>
      <p class="text-muted-foreground text-sm">
        {tracksListInfos.totalTracks} tracks
      </p>
    </div>
  </div>
  <div class="flex justify-between">
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button href={tracksListInfos.link} class="relative">
            <i class="si si-spotify si--color text-2xl"></i>
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Open on Spotify</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </div>
</div>
