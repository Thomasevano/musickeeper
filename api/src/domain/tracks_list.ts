import { Track } from './track'

export interface TracksListProperties {
  id: string
  title: string
  description: string
  tracks: Track[]
  link: string
  imageUrl: string
}

export class TracksList {
  private readonly id: string
  private readonly title: string
  private readonly description: string
  private readonly tracks: Track[]
  private readonly link: string
  private readonly imageUrl: string

  constructor(props: TracksListProperties) {
    this.id = props.id
    this.title = props.title
    this.description = props.description
    this.tracks = props.tracks
    this.link = props.link
    this.imageUrl = props.imageUrl
  }

  getLink(): string {
    return this.link
  }
}

export interface TracksListInfosProperties {
  id: string
  title: string
  description: string
  tracksUrl: string
  link: string
  imageUrl: string
}

export class TracksListInfos {
  private readonly id: string
  private readonly title: string
  private readonly description: string
  private readonly tracksUrl: string
  private readonly link: string
  private readonly imageUrl: string

  constructor(props: TracksListInfosProperties) {
    this.id = props.id
    this.title = props.title
    this.description = props.description
    this.tracksUrl = props.tracksUrl
    this.link = props.link
    this.imageUrl = props.imageUrl
  }

  getLink(): string {
    return this.link
  }

  getTracksUrl(): string {
    return this.tracksUrl
  }
}
