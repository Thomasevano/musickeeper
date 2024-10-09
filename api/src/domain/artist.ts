interface Properties {
  id: string
  name: string
}

export class Artist {
  constructor(public props: Properties) {
    this.props = props
  }

  getName(): string {
    return this.props.name
  }
}
