<script lang="ts">
  import { Debounced } from 'runed'
  import LibraryLayout from './libraryLayout.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Command from '$lib/components/ui/command/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import TrackItem from '~/components/trackItem.svelte'
  import Button from '~/lib/components/ui/button/button.svelte'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'
  import { Trash2, Check, X } from '@lucide/svelte'

  let {
    matchingItems = {
      tracks: { items: [] },
      albums: { items: [] },
    },
  } = $props()
  let searchTerm = $state('')
  let searchType = $state('track')
  let listenLaterItems = $state([])
  let db

  const debouncedSearch = new Debounced(() => searchTerm, 500)

  async function handleSearch() {
    await fetch(`/library/listen-later?q=${debouncedSearch.current}&type=${searchType}`)
      .then((response) => response.json())
      .then((data) => {
        matchingItems = data.matchingItems
      })
      .catch((error) => {
        console.error('Error fetching data from music provider:', error)
        return []
      })
  }

  $effect(() => {
    if (debouncedSearch.current && debouncedSearch.current.trim() !== '') {
      handleSearch()
    } else {
      // Reset matching items when search is empty
      matchingItems = {
        tracks: { items: [] },
        albums: { items: [] },
      }
    }
  })

  const request = indexedDB.open('listenLaterDB', 2)

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

      objectStore.openCursor().onsuccess = (cursorEvent) => {
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
  }

  request.onsuccess = (event) => {
    db = event.target.result
    const transaction = db.transaction('listenLaterList', 'readwrite')
    const store = transaction.objectStore('listenLaterList')

    const getRequest = store.getAll()
    getRequest.onsuccess = () => {
      listenLaterItems = getRequest.result.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))
    }
  }

  function handleListen(item): void {
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
            listenLaterItems = getAllRequest.result.sort(
              (a, b) => (a.addedAt || 0) - (b.addedAt || 0)
            )
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

  function handleDelete(item): void {
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
        listenLaterItems = getAllRequest.result.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))
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
</script>

<LibraryLayout data={listenLaterItems}>
  <div class="h-full w-full px-4 py-6 lg:px-8">
    <div class="flex flex-col justify-between md:flex-row">
      <div class="flex flex-row">
        <Sidebar.Trigger class="mr-2" />
        <div class="mb-4 space-y-2 md:mb-0">
          <h2 class="text-2xl font-semibold tracking-tight">Listen Later</h2>
          <p class="text-muted-foreground text-sm">
            Listen later is a list of albums, artists and tracks you want to listen to later.
          </p>
        </div>
      </div>
    </div>
    <Separator class="my-4" />
    <div class="mb-4 flex items-center gap-4">
      <label for="search-type" class="text-sm font-medium">Search for:</label>
      <Select.Root type="single" bind:value={searchType} class="w-[180px]">
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
    </div>
    <Command.Root class="rounded-lg border shadow-md mb-4" shouldFilter={false}>
      <Command.Input
        bind:value={searchTerm}
        placeholder="Search a song or album to add to your listen later list..."
      />
      {#if (searchType === 'track' && matchingItems.tracks?.items?.length > 0) || (searchType === 'album' && matchingItems.albums?.items?.length > 0)}
        <Command.List>
          <Command.Empty class="text-muted-foreground"
            >No results found for your search.</Command.Empty
          >
          {#if searchType === 'track' && matchingItems.tracks?.items?.length > 0}
            <Command.Group heading="Tracks">
              {#each matchingItems.tracks.items as track (track.id)}
                <TrackItem bind:listenLaterItems item={track} type="track" />
              {/each}
            </Command.Group>
          {/if}
          {#if searchType === 'album' && matchingItems.albums?.items?.length > 0}
            <Command.Group heading="Albums">
              {#each matchingItems.albums.items as album (album.id)}
                <TrackItem bind:listenLaterItems item={album} type="album" />
              {/each}
            </Command.Group>
          {/if}
        </Command.List>
      {/if}
    </Command.Root>

    <div>
      {#if listenLaterItems.length > 0}
        <table>
          <thead>
            <tr>
              <th class="px-4 py-2">Listened</th>
              <th class="px-4 py-2">Type</th>
              <th class="px-4 py-2">Title</th>
              <th class="px-4 py-2">Artists</th>
              <th class="px-4 py-2">Album</th>
              <th class="px-4 py-2">Link</th>
              <th class="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {#each listenLaterItems as item (item.id)}
              <tr>
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
                <td class="px-4 py-2 capitalize">{item.type || 'track'}</td>
                <td class="px-4 py-2">{item.title}</td>
                <td class="px-4 py-2">{item.artists.join(', ')}</td>
                <td class="px-4 py-2">{item.album || '-'}</td>
                <td class="px-4 py-2">
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button href={item.link} variant="link" class="relative">
                          <i class="si si-spotify si--color text-2xl"></i>
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p>Open on Spotify</p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </td>
                <td class="px-4 py-2">
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="cursor-pointer text-destructive hover:text-destructive/90"
                          onclick={() => handleDelete(item)}
                        >
                          <Trash2 class="h-4 w-4" />
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
          <!-- Placeholder for listen later items -->
          <!-- You can add logic to display items from IndexedDB here -->
        </div>
      {/if}
    </div>
  </div>
</LibraryLayout>
