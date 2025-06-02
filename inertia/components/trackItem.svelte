<script lang="ts">
  import { Check, Plus } from '@lucide/svelte'
  import * as Command from '$lib/components/ui/command/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'

  let { listenLaterItems = $bindable(), track } = $props()

  function addToListenLater(item) {
    const itemTolistenLater = {
      id: item.id,
      title: item.name,
      artists: item.artists.map((artist) => artist.name),
      link: item.external_urls.spotify,
      hasBeenListened: false,
      album: item.album.name,
    }
    const dbRequest = indexedDB.open('listenLaterDB', 1)

    dbRequest.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction('listenLaterList', 'readwrite')
      const store = transaction.objectStore('listenLaterList')

      const addRequest = store.add(itemTolistenLater)
      addRequest.onsuccess = () => {
        listenLaterItems.push(itemTolistenLater)
      }
      addRequest.onerror = (error) => {
        console.error('Error adding item to listen later list:', error)
      }
    }
  }
  function removeFromListenLater(itemId) {
    const dbRequest = indexedDB.open('listenLaterDB', 1)

    dbRequest.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction('listenLaterList', 'readwrite')
      const store = transaction.objectStore('listenLaterList')

      const deleteRequest = store.delete(itemId)
      deleteRequest.onsuccess = () => {
        console.log('Item removed from listen later list:', itemId)
        listenLaterItems = listenLaterItems.filter((item) => item.id !== itemId)
      }
      deleteRequest.onerror = (error) => {
        console.error('Error removing item from listen later list:', error)
      }
    }
  }
  function toggleListenLater(item) {
    if (listenLaterItems.some((i) => i.id === item.id)) {
      removeFromListenLater(item.id)
    } else {
      console.log('Adding item to listen later list:', item)
      addToListenLater(item)
    }
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger class="w-full">
      <Command.Item
        class="cursor-pointer flex justify-between p-2"
        onclick={() => toggleListenLater(track)}
      >
        <div class="flex items-center gap-4">
          <img
            src={track.album.images[2]?.url}
            alt={`Cover of ${track.album.name}`}
            class="object-cover h-32 w-32"
          />
          <div class="flex flex-col justify-between text-left">
            <p class="px-4 py-2">Title: {track.name}</p>
            <p class="px-4 py-2">
              Artists: {track.artists.map((artist) => artist.name).join(', ')}
            </p>
            <p class="px-4 py-2">Album: {track.album.name}</p>
          </div>
        </div>
        {#if listenLaterItems.some((item) => item.id === track.id)}
          <Check class="size-icon" />
        {:else}
          <Plus />
        {/if}
      </Command.Item>
    </Tooltip.Trigger>
    <Tooltip.Content>Add to Listen Later</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
