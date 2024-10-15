export class ExpiredAccesTokenException extends Error {
  constructor() {
    super('Expired access token')

    this.name = 'ExpiredAccesTokenException'
  }

  serialize() {
    return {
      name: this.name,
      code: 'E_EPIRED_ACCESS_TOKEN',
      date: new Date().toISOString(),
      message: this.message,
    }
  }
}
