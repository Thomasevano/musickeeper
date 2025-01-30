import { Artist } from './artist.js'

interface TrackProperties {
  id: string
  title: string
  link: string
  artists: Artist['name'][]
}

export class Track {
  private id: string
  private title: string
  private link: string
  private artists: Artist['name'][]
  constructor(public props: TrackProperties) {
    this.id = props.id
    this.title = props.title
    this.link = props.link
    this.artists = props.artists
  }

  getId(): string {
    return this.id
  }

  getTitle(): string {
    return this.title
  }

  getLink(): string {
    return this.link
  }

  getArtists(): Artist['name'][] {
    return this.artists
  }
}
