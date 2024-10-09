import { type TracksListProperties, TracksList } from './tracks_list.js'

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
