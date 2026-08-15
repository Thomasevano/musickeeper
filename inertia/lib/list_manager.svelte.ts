import { getContext, setContext } from 'svelte'
import { toast } from 'svelte-sonner'
import {
  ListenLaterItem,
  MusicItem,
  SearchType,
  musicItemName,
} from '../../src/domain/music_item'
import type { ExternalLink } from '../../src/domain/music_item'
import {
  findDuplicate,
  listenLaterStorage,
  type ListenLaterStorage,
  type NewListenLaterItem,
} from '../../src/infrastructure/storage/listen_later_storage'

type PendingListenLaterItem = ListenLaterItem & { externalLinksPending?: boolean }

const LIST_MANAGER_KEY = Symbol('listManager')

export interface ListManager {
  readonly items: PendingListenLaterItem[]
  load(): Promise<void>
  add(input: NewListenLaterItem, sourceUrl?: string): Promise<ListenLaterItem | null>
  remove(item: Pick<MusicItem, 'id' | 'title' | 'artists'>): Promise<void>
  toggleListened(item: Pick<ListenLaterItem, 'id' | 'title' | 'artists'>): Promise<void>
  findDuplicate(title: string, artists: string[]): ListenLaterItem | null
}

async function fetchExternalLinks(
  item: Pick<MusicItem, 'id' | 'itemType' | 'artists' | 'title'>,
  sourceUrl?: string
): Promise<ExternalLink[]> {
  try {
    const params = new URLSearchParams({
      mbid: item.id,
      type: item.itemType === SearchType.album ? 'album' : 'track',
      locale: navigator.language || 'fr-FR',
    })
    if (item.artists?.length) params.set('artists', item.artists.join(','))
    if (item.title) params.set('title', item.title)
    if (sourceUrl) params.set('sourceUrl', sourceUrl)
    const response = await fetch(`/api/links?${params.toString()}`)
    if (!response.ok) return []
    const data = await response.json()
    return data.externalLinks ?? []
  } catch {
    return []
  }
}

export function createListManager(storage: ListenLaterStorage = listenLaterStorage): ListManager {
  let items = $state<PendingListenLaterItem[]>([])

  async function load() {
    try {
      items = await storage.getAll()
    } catch (error) {
      console.error('Error loading listen later list:', error)
      toast.error('Failed to load your list')
    }
  }

  async function add(
    input: NewListenLaterItem,
    sourceUrl?: string
  ): Promise<ListenLaterItem | null> {
    // When a sourceUrl is provided (link-paste path), fetch external links
    // before saving so the item lands with its links already resolved.
    if (sourceUrl) {
      const externalLinks = await fetchExternalLinks(input, sourceUrl)
      input = { ...input, sourceUrl, externalLinks }
    }

    try {
      const stored = await storage.add(
        sourceUrl ? input : { ...input, externalLinks: [] }
      )

      // ponytail: appending assumes the store's oldest-first order, which puts a
      // new item last. If that default order ever changes, replace this with a
      // getAll().
      if (sourceUrl) {
        items = [...items, stored]
      } else {
        items = [...items, { ...stored, externalLinksPending: true }]
        void backfillExternalLinks(stored)
      }

      toast.success(`${musicItemName(stored)} added to your list`)
      return stored
    } catch (error) {
      console.error('Error adding item to listen later list:', error)
      toast.error(`Could not add ${musicItemName(input)}`)
      return null
    }
  }

  // Link resolution hits third-party APIs and can take seconds. The item is
  // already saved and on screen by then, so patch it in place when the links
  // land — and skip the write if the user removed it while we waited.
  async function backfillExternalLinks(item: ListenLaterItem) {
    let resolvedExternalLinks = await fetchExternalLinks(item)

    if (resolvedExternalLinks.length) {
      try {
        const updated = await storage.updateExternalLinks(item.id, resolvedExternalLinks)
        if (!updated) resolvedExternalLinks = []
      } catch (error) {
        console.error('Error backfilling external links:', error)
        resolvedExternalLinks = []
      }
    }

    items = items.map((existing) =>
      existing.id === item.id
        ? { ...existing, externalLinks: resolvedExternalLinks, externalLinksPending: false }
        : existing
    )
  }

  async function remove(item: Pick<MusicItem, 'id' | 'title' | 'artists'>) {
    try {
      await storage.remove(item.id)
      items = items.filter((i) => i.id !== item.id)
      toast.success(`${musicItemName(item)} removed from your list`)
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error(`Could not remove ${musicItemName(item)}`)
    }
  }

  async function toggleListened(item: Pick<MusicItem, 'id' | 'title' | 'artists'>) {
    try {
      const updated = await storage.toggleListened(item.id)
      if (updated) {
        items = items.map((i) => (i.id === updated.id ? updated : i))
        toast.success(
          `${musicItemName(updated)} marked as ${updated.hasBeenListened ? 'listened' : 'not listened'}`
        )
      }
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error(`Could not update ${musicItemName(item)}`)
    }
  }

  function findDuplicateInList(title: string, artists: string[]): ListenLaterItem | null {
    return findDuplicate(items, title, artists)
  }

  return {
    get items() {
      return items
    },
    load,
    add,
    remove,
    toggleListened,
    findDuplicate: findDuplicateInList,
  }
}

export function setListManagerContext(manager: ListManager): void {
  setContext(LIST_MANAGER_KEY, manager)
}

export function getListManager(): ListManager {
  return getContext<ListManager>(LIST_MANAGER_KEY)
}
