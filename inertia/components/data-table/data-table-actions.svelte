<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import { musicItemName } from '../../../src/domain/music_item'
  import type { ListenLaterItem } from '../../../src/domain/music_item'

  let {
    item,
    describedBy,
    onDelete,
    onToggleListen,
  }: {
    item: ListenLaterItem
    describedBy: string
    onDelete: (item: ListenLaterItem) => void
    onToggleListen: (item: ListenLaterItem) => void
  } = $props()

  // Both actions read out of context - the menu floats away from its row, so
  // "Delete" alone leaves a reader guessing which recording it destroys. The
  // name is kept off screen: the trigger and the row already carry it visually.
  const target = $derived(musicItemName(item))
</script>

<div class="flex items-center justify-end gap-1">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button {...props} aria-describedby={describedBy} variant="ghost" size="icon" class="relative p-0">
          <span class="sr-only">Open menu for {target}</span>
          <EllipsisIcon aria-hidden="true" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Group>
        <DropdownMenu.Label>Actions</DropdownMenu.Label>
        <DropdownMenu.Item onclick={() => onToggleListen(item)}>
          {#if item.hasBeenListened}
            Mark<span class="sr-only"> {target}</span> as not listened
          {:else}
            Mark<span class="sr-only"> {target}</span> as listened
          {/if}
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        class="text-destructive focus:text-destructive"
        onclick={() => onDelete(item)}
      >
        Delete<span class="sr-only"> {target}</span>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
