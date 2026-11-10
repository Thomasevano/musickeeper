<script lang="ts">
  import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Check from '@lucide/svelte/icons/check'
  import Disc from '@lucide/svelte/icons/disc'
  import Ellipsis from '@lucide/svelte/icons/ellipsis'
  import Music2 from '@lucide/svelte/icons/music-2'
  import X from '@lucide/svelte/icons/x'

  const examples = [
    {
      title: 'Rien d’spécial',
      artist: 'Népal',
      cover: '/landing/nepal.jpg',
      type: 'Track',
      listened: false,
      date: '27 Oct 2026',
      providers: ['Apple Music', 'Spotify'],
    },
    {
      title: 'To Pimp a Butterfly',
      artist: 'Kendrick Lamar',
      cover: '/landing/tpab.jpg',
      type: 'Album',
      listened: true,
      date: '1 Nov 2026',
      providers: ['Apple Music', 'Deezer'],
    },
    {
      title: 'Random Access Memories',
      artist: 'Daft Punk',
      cover: '/landing/daftpunk.jpg',
      type: 'Album',
      listened: true,
      date: '3 Nov 2026',
      providers: ['Apple Music (source)'],
    },
  ]
</script>

{#snippet status(listened: boolean, mobile: boolean)}
  <span
    class="inline-flex w-fit items-center rounded-full border whitespace-nowrap {listened
      ? 'border-transparent bg-secondary text-green-800 dark:text-green-400'
      : 'border-border text-muted-foreground'}"
    class:status-mobile={mobile}
    class:status-desktop={!mobile}
  >
    {#if listened}<Check size={mobile ? 14 : 12} />{:else}<X size={mobile ? 14 : 12} />{/if}
    {listened ? 'Listened' : 'Not listened'}
  </span>
{/snippet}

{#snippet musicType(type: string, mobile: boolean)}
  <span
    class="inline-flex w-fit items-center whitespace-nowrap {type === 'Track'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-purple-600 dark:text-purple-400'}"
    class:type-mobile={mobile}
    class:type-desktop={!mobile}
  >
    {#if type === 'Track'}<Music2 size={mobile ? 14 : 12} />{:else}<Disc size={mobile ? 14 : 12} />{/if}
    {type}
  </span>
{/snippet}

{#snippet provider(name: string, mobile: boolean)}
  <span class="provider border-border bg-secondary text-secondary-foreground" class:provider-mobile={mobile}>
    <Music2 size={mobile ? 14 : 12} />{name}
  </span>
{/snippet}

<figure class="m-0 w-full min-w-0">
  <div
    role="img"
    aria-label="Example Listen Later List: Rien d’spécial by Népal is not listened; To Pimp a Butterfly by Kendrick Lamar and Random Access Memories by Daft Punk are listened."
    class="pointer-events-none select-none rounded-[9px] border border-border bg-card p-4 font-[LandingInter] text-card-foreground xl:rounded-[10px] xl:px-6 xl:pt-6 xl:pb-5"
  >
    <div aria-hidden="true" class="hidden overflow-hidden rounded-[6px] border border-border xl:block">
      <div class="preview-row preview-header border-b border-border text-foreground">
        <span>Status</span>
        <span>Cover</span>
        <span>Type</span>
        <span class="flex items-center gap-[5px]">Title <ArrowDownUp size={12} class="text-muted-foreground" /></span>
        <span class="flex items-center gap-[5px]">Artists <ArrowDownUp size={12} class="text-muted-foreground" /></span>
        <span class="flex items-center gap-[5px]">Added <ArrowUp size={12} /></span>
        <span>Links</span>
      </div>
      {#each examples as item}
        <div class="preview-row preview-item border-border">
          <div>{@render status(item.listened, false)}</div>
          <img src={item.cover} alt="" width="48" height="48" class="size-12 rounded-[5px] object-cover" />
          {@render musicType(item.type, false)}
          <span class="text-[13px] leading-[18px] font-medium text-card-foreground">{item.title}</span>
          <span class="text-xs text-card-foreground">{item.artist}</span>
          <span class="text-[11px] text-muted-foreground">{item.date}</span>
          <div class="flex flex-col items-start gap-[5px]">
            {#each item.providers as name}{@render provider(name, false)}{/each}
          </div>
        </div>
      {/each}
    </div>

    <div aria-hidden="true" class="flex flex-col gap-3 xl:hidden">
      {#each examples as item}
        <div class="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3">
          <div class="flex min-w-0 items-start gap-3">
            <img src={item.cover} alt="" width="48" height="48" class="size-12 shrink-0 rounded-[5px] object-cover" />
            <div class="flex min-w-0 flex-1 flex-col gap-[6px]">
              <span class="text-sm leading-5 font-medium text-card-foreground">{item.title}</span>
              <span class="text-sm leading-normal text-muted-foreground">{item.artist}</span>
            </div>
            <span class="flex size-11 shrink-0 items-center justify-center text-muted-foreground"><Ellipsis size={16} /></span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            {@render musicType(item.type, true)}
            {@render status(item.listened, true)}
          </div>
          <div class="border-t border-border pt-3">
            {@render provider(item.providers[0], true)}
          </div>
        </div>
      {/each}
    </div>
  </div>
  <figcaption class="mt-[14px] text-xs leading-[18px] text-muted-foreground xl:mt-4 xl:flex xl:justify-between xl:leading-normal">
    <span class="xl:hidden">List excerpt · Actual card layout, example music</span>
    <span class="hidden xl:inline">Search: Kendrick Lamar &amp; Népal · Pasted link: Daft Punk</span>
    <span class="hidden xl:inline">Reproduced interface · Example dates</span>
  </figcaption>
</figure>

<style>
  .preview-row {
    display: grid;
    grid-template-columns: 108px 62px 65px minmax(0, 1fr) 126px 86px 166px;
    align-items: center;
    gap: 12px;
    padding-inline: 10px;
  }

  .preview-header {
    min-height: 38px;
    font-size: 12px;
    font-weight: 500;
  }

  .preview-item {
    min-height: 72px;
    padding-block: 12px;
  }

  .preview-item + .preview-item {
    border-top-width: 1px;
    border-top-style: solid;
  }

  .status-desktop {
    gap: 5px;
    padding: 4px 7px;
    font-size: 11px;
    font-weight: 600;
    line-height: 14px;
  }

  .status-mobile {
    gap: 6px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
  }

  .type-desktop {
    gap: 4px;
    font-size: 12px;
  }

  .type-mobile {
    gap: 6px;
    border: 1px solid hsl(var(--border));
    border-radius: 99px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
  }

  .provider {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 5px;
    border-width: 1px;
    border-style: solid;
    border-radius: 99px;
    padding: 3px 7px;
    font-size: 11px;
    line-height: 14px;
    white-space: nowrap;
  }

  .provider-mobile {
    gap: 6px;
    padding: 4px 7px;
    font-size: 12px;
    line-height: 16px;
  }
</style>
