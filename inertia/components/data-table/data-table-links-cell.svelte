<script lang="ts">
  import Music from '@lucide/svelte/icons/music'
  import ShoppingBag from '@lucide/svelte/icons/shopping-bag'
  import type { ListenLaterItem } from '../../../src/domain/music_item'
  let { item }: { item: ListenLaterItem } = $props()
  const links = $derived(item.externalLinks ?? [])
  const stream = $derived(links.filter((link) => link.category === 'stream').sort((a, b) => a.label.localeCompare(b.label)))
  const buy = $derived(links.filter((link) => link.category === 'buy').sort((a, b) => a.label.localeCompare(b.label)))
  const linkPresentation = {
    stream: {
      classes:
        'inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-sm font-medium text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20 sm:gap-1 sm:rounded-full sm:px-1.5 sm:text-[11px] md:min-h-5',
      icon: Music,
    },
    buy: {
      classes:
        'inline-flex min-h-11 items-center gap-1.5 rounded-md border border-emerald-300/50 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 sm:gap-1 sm:rounded-full sm:px-1.5 sm:text-[11px] md:min-h-5 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40',
      icon: ShoppingBag,
    },
  } as const
</script>

{#if links.length}
  <div class="flex flex-wrap items-center gap-1">
    {#each [stream, buy] as group, groupIndex}
      {#if groupIndex === 1 && stream.length && buy.length}
        <span class="text-muted-foreground/40 mx-0.5">·</span>
      {/if}
      {#each group as link (link.platform)}
        {@const presentation = linkPresentation[link.category]}
        {@const Icon = presentation.icon}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          class={presentation.classes}
        >
          <Icon class="size-3 shrink-0" />
          {link.label}
        </a>
      {/each}
    {/each}
  </div>
{/if}