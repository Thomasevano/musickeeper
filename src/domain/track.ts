import { Artist } from './artist.js'

interface TrackProperties {
  id: string
  title: string
  artists: Artist['name'][]
}

export class Track {
  private id: string
  private title: string
  private artists: Artist['name'][]
  constructor(public props: TrackProperties) {
    this.id = props.id
    this.title = props.title
    this.artists = props.artists
  }

  getId(): string {
    return this.id
  }

  getTitle(): string {
    return this.title
  }

  getArtists(): Artist['name'][] {
    return this.artists
  }
}
