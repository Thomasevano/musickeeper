import type { SearchType } from '../../src/domain/music_item'
import type { NewListenLaterItem } from '../../src/infrastructure/storage/listen_later_storage'

/** An observed Discover card, not a live catalog response. */
export interface ConceptAlbum {
  /** Actual Qobuz album identifier; slug is retained for existing callers. */
  id: string
  slug: string
  title: string
  artist: string
  artists: string[]
  year: string
  genre: string
  note: string
  description: string
  coverArt: string
  sourceUrl: string
  itemType: SearchType.album
  releaseDate: string
}

export type QobuzCatalogItem = ConceptAlbum

function album(id: string, title: string, artists: string[], note = ''): ConceptAlbum {
  return {
    id,
    slug: id,
    title,
    artist: artists.join(' • '),
    artists,
    // The captured Discover cards did not expose these metadata fields.
    year: '',
    genre: '',
    note,
    description: '',
    coverArt: `/qobuz-concept/covers/${id}.jpg`,
    sourceUrl: `https://play.qobuz.com/album/${id}`,
    itemType: 'album' as SearchType.album,
    releaseDate: '',
  }
}

// Titles, artists, player paths and artwork observed on play.qobuz.com Discover.
// This fixed illustrative selection is not a live or exhaustive catalog.
export const conceptAlbums: ConceptAlbum[] = [
  album('y9xwqjq7ru2vr', 'Still Outstanding', ['Ragga Twins'], 'ALBUM DE LA SEMAINE'),
  album('fpoq100peqjph', 'Close to Home', ['Bill Laurance', 'Michael League']),
  album('lw1tfb5eu9lud', 'trentemøller', ['Trentemøller']),
  album('y2u9ofk640gnc', '(SILHOUETTE)', ['D.a.n.']),
  album('nzxh5konmvw4j', 'Drukqs (Expanded Edition)', ['Aphex Twin', 'Richard D. James']),
  album('gb7g64sfy8bwv', 'Beginningless', ['Anna Butterss', 'Raymond John', 'Ben Lumsdaine']),
  album('ccwouqvud3hmp', 'The Interpretation Of Nightmares', ['Silvertomb']),
  album(
    'c76tuudwjd3q8',
    'J.S. Bach: The Complete Works for Keyboard, Vol. 12: The Well-Tempered Clavier, Book II',
    ['Benjamin Alard']
  ),
  album('nnfef6hysr1i4', 'Carnaval De Luz', ['U2']),
  album('q7kyp0dgf7izw', 'Fantasy & Reveries', ['Brad Mehldau']),
]

export const qobuzCatalog = conceptAlbums
export const conceptId = (item: ConceptAlbum) => `qobuz-concept:${item.id}`
export const conceptCover = (item: ConceptAlbum) => item.coverArt
export const qobuzSearch = (artist: string, title: string) =>
  `https://play.qobuz.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`

/** Convert a concept card to the input accepted by listenLaterStorage.add. */
export function toListenLaterItem(item: ConceptAlbum): NewListenLaterItem {
  return {
    id: conceptId(item),
    title: item.title,
    artists: [...item.artists],
    releaseDate: item.releaseDate,
    itemType: item.itemType,
    coverArt: item.coverArt,
    sourceUrl: item.sourceUrl,
    externalLinks: [
      {
        platform: 'qobuz',
        label: 'Qobuz',
        url: item.sourceUrl,
        category: 'stream',
        source: 'source-url',
      },
    ],
  }
}

export const toNewListenLaterItem = toListenLaterItem
