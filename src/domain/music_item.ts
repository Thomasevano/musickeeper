export enum SearchType {
  album = 'album',
  track = 'track',
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

interface ListenLaterItemProperties extends MusicItemProperties {
  hasBeenListened: boolean
  addedAt: Date
  sourceUrl?: string
}

export class ListenLaterItem extends MusicItem {
  public hasBeenListened: boolean
  public addedAt: Date
  public sourceUrl?: string
  public constructor(props: ListenLaterItemProperties) {
    super(props)
    this.hasBeenListened = props.hasBeenListened
    this.addedAt = props.addedAt
    this.sourceUrl = props.sourceUrl
  }
}
