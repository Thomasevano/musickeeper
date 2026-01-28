<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import Button from '~/lib/components/ui/button/button.svelte'
  import CoverArt from '~/components/CoverArt.svelte'
  import { AlertTriangle, Copy } from '@lucide/svelte'
  import { ListenLaterItem, MusicItem, SearchType } from '../../src/domain/music_item'
  import type { LinkMetadata } from '../../src/infrastructure/services/link_metadata.service'

  interface Props {
    open: boolean
    musicItem: MusicItem | null
    linkMetadata: LinkMetadata | null
    source: 'musicbrainz' | 'link' | null
    existingItem: ListenLaterItem | null
    onConfirm: (itemType: SearchType) => void
    onCancel: () => void
    onViewExisting: () => void
  }

  let { open = $bindable(), musicItem, linkMetadata, source, existingItem, onConfirm, onCancel, onViewExisting }: Props = $props()

  let selectedType = $state<SearchType>(SearchType.track)

  // Pre-select item type from detected type
  $effect(() => {
    if (musicItem) {
      selectedType = musicItem.itemType
    } else if (linkMetadata) {
      selectedType = linkMetadata.type
    }
  })

  const types = [
    { value: SearchType.track, label: 'Track' },
    { value: SearchType.album, label: 'Album' },
  ]

  const triggerContent = $derived(
    types.find((t) => t.value === selectedType)?.label ?? 'Select type'
  )

  // Check if metadata is missing important fields
  const hasMissingMetadata = $derived(() => {
    if (!musicItem) return true
    return !musicItem.title || !musicItem.artists || musicItem.artists.length === 0
  })

  function handleConfirm() {
    onConfirm(selectedType)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onCancel()
    }
    open = isOpen
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        {#if existingItem}
          Duplicate Found
        {:else}
          Add to Listen Later
        {/if}
      </Dialog.Title>
      <Dialog.Description>
        {#if existingItem}
          This item appears to already be in your list.
        {:else}
          Review the extracted music information before adding.
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if existingItem}
      <div class="flex items-center gap-2 rounded-md border border-yellow-500 bg-yellow-50 p-3 dark:bg-yellow-950 mb-4">
        <Copy class="h-5 w-5 text-yellow-500" />
        <p class="text-sm text-yellow-700 dark:text-yellow-300">
          An item with the same title and artist already exists in your list.
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <p class="text-sm font-medium text-muted-foreground mb-2">Existing item in your list:</p>
          <div class="flex gap-4 p-3 rounded-md border bg-muted/50">
            <CoverArt
              src={existingItem.coverArt}
              alt={`Cover of ${existingItem.title}`}
              size="md"
            />
            <div class="flex flex-col justify-center">
              <h4 class="font-medium">{existingItem.title}</h4>
              <p class="text-sm text-muted-foreground">{existingItem.artists.join(', ')}</p>
              <p class="text-xs text-muted-foreground capitalize">{existingItem.itemType}</p>
            </div>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-muted-foreground mb-2">New item from link:</p>
          <div class="flex gap-4 p-3 rounded-md border">
            <CoverArt
              src={musicItem?.coverArt}
              alt={`Cover of ${musicItem?.title}`}
              size="md"
            />
            <div class="flex flex-col justify-center">
              <h4 class="font-medium">{musicItem?.title || 'Unknown Title'}</h4>
              <p class="text-sm text-muted-foreground">{musicItem?.artists?.join(', ') || 'Unknown Artist'}</p>
            </div>
          </div>
        </div>
      </div>
    {:else if musicItem}
      <div class="flex gap-4">
        <CoverArt
          src={musicItem.coverArt}
          alt={`Cover of ${musicItem.title}`}
          size="lg"
        />
        <div class="flex flex-col justify-center gap-2">
          <h3 class="text-lg font-semibold">{musicItem.title || 'Unknown Title'}</h3>
          <p class="text-muted-foreground">
            {musicItem.artists?.join(', ') || 'Unknown Artist'}
          </p>
          {#if source === 'musicbrainz'}
            <Badge variant="secondary" class="w-fit">MusicBrainz Match</Badge>
          {:else if source === 'link'}
            <Badge variant="outline" class="w-fit">From Link</Badge>
          {/if}
        </div>
      </div>

      {#if hasMissingMetadata()}
        <div class="flex items-center gap-2 rounded-md border border-yellow-500 bg-yellow-50 p-3 dark:bg-yellow-950">
          <AlertTriangle class="h-5 w-5 text-yellow-500" />
          <p class="text-sm text-yellow-700 dark:text-yellow-300">
            Some metadata could not be extracted. You may want to edit after adding.
          </p>
        </div>
      {/if}

      <div class="flex items-center gap-4">
        <label for="item-type" class="text-sm font-medium">Item Type:</label>
        <Select.Root type="single" bind:value={selectedType}>
          <Select.Trigger class="w-[140px]">{triggerContent}</Select.Trigger>
          <Select.Content>
            <Select.Group>
              {#each types as type (type.value)}
                <Select.Item value={type.value} label={type.label}>
                  {type.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
    {/if}

    <Dialog.Footer>
      {#if existingItem}
        <Button variant="outline" onclick={onCancel}>Cancel</Button>
        <Button variant="secondary" onclick={onViewExisting}>View Existing</Button>
        <Button onclick={handleConfirm} disabled={!musicItem}>Add Anyway</Button>
      {:else}
        <Button variant="outline" onclick={onCancel}>Cancel</Button>
        <Button onclick={handleConfirm} disabled={!musicItem}>Add to List</Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
