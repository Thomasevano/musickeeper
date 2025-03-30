interface userProperties {
  id: string
  name: string
  email: string
  avatar?: string
}

export class User {
  private id: string
  private name: string
  private email: string
  private avatar?: string

  constructor(props: userProperties) {
    this.id = props.id
    this.name = props.name
    this.email = props.email
    this.avatar = props.avatar
  }

  getId(): string {
    return this.id
  }

  getName(): string {
    return this.name
  }

  getEmail(): string {
    return this.email
  }

  getAvatar(): string | undefined {
    return this.avatar ?? undefined
  }
}
