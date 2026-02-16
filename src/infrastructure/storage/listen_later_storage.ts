/// <reference lib="dom" />
import { ListenLaterItem, MusicItem } from '../../domain/music_item.js'

const DB_NAME = 'listenLaterDB'
const DB_VERSION = 2
const STORE_NAME = 'listenLaterList'

export interface ListenLaterStorage {
  open(): Promise<IDBDatabase>
  getAll(): Promise<ListenLaterItem[]>
  add(item: MusicItem): Promise<ListenLaterItem>
  remove(itemId: string | number): Promise<void>
  toggleListened(itemId: string | number): Promise<ListenLaterItem | null>
  get(itemId: string | number): Promise<ListenLaterItem | null>
}

/**
 * Creates a ListenLaterItem from a MusicItem
 */
export function createListenLaterItem(item: MusicItem): ListenLaterItem {
  return {
    ...item,
    hasBeenListened: false,
    addedAt: new Date(),
  } as ListenLaterItem
}

/**
 * Sorts listen later items by addedAt date
 */
export function sortListenLaterItems(items: ListenLaterItem[]): ListenLaterItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.addedAt instanceof Date ? a.addedAt.getTime() : (a.addedAt as number) || 0
    const bTime = b.addedAt instanceof Date ? b.addedAt.getTime() : (b.addedAt as number) || 0
    return aTime - bTime
  })
}

/**
 * Opens the IndexedDB database and handles migrations
 */
export function openDatabase(indexedDBInstance: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDBInstance.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`))
    }

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
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

/**
 * Gets all items from the listen later list
 */
export function getAllItems(db: IDBDatabase): Promise<ListenLaterItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(sortListenLaterItems(request.result))
    }

    request.onerror = () => {
      reject(new Error(`Failed to get items: ${request.error?.message}`))
    }
  })
}

/**
 * Gets a single item by ID
 */
export function getItem(db: IDBDatabase, itemId: string | number): Promise<ListenLaterItem | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(itemId)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      reject(new Error(`Failed to get item: ${request.error?.message}`))
    }
  })
}

/**
 * Adds a music item to the listen later list
 */
export function addItem(db: IDBDatabase, item: MusicItem): Promise<ListenLaterItem> {
  return new Promise((resolve, reject) => {
    const listenLaterItem = createListenLaterItem(item)
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(listenLaterItem)

    request.onsuccess = () => {
      resolve(listenLaterItem)
    }

    request.onerror = () => {
      reject(new Error(`Failed to add item: ${request.error?.message}`))
    }
  })
}

/**
 * Removes an item from the listen later list
 */
export function removeItem(db: IDBDatabase, itemId: string | number): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(itemId)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(new Error(`Failed to remove item: ${request.error?.message}`))
    }
  })
}

/**
 * Toggles the hasBeenListened status of an item
 */
export function toggleItemListened(
  db: IDBDatabase,
  itemId: string | number
): Promise<ListenLaterItem | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(itemId)

    getRequest.onsuccess = () => {
      const item = getRequest.result
      if (!item) {
        resolve(null)
        return
      }

      item.hasBeenListened = !item.hasBeenListened
      const updateRequest = store.put(item)

      updateRequest.onsuccess = () => {
        resolve(item)
      }

      updateRequest.onerror = () => {
        reject(new Error(`Failed to update item: ${updateRequest.error?.message}`))
      }
    }

    getRequest.onerror = () => {
      reject(new Error(`Failed to get item: ${getRequest.error?.message}`))
    }
  })
}

/**
 * Checks if an item exists in the listen later list
 */
export function itemExists(db: IDBDatabase, itemId: string | number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(itemId)

    request.onsuccess = () => {
      resolve(request.result !== undefined)
    }

    request.onerror = () => {
      reject(new Error(`Failed to check item existence: ${request.error?.message}`))
    }
  })
}

/**
 * Gets the count of items in the listen later list
 */
export function getItemCount(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(new Error(`Failed to count items: ${request.error?.message}`))
    }
  })
}

export const DB_CONFIG = {
  name: DB_NAME,
  version: DB_VERSION,
  storeName: STORE_NAME,
}
