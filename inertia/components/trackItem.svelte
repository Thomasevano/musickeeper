<script lang="ts">
  import { Check, Plus } from '@lucide/svelte'
  import { ListenLaterItem, MusicItem, SearchType, musicItemName } from '../../src/domain/music_item'
  import type { ExternalLink } from '../../src/domain/music_item'
  import CoverArt from '~/components/CoverArt.svelte'
  import Skeleton from 'boneyard-js/svelte'
  import { toast } from 'svelte-sonner'
  import { listenLaterStorage } from '../../src/infrastructure/storage/listen_later_storage'
  type PendingListenLaterItem = ListenLaterItem & { externalLinksPending?: boolean }

  let {
    listenLaterItems = $bindable(),
    item = undefined,
    type,
    loading = false,
    focused = false,
  } = $props()

  async function fetchExternalLinks(item: MusicItem): Promise<ExternalLink[]> {
    try {
      const params = new URLSearchParams({
        mbid: item.id,
        type: item.itemType === SearchType.album ? 'album' : 'track',
        locale: navigator.language || 'fr-FR',
      })
      if (item.artists?.length) params.set('artists', item.artists.join(','))
      if (item.title) params.set('title', item.title)
      const response = await fetch(`/api/links?${params.toString()}`)
      if (!response.ok) return []
      const data = await response.json()
      return data.externalLinks ?? []
    } catch {
      return []
    }
  }

  async function addToListenLater(item: MusicItem) {
    // Links resolve in the background: the item is saved and on screen first.
    try {
      const stored = await listenLaterStorage.add({
        id: item.id,
        title: item.title,
        releaseDate: item.releaseDate,
        length: item.length,
        artists: item.artists,
        albumName: item.albumName,
        itemType: item.itemType,
        coverArt: item.coverArt,
        externalLinks: [],
      })

      // ponytail: appending assumes the store's oldest-first order, which puts a
      // new item last. If that default order ever changes, replace this with a
      // getAll().
      listenLaterItems = [...listenLaterItems, { ...stored, externalLinksPending: true }]
      toast.success(`${musicItemName(item)} added to your list`)
      void backfillExternalLinks(item)
    } catch (error) {
      console.error('Error adding item to listen later list:', error)
      toast.error(`Could not add ${musicItemName(item)}`)
    }
  }

  // Link resolution hits third-party APIs and can take seconds. The item is
  // already saved and on screen by then, so patch it in place when the links
  // land — and skip the write if the user removed it while we waited.
  async function backfillExternalLinks(item: MusicItem) {
    let resolvedExternalLinks = await fetchExternalLinks(item)

    if (resolvedExternalLinks.length) {
      try {
        const updated = await listenLaterStorage.updateExternalLinks(item.id, resolvedExternalLinks)
        if (!updated) resolvedExternalLinks = []
      } catch (error) {
        console.error('Error backfilling external links:', error)
        resolvedExternalLinks = []
      }
    }

    listenLaterItems = listenLaterItems.map((existing: PendingListenLaterItem) =>
      existing.id === item.id
        ? { ...existing, externalLinks: resolvedExternalLinks, externalLinksPending: false }
        : existing
    )
  }

  async function removeFromListenLater(item: MusicItem) {
    try {
      await listenLaterStorage.remove(item.id)
      listenLaterItems = listenLaterItems.filter((i: ListenLaterItem) => i.id !== item.id)
      toast.success(`${musicItemName(item)} removed from your list`)
    } catch (error) {
      console.error('Error removing item from listen later list:', error)
      toast.error(`Could not remove ${musicItemName(item)}`)
    }
  }

  function toggleListenLater(item: MusicItem) {
    if (listenLaterItems.some((i: ListenLaterItem) => i.id === item.id)) {
      removeFromListenLater(item)
    } else {
      addToListenLater(item)
    }
  }

  let isInListenLaterList = $derived(
    listenLaterItems.some((i: ListenLaterItem) => i.id === item?.id)
  )
</script>

<!--
  `role="listbox"` may only own `option` children, so the Skeleton wrapper - two
  generic divs deep - can never be in the tree at the same time as a real row.
  While loading the list holds only placeholders, and those are `aria-hidden`.
-->
{#if loading}
  <Skeleton name="track-item" {loading}>
    {#snippet fixture()}
      <li class="flex items-center p-2 rounded-sm gap-2" aria-hidden="true">
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
      <li class="flex p-2 rounded-sm gap-2" aria-hidden="true">
        <div class="h-32 w-32 shrink-0 rounded-md bg-muted animate-pulse"></div>
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
  </Skeleton>
{:else if item}
  <!-- What the option is called is the lines printed inside it. An `aria-label`
       would have replaced them with a summary, so the album and the release
       date - on screen, and part of telling two recordings apart - would never
       be read out. The cover repeats the title, so it stays out of the name. -->
  <li
    role="option"
    aria-selected={isInListenLaterList}
    aria-describedby={isInListenLaterList ? 'result-remove-hint' : 'result-add-hint'}
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
    <CoverArt src={item.coverArt} alt="" size="md" />
    <div class="flex items-center gap-4">
      <div class="flex flex-col justify-between text-left">
        <p class="px-4 py-2">Title: {item.title}</p>
        <p class="px-4 py-2">Artists: {item.artists.join(', ')}</p>
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
