export class SpotifyApiClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  async get(endpoint: string) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
    return response.json()
  }

  // Add other methods like post, put, delete as needed
}
