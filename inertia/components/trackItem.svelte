<script lang="ts">
  import { Check, Plus } from '@lucide/svelte'
  import * as Command from '$lib/components/ui/command/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'
  import { ListenLaterItem, MusicItem, SearchType } from '../../src/domain/music_item'

  let { listenLaterItems = $bindable(), item, type } = $props()

  function addToListenLater(item: MusicItem) {
    const itemTolistenLater: ListenLaterItem = {
      ...item,
      hasBeenListened: false,
      addedAt: new Date(),
    }
    const dbRequest = indexedDB.open('listenLaterDB', 2)

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
    const dbRequest = indexedDB.open('listenLaterDB', 2)

    dbRequest.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction('listenLaterList', 'readwrite')
      const store = transaction.objectStore('listenLaterList')

      const deleteRequest = store.delete(itemId)
      deleteRequest.onsuccess = () => {
        console.log('Item removed from listen later list:', itemId)
        listenLaterItems = listenLaterItems.filter((item: ListenLaterItem) => item.id !== itemId)
      }
      deleteRequest.onerror = (error) => {
        console.error('Error removing item from listen later list:', error)
      }
    }
  }
  function toggleListenLater(item: MusicItem) {
    if (listenLaterItems.some((i: ListenLaterItem) => i.id === item.id)) {
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
      <Command.Item class="cursor-pointer flex p-2" onclick={() => toggleListenLater(item)}>
        <img src={item.coverArt} alt={`Cover of ${item.title}`} class="object-cover h-32 w-32" />
        <div class="flex items-center gap-4">
          <div class="flex flex-col justify-between text-left">
            <p class="px-4 py-2">Title: {item.title}</p>
            <p class="px-4 py-2">
              Artists: {item.artists.map((artist: string) => artist).join(', ')}
            </p>
            {#if type === 'track'}
              <p class="px-4 py-2">Album: {item.albumName}</p>
            {:else}{/if}
            <p class="px-4 py-2">Release Date: {item.releaseDate}</p>
          </div>
        </div>
        <div class="ml-auto">
          {#if listenLaterItems.some((i: ListenLaterItem) => i.id === item.id)}
            <Check class="size-icon" />
          {:else}
            <Plus />
          {/if}
        </div>
      </Command.Item>
    </Tooltip.Trigger>
    <Tooltip.Content>Add to Listen Later</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
