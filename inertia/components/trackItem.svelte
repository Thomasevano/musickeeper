<script lang="ts">
  import { Check, Plus } from '@lucide/svelte'
  import * as Command from '$lib/components/ui/command/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'
  import { ListenLaterItem, MusicItem } from '../../src/domain/music_item'
  import CoverArt from '~/components/CoverArt.svelte'
  import Skeleton from '~/lib/components/ui/skeleton/skeleton.svelte'

  let { listenLaterItems = $bindable(), item = undefined, type, loading = false } = $props()

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

{#if loading}
  <Command.Item class="flex p-2">
    <CoverArt src="" alt="Cover" size="md" />
    <div class="flex gap-4">
      <div class="flex flex-col justify-between space-y-4 space-x-2">
        <Skeleton class="h-4 w-[200px]" />
        <Skeleton class=" h-4 w-[260px]" />
        {#if type === 'track'}
          <Skeleton
            class="
          h-4 w-[180px]"
          />
        {/if}
        <Skeleton
          class="
        h-4 w-[240px]"
        />
      </div>
    </div>
  </Command.Item>
{:else}
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger class="w-full">
        <Command.Item class="cursor-pointer flex p-2" onclick={() => toggleListenLater(item)}>
          <CoverArt src={item.coverArt} alt={`Cover of ${item.title}`} size="md" />
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
{/if}
