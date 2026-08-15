/// <reference lib="dom" />
import {
  type ListenLaterItem,
  type ExternalLink,
  type ListenLaterItemProperties,
} from '../../domain/music_item.js'

const DB_NAME = 'listenLaterDB'
const DB_VERSION = 3
const STORE_NAME = 'listenLaterList'

export const DB_CONFIG = {
  name: DB_NAME,
  version: DB_VERSION,
  storeName: STORE_NAME,
}

/**
 * What a caller has to provide to save an item. The store owns `addedAt` and
 * `hasBeenListened`, so callers cannot disagree about them.
 */
export type NewListenLaterItem = Omit<ListenLaterItemProperties, 'hasBeenListened' | 'addedAt'>

export interface ListenLaterStorage {
  getAll(): Promise<ListenLaterItem[]>
  get(itemId: string | number): Promise<ListenLaterItem | null>
  add(input: NewListenLaterItem): Promise<ListenLaterItem>
  remove(itemId: string | number): Promise<void>
  toggleListened(itemId: string | number): Promise<ListenLaterItem | null>
  updateExternalLinks(
    itemId: string | number,
    externalLinks: ExternalLink[]
  ): Promise<ListenLaterItem | null>
}

/**
 * Sorts items oldest first.
 *
 * Items written before version 2 carry a numeric `addedAt` (a migration
 * counter) instead of a Date. Those integers are far below any epoch
 * millisecond, so legacy items keep sorting before dated ones.
 */
function sortListenLaterItems(items: ListenLaterItem[]): ListenLaterItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.addedAt instanceof Date ? a.addedAt.getTime() : (a.addedAt as unknown as number)
    const bTime = b.addedAt instanceof Date ? b.addedAt.getTime() : (b.addedAt as unknown as number)
    return (aTime || 0) - (bTime || 0)
  })
}

function openDatabase(indexedDBInstance: IDBFactory): Promise<IDBDatabase> {
  const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>()
  const request = indexedDBInstance.open(DB_NAME, DB_VERSION)

  request.onerror = () => reject(new Error(`Failed to open database: ${request.error?.message}`))
  request.onsuccess = () => resolve(request.result)

  request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
    const db = (event.target as IDBOpenDBRequest).result
    const oldVersion = event.oldVersion

    // Create object store for fresh installs
    if (oldVersion < 1) {
      db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      })
    }

    // Migration from version 1 to 2: add type field to existing items
    if (oldVersion < 2 && oldVersion >= 1) {
      const transaction = (event.target as IDBOpenDBRequest).transaction
      if (transaction) {
        const objectStore = transaction.objectStore(STORE_NAME)
        let counter = 0

        objectStore.openCursor().onsuccess = (cursorEvent) => {
          const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue>).result
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

    // Migration from version 2 to 3: backfill externalLinks = [] on existing items
    if (oldVersion < 3 && oldVersion >= 2) {
      const transaction = (event.target as IDBOpenDBRequest).transaction
      if (transaction) {
        const objectStore = transaction.objectStore(STORE_NAME)

        objectStore.openCursor().onsuccess = (cursorEvent) => {
          const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor) {
            const item = cursor.value
            if (!item.externalLinks) {
              item.externalLinks = []
              const updateReq = cursor.update(item)
              updateReq.onerror = () => {
                console.error(
                  'Failed to backfill externalLinks for item %o:',
                  item.id,
                  updateReq.error
                )
              }
            }
            cursor.continue()
          }
        }
      }
    }
  }

  return promise
}

// Five call sites open a transaction on the one object store; naming it keeps
// STORE_NAME in a single place and reads as the intent, not the ceremony.
const storeFor = (db: IDBDatabase, mode: IDBTransactionMode) =>
  db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)

function getAllItems(db: IDBDatabase): Promise<ListenLaterItem[]> {
  const { promise, resolve, reject } = Promise.withResolvers<ListenLaterItem[]>()
  const request = storeFor(db, 'readonly').getAll()

  request.onsuccess = () => resolve(sortListenLaterItems(request.result))
  request.onerror = () => reject(new Error(`Failed to get items: ${request.error?.message}`))

  return promise
}

function getItem(db: IDBDatabase, itemId: string | number): Promise<ListenLaterItem | null> {
  const { promise, resolve, reject } = Promise.withResolvers<ListenLaterItem | null>()
  const request = storeFor(db, 'readonly').get(itemId)

  request.onsuccess = () => resolve(request.result || null)
  request.onerror = () => reject(new Error(`Failed to get item: ${request.error?.message}`))

  return promise
}

function addItem(
  db: IDBDatabase,
  input: NewListenLaterItem,
  addedAt: Date
): Promise<ListenLaterItem> {
  const { promise, resolve, reject } = Promise.withResolvers<ListenLaterItem>()

  // Every field is copied explicitly and arrays are rebuilt: IndexedDB
  // structured-clones what it is given and rejects Svelte's reactive proxies
  // with a DataCloneError. Keeping that here means no caller has to know.
  const item: ListenLaterItem = {
    id: input.id,
    title: input.title,
    releaseDate: input.releaseDate,
    length: input.length,
    artists: [...input.artists],
    albumName: input.albumName,
    itemType: input.itemType,
    coverArt: input.coverArt,
    hasBeenListened: false,
    addedAt,
    sourceUrl: input.sourceUrl,
    externalLinks: (input.externalLinks ?? []).map((link) => ({ ...link })),
  }

  const request = storeFor(db, 'readwrite').add(item)

  request.onsuccess = () => resolve(item)
  request.onerror = () => reject(new Error(`Failed to add item: ${request.error?.message}`))

  return promise
}

function removeItem(db: IDBDatabase, itemId: string | number): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const request = storeFor(db, 'readwrite').delete(itemId)

  request.onsuccess = () => resolve()
  request.onerror = () => reject(new Error(`Failed to remove item: ${request.error?.message}`))

  return promise
}

function toggleItemListened(
  db: IDBDatabase,
  itemId: string | number
): Promise<ListenLaterItem | null> {
  const { promise, resolve, reject } = Promise.withResolvers<ListenLaterItem | null>()

  // One readwrite transaction for the read and the write, so the flip cannot
  // interleave with another writer.
  const store = storeFor(db, 'readwrite')
  const getRequest = store.get(itemId)

  getRequest.onsuccess = () => {
    const item = getRequest.result
    if (!item) {
      resolve(null)
      return
    }

    item.hasBeenListened = !item.hasBeenListened
    const updateRequest = store.put(item)

    updateRequest.onsuccess = () => resolve(item)
    updateRequest.onerror = () =>
      reject(new Error(`Failed to update item: ${updateRequest.error?.message}`))
  }

  getRequest.onerror = () => reject(new Error(`Failed to get item: ${getRequest.error?.message}`))

  return promise
}

/**
 * Replaces an item's external links. Resolves `null` when the item is gone —
 * link resolution takes seconds, and the user can remove the row while it runs.
 */
function updateItemExternalLinks(
  db: IDBDatabase,
  itemId: string | number,
  externalLinks: ExternalLink[]
): Promise<ListenLaterItem | null> {
  const { promise, resolve, reject } = Promise.withResolvers<ListenLaterItem | null>()

  const store = storeFor(db, 'readwrite')
  const getRequest = store.get(itemId)

  getRequest.onsuccess = () => {
    const item = getRequest.result
    if (!item) {
      resolve(null)
      return
    }

    // Rebuilt for the same reason `addItem` rebuilds arrays: a Svelte proxy
    // reaching IndexedDB throws a DataCloneError.
    item.externalLinks = externalLinks.map((link) => ({ ...link }))
    const updateRequest = store.put(item)

    updateRequest.onsuccess = () => resolve(item)
    updateRequest.onerror = () =>
      reject(new Error(`Failed to update item: ${updateRequest.error?.message}`))
  }

  getRequest.onerror = () => reject(new Error(`Failed to get item: ${getRequest.error?.message}`))

  return promise
}

/**
 * The only way to reach the Listen Later List. Owns the database name, the
 * version, the migrations, the transactions and the sort order; never hands out
 * an `IDBDatabase`.
 *
 * The connection opens on first use and is reused. `indexedDBInstance` is left
 * unresolved until then, so importing this module is safe during SSR.
 *
 * `now` exists because two items added in the same millisecond sort in an
 * unspecified order. A UI cannot produce that, a test can — so tests inject a
 * sequenced clock instead of sleeping between writes.
 */
export function createListenLaterStorage(
  indexedDBInstance?: IDBFactory,
  now: () => Date = () => new Date()
): ListenLaterStorage {
  let connection: Promise<IDBDatabase> | null = null

  const db = () => (connection ??= openDatabase(indexedDBInstance ?? indexedDB))

  return {
    async getAll() {
      return getAllItems(await db())
    },

    async get(itemId) {
      return getItem(await db(), itemId)
    },

    async add(input) {
      return addItem(await db(), input, now())
    },

    async remove(itemId) {
      return removeItem(await db(), itemId)
    },

    async toggleListened(itemId) {
      return toggleItemListened(await db(), itemId)
    },

    async updateExternalLinks(itemId, externalLinks) {
      return updateItemExternalLinks(await db(), itemId, externalLinks)
    },
  }
}

/** Shared instance: one connection for every caller in the browser. */
export const listenLaterStorage = createListenLaterStorage()
