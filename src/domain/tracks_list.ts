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

  getTitle(): string {
    return this.title
  }

  getLink(): string {
    return this.link
  }

  getTracksUrl(): string {
    return this.tracksUrl
  }
}
