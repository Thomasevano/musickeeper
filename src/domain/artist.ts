interface ArtistProperties {
  id: string
  name: string
}

export class Artist {
  private id: string
  public name: string
  constructor(props: ArtistProperties) {
    this.id = props.id
    this.name = props.name
  }

  getId(): string {
    return this.id
  }
}
