import { TrackListInfos, type TrackListInfosProperties } from './track_list.js'

interface PlaylistInfosProperties extends TrackListInfosProperties {
  owner: string,
  totalTracks: number
}

export class PlaylistInfos extends TrackListInfos {
  private readonly owner: string
  private readonly totalTracks: number

  constructor(props: PlaylistInfosProperties) {
    super({
      id: props.id,
      title: props.title,
      description: props.description,
      tracksUrl: props.tracksUrl,
      link: props.link,
      imageUrl: props.imageUrl,
    })
    this.owner = props.owner,
      this.totalTracks = props.totalTracks
  }

  getOwner(): string {
    return this.owner
  }

  getTotalTracks(): number {
    return this.totalTracks
  }
}

interface PaginatedPlaylistsInfosPropreties {
  limit: number
  offset: number
  previousUrl: string | null
  nextUrl: string | null
  total: number
  playlistsInfos: PlaylistInfos[]
}
export class PaginatedPlaylistsInfos {
  private limit: number
  private offset: number
  private previousUrl: string | null
  private nextUrl: string | null
  private total: number
  public playlistsInfos: PlaylistInfos[]

  constructor(props: PaginatedPlaylistsInfosPropreties) {
    this.limit = props.limit
    this.offset = props.offset
    this.previousUrl = props.previousUrl
    this.nextUrl = props.nextUrl
    this.total = props.total
    this.playlistsInfos = props.playlistsInfos
  }

  getNextUrl(): string | null {
    return this.nextUrl
  }

  getPreviousUrl(): string | null {
    return this.previousUrl
  }

  getLimit(): number {
    return this.limit
  }

  getOffset(): number {
    return this.offset
  }

  getTotal(): number {
    return this.total
  }
}
