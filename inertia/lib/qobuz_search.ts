import type { SearchType } from '../../src/domain/music_item.js'
import type { NewListenLaterItem } from '../../src/infrastructure/storage/listen_later_storage.js'

const MUSICBRAINZ_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Quote each free-search term so Lucene operators cannot change its meaning. */
export function buildMusicBrainzQuery(query: string): string {
  const tokens = query.trim().split(/\s+/u).filter(Boolean)
  const meaningful = tokens.filter((token) => token !== '-' && token !== '—')
  return (meaningful.length ? meaningful : tokens)
    .map((token) => `"${token.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(' AND ')
}

function searchTokens(value: string): string[] {
  return (
    value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
}

function containsTokens(haystack: string[], needle: string[]): boolean {
  return (
    needle.length > 0 &&
    haystack.some((_, index) => needle.every((token, offset) => haystack[index + offset] === token))
  )
}

/** Rank without changing either the input array or its items. */
export function rankSearchResults(
  items: readonly NewListenLaterItem[],
  query: string
): NewListenLaterItem[] {
  const queryTokens = searchTokens(query)
  if (!queryTokens.length) return [...items]

  const score = (item: NewListenLaterItem): number[] => {
    const title = searchTokens(item.title)
    const artists = item.artists.map(searchTokens)
    const available = [...title, ...artists.flat()]
    const remaining = [...available]
    let coverage = 0
    for (const token of queryTokens) {
      const index = remaining.indexOf(token)
      if (index !== -1) {
        coverage++
        remaining.splice(index, 1)
      }
    }

    const queryRemaining = [...queryTokens]
    const fullTitle =
      title.length > 0 &&
      title.every((token) => {
        const index = queryRemaining.indexOf(token)
        if (index === -1) return false
        queryRemaining.splice(index, 1)
        return true
      })
    const remainingArtists = artists.flat()
    const titleAndArtists =
      fullTitle &&
      queryRemaining.length > 0 &&
      queryRemaining.every((token) => {
        const index = remainingArtists.indexOf(token)
        if (index === -1) return false
        remainingArtists.splice(index, 1)
        return true
      })
    return [
      coverage,
      Number(
        artists.some(
          (artist) => artist.length === queryTokens.length && containsTokens(queryTokens, artist)
        )
      ),
      Number(titleAndArtists),
      Number(title.length === queryTokens.length && containsTokens(queryTokens, title)),
    ]
  }

  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => {
      for (let i = 0; i < a.score.length; i++) {
        const difference = b.score[i] - a.score[i]
        if (difference) return difference
      }
      return a.index - b.index
    })
    .map(({ item }) => item)
}

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
