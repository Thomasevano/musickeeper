import {
  TrackListInfos,
  type TrackListInfosProperties,
  type PaginatedTrackListInfosPropreties,
  PaginatedTrackListInfos,
} from './track_list.js'

interface PlaylistInfosProperties extends TrackListInfosProperties {
  owner: string
}

export class PlaylistInfos extends TrackListInfos {
  private readonly owner: string

  constructor(props: PlaylistInfosProperties) {
    super({
      id: props.id,
      title: props.title,
      description: props.description,
      tracksUrl: props.tracksUrl,
      link: props.link,
      imageUrl: props.imageUrl,
      totalTracks: props.totalTracks,
    })
    this.owner = props.owner
  }

  getOwner(): string {
    return this.owner
  }
}

interface PaginatedPlaylistsInfosPropreties extends PaginatedTrackListInfosPropreties {
  playlistsInfos: PlaylistInfos[]
}
export class PaginatedPlaylistsInfos extends PaginatedTrackListInfos {
  public playlistsInfos: PlaylistInfos[]

  constructor(props: PaginatedPlaylistsInfosPropreties) {
    super({
      limit: props.limit,
      offset: props.offset,
      previousUrl: props.previousUrl,
      nextUrl: props.nextUrl,
      total: props.total,
    })
    this.playlistsInfos = props.playlistsInfos
  }
}
