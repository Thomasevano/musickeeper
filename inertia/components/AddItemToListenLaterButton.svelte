<script lang="ts">
  import { CircleCheck, CirclePlus } from '@lucide/svelte'
  import Button from '~/lib/components/ui/button/button.svelte'

  let { listenLaterItems, track } = $props()

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

<Button onclick={() => toggleListenLater(track)}>
  {#if listenLaterItems.some((item) => item.id === track.id)}
    <CircleCheck />
  {:else}
    <CirclePlus />
  {/if}
</Button>
