import { Artist } from './artist'

interface Properties {
  id: string
  title: string
  link: string
  artists: Artist[]
}

export class Track {
  constructor(public props: Properties) {
    this.props = props
  }

  getArtists(): Artist[] {
    return this.props.artists
  }
}
