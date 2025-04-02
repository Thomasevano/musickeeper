import {
  type TrackListInfosProperties,
  TrackListInfos,
  type PaginatedTrackListInfosPropreties,
  PaginatedTrackListInfos,
} from './track_list.js'

interface AlbumInfosProperties extends TrackListInfosProperties {
  artists: string[]
  releaseDate: string
  albumType: string
  label: string
  genres: string[]
}

export class AlbumInfos extends TrackListInfos {
  private artists: string[]
  private releaseDate: string
  private albumType: string
  private label: string
  private genres: string[]

  constructor(props: AlbumInfosProperties) {
    super({
      id: props.id,
      title: props.title,
      description: props.description,
      tracksUrl: props.tracksUrl,
      link: props.link,
      imageUrl: props.imageUrl,
      totalTracks: props.totalTracks,
    })
    this.artists = props.artists
    this.releaseDate = props.releaseDate
    this.albumType = props.albumType
    this.label = props.label
    this.genres = props.genres
  }

  getArtists(): string[] {
    return this.artists
  }

  getReleaseDate(): string {
    return this.releaseDate
  }

  getAlbumType(): string {
    return this.albumType
  }

  getLabel(): string {
    return this.label
  }

  getGenres(): string[] {
    return this.genres
  }
}

interface PaginatedAlbumInfosPropreties extends PaginatedTrackListInfosPropreties {
  albumsInfos: AlbumInfos[]
}
export class PaginatedAlbumInfos extends PaginatedTrackListInfos {
  public albumsInfos: AlbumInfos[]

  constructor(props: PaginatedAlbumInfosPropreties) {
    super({
      limit: props.limit,
      offset: props.offset,
      previousUrl: props.previousUrl,
      nextUrl: props.nextUrl,
      total: props.total,
    })
    this.albumsInfos = props.albumsInfos
  }
}
