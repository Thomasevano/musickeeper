import { Track } from './track.js'

export interface TrackListInfosProperties {
  id: string
  title: string
  description: string | null
  tracksUrl: string
  link: string
  imageUrl: string
}

export class TrackListInfos {
  private readonly id: string
  private readonly title: string
  private readonly description: string | null
  private readonly tracksUrl: string
  private readonly link: string
  private readonly imageUrl: string

  constructor(props: TrackListInfosProperties) {
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

  getDescription(): string | null {
    return this.description
  }

  getImageUrl(): string {
    return this.imageUrl
  }

  getId(): string {
    return this.id
  }
}

export interface PaginatedTrackListInfosPropreties {
  limit: number
  offset: number
  previousUrl: string | null
  nextUrl: string | null
  total: number
  tracks: Track[] | null
}
export class PaginatedTrackListInfos {
  private limit: number
  private offset: number
  private previousUrl: string | null
  private nextUrl: string | null
  private total: number
  public tracks: Track[] | null

  constructor(props: PaginatedTrackListInfosPropreties) {
    this.limit = props.limit
    this.offset = props.offset
    this.previousUrl = props.previousUrl
    this.nextUrl = props.nextUrl
    this.total = props.total
    this.tracks = props.tracks
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
