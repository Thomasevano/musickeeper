<script lang="ts">
  import * as Alert from '$lib/components/ui/alert/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { controlHeights } from '$lib/components/ui/control_heights.js'
  import { Select } from '$lib/components/ui/select/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { Link2, Search, TriangleAlert, WifiOff } from '@lucide/svelte'
  import { Debounced } from 'runed'
  import ConfirmMusicDialog from '~/components/ConfirmMusicDialog.svelte'
  import ListenLaterListTable from '~/components/ListenLaterListTable.svelte'
  import TrackItem from '~/components/trackItem.svelte'
  import Button from '~/lib/components/ui/button/button.svelte'
  import Input from '~/lib/components/ui/input/input.svelte'
  import { createListManager } from '~/lib/list_manager.svelte'
  import { appFetch } from '~/lib/app_update.svelte'
  import { registerUnsavedWork } from '~/lib/reload_guard'
  import { type ListenLaterItem, MusicItem, musicItemName } from '../../src/domain/music_item'
  import { library } from '~/lib/listen_later.svelte'
  import LibraryLayout from '../layouts/libraryLayout.svelte'

  let {
    serializedItems = [],
    title,
  }: { serializedItems?: MusicItem[]; title: string } = $props()
  let searchTerm = $state('')
  let artistName = $state('')
  let searchType = $state('track')
  const list = createListManager()
  let isSearching = $state(false)
  let isOffline = $state(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const searchReadOnly = $derived(library.access === 'outdated')
  const searchDisabled = $derived(!searchReadOnly && (isOffline || !list.ready))

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

  // Paste link state
  let linkUrl = $state('')
  let isProcessingLink = $state(false)
  let linkError = $state('')

  // Confirmation dialog state
  let isConfirmDialogOpen = $state(false)
  let isDialogLoading = $state(false)
  let dialogError = $state<string | null>(null)
  let pendingMusicItem = $state<MusicItem | null>(null)
  let pendingSourceUrl = $state<string | undefined>()
  let isSaving = $state(false)
  let platformController: AbortController | null = null
  let listTable = $state<ReturnType<typeof ListenLaterListTable>>()
  let deleteTarget = $state<ListenLaterItem | null>(null)
  const deleteTargetName = $derived(deleteTarget ? musicItemName(deleteTarget) : '')

  let focusedResultIndex = $state<number>(-1)
  let resultsListEl = $state<HTMLUListElement | null>(null)
  let titleInputEl = $state<HTMLInputElement | null>(null)

  $effect(() => registerUnsavedWork(() =>
    !!(searchTerm || artistName || linkUrl || isConfirmDialogOpen || pendingMusicItem || pendingSourceUrl)
  ))

  const debouncedSearch = new Debounced(() => searchTerm, 300)
  const debouncedArtist = new Debounced(() => artistName, 300)
  const searchInputClasses = [
    'placeholder:text-muted-foreground flex w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
    controlHeights.default,
  ].join(' ')

  const minLiveSearchLength = 2
  const hasSearchTerm = $derived(debouncedSearch.current.trim().length >= minLiveSearchLength)
  const hasArtist = $derived(debouncedArtist.current.trim().length >= minLiveSearchLength)
  const isAboveThreshold = $derived(
    searchTerm.trim().length >= minLiveSearchLength || artistName.trim().length >= minLiveSearchLength
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

      if (debouncedSearch.current.trim()) {
        params.set('q', debouncedSearch.current.trim())
      }

      if (debouncedArtist.current.trim()) {
        params.set('artist', debouncedArtist.current.trim())
      }

      const response = await appFetch(`/library/listen-later?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      if (controller.signal.aborted || searchAbortController !== controller) return
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
    if (list.ready && (hasSearchTerm || hasArtist)) {
      handleSearch()
    } else {
      searchAbortController?.abort()
      searchAbortController = null
      isSearching = false
      serializedItems = []
    }
    return () => searchAbortController?.abort()
  })

  $effect(() => {
    void list.load()
  })

  const types = [
    { value: 'track', label: 'Tracks' },
    { value: 'album', label: 'Albums' },
  ]

  function isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  async function handlePasteLink() {
    // A disabled button is unfocusable, so disabling this one mid-request
    // would blur it and leave the dialog with nowhere to put focus back on
    // close. It stays enabled and turns the second press into a no-op.
    if (isProcessingLink || !list.ready) return

    linkError = ''

    if (!linkUrl.trim()) {
      linkError = 'Please enter a URL'
      return
    }

    if (!isValidUrl(linkUrl)) {
      linkError = 'Please enter a valid URL'
      return
    }

    // Open dialog immediately with loading state
    isProcessingLink = true
    isDialogLoading = true
    dialogError = null
    isConfirmDialogOpen = true

    await fetchLinkMetadata()
  }

  async function fetchLinkMetadata() {
    platformController?.abort()
    const controller = new AbortController()
    platformController = controller
    const sourceUrl = linkUrl.trim()
    isDialogLoading = true
    dialogError = null
    isProcessingLink = true
    try {
      const response = await appFetch('/api/platform-metadata', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl }), signal: controller.signal,
      })
      const data = await response.json()
      if (controller.signal.aborted || platformController !== controller) return
      if (!response.ok) {
        dialogError = data.error || 'Failed to fetch metadata'
        return
      }
      pendingMusicItem = new MusicItem(data.musicItem)
      pendingSourceUrl = data.linkMetadata.originalUrl
    } catch {
      if (!controller.signal.aborted && platformController === controller) {
        dialogError = 'Failed to connect to server. Please check your internet connection.'
      }
    } finally {
      if (platformController === controller) {
        isDialogLoading = false
        isProcessingLink = false
      }
    }
  }

  function handleRetry() {
    void fetchLinkMetadata()
  }

  async function handleConfirmDialogConfirm(item: MusicItem, musicBrainzId?: string) {
    if (isSaving || !pendingMusicItem) return
    isSaving = true
    dialogError = null
    try {
      await list.addFromPaste(item, musicBrainzId, pendingSourceUrl)
      isConfirmDialogOpen = false
      resetPendingState()
      linkUrl = ''
    } catch (error) {
      console.error('Error saving item to listen later list:', error)
      dialogError = 'Failed to save item. Please try again.'
    } finally {
      isSaving = false
    }
  }

  function handleConfirmDialogCancel() {
    if (isSaving) return
    isConfirmDialogOpen = false
    resetPendingState()
  }

  function resetPendingState() {
    platformController?.abort()
    platformController = null
    pendingMusicItem = null
    pendingSourceUrl = undefined
    dialogError = null
    isDialogLoading = false
    isProcessingLink = false
  }

</script>

<LibraryLayout data={list.items} {title}>
  <div class="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-12 lg:px-16">
    {#if isOffline}
      <Alert.Root variant="info" class="mb-4">
        <WifiOff />
        <Alert.Title>You're currently offline</Alert.Title>
        <Alert.Description>
          Search is disabled until you reconnect.
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
          bind:value={linkUrl}
          placeholder="Paste a link from Spotify, YouTube, Apple Music, or SoundCloud..."
          class="flex-1"
          readonly={isProcessingLink}
          aria-describedby={linkError ? 'link-url-error' : undefined}
          aria-invalid={linkError ? 'true' : undefined}
        />
        <Button
          class="w-full sm:w-auto aria-disabled:opacity-50"
          onclick={handlePasteLink}
          disabled={!linkUrl.trim() || list.status !== 'loaded'}
          aria-disabled={library.access === 'outdated' || undefined}
          aria-busy={isProcessingLink}
        >
          <Link2 class="mr-2 h-4 w-4" aria-hidden="true" />
          {isProcessingLink ? 'Processing...' : 'Add'}
        </Button>
      </div>
      {#if linkError}
        <p id="link-url-error" class="text-destructive text-sm mt-2" role="alert">{linkError}</p>
      {/if}
    </div>

    <Separator class="my-4" />

    <div class="mb-2 flex items-center gap-4" class:opacity-50={isOffline}>
      <label for="search-type" class="text-sm font-medium">Type:</label>
      <Select
        id="search-type"
        class="w-full sm:w-[180px]"
        bind:value={searchType}
        disabled={isOffline || !list.ready}
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
            disabled={searchDisabled}
            readonly={searchReadOnly}
            role="combobox"
            aria-expanded={list.ready && !!(hasSearchTerm || hasArtist) && serializedItems.length > 0}
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
            disabled={searchDisabled}
            readonly={searchReadOnly}
            aria-describedby="search-hint"
            onkeydown={handleInputKeydown}
            class={searchInputClasses}
          />
        </div>

        <!-- The options carry tabindex="-1" until focused, so Tab never reaches them.
             Nothing on screen says which key does. -->
        <p id="search-hint" class="sr-only">
          {#if searchReadOnly}
            Reload to search again. You can still copy your search text.
          {:else}
            Results appear after at least two characters in either field. Press the down arrow key to reach them.
          {/if}
        </p>

        <!-- Described, not labelled: the option is named by the four lines it
             prints, and the consequence of Enter belongs after that name. Both
             sit here once - every option points at whichever one fits its state. -->
        <p id="result-add-hint" class="sr-only">Press Enter to add it to your list.</p>
        <p id="result-remove-hint" class="sr-only">
          In your list already. Press Enter to remove it.
        </p>
      </div>

      {#if list.ready && (isAboveThreshold || isSearching)}
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
                <TrackItem
                  {item}
                  type={searchType}
                  focused={i === focusedResultIndex}
                />
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
      {#if library.access === 'blocked'}
        <Alert.Root variant="warning">
          <TriangleAlert aria-hidden="true" />
          <Alert.Title>Another tab is blocking your list</Alert.Title>
          <Alert.Description>
            Finish any edits in your other MusicKeeper tabs, then close or reload them.
            Your list will appear here automatically.
          </Alert.Description>
        </Alert.Root>
      {/if}
      {#if list.items.length > 0}
        <h2 id="listen-later-list-heading" tabindex="-1" class="mb-4 text-xl font-semibold">Listen Later List</h2>
        <ListenLaterListTable
          bind:this={listTable}
          items={list.items}
          onDelete={(item) => (deleteTarget = item)}
          onToggleListen={list.toggleListened}
        />
      {:else if list.ready}
        <div class="flex flex-col items-center justify-center gap-4 h-64">
          <p class="text-muted-foreground text-sm text-pretty text-center">
            Add your first item by searching above or pasting a link from Spotify, YouTube, Apple
            Music, or SoundCloud.
          </p>
        </div>
      {:else if list.status === 'loading' && library.access !== 'blocked'}
        <p class="text-muted-foreground text-sm" role="status">Loading your list…</p>
      {:else if list.status === 'failed'}
        <p class="text-muted-foreground text-sm">Reload this page to try loading your list again.</p>
      {/if}
    </div>
  </div>
</LibraryLayout>

<ConfirmMusicDialog
  bind:open={isConfirmDialogOpen}
  isLoading={isDialogLoading}
  error={dialogError}
  musicItem={pendingMusicItem}
  {isSaving}
  listenLaterItems={list.items}
  onConfirm={handleConfirmDialogConfirm}
  onCancel={handleConfirmDialogCancel}
  onViewExisting={async (id) => listTable?.revealItem(id)}
  onRetry={handleRetry}
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
    {#if library.access === 'outdated'}
      <p role="alert" class="text-sm">This tab can no longer delete items. Cancel and reload to make changes.</p>
    {/if}
    <Dialog.Footer>
      <Button variant="outline" class="cursor-pointer" onclick={() => (deleteTarget = null)}
        >Cancel</Button
      >
      <Button
        variant="destructive"
        disabled={!list.ready}
        class="cursor-pointer"
        onclick={() => {
          if (deleteTarget) {
            void list.remove(deleteTarget)
            deleteTarget = null
          }
        }}
      >
        Confirm<span class="sr-only">, permanently remove {deleteTargetName}</span>
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
