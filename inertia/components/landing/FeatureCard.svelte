<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import type { LandingFeature } from '~/lib/types'

  export let feature: LandingFeature
</script>

<div class="bg-background relative overflow-hidden rounded-lg border p-2">
  <div class="flex h-[180px] flex-col justify-between rounded-md p-5">
    {#if feature.icon === 'connect'}
      <div class="flex justify-between">
        <i class="si si-spotify mr-2 text-4xl"></i>
        <i class="si si-applemusic mr-2 text-4xl"></i>
        <i class="si si-soundcloud mr-2 text-4xl"></i>
        <i class="si si-youtubemusic mr-2 text-4xl"></i>
      </div>
    {:else if typeof feature.icon !== 'string'}
      <div class="rounded-full w-12 h-12 flex items-center justify-center bg-primary/10 mb-4">
        <svelte:component this={feature.icon} class="size-8" />
      </div>
    {/if}

    <div class="space-y-2">
      <h3 class="font-bold">
        <span class="mr-2">{feature.title}</span>
        {#if feature.isAvailable}
          <Badge variant="outline">Available</Badge>
        {:else}
          <Badge variant="secondary">Soon</Badge>
        {/if}
      </h3>
      <p class="text-muted-foreground text-sm">
        {feature.description}
      </p>
    </div>
  </div>
</div>
