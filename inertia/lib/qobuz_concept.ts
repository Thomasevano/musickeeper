import type { SearchType } from '../../src/domain/music_item'
import type { NewListenLaterItem } from '../../src/infrastructure/storage/listen_later_storage'

export interface ConceptAlbum {
  slug: string
  title: string
  artist: string
  year: string
  genre: 'Jazz' | 'Alternative' | 'Electronic'
  note: string
  description: string
}

// A fixed, illustrative editorial selection — not a live Qobuz catalog response.
// Covers are sample thumbnails sourced from Apple's public iTunes Search API.
export const conceptAlbums: ConceptAlbum[] = [
  {
    slug: 'endlessness',
    title: 'Endlessness',
    artist: 'Nala Sinephro',
    year: '2024',
    genre: 'Jazz',
    note: 'A little space to get lost in.',
    description:
      'An expansive meeting of ambient electronics, harp and jazz. A record for slowing down, listening closely, and letting one discovery lead to another.',
  },
  {
    slug: 'a-la-sala',
    title: 'A LA SALA',
    artist: 'Khruangbin',
    year: '2024',
    genre: 'Alternative',
    note: 'Open windows. Unhurried grooves.',
    description:
      'Warm, spacious instrumentals from the Texas trio. Keep it for a quiet morning, a long drive, or the moment your day needs a different rhythm.',
  },
  {
    slug: 'cascade',
    title: 'Cascade',
    artist: 'Floating Points',
    year: '2024',
    genre: 'Electronic',
    note: 'For when the room needs to move.',
    description:
      'Detailed electronics with a dance-floor pulse. A change of pace for the listening queue, full of texture and forward motion.',
  },
  {
    slug: 'lives-outgrown',
    title: 'Lives Outgrown',
    artist: 'Beth Gibbons',
    year: '2024',
    genre: 'Alternative',
    note: 'A voice that stays with you.',
    description:
      'Intimate songwriting and richly layered arrangements. The kind of record a friend recommends, and you want to remember to give your full attention.',
  },
  {
    slug: 'waltz-for-debby',
    title: 'Waltz for Debby',
    artist: 'Bill Evans Trio',
    year: '1961',
    genre: 'Jazz',
    note: 'Some conversations are timeless.',
    description:
      'A Village Vanguard classic, alive with the interplay of piano, bass and drums. Save a place for a record worth returning to.',
  },
  {
    slug: 'in-rainbows',
    title: 'In Rainbows',
    artist: 'Radiohead',
    year: '2007',
    genre: 'Alternative',
    note: 'A familiar record. A fresh listen.',
    description:
      'Restless rhythms, warmth and unexpected detail. Rediscovery belongs in a listening queue just as much as something entirely new.',
  },
]

export const conceptId = (album: ConceptAlbum) => `qobuz-concept:${album.slug}`
export const conceptCover = (album: ConceptAlbum) => `/qobuz-concept/${album.slug}.jpg`
export const qobuzSearch = (artist: string, title: string) =>
  `https://play.qobuz.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`

export function toListenLaterItem(album: ConceptAlbum): NewListenLaterItem {
  return {
    id: conceptId(album),
    title: album.title,
    artists: [album.artist],
    itemType: 'album' as SearchType.album,
    releaseDate: album.year,
    coverArt: conceptCover(album),
    // This is a search destination, not an asserted Qobuz album identity.
    externalLinks: [
      {
        platform: 'qobuz',
        label: 'Search on Qobuz',
        url: qobuzSearch(album.artist, album.title),
        category: 'stream',
        source: 'platform-search',
      },
    ],
  }
}
