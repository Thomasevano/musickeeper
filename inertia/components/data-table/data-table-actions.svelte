<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis'
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'
  import type { ListenLaterItem } from '../../../src/domain/music_item'

  let {
    item,
    onDelete,
    onToggleListen,
  }: {
    item: ListenLaterItem
    onDelete: (item: ListenLaterItem) => void
    onToggleListen: (item: ListenLaterItem) => void
  } = $props()
</script>

<div class="flex items-center justify-end gap-1">
  {#if item.sourceUrl}
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              class="text-muted-foreground hover:text-foreground size-8 cursor-pointer p-0 transition-colors duration-150"
              aria-label="Open on platform"
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLinkIcon class="size-4" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Open on platform</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  {/if}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
          <span class="sr-only">Open menu</span>
          <EllipsisIcon />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Group>
        <DropdownMenu.Label>Actions</DropdownMenu.Label>
        <DropdownMenu.Item onclick={() => onToggleListen(item)}>
          {item.hasBeenListened ? 'Mark as not listened' : 'Mark as listened'}
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        class="text-destructive focus:text-destructive"
        onclick={() => onDelete(item)}
      >
        Delete
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
