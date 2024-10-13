import {
  type TracksListProperties,
  TracksList,
  TracksListInfos,
  type TracksListInfosProperties,
} from './tracks_list.js'

interface PlaylistProperties extends TracksListProperties {
  owner: string
}

export class Playlist extends TracksList {
  private readonly owner: string

  constructor(props: PlaylistProperties) {
    super({
      id: props.id,
      title: props.title,
      description: props.description,
      tracks: props.tracks,
      link: props.link,
      imageUrl: props.imageUrl,
    })
    this.owner = props.owner
  }

  getOwner(): string {
    return this.owner
  }
}

interface PlaylistInfosProperties extends TracksListInfosProperties {
  owner: string
}

export class PlaylistInfos extends TracksListInfos {
  private readonly owner: string

  constructor(props: PlaylistInfosProperties) {
    super({
      id: props.id,
      title: props.title,
      description: props.description,
      tracksUrl: props.tracksUrl,
      link: props.link,
      imageUrl: props.imageUrl,
    })
    this.owner = props.owner
  }

  getOwner(): string {
    return this.owner
  }
}

interface PaginatedPlaylistsInfosPropreties {
  limit: number
  offset: number
  previousUrl: string
  nextUrl: string
  total: number
  playlistsInfos: PlaylistInfos[]
}
export class PaginatedPlaylistsInfos {
  private limit: number
  private offset: number
  private previousUrl: string
  private nextUrl: string
  private total: number
  private playlistsInfos: PlaylistInfos[]

  constructor(props: PaginatedPlaylistsInfosPropreties) {
    this.limit = props.limit
    this.offset = props.offset
    this.previousUrl = props.previousUrl
    this.nextUrl = props.nextUrl
    this.total = props.total
    this.playlistsInfos = props.playlistsInfos
  }
}
