<script lang="ts">
  import Music from '@lucide/svelte/icons/music'
  import ShoppingBag from '@lucide/svelte/icons/shopping-bag'
  import type { ListenLaterItem } from '../../../src/domain/music_item'
  let { item }: { item: ListenLaterItem } = $props()
  const links = $derived(item.externalLinks ?? [])
  const stream = $derived(links.filter((l: any) => l.category === 'stream').sort((a: any, b: any) => a.label.localeCompare(b.label)))
  const buy = $derived(links.filter((l: any) => l.category === 'buy').sort((a: any, b: any) => a.label.localeCompare(b.label)))
</script>

{#if links.length}
  <div class="flex flex-wrap items-center gap-1">
    {#each stream as l (l.platform)}
      <a
        href={l.url}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-11 items-center gap-1 rounded-full bg-primary/10 px-2 text-[11px] font-medium text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20 sm:h-5 sm:px-1.5"
      >
        <Music class="size-3 shrink-0" />
        {l.label}
      </a>
    {/each}
    {#if stream.length && buy.length}
      <span class="text-muted-foreground/40 mx-0.5">·</span>
    {/if}
    {#each buy as l (l.platform)}
      <a
        href={l.url}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-11 items-center gap-1 rounded-full border border-emerald-300/50 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40 sm:h-5 sm:px-1.5"
      >
        <ShoppingBag class="size-3 shrink-0" />
        {l.label}
      </a>
    {/each}
  </div>
{/if}