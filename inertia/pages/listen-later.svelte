<script lang="ts">
  import * as Command from '$lib/components/ui/command/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'
  import { receive, send } from '$lib/helpers'
  import { Check, Link2, Trash2, X } from '@lucide/svelte'
  import { Debounced } from 'runed'
  import CoverArt from '~/components/CoverArt.svelte'
  import ConfirmMusicDialog from '~/components/ConfirmMusicDialog.svelte'
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
  let db: IDBDatabase

  // Paste link state
  let linkUrl = $state('')
  let isProcessingLink = $state(false)
  let linkError = $state('')

  // Confirmation dialog state
  let isConfirmDialogOpen = $state(false)
  let pendingMusicItem = $state<MusicItem | null>(null)
  let pendingLinkMetadata = $state<LinkMetadata | null>(null)
  let pendingSource = $state<'musicbrainz' | 'link' | null>(null)
  let existingDuplicate = $state<ListenLaterItem | null>(null)
  let highlightedItemId = $state<string | null>(null)

  const debouncedSearch = new Debounced(() => searchTerm, 350)
  const debouncedArtist = new Debounced(() => artistName, 350)

  const hasSearchTerm = $derived(debouncedSearch.current && debouncedSearch.current.trim() !== '')
  const hasArtist = $derived(debouncedArtist.current && debouncedArtist.current.trim() !== '')

  async function handleSearch() {
    isSearching = true
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

  $effect(() => {
    if (hasSearchTerm || hasArtist) {
      handleSearch()
    } else {
      serializedItems = []
    }
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
      (typeof a.addedAt && typeof b.addedAt) === typeof Date
        ? a.addedAt.getDate() - b.addedAt.getDate()
        : (a.addedAt || 0) - (b.addedAt || 0)
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
        linkError = data.error || 'Failed to fetch metadata'
        return
      }

      // Check for duplicate before showing confirmation dialog
      const title = data.musicItem?.title || data.linkMetadata?.title || ''
      const artists = data.musicItem?.artists || (data.linkMetadata?.artist ? [data.linkMetadata.artist] : [])
      const duplicate = findDuplicate(title, artists)

      // Open confirmation dialog with fetched data
      pendingMusicItem = data.musicItem
      pendingLinkMetadata = data.linkMetadata
      pendingSource = data.source
      existingDuplicate = duplicate
      isConfirmDialogOpen = true
    } catch (error) {
      linkError = 'Failed to connect to server'
      console.error('Error fetching link metadata:', error)
    } finally {
      isProcessingLink = false
    }
  }

  function handleConfirmDialogConfirm(itemType: SearchType) {
    // US-010 will implement saving the item
    // For now, close the dialog and reset state
    isConfirmDialogOpen = false
    resetPendingState()
    linkUrl = ''
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

      // Scroll to the item
      const element = document.getElementById(`item-${existingDuplicate.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      // Remove highlight after 3 seconds
      setTimeout(() => {
        highlightedItemId = null
      }, 3000)

      resetPendingState()
    }
  }
</script>

<LibraryLayout data={listenLaterItems}>
  <div class="mx-auto w-full max-w-7xl px-8 py-6 md:px-12 lg:px-16">
    <div class="flex flex-col justify-between md:flex-row">
      <div class="flex flex-row">
        <div class="mb-4 space-y-2 md:mb-0">
          <h2 class="text-2xl font-semibold tracking-tight">Listen Later</h2>
          <p class="text-muted-foreground text-sm">
            Listen later is a list of albums, artists and tracks you want to listen to later.
          </p>
        </div>
      </div>
    </div>
    <Separator class="my-4" />

    <!-- Paste Link Section -->
    <div class="mb-6">
      <h3 class="text-lg font-medium mb-2">Add from Link</h3>
      <div class="flex gap-2">
        <Input
          type="url"
          bind:value={linkUrl}
          placeholder="Paste a link from Spotify, YouTube, Apple Music, or SoundCloud..."
          class="flex-1"
          disabled={isProcessingLink}
        />
        <Button
          onclick={handlePasteLink}
          disabled={isProcessingLink || !linkUrl.trim()}
        >
          <Link2 class="mr-2 h-4 w-4" />
          {isProcessingLink ? 'Processing...' : 'Add'}
        </Button>
      </div>
      {#if linkError}
        <p class="text-destructive text-sm mt-2">{linkError}</p>
      {/if}
    </div>

    <Separator class="my-4" />

    <div class="mb-4 flex items-center gap-4">
      <label for="search-type" class="text-sm font-medium">Type:</label>
      <Select.Root type="single" bind:value={searchType}>
        <Select.Trigger class="w-[180px]">{triggerContent}</Select.Trigger>

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

      <div class="flex gap-2 w-full">
        <Command.Root class="rounded-lg border shadow-md flex-1" shouldFilter={false}>
          <Command.Input bind:value={searchTerm} placeholder="Search a song or album title..." />
        </Command.Root>

        <Command.Root class="rounded-lg border shadow-md flex-1" shouldFilter={false}>
          <Command.Input
            bind:value={artistName}
            placeholder="Artist name (optional for more precise results)..."
          />
        </Command.Root>
      </div>
    </div>

    <div class="mb-4">
      <Command.Root class="rounded-lg border shadow-md" shouldFilter={false}>
        {#if isSearching}
          <Command.List>
            <Command.Group heading={searchType === 'track' ? 'Tracks' : 'Albums'}>
              <TrackItem loading={true} type={searchType} />
            </Command.Group>
          </Command.List>
        {:else if serializedItems && serializedItems.length > 0 && (searchType === 'track' || searchType === 'album')}
          <Command.List>
            <Command.Empty class="text-muted-foreground"
              >No results found for your search.</Command.Empty
            >

            {#if searchType === 'track'}
              <Command.Group heading="Tracks">
                {#each serializedItems as track (track.id)}
                  <TrackItem bind:listenLaterItems item={track} type="track" />
                {/each}
              </Command.Group>
            {/if}

            {#if searchType === 'album'}
              <Command.Group heading="Albums">
                {#each serializedItems as album (album.id)}
                  <TrackItem bind:listenLaterItems item={album} type="album" />
                {/each}
              </Command.Group>
            {/if}
          </Command.List>
        {/if}
      </Command.Root>
    </div>
    <div>
      {#if listenLaterItems.length > 0}
        <table class="w-full">
          <thead>
            <tr>
              <th class="px-4 py-2">Listened</th>
              <th class="px-4 py-2">Cover</th>
              <th class="px-4 py-2">Type</th>
              <th class="px-4 py-2">Title</th>
              <th class="px-4 py-2">Artists</th>
              <th class="px-4 py-2">Album</th>
              <th class="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {#each listenLaterItems as item (item.id)}
              <tr
                id={`item-${item.id}`}
                in:receive={{ key: item.id }}
                out:send={{ key: item.id }}
                class="text-center transition-colors duration-500 {highlightedItemId === item.id ? 'bg-yellow-100 dark:bg-yellow-900' : ''}"
              >
                <td class="px-4 py-2">
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button
                          variant="ghost"
                          class="cursor-pointer"
                          onclick={() => handleListen(item)}
                        >
                          {#if item.hasBeenListened}
                            <Check color="green" />
                          {:else}
                            <X color="red" />
                          {/if}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        {#if item.hasBeenListened}
                          <p>Mark as not listened</p>
                        {:else}
                          <p>Mark as listened</p>
                        {/if}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </td>
                <td class="px-4 py-2">
                  <CoverArt
                    src={item.coverArt}
                    alt={`Cover of ${item.title}`}
                    size="md"
                    class="mx-auto"
                  />
                </td>
                <td class="px-4 py-2 capitalize">{item.itemType}</td>
                <td class="px-4 py-2">{item.title}</td>
                <td class="px-4 py-2">{item.artists.join(', ')}</td>
                <td class="px-4 py-2">{item.albumName || '-'}</td>
                <td class="px-4 py-2">
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="cursor-pointer"
                          onclick={() => handleDelete(item)}
                        >
                          <Trash2 color="red" />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p>Delete from list</p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="flex items-center justify-center h-64">
          <p class="text-muted-foreground text-sm">No items in your listen later list yet.</p>
        </div>
      {/if}
    </div>
  </div>
</LibraryLayout>

<ConfirmMusicDialog
  bind:open={isConfirmDialogOpen}
  musicItem={pendingMusicItem}
  linkMetadata={pendingLinkMetadata}
  source={pendingSource}
  existingItem={existingDuplicate}
  onConfirm={handleConfirmDialogConfirm}
  onCancel={handleConfirmDialogCancel}
  onViewExisting={handleViewExisting}
/>
