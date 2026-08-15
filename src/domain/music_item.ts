export enum SearchType {
  album = 'album',
  track = 'track',
}

export type LinkCategory = 'stream' | 'buy'

export interface ExternalLink {
  platform: string
  label: string
  url: string
  category: LinkCategory
  source: 'musicbrainz' | 'source-url' | 'platform-search'
}

interface MusicItemProperties {
  id: string
  title: string
  releaseDate: string
  length?: number
  artists: string[]
  albumName?: string
  itemType: SearchType
  coverArt?: string
}

export class MusicItem {
  public id: string
  public title: string
  public releaseDate: string
  public length?: number
  public artists: string[]
  public albumName?: string
  public itemType: SearchType
  coverArt?: string
  public constructor(props: MusicItemProperties) {
    this.id = props.id
    this.title = props.title
    this.releaseDate = props.releaseDate
    this.length = props.length
    this.artists = props.artists
    this.albumName = props.albumName
    this.itemType = props.itemType
    this.coverArt = props.coverArt
  }
}

// How a Music Item is named wherever someone is told about one - a toast, a row
// menu, a delete confirmation. A screen reader reads all three, so they either
// say it identically or the same item sounds like two different ones.
export const musicItemName = ({ title, artists }: Pick<MusicItem, 'title' | 'artists'>) =>
  `"${title}" by ${artists.join(', ')}`

export interface ListenLaterItemProperties extends MusicItemProperties {
  hasBeenListened: boolean
  addedAt: Date
  sourceUrl?: string
  externalLinks?: ExternalLink[]
}

export class ListenLaterItem extends MusicItem {
  public hasBeenListened: boolean
  public addedAt: Date
  public sourceUrl?: string
  public externalLinks?: ExternalLink[]
  public constructor(props: ListenLaterItemProperties) {
    super(props)
    this.hasBeenListened = props.hasBeenListened
    this.addedAt = props.addedAt
    this.sourceUrl = props.sourceUrl
    this.externalLinks = props.externalLinks
  }
}

/**
 * Finds an item that is the same recording as the one described.
 *
 * Same title and the *same set* of artists. A shared title with a different
 * artist set is another version, not a duplicate.
 */
export function findDuplicate(
  items: ListenLaterItem[],
  title: string,
  artists: string[]
): ListenLaterItem | null {
  const normalizedTitle = title.toLowerCase().trim()
  const normalizedArtists = [
    ...new Set(artists.map((artist) => artist.toLowerCase().trim())),
  ].sort()

  return (
    items.find((item) => {
      if (item.title.toLowerCase().trim() !== normalizedTitle) return false

      const itemArtists = [
        ...new Set(item.artists.map((artist) => artist.toLowerCase().trim())),
      ].sort()
      if (itemArtists.length !== normalizedArtists.length) return false

      return itemArtists.every((artist, index) => artist === normalizedArtists[index])
    }) ?? null
  )
}
