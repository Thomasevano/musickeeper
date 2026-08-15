<script lang="ts">
  import * as Alert from '$lib/components/ui/alert/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { controlHeights } from '$lib/components/ui/control_heights.js'
  import { Select } from '$lib/components/ui/select/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { Link2, Search, WifiOff } from '@lucide/svelte'
  import { Debounced } from 'runed'
  import ConfirmMusicDialog from '~/components/ConfirmMusicDialog.svelte'
  import ListenLaterListTable from '~/components/ListenLaterListTable.svelte'
  import TrackItem from '~/components/trackItem.svelte'
  import Button from '~/lib/components/ui/button/button.svelte'
  import Input from '~/lib/components/ui/input/input.svelte'
  import { createListManager, setListManagerContext } from '~/lib/list_manager.svelte.js'
  import { createLinkPaste } from '~/lib/use_link_paste.svelte.js'
  import { type ListenLaterItem, MusicItem, musicItemName } from '../../src/domain/music_item'
  import LibraryLayout from '../layouts/libraryLayout.svelte'

  let {
    serializedItems = [],
    title,
  }: { serializedItems?: MusicItem[]; title: string } = $props()
  let searchTerm = $state('')
  let artistName = $state('')
  let searchType = $state('track')
  const list = createListManager()
  setListManagerContext(list)
  const linkPaste = createLinkPaste(list)
  let isSearching = $state(false)
  let isOffline = $state(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  // Listen for online/offline events
  $effect(() => {
    const handleOnline = () => (isOffline = false)
    const handleOffline = () => (isOffline = true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })

  let highlightedItemId = $state<string | null>(null)
  let deleteTarget = $state<ListenLaterItem | null>(null)
  const deleteTargetName = $derived(deleteTarget ? musicItemName(deleteTarget) : '')
  let focusedResultIndex = $state<number>(-1)
  let resultsListEl = $state<HTMLUListElement | null>(null)
  let titleInputEl = $state<HTMLInputElement | null>(null)

  const debouncedSearch = new Debounced(() => searchTerm, 300)
  const debouncedArtist = new Debounced(() => artistName, 300)
  const searchInputClasses = [
    'placeholder:text-muted-foreground flex w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
    controlHeights.default,
  ].join(' ')

  const hasSearchTerm = $derived(debouncedSearch.current.trim().length >= 3)
  const hasArtist = $derived(debouncedArtist.current.trim().length >= 3)
  const isAboveThreshold = $derived(
    searchTerm.trim().length >= 3 || artistName.trim().length >= 3
  )

  let searchAbortController: AbortController | null = null

  async function handleSearch() {
    searchAbortController?.abort()
    const controller = new AbortController()
    searchAbortController = controller
    isSearching = true
    focusedResultIndex = -1
    try {
      const params = new URLSearchParams({
        type: searchType,
      })

      if (hasSearchTerm) {
        params.set('q', debouncedSearch.current)
      }

      if (hasArtist) {
        params.set('artist', debouncedArtist.current)
      }

      const response = await fetch(`/library/listen-later?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      const data = await response.json()
      serializedItems = data.serializedItems
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('Error fetching data from music provider:', error)
    } finally {
      if (!controller.signal.aborted) {
        isSearching = false
      }
    }
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (!resultsListEl) return
    const items = Array.from(resultsListEl.querySelectorAll<HTMLElement>('[role="option"]'))
    if (!items.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusedResultIndex = 0
      items[0]?.focus()
    }
  }

  function handleListKeydown(e: KeyboardEvent) {
    if (!resultsListEl) return
    const items = Array.from(resultsListEl.querySelectorAll<HTMLElement>('[role="option"]'))
    const count = items.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusedResultIndex = Math.min(focusedResultIndex + 1, count - 1)
      items[focusedResultIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (focusedResultIndex <= 0) {
        focusedResultIndex = -1
        titleInputEl?.focus()
      } else {
        focusedResultIndex -= 1
        items[focusedResultIndex]?.focus()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      focusedResultIndex = -1
      titleInputEl?.focus()
    }
  }

  $effect(() => {
    if (hasSearchTerm || hasArtist) {
      handleSearch()
    } else {
      serializedItems = []
    }
  })

  // Scroll to highlighted item and auto-clear after 3s
  $effect(() => {
    if (!highlightedItemId) return

    const element = document.getElementById(`item-${highlightedItemId}`)
    if (element) {
      // An explicit `smooth` overrides the CSS scroll-behavior, so the
      // preference has to be honoured here rather than in a stylesheet.
      element.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'center',
      })
    }

    const timeout = setTimeout(() => {
      highlightedItemId = null
    }, 3000)

    return () => clearTimeout(timeout)
  })
  $effect(() => {
    void list.load()
  })



  async function handleDelete(item: ListenLaterItem) {
    await list.remove(item)
  }

  const types = [
    { value: 'track', label: 'Tracks' },
    { value: 'album', label: 'Albums' },
  ]

  function handleViewExisting() {
    const id = linkPaste.handleViewExisting()
    if (id) highlightedItemId = id
  }
</script>

<LibraryLayout data={list.items} {title}>
  <div class="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-12 lg:px-16">
    {#if isOffline}
      <Alert.Root variant="info" class="mb-4">
        <WifiOff />
        <Alert.Title>You're currently offline</Alert.Title>
        <Alert.Description>
          Your saved items are available, but search is disabled.
        </Alert.Description>
      </Alert.Root>
    {/if}
    <div class="flex flex-col justify-between md:flex-row">
      <div class="flex flex-row">
        <div class="mb-4 space-y-2 md:mb-0">
          <h2 class="text-2xl font-semibold">Listen Later</h2>
          <p class="text-muted-foreground text-sm">
            Tracks and albums you want to listen to.
          </p>
        </div>
      </div>
    </div>
    <Separator class="my-4" />

    <!-- Paste Link Section -->
    <div class="mb-6">
      <h3 class="text-lg font-medium mb-2">Add from Link</h3>
      <div class="flex flex-col gap-2 sm:flex-row">
        <label for="link-url" class="sr-only">Music link URL</label>
        <Input
          id="link-url"
          type="url"
          value={linkPaste.linkUrl}
          oninput={(e) => linkPaste.setLinkUrl(e.currentTarget.value)}
          placeholder="Paste a link from Spotify, YouTube, Apple Music, or SoundCloud..."
          class="flex-1"
          readonly={linkPaste.isProcessingLink}
          aria-describedby={linkPaste.linkError ? 'link-url-error' : undefined}
          aria-invalid={linkPaste.linkError ? 'true' : undefined}
        />
        <Button
          class="w-full sm:w-auto"
          onclick={linkPaste.handlePasteLink}
          disabled={!linkPaste.linkUrl.trim()}
          aria-busy={linkPaste.isProcessingLink}
        >
          <Link2 class="mr-2 h-4 w-4" aria-hidden="true" />
          {linkPaste.isProcessingLink ? 'Processing...' : 'Add'}
        </Button>
      </div>
      {#if linkPaste.linkError}
        <p id="link-url-error" class="text-destructive text-sm mt-2" role="alert">{linkPaste.linkError}</p>
      {/if}
    </div>

    <Separator class="my-4" />

    <div class="mb-2 flex items-center gap-4" class:opacity-50={isOffline}>
      <label for="search-type" class="text-sm font-medium">Type:</label>
      <Select
        id="search-type"
        class="w-full sm:w-[180px]"
        bind:value={searchType}
        disabled={isOffline}
      >
        {#each types as type (type.value)}
          <option value={type.value}>{type.label}</option>
        {/each}
      </Select>
    </div>

    <div class="rounded-lg border shadow-md" class:opacity-50={isOffline}>
      <div class="flex w-full flex-col gap-0 border-b sm:flex-row">
        <div class="flex min-w-0 flex-1 items-center gap-2 p-3 sm:h-12 sm:py-1.5">
          <Search class="size-4 shrink-0 opacity-50" aria-hidden="true" />
          <label for="search-title" class="sr-only">Song or album title</label>
          <input
            id="search-title"
            bind:this={titleInputEl}
            bind:value={searchTerm}
            placeholder={isOffline ? 'Search disabled while offline' : 'Search a song or album title...'}
            disabled={isOffline}
            role="combobox"
            aria-expanded={!!(hasSearchTerm || hasArtist) && serializedItems.length > 0}
            aria-controls="search-results-list"
            aria-autocomplete="list"
            aria-describedby="search-hint"
            onkeydown={handleInputKeydown}
            class={searchInputClasses}
          />
        </div>

        <div class="flex min-w-0 flex-1 items-center gap-2 border-t p-3 sm:h-12 sm:border-l sm:border-t-0 sm:py-1.5">
          <label for="search-artist" class="sr-only">Artist name</label>
          <input
            id="search-artist"
            bind:value={artistName}
            placeholder={isOffline ? 'Search disabled while offline' : 'Artist name (optional)...'}
            disabled={isOffline}
            aria-describedby="search-hint"
            onkeydown={handleInputKeydown}
            class={searchInputClasses}
          />
        </div>

        <!-- The options carry tabindex="-1" until focused, so Tab never reaches them.
             Nothing on screen says which key does. -->
        <p id="search-hint" class="sr-only">
          Results appear below as you type. Press the down arrow key to reach them.
        </p>

        <!-- Described, not labelled: the option is named by the four lines it
             prints, and the consequence of Enter belongs after that name. Both
             sit here once - every option points at whichever one fits its state. -->
        <p id="result-add-hint" class="sr-only">Press Enter to add it to your list.</p>
        <p id="result-remove-hint" class="sr-only">
          In your list already. Press Enter to remove it.
        </p>
      </div>

      {#if isAboveThreshold || isSearching}
        <!-- Named so the a11y suite can park `scrollable-region-focusable` on
             this node alone: its options leave the tab order by design, which
             is not true of any other scroll region in the app. -->
        <div
          id="search-results-scroll"
          class="max-h-[300px] overflow-y-auto overflow-x-hidden scroll-py-1"
        >
          {#if isSearching || (isAboveThreshold && !serializedItems.length && !hasSearchTerm && !hasArtist)}
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {searchType === 'track' ? 'Tracks' : 'Albums'}
            </div>
            <ul
              role="listbox"
              aria-label={searchType === 'track' ? 'Tracks' : 'Albums'}
              aria-busy="true"
            >
              <TrackItem loading={true} type={searchType} />
            </ul>
          {:else if serializedItems && serializedItems.length > 0}
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {searchType === 'track' ? 'Tracks' : 'Albums'}
            </div>
            <ul
              id="search-results-list"
              role="listbox"
              aria-label={searchType === 'track' ? 'Tracks' : 'Albums'}
              bind:this={resultsListEl}
              onkeydown={handleListKeydown}
            >
              {#each serializedItems as item, i (item.id)}
                <TrackItem {item} type={searchType} focused={i === focusedResultIndex} />
              {/each}
            </ul>
          {:else}
            <p class="text-muted-foreground py-6 text-center text-sm">
              No results found for your search.
            </p>
          {/if}
        </div>
      {/if}
    </div>

    <Separator class="my-6" />

    <div>
      {#if list.items.length > 0}
        <ListenLaterListTable
          items={list.items}
          onDelete={(item) => (deleteTarget = item)}
          onToggleListen={(item) => list.toggleListened(item)}
          {highlightedItemId}
        />
      {:else}
        <div class="flex flex-col items-center justify-center gap-4 h-64">
          <p class="text-muted-foreground text-sm text-pretty text-center">
            Add your first item by searching above or pasting a link from Spotify, YouTube, Apple
            Music, or SoundCloud.
          </p>
        </div>
      {/if}
    </div>
  </div>
</LibraryLayout>

<ConfirmMusicDialog
  bind:open={linkPaste.isConfirmDialogOpen}
  isLoading={linkPaste.isDialogLoading}
  error={linkPaste.dialogError}
  musicItem={linkPaste.pendingMusicItem}
  linkMetadata={linkPaste.pendingLinkMetadata}
  source={linkPaste.pendingSource}
  existingItem={linkPaste.existingDuplicate}
  onConfirm={linkPaste.handleConfirm}
  onCancel={linkPaste.handleCancel}
  onViewExisting={handleViewExisting}
  onRetry={linkPaste.handleRetry}
/>

<Dialog.Root
  open={!!deleteTarget}
  onOpenChange={(open) => {
    if (!open) deleteTarget = null
  }}
>
  <Dialog.Content interactOutsideBehavior="close" showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>Are you sure?</Dialog.Title>
      <Dialog.Description>
        {deleteTargetName} will be permanently removed from your listen later list.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" class="cursor-pointer" onclick={() => (deleteTarget = null)}
        >Cancel</Button
      >
      <Button
        variant="destructive"
        class="cursor-pointer"
        onclick={() => {
          if (deleteTarget) {
            handleDelete(deleteTarget)
            deleteTarget = null
          }
        }}
      >
        Confirm<span class="sr-only">, permanently remove {deleteTargetName}</span>
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
