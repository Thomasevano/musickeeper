interface UserProperties {
  id: string
  name: string
  email: string
  avatar?: string
  providers?: string[]
}

export class User {
  private id: string
  private name: string
  private email: string
  private avatar?: string
  private providers?: string[]

  constructor(props: UserProperties) {
    this.id = props.id
    this.name = props.name
    this.email = props.email
    this.avatar = props.avatar
    this.providers = props.providers ?? []
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

  getProviders(): string[] {
    return this.providers ?? []
  }
}
