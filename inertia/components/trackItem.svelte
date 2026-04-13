<script lang="ts">
  import { Check, Plus } from '@lucide/svelte'
  import { ListenLaterItem, MusicItem } from '../../src/domain/music_item'
  import CoverArt from '~/components/CoverArt.svelte'
  import Skeleton from 'boneyard-js/svelte'

  let {
    listenLaterItems = $bindable(),
    item = undefined,
    type,
    loading = false,
    focused = false,
  } = $props()

  function addToListenLater(item: MusicItem) {
    const itemTolistenLater: ListenLaterItem = {
      ...item,
      hasBeenListened: false,
      addedAt: new Date(),
    }
    const dbRequest = indexedDB.open('listenLaterDB', 3)

    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = db.transaction('listenLaterList', 'readwrite')
      const store = transaction.objectStore('listenLaterList')

      const addRequest = store.add(itemTolistenLater)
      addRequest.onsuccess = () => {
        listenLaterItems = [...listenLaterItems, itemTolistenLater]
      }
      addRequest.onerror = (error) => {
        console.error('Error adding item to listen later list:', error)
      }
    }
  }

  function removeFromListenLater(itemId: string) {
    const dbRequest = indexedDB.open('listenLaterDB', 3)

    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = db.transaction('listenLaterList', 'readwrite')
      const store = transaction.objectStore('listenLaterList')

      const deleteRequest = store.delete(itemId)
      deleteRequest.onsuccess = () => {
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
      addToListenLater(item)
    }
  }

  let isInListenLaterList = $derived(
    listenLaterItems.some((i: ListenLaterItem) => i.id === item?.id)
  )
</script>

<Skeleton name="track-item" {loading}>
  {#snippet fixture()}
    <li class="flex items-center p-2 rounded-sm gap-2">
      <CoverArt src="" alt="Cover" size="md" />
      <div class="flex items-center gap-4">
        <div class="flex flex-col justify-between text-left">
          <p class="px-4 py-2">Title: Never Gonna Give You Up</p>
          <p class="px-4 py-2">Artists: Rick Astley</p>
          <p class="px-4 py-2">Album: Whenever You Need Somebody</p>
          <p class="px-4 py-2">Release Date: 1987</p>
        </div>
      </div>
      <div class="ml-auto"><Plus class="size-4" /></div>
    </li>
  {/snippet}
  {#snippet fallback()}
    <li class="flex p-2 rounded-sm gap-2">
      <CoverArt src="" alt="Cover" size="md" />
      <div class="flex gap-4">
        <div class="flex flex-col justify-between space-y-4 space-x-2">
          <div class="h-4 w-[200px] rounded bg-muted animate-pulse"></div>
          <div class="h-4 w-[260px] rounded bg-muted animate-pulse"></div>
          {#if type === 'track'}
            <div class="h-4 w-[180px] rounded bg-muted animate-pulse"></div>
          {/if}
          <div class="h-4 w-[240px] rounded bg-muted animate-pulse"></div>
        </div>
      </div>
    </li>
  {/snippet}
  {#if item}
    <li
      role="option"
      aria-selected={isInListenLaterList}
      aria-label={isInListenLaterList
        ? `Remove ${item.title} from listen later`
        : `Add ${item.title} to listen later`}
      class="cursor-pointer flex items-center p-2 rounded-sm hover:bg-accent hover:text-accent-foreground outline-none focus-visible:bg-accent focus-visible:text-accent-foreground"
      tabindex={focused ? 0 : -1}
      onclick={() => toggleListenLater(item)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleListenLater(item)
        }
      }}
    >
      <CoverArt src={item.coverArt} alt={`Cover of ${item.title}`} size="md" />
      <div class="flex items-center gap-4">
        <div class="flex flex-col justify-between text-left">
          <p class="px-4 py-2">Title: {item.title}</p>
          <p class="px-4 py-2">
            Artists: {item.artists.map((artist: string) => artist).join(', ')}
          </p>
          {#if type === 'track'}
            <p class="px-4 py-2">Album: {item.albumName}</p>
          {/if}
          <p class="px-4 py-2">Release Date: {item.releaseDate}</p>
        </div>
      </div>
      <div class="ml-auto" aria-hidden="true">
        {#if isInListenLaterList}
          <Check class="size-4" />
        {:else}
          <Plus class="size-4" />
        {/if}
      </div>
    </li>
  {/if}
</Skeleton>
