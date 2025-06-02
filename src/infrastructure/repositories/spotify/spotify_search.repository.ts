import { SearchRepository } from '../../../application/repositories/search.repository.js'

export class SpotifySearchRepository implements SearchRepository {
  async searchItem(query: string, token: string): Promise<SpotifyApi.SearchResponse> {
    const searchUrl = `${process.env.SPOTIFY_BASE_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=5`
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) {
      throw new Error('Failed to fetch search results')
    }
    return response.json()
  }
}
