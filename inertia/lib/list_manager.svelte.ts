import { nanoid } from 'nanoid'
import { getContext, setContext } from 'svelte'
import { toast } from 'svelte-sonner'
import {
  type ExternalLink,
  type ListenLaterItem,
  type MusicItem,
  SearchType,
  musicItemName,
} from '../../src/domain/music_item.js'
import { detectPlatform } from '../../src/shared/platform_registry.js'
import { trackQualifyingActivity } from './analytics.js'
import { appFetch } from './app_update.svelte.js'
import { library, listenLaterStorage } from './listen_later.svelte.js'
import { trackWrite } from './reload_guard.js'

type PendingListenLaterItem = ListenLaterItem & { externalLinksPending?: boolean }
type ListStatus = 'loading' | 'loaded' | 'failed'

const LIST_MANAGER_KEY = Symbol('listManager')

export interface ListManager {
  readonly items: PendingListenLaterItem[]
  readonly status: ListStatus
  readonly ready: boolean
  load(): Promise<void>
  remove(item: ListenLaterItem): Promise<void>
  toggleListened(item: ListenLaterItem): Promise<void>
  addFromSearch(item: MusicItem): Promise<void>
  addFromPaste(
    item: MusicItem,
    musicBrainzId: string | undefined,
    sourceUrl: string | undefined,
    onSaved: () => void
  ): Promise<void>
}

async function fetchSearchLinks(item: MusicItem): Promise<ExternalLink[]> {
  try {
    const params = new URLSearchParams({
      mbid: item.id,
      type: item.itemType === SearchType.album ? 'album' : 'track',
      locale: navigator.language || 'fr-FR',
    })
    for (const artist of item.artists) params.append('artists[]', artist)
    if (item.title) params.set('title', item.title)
    const response = await appFetch(`/api/links?${params}`)
    if (!response.ok) return []
    const data = await response.json()
    return data.externalLinks ?? []
  } catch {
    return []
  }
}

export function createListManager(): ListManager {
  let items = $state<PendingListenLaterItem[]>([])
  let status = $state<ListStatus>('loading')
  const ready = $derived(status === 'loaded' && library.access === 'available')
  // Result options remount between queries, even while their saves are pending.
  const searchSavesInFlight = new Set<string>()

  async function load() {
    try {
      items = await listenLaterStorage.getAll()
      status = 'loaded'
    } catch (error) {
      status = 'failed'
      console.error('Error loading listen later list:', error)
      toast.error('Failed to load your list')
    }
  }

  async function addFromSearch(item: MusicItem) {
    if (searchSavesInFlight.has(item.id)) return
    searchSavesInFlight.add(item.id)

    let stored: ListenLaterItem
    try {
      stored = await trackWrite(() =>
        listenLaterStorage.add({
          id: nanoid(),
          musicBrainzId: item.id,
          title: item.title,
          releaseDate: item.releaseDate,
          length: item.length,
          artists: item.artists,
          albumName: item.albumName,
          itemType: item.itemType,
          coverArt: item.coverArt,
          externalLinks: [],
        })
      )
      // ponytail: appending assumes the store's oldest-first order, which puts a
      // new item last. If that default order ever changes, replace this with a
      // getAll().
      items = [...items, { ...stored, externalLinksPending: true }]
    } catch (error) {
      console.error('Error adding item to listen later list:', error)
      toast.error(`Could not add ${musicItemName(item)}`)
      return
    } finally {
      searchSavesInFlight.delete(item.id)
    }

    trackQualifyingActivity('item_saved')
    toast.success(`${musicItemName(item)} added to your list`)
    void backfillSearchLinks(item, stored.id)
  }

  // Link resolution hits third-party APIs and can take seconds. The item is
  // already saved and on screen by then, so patch it in place when the links
  // land — and skip the write if the user removed it while we waited.
  async function backfillSearchLinks(item: MusicItem, localId: string) {
    let resolvedExternalLinks: ExternalLink[] = []
    try {
      resolvedExternalLinks = await trackWrite(async () => {
        const links = await fetchSearchLinks(item)
        if (!links.length) return links
        const updated = await listenLaterStorage.updateExternalLinks(localId, links)
        return updated ? links : []
      })
    } catch (error) {
      console.error('Error backfilling external links:', error)
    }

    items = items.map((existing) =>
      existing.id === localId
        ? { ...existing, externalLinks: resolvedExternalLinks, externalLinksPending: false }
        : existing
    )
  }

  async function addFromPaste(
    item: MusicItem,
    musicBrainzId: string | undefined,
    sourceUrl: string | undefined,
    onSaved: () => void
  ) {
    const platform = sourceUrl ? detectPlatform(sourceUrl) : null
    const stored = await trackWrite(() =>
      listenLaterStorage.add({
        ...item,
        musicBrainzId,
        sourceUrl,
        externalLinks:
          platform && sourceUrl
            ? [
                {
                  platform: platform.id,
                  label: platform.label,
                  category: platform.category,
                  url: sourceUrl,
                  source: 'source-url',
                },
              ]
            : [],
      })
    )
    // Close the draft in the same update so it never sees its own saved row as a duplicate.
    onSaved()
    trackQualifyingActivity('item_saved')
    items = [...items, stored]
    toast.success(`${musicItemName(stored)} added to your list`)
    void trackWrite(() => backfillPasteLinks(stored)).catch((error) =>
      console.error('Error saving external links:', error)
    )
  }

  async function backfillPasteLinks(item: ListenLaterItem) {
    let links: ExternalLink[]
    try {
      const params = new URLSearchParams({
        type: item.itemType,
        locale: navigator.language || 'fr-FR',
        title: item.title,
      })
      for (const artist of item.artists) params.append('artists[]', artist)
      if (item.musicBrainzId) params.set('mbid', item.musicBrainzId)
      if (item.sourceUrl) params.set('sourceUrl', item.sourceUrl)
      const response = await appFetch(`/api/links?${params}`, {
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return
      const data = await response.json()
      links = data.externalLinks ?? []
    } catch {
      // Saving succeeds independently of optional external provider lookups.
      return
    }
    const updated = await listenLaterStorage.updateExternalLinks(item.id, links)
    if (updated) items = items.map((existing) => (existing.id === updated.id ? updated : existing))
  }

  async function remove(item: ListenLaterItem) {
    try {
      await trackWrite(() => listenLaterStorage.remove(item.id))
      trackQualifyingActivity('item_removed')
      items = items.filter((existing) => existing.id !== item.id)
      toast.success(`${musicItemName(item)} removed from your list`)
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error(`Could not remove ${musicItemName(item)}`)
    }
  }

  async function toggleListened(item: ListenLaterItem) {
    try {
      const updated = await trackWrite(() => listenLaterStorage.toggleListened(item.id))
      if (updated) {
        trackQualifyingActivity(updated.hasBeenListened ? 'marked_listened' : 'marked_unlistened')
        items = items.map((existing) => (existing.id === updated.id ? updated : existing))
        // Every other list write confirms itself. This one changed a badge on a row
        // the reader has already moved past, so it needs saying out loud too.
        toast.success(
          `${musicItemName(updated)} marked as ${updated.hasBeenListened ? 'listened' : 'not listened'}`
        )
      }
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error(`Could not update ${musicItemName(item)}`)
    }
  }

  return setContext<ListManager>(LIST_MANAGER_KEY, {
    get items() {
      return items
    },
    get status() {
      return status
    },
    get ready() {
      return ready
    },
    load,
    remove,
    toggleListened,
    addFromSearch,
    addFromPaste,
  })
}

export function getListManager(): ListManager {
  return getContext<ListManager>(LIST_MANAGER_KEY)
}
