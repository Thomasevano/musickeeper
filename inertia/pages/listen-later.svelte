<script lang="ts">
  import * as Alert from '$lib/components/ui/alert/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { Link2, Search, WifiOff } from '@lucide/svelte'
  import { Debounced } from 'runed'
  import { toast } from 'svelte-sonner'
  import ConfirmMusicDialog from '~/components/ConfirmMusicDialog.svelte'
  import ListenLaterListTable from '~/components/ListenLaterListTable.svelte'
  import TrackItem from '~/components/trackItem.svelte'
  import Button from '~/lib/components/ui/button/button.svelte'
  import Input from '~/lib/components/ui/input/input.svelte'
  import { ListenLaterItem, MusicItem, SearchType } from '../../src/domain/music_item'
  import type { LinkMetadata } from '../../src/infrastructure/services/link_metadata.service'
  import LibraryLayout from '../layouts/libraryLayout.svelte'

  let { serializedItems = [] } = $props()
  let searchTerm = $state('')
  let artistName = $state('')
  let searchType = $state('track')
  let listenLaterItems = $state([]) as ListenLaterItem[]
  let isSearching = $state(false)
  let isOffline = $state(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  let db: IDBDatabase

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
  let pendingLinkMetadata = $state<LinkMetadata | null>(null)
  let pendingSource = $state<'musicbrainz' | 'link' | null>(null)
  let existingDuplicate = $state<ListenLaterItem | null>(null)
  let highlightedItemId = $state<string | null>(null)
  let deleteTarget = $state<ListenLaterItem | null>(null)
  let focusedResultIndex = $state<number>(-1)
  let resultsListEl = $state<HTMLUListElement | null>(null)
  let titleInputEl = $state<HTMLInputElement | null>(null)

  const debouncedSearch = new Debounced(() => searchTerm, 350)
  const debouncedArtist = new Debounced(() => artistName, 350)

  const hasSearchTerm = $derived(debouncedSearch.current && debouncedSearch.current.trim() !== '')
  const hasArtist = $derived(debouncedArtist.current && debouncedArtist.current.trim() !== '')

  async function handleSearch() {
    isSearching = true
    focusedResultIndex = -1
    try {
      const params = new URLSearchParams({
        q: debouncedSearch.current,
        type: searchType,
      })

      if (hasArtist) {
        params.append('artist', debouncedArtist.current)
      }

      const response = await fetch(`/library/listen-later?${params.toString()}`)
      const data = await response.json()
      serializedItems = data.serializedItems
    } catch (error) {
      console.error('Error fetching data from music provider:', error)
      serializedItems = []
    } finally {
      isSearching = false
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
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const timeout = setTimeout(() => {
      highlightedItemId = null
    }, 3000)

    return () => clearTimeout(timeout)
  })

  const request = indexedDB.open('listenLaterDB', 3)

  request.onupgradeneeded = (event) => {
    db = event.target?.result
    const oldVersion = event.oldVersion

    // Create object store for fresh installs
    if (oldVersion < 1) {
      db.createObjectStore('listenLaterList', {
        keyPath: 'id',
        autoIncrement: true,
      })
    }

    // Migration from version 1 to 2: add type field to existing items
    if (oldVersion < 2) {
      const transaction = event.target.transaction
      const objectStore = transaction.objectStore('listenLaterList')
      let counter = 0

      objectStore.openCursor().onsuccess = (cursorEvent: IDBCursor) => {
        const cursor = cursorEvent.target.result
        if (cursor) {
          const item = cursor.value
          // Add type field to existing items (default to 'track')
          if (!item.type) {
            item.type = 'track'
          }
          // Add addedAt field to existing items (use counter to preserve order)
          if (!item.addedAt) {
            item.addedAt = counter++
          }
          cursor.update(item)
          cursor.continue()
        }
      }
    }

    // Migration from version 2 to 3: add optional sourceUrl field
    // No data transformation needed - sourceUrl is optional and existing items
    // will simply not have it, which is valid for the new schema
  }

  request.onsuccess = (event) => {
    db = event.target.result
    const transaction = db.transaction('listenLaterList', 'readwrite')
    const store = transaction.objectStore('listenLaterList')

    const getRequest = store.getAll()
    getRequest.onsuccess = () => {
      sortListenLaterItems(getRequest)
    }
  }

  function handleListen(item: ListenLaterItem): void {
    // Toggle hasBeenListened status
    const transaction = db.transaction(['listenLaterList'], 'readwrite')
    const objectStore = transaction.objectStore('listenLaterList')

    const getRequest = objectStore.get(item.id)
    getRequest.onsuccess = () => {
      const data = getRequest.result

      if (data) {
        // Toggle the hasBeenListened value
        data.hasBeenListened = !data.hasBeenListened

        // Update the item in the database
        const updateRequest = objectStore.put(data)

        updateRequest.onsuccess = () => {
          // Refresh the list after successful update
          const refreshTransaction = db.transaction('listenLaterList', 'readonly')
          const refreshStore = refreshTransaction.objectStore('listenLaterList')
          const getAllRequest = refreshStore.getAll()

          getAllRequest.onsuccess = () => {
            sortListenLaterItems(getAllRequest)
          }
        }
        updateRequest.onerror = (error) => {
          console.error('Error updating item:', error)
        }
      }
    }

    getRequest.onerror = (error) => {
      console.error('Error getting item:', error)
    }
  }

  function handleDelete(item: ListenLaterItem): void {
    // Delete item from IndexedDB
    const transaction = db.transaction(['listenLaterList'], 'readwrite')
    const objectStore = transaction.objectStore('listenLaterList')

    const deleteRequest = objectStore.delete(item.id)

    deleteRequest.onsuccess = () => {
      // Refresh the list after successful deletion
      const refreshTransaction = db.transaction('listenLaterList', 'readonly')
      const refreshStore = refreshTransaction.objectStore('listenLaterList')
      const getAllRequest = refreshStore.getAll()

      getAllRequest.onsuccess = () => {
        sortListenLaterItems(getAllRequest)
      }

      toast.success(`"${item.title}" removed from your list`)
    }

    deleteRequest.onerror = (error) => {
      console.error('Error deleting item:', error)
    }
  }

  const types = [
    { value: 'track', label: 'Tracks' },
    { value: 'album', label: 'Albums' },
  ]

  const triggerContent = $derived(
    types.find((t) => t.value === searchType)?.label ?? 'Select a type'
  )

  function sortListenLaterItems(getAllRequest: IDBRequest<any[]>) {
    // TODO: remove this condition when I can export and import the list
    // this condition exists only for legacy reasons, I should remove it later
    listenLaterItems = getAllRequest.result.sort((a: ListenLaterItem, b: ListenLaterItem) =>
      a.addedAt instanceof Date && b.addedAt instanceof Date
        ? a.addedAt.getTime() - b.addedAt.getTime()
        : ((a.addedAt as unknown as number) || 0) - ((b.addedAt as unknown as number) || 0)
    )
  }

  function isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  async function handlePasteLink() {
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
    isDialogLoading = true
    dialogError = null
    isProcessingLink = true

    try {
      const response = await fetch('/api/link/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: linkUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        dialogError = data.error || 'Failed to fetch metadata'
        return
      }

      // Check for duplicate before showing confirmation dialog
      const title = data.musicItem?.title || data.linkMetadata?.title || ''
      const artists =
        data.musicItem?.artists || (data.linkMetadata?.artist ? [data.linkMetadata.artist] : [])
      const duplicate = findDuplicate(title, artists)

      // Update dialog with fetched data
      pendingMusicItem = data.musicItem
      pendingLinkMetadata = data.linkMetadata
      pendingSource = data.source
      existingDuplicate = duplicate
    } catch (error) {
      dialogError = 'Failed to connect to server. Please check your internet connection.'
      console.error('Error fetching link metadata:', error)
    } finally {
      isDialogLoading = false
      isProcessingLink = false
    }
  }

  function handleRetry() {
    fetchLinkMetadata()
  }

  function handleConfirmDialogConfirm(
    itemType: SearchType,
    title: string,
    artists: string[],
    albumName: string
  ) {
    if (!pendingMusicItem) return

    // Create ListenLaterItem from confirmed (and possibly edited) data
    const newItem: ListenLaterItem = new ListenLaterItem({
      id: pendingMusicItem.id,
      title: title,
      releaseDate: pendingMusicItem.releaseDate,
      length: pendingMusicItem.length,
      artists: artists,
      albumName: albumName,
      itemType: itemType,
      coverArt: pendingMusicItem.coverArt,
      hasBeenListened: false,
      addedAt: new Date(),
      sourceUrl: linkUrl,
    })

    // Save to IndexedDB
    const transaction = db.transaction('listenLaterList', 'readwrite')
    const store = transaction.objectStore('listenLaterList')

    const addRequest = store.add(newItem)

    addRequest.onsuccess = () => {
      // Add to the list immediately so it appears in the UI
      listenLaterItems = [...listenLaterItems, newItem]

      // Close dialog and reset state
      isConfirmDialogOpen = false
      resetPendingState()
      linkUrl = ''

      toast.success(`"${title}" added to your list`)
    }

    addRequest.onerror = (error) => {
      console.error('Error saving item to listen later list:', error)
      dialogError = 'Failed to save item. Please try again.'
    }
  }

  function handleConfirmDialogCancel() {
    isConfirmDialogOpen = false
    resetPendingState()
  }

  function resetPendingState() {
    pendingMusicItem = null
    pendingLinkMetadata = null
    pendingSource = null
    existingDuplicate = null
    dialogError = null
    isDialogLoading = false
  }

  function findDuplicate(title: string, artists: string[]): ListenLaterItem | null {
    const normalizedTitle = title.toLowerCase().trim()
    const normalizedArtists = artists.map((a) => a.toLowerCase().trim()).sort()

    return (
      listenLaterItems.find((item) => {
        const itemTitle = item.title.toLowerCase().trim()
        const itemArtists = item.artists.map((a: string) => a.toLowerCase().trim()).sort()

        // Match if title and at least one artist matches
        if (itemTitle !== normalizedTitle) return false

        // Check if any artist overlaps
        return normalizedArtists.some((artist) => itemArtists.includes(artist))
      }) || null
    )
  }

  function handleViewExisting() {
    if (existingDuplicate) {
      isConfirmDialogOpen = false
      highlightedItemId = existingDuplicate.id
      resetPendingState()
    }
  }
</script>

<LibraryLayout data={listenLaterItems}>
  <div class="mx-auto w-full max-w-7xl px-8 py-6 md:px-12 lg:px-16">
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
      <div class="flex gap-2">
        <label for="link-url" class="sr-only">Music link URL</label>
        <Input
          id="link-url"
          type="url"
          bind:value={linkUrl}
          placeholder="Paste a link from Spotify, YouTube, Apple Music, or SoundCloud..."
          class="flex-1"
          disabled={isProcessingLink}
          aria-describedby={linkError ? 'link-url-error' : undefined}
          aria-invalid={linkError ? 'true' : undefined}
        />
        <Button onclick={handlePasteLink} disabled={isProcessingLink || !linkUrl.trim()}>
          <Link2 class="mr-2 h-4 w-4" aria-hidden="true" />
          {isProcessingLink ? 'Processing...' : 'Add'}
        </Button>
      </div>
      {#if linkError}
        <p id="link-url-error" class="text-destructive text-sm mt-2" role="alert">{linkError}</p>
      {/if}
    </div>

    <Separator class="my-4" />

    <div class="mb-4 flex items-center gap-4" class:opacity-50={isOffline}>
      <label for="search-type" class="text-sm font-medium">Type:</label>
      <Select.Root type="single" bind:value={searchType} disabled={isOffline}>
        <Select.Trigger id="search-type" class="w-[180px]">{triggerContent}</Select.Trigger>

        <Select.Content>
          <Select.Group>
            <Select.Label>Types</Select.Label>

            {#each types as type (type.value)}
              <Select.Item value={type.value} label={type.label}>
                {type.label}
              </Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>

    <div class="rounded-lg border shadow-md mb-4" class:opacity-50={isOffline}>
      <div class="flex gap-2 w-full border-b">
        <div class="flex flex-1 items-center gap-2 ps-3 pe-8 h-9">
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
            onkeydown={handleInputKeydown}
            class="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div class="flex flex-1 items-center gap-2 ps-3 pe-3 h-9 border-l">
          <label for="search-artist" class="sr-only">Artist name</label>
          <input
            id="search-artist"
            bind:value={artistName}
            placeholder={isOffline ? 'Search disabled while offline' : 'Artist name (optional)...'}
            disabled={isOffline}
            class="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {#if hasSearchTerm || hasArtist || isSearching}
        <div class="max-h-[300px] overflow-y-auto overflow-x-hidden scroll-py-1">
          {#if isSearching}
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {searchType === 'track' ? 'Tracks' : 'Albums'}
            </div>
            <ul role="listbox" aria-label={searchType === 'track' ? 'Tracks' : 'Albums'}>
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
                <TrackItem bind:listenLaterItems {item} type={searchType} focused={i === focusedResultIndex} />
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
    <div>
      {#if listenLaterItems.length > 0}
        <ListenLaterListTable
          items={listenLaterItems}
          onDelete={(item) => (deleteTarget = item)}
          onToggleListen={handleListen}
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
  bind:open={isConfirmDialogOpen}
  isLoading={isDialogLoading}
  error={dialogError}
  musicItem={pendingMusicItem}
  linkMetadata={pendingLinkMetadata}
  source={pendingSource}
  existingItem={existingDuplicate}
  onConfirm={handleConfirmDialogConfirm}
  onCancel={handleConfirmDialogCancel}
  onViewExisting={handleViewExisting}
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
        "{deleteTarget?.title}" will be permanently removed from your listen later list.
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
        Confirm
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
