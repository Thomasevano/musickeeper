<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import { ArrowRight, FileText, Download, FolderKanban } from '@lucide/svelte'

  export let feature: IFeature
</script>

<div class="bg-background relative overflow-hidden rounded-lg border p-2">
  <div class="flex h-[180px] flex-col justify-between rounded-md p-5">
    {#if feature.icon === 'extract'}
      <FileText class="size-12" />
    {/if}
    {#if feature.icon === 'transfer'}
      <ArrowRight class="size-12" />
    {/if}
    {#if feature.icon === 'manage'}
      <FolderKanban class="size-12" />
    {/if}
    {#if feature.icon === 'connect'}
      <div class="flex justify-between">
        <i class="si si-applemusic mr-2 text-4xl"></i>
        <i class="si si-soundcloud mr-2 text-4xl"></i>
        <i class="si si-tidal mr-2 text-4xl"></i>
        <i class="si si-youtubemusic mr-2 text-4xl"></i>
      </div>
    {/if}
    {#if feature.icon === 'own'}
      <Download class="size-12" />
    {/if}

    <div class="space-y-2">
      <h3 class="font-bold">
        <span class="mr-2">{feature.title}</span>
        {#if !feature.isAvailable}
          <Badge variant="secondary" radius="sm">Soon</Badge>
        {/if}
      </h3>
      <p class="text-muted-foreground text-sm">
        {feature.description}
      </p>
    </div>
  </div>
</div>
