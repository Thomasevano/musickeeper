import type { SearchType } from '../../src/domain/music_item.js'
import type { NewListenLaterItem } from '../../src/infrastructure/storage/listen_later_storage.js'

const MUSICBRAINZ_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Convert untrusted MusicBrainz search JSON to bounded storage inputs. */
export function normalizeSearchResults(
  payload: unknown,
  category: 'album' | 'track'
): NewListenLaterItem[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return []
  const items = (payload as Record<string, unknown>).serializedItems
  if (!Array.isArray(items)) return []

  const results: NewListenLaterItem[] = []
  const seenIds = new Set<string>()
  for (const value of items) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const item = value as Record<string, unknown>
    if (
      typeof item.id !== 'string' ||
      !MUSICBRAINZ_ID.test(item.id) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      item.itemType !== category
    )
      continue
    if (seenIds.has(item.id)) continue
    seenIds.add(item.id)

    const result: NewListenLaterItem = {
      id: item.id,
      title: item.title.trim(),
      artists: Array.isArray(item.artists)
        ? item.artists.filter((artist): artist is string => typeof artist === 'string')
        : [],
      releaseDate: typeof item.releaseDate === 'string' ? item.releaseDate : '',
      itemType: category as SearchType,
      sourceUrl: `https://musicbrainz.org/${category === 'album' ? 'release' : 'recording'}/${item.id}`,
    }
    if (typeof item.length === 'number' && Number.isFinite(item.length) && item.length >= 0) {
      result.length = item.length
    }
    if (typeof item.albumName === 'string') result.albumName = item.albumName
    if (typeof item.coverArt === 'string') {
      try {
        const cover = new URL(item.coverArt)
        if (cover.protocol === 'https:' && !cover.username && !cover.password) {
          result.coverArt = cover.href
        }
      } catch {
        // Ignore invalid artwork URLs rather than passing them to the browser.
      }
    }
    results.push(result)
    if (results.length === 10) break
  }
  return results
}
