import { SearchPort } from '#application/ports/search.port.js'
import { MusicItem, SearchType } from '#domain/music_item.js'

export interface CachedSearchOptions {
  /** How long a cached result stays servable, in milliseconds. */
  ttlMs?: number
  /** Upper bound on resident entries; the oldest is evicted past this. */
  maxEntries?: number
  /** Injectable clock, so tests do not depend on wall time. */
  now?: () => number
}

interface CacheEntry {
  items: MusicItem[]
  storedAt: number
}

const DEFAULT_TTL_MS = 5 * 60 * 1000
const DEFAULT_MAX_ENTRIES = 500

function copyMusicItems(items: MusicItem[]): MusicItem[] {
  return items.map((item) => new MusicItem({ ...item, artists: [...item.artists] }))
}

/**
 * Caches search results in memory so repeated queries skip the MusicBrainz
 * round trip entirely.
 *
 * Searches are debounced per keystroke-settle, so a user refining a query
 * re-issues the same terms constantly — and MusicBrainz rate-limits to roughly
 * one request per second, making every repeat expensive.
 *
 * ponytail: process-local Map. Fine for a single instance; move to Redis if the
 * app is ever scaled horizontally, since each replica keeps its own copy.
 */
export class CachedSearchAdapter extends SearchPort {
  readonly #inner: SearchPort
  readonly #ttlMs: number
  readonly #maxEntries: number
  readonly #now: () => number
  readonly #entries = new Map<string, CacheEntry>()

  constructor(inner: SearchPort, options: CachedSearchOptions = {}) {
    super()
    this.#inner = inner
    this.#ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.#maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
    this.#now = options.now ?? Date.now
  }

  async searchItem(query: string, type: SearchType, artist?: string): Promise<MusicItem[]> {
    const key = JSON.stringify([type, query, artist ?? ''])
    const cached = this.#entries.get(key)

    if (cached && this.#now() - cached.storedAt < this.#ttlMs) {
      return copyMusicItems(cached.items)
    }

    // A rejection propagates untouched, so failures are never cached.
    const items = await this.#inner.searchItem(query, type, artist)

    // Re-insert so the key moves to the end of Map's insertion order, which is
    // what makes the eviction below oldest-first.
    this.#entries.delete(key)
    this.#entries.set(key, { items: copyMusicItems(items), storedAt: this.#now() })

    while (this.#entries.size > this.#maxEntries) {
      const oldest = this.#entries.keys().next()
      if (oldest.done) break
      this.#entries.delete(oldest.value)
    }

    return items
  }
}
