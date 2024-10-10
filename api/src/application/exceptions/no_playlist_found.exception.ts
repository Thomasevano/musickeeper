export class NoPlaylistFoundException extends Error {
  constructor() {
    super('No playlist found')

    this.name = 'NoPlaylistFoundException'
  }

  serialize() {
    return {
      name: this.name,
      code: 'E_NO_PLAYLIST_FOUND',
      date: new Date().toISOString(),
      message: this.message,
    }
  }
}
