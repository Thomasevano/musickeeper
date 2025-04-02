export interface TrackListInfosProperties {
  id: string
  title: string
  description: string | null
  tracksUrl: string
  link: string
  imageUrl: string
  totalTracks: number
}

export class TrackListInfos {
  private readonly id: string
  private readonly title: string
  private readonly description: string | null
  private readonly tracksUrl: string
  private readonly link: string
  private readonly imageUrl: string
  private readonly totalTracks: number

  constructor(props: TrackListInfosProperties) {
    this.id = props.id
    this.title = props.title
    this.description = props.description
    this.tracksUrl = props.tracksUrl
    this.link = props.link
    this.imageUrl = props.imageUrl
    this.totalTracks = props.totalTracks
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

  getTotalTracks(): number {
    return this.totalTracks
  }
}

export interface PaginatedTrackListInfosPropreties {
  limit: number
  offset: number
  previousUrl: string | null
  nextUrl: string | null
  total: number
}
export class PaginatedTrackListInfos {
  private limit: number
  private offset: number
  private previousUrl: string | null
  private nextUrl: string | null
  private total: number

  constructor(props: PaginatedTrackListInfosPropreties) {
    this.limit = props.limit
    this.offset = props.offset
    this.previousUrl = props.previousUrl
    this.nextUrl = props.nextUrl
    this.total = props.total
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
