<script lang="ts">
  import { Debounced } from 'runed'
  import LibraryLayout from './libraryLayout.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Command from '$lib/components/ui/command/index.js'
  import TrackItem from '~/components/trackItem.svelte'
  import Button from '~/lib/components/ui/button/button.svelte'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'

  let {
    matchingItems = {
      tracks: { items: [] },
    },
  } = $props()
  let searchTerm = $state('')
  let listenLaterItems = $state([])
  let db

  const debouncedSearch = new Debounced(() => searchTerm, 500)

  async function handleSearch() {
    await fetch(`/library/listen-later?q=${debouncedSearch.current}`)
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
      }
    }
  })

  const request = indexedDB.open('listenLaterDB', 1)

  request.onupgradeneeded = (event) => {
    db = event.target?.result

    const objectStore = db.createObjectStore('listenLaterList', {
      keyPath: 'id',
      autoIncrement: true,
    })
  }

  request.onsuccess = (event) => {
    db = event.target.result
    const transaction = db.transaction('listenLaterList', 'readwrite')
    const store = transaction.objectStore('listenLaterList')

    const getRequest = store.getAll()
    getRequest.onsuccess = () => {
      listenLaterItems = getRequest.result
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
            listenLaterItems = getAllRequest.result
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
    <Command.Root class="rounded-lg border shadow-md mb-4" shouldFilter={false}>
      <Command.Input
        bind:value={searchTerm}
        placeholder="Search a song to add to your listen later list..."
      />
      {#if matchingItems.tracks.items.length > 0}
        <Command.List>
          <Command.Empty class="text-muted-foreground"
            >No results found for your search.</Command.Empty
          >
          <Command.Group heading="Tracks">
            {#each matchingItems.tracks.items as track (track.id)}
              <TrackItem bind:listenLaterItems {track} />
            {/each}
          </Command.Group>
        </Command.List>
      {/if}
    </Command.Root>

    <div>
      {#if listenLaterItems.length > 0}
        <table>
          <thead>
            <tr>
              <th class="px-4 py-2">Listened</th>
              <th class="px-4 py-2">Title</th>
              <th class="px-4 py-2">Artists</th>
              <th class="px-4 py-2">Album</th>
              <th class="px-4 py-2">Link</th>
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
                          {item.hasBeenListened ? '✅' : '❌'}
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
                <td class="px-4 py-2">{item.title}</td>
                <td class="px-4 py-2">{item.artists.join(', ')}</td>
                <td class="px-4 py-2">{item.album}</td>
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
